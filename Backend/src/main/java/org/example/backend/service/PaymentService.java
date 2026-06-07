package org.example.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.aspect.LogAdminAction;
import org.example.backend.dto.response.PageResponse;
import org.example.backend.dto.PaymentDetailDTO;
import org.example.backend.dto.PaymentTransactionDTO;
import org.example.backend.dto.request.VnpayPaymentUrlRequest;
import org.example.backend.dto.VnpayPaymentUrlResponse;
import org.example.backend.entity.Payment;
import org.example.backend.entity.PaymentTransaction;
import org.example.backend.entity.UtilityBill;
import org.example.backend.entity.enums.PaymentMethod;
import org.example.backend.entity.enums.UtilityBillStatus;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.NotFoundException;
import org.example.backend.service.VnpayService;
import org.example.backend.repository.*;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
public class PaymentService {

    /** Kết quả trả về cho VNPay ở endpoint IPN (chuẩn { "RspCode", "Message" }). */
    public record IpnResponse(String rspCode, String message) {}

    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository txRepository;
    private final UtilityBillRepository utilityBillRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final VnpayService vnpayService;
    private static final long VNPAY_EXPIRE_MINUTES = 15;

    public PaymentService(PaymentRepository paymentRepository,
                          PaymentTransactionRepository txRepository,
                          UtilityBillRepository utilityBillRepository,
                          HouseholdRepository householdRepository,
                          UserRepository userRepository,
                          VnpayService vnpayService) {
        this.paymentRepository = paymentRepository;
        this.txRepository = txRepository;
        this.utilityBillRepository = utilityBillRepository;
        this.householdRepository = householdRepository;
        this.userRepository = userRepository;
        this.vnpayService = vnpayService;
    }

    // ============================ XEM PHIẾU NỘP =============================

    /** Admin: danh sách phiếu nộp, lọc tuỳ chọn theo householdId/status. */
    @Transactional(readOnly = true)
    public PageResponse<PaymentDetailDTO> listPayments(Long householdId, String status, Pageable pageable) {
        String s = (status == null || status.isBlank()) ? null : status.trim().toUpperCase();
        return PageResponse.of(paymentRepository.search(householdId, s, pageable)
                .map(PaymentDetailDTO::from));
    }

    /** Resident: chỉ phiếu nộp của hộ mình (householdId lấy từ JWT, ép ở controller). */
    @Transactional(readOnly = true)
    public PageResponse<PaymentDetailDTO> listMyHousehold(Long householdId, Pageable pageable) {
        return PageResponse.of(paymentRepository.findByHousehold_Id(householdId, pageable)
                .map(PaymentDetailDTO::from));
    }

    // ============================ XÁC NHẬN TIỀN MẶT =========================

    @LogAdminAction(entity = "Payment", action = "UPDATE", description = "Xác nhận thu tiền mặt phiếu nộp",
            detail = "'Hộ ' + #result.householdCode() + ' - đợt ' + #result.feePeriodName()")
    @Transactional
    public PaymentDetailDTO confirmCashPayment(Long paymentId, Long adminUserId) {
        Payment p = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException(
                        "PAYMENT_NOT_FOUND", "Không tìm thấy phiếu nộp id=" + paymentId));

        if (Payment.STATUS_PAID.equals(p.getStatus())) {
            throw new BadRequestException(
                    "PAYMENT_ALREADY_PAID", "Phiếu nộp đã thanh toán, không thể xác nhận lại");
        }

        p.setAmountPaid(p.getAmountDue());
        p.setStatus(Payment.STATUS_PAID);
        p.setPaymentMethod(Payment.METHOD_CASH);
        p.setPaidDate(LocalDate.now());
        p.setPaidAt(LocalDateTime.now());
        p.setCollectedBy(userRepository.getReferenceById(adminUserId));
        paymentRepository.save(p);

        return PaymentDetailDTO.from(p);
    }

    // ===================== TẠO GIAO DỊCH VNPAY (PENDING) =====================

    @Transactional
    public VnpayPaymentUrlResponse createVnpayTransaction(Long userId, Long householdId,
                                                          VnpayPaymentUrlRequest req, String ipAddr) {
        final String targetType = req.targetType();
        final Long targetId = req.targetId();

        boolean isFee = PaymentTransaction.TARGET_FEE_PAYMENT.equals(targetType);
        boolean isUtility = PaymentTransaction.TARGET_UTILITY_BILL.equals(targetType);
        boolean isFeeBatch = PaymentTransaction.TARGET_FEE_PAYMENT_BATCH.equals(targetType);
        boolean isMixedBatch = PaymentTransaction.TARGET_MIXED_PAYMENT_BATCH.equals(targetType);
        if (!isFee && !isUtility && !isFeeBatch && !isMixedBatch) {
            throw new BadRequestException("INVALID_TARGET_TYPE",
                    "targetType không hợp lệ: " + targetType);
        }

        // 1) Resolve đối tượng cần thanh toán → số tiền + hộ sở hữu + kiểm tra đã thanh toán chưa
        BigDecimal amount;
        Long ownerHouseholdId;
        List<Long> batchPaymentIds = List.of();
        List<Long> batchUtilityBillIds = List.of();
        List<BigDecimal> batchAmounts = List.of();
        if (isFee) {
            if (targetId == null) {
                throw new BadRequestException("TARGET_ID_REQUIRED", "Vui long chon khoan phi can thanh toan");
            }
            Payment p = paymentRepository.findById(targetId)
                    .orElseThrow(() -> new NotFoundException(
                            "PAYMENT_NOT_FOUND", "Không tìm thấy phiếu nộp id=" + targetId));
            if (Payment.STATUS_PAID.equals(p.getStatus())) {
                throw new BadRequestException("TARGET_ALREADY_PAID", "Khoản phí đã được thanh toán");
            }
            if (p.getFeePeriod() == null || !"OPEN".equalsIgnoreCase(p.getFeePeriod().getStatus())) {
                throw new BadRequestException("FEE_PERIOD_CLOSED",
                        "Đợt thu phí đã đóng, không thể thanh toán online");
            }
            if (isDonationPayment(p)) {
                amount = req.customAmount();
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BadRequestException("INVALID_DONATION_AMOUNT",
                            "Vui lòng nhập số tiền đóng góp lớn hơn 0");
                }
            } else {
                amount = p.getAmountDue();
            }
            ownerHouseholdId = p.getHousehold().getId();
        } else if (isFeeBatch || isMixedBatch) {
            batchPaymentIds = normalizeTargetIds(req.targetIds());
            batchUtilityBillIds = isMixedBatch ? normalizeTargetIds(req.utilityBillIds()) : List.of();
            if (batchPaymentIds.isEmpty() && batchUtilityBillIds.isEmpty()) {
                throw new BadRequestException("EMPTY_BATCH", "Vui long chon it nhat mot muc thanh toan");
            }

            BigDecimal total = BigDecimal.ZERO;
            Long batchOwner = null;
            List<BigDecimal> lineAmounts = new ArrayList<>();
            for (Long paymentId : batchPaymentIds) {
                Payment p = paymentRepository.findById(paymentId)
                        .orElseThrow(() -> new NotFoundException(
                                "PAYMENT_NOT_FOUND", "Khong tim thay phieu nop id=" + paymentId));
                if (Payment.STATUS_PAID.equals(p.getStatus())) {
                    throw new BadRequestException("TARGET_ALREADY_PAID", "Co khoan phi da duoc thanh toan");
                }
                if (p.getFeePeriod() == null || !"OPEN".equalsIgnoreCase(p.getFeePeriod().getStatus())) {
                    throw new BadRequestException("FEE_PERIOD_CLOSED",
                            "Co dot thu phi da dong, khong the thanh toan online");
                }

                Long paymentHouseholdId = p.getHousehold().getId();
                if (batchOwner == null) {
                    batchOwner = paymentHouseholdId;
                } else if (!batchOwner.equals(paymentHouseholdId)) {
                    throw new AccessDeniedException("Cac khoan phi khong cung ho dan");
                }

                BigDecimal lineAmount = p.getAmountDue();
                if (isDonationPayment(p)) {
                    lineAmount = req.customAmounts() == null ? null : req.customAmounts().get(paymentId);
                    if (lineAmount == null || lineAmount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new BadRequestException("INVALID_DONATION_AMOUNT",
                                "Vui long nhap so tien dong gop lon hon 0");
                    }
                }
                lineAmounts.add(lineAmount);
                total = total.add(lineAmount);
            }
            for (Long billId : batchUtilityBillIds) {
                UtilityBill b = utilityBillRepository.findById(billId)
                        .orElseThrow(() -> new NotFoundException(
                                "UTILITY_BILL_NOT_FOUND", "Khong tim thay hoa don id=" + billId));
                if (b.getStatus() == UtilityBillStatus.PAID) {
                    throw new BadRequestException("TARGET_ALREADY_PAID", "Co hoa don da duoc thanh toan");
                }

                Long billHouseholdId = b.getHousehold().getId();
                if (batchOwner == null) {
                    batchOwner = billHouseholdId;
                } else if (!batchOwner.equals(billHouseholdId)) {
                    throw new AccessDeniedException("Cac muc thanh toan khong cung ho dan");
                }

                total = total.add(b.getAmount());
            }
            amount = total;
            ownerHouseholdId = batchOwner;
            batchAmounts = lineAmounts;
        } else {
            if (targetId == null) {
                throw new BadRequestException("TARGET_ID_REQUIRED", "Vui long chon hoa don can thanh toan");
            }
            UtilityBill b = utilityBillRepository.findById(targetId)
                    .orElseThrow(() -> new NotFoundException(
                            "UTILITY_BILL_NOT_FOUND", "Không tìm thấy hoá đơn id=" + targetId));
            if (b.getStatus() == UtilityBillStatus.PAID) {
                throw new BadRequestException("TARGET_ALREADY_PAID", "Hoá đơn đã được thanh toán");
            }
            amount = b.getAmount();
            ownerHouseholdId = b.getHousehold().getId();
        }

        // 2) Cư dân chỉ được thanh toán cho hộ mình → 403
        if (!ownerHouseholdId.equals(householdId)) {
            throw new AccessDeniedException("Khoản phí không thuộc hộ của bạn");
        }

        // 3) Idempotency tạo URL: đã có PENDING → trả lại URL cũ, không tạo song song
        Optional<PaymentTransaction> pending = (isFeeBatch || isMixedBatch)
                ? Optional.empty()
                : txRepository.findFirstByTargetTypeAndTargetIdAndStatus(
                        targetType, targetId, PaymentTransaction.STATUS_PENDING);
        if (!isFeeBatch && !isMixedBatch && pending.isPresent()) {
            PaymentTransaction old = pending.get();
            if (old.getCreatedAt() != null
                    && old.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(VNPAY_EXPIRE_MINUTES))
                    && old.getPaymentUrl() != null
                    && !old.getPaymentUrl().isBlank()) {
                return new VnpayPaymentUrlResponse(old.getPaymentUrl(), old.getTransactionCode());
            }
            old.setStatus(PaymentTransaction.STATUS_CANCELLED);
            txRepository.save(old);
        }

        if (isFeeBatch || isMixedBatch) {
            for (Long paymentId : batchPaymentIds) {
                txRepository.findFirstByTargetTypeAndTargetIdAndStatus(
                                PaymentTransaction.TARGET_FEE_PAYMENT, paymentId, PaymentTransaction.STATUS_PENDING)
                        .ifPresent(old -> {
                            old.setStatus(PaymentTransaction.STATUS_CANCELLED);
                            txRepository.save(old);
                        });
            }
            for (Long billId : batchUtilityBillIds) {
                txRepository.findFirstByTargetTypeAndTargetIdAndStatus(
                                PaymentTransaction.TARGET_UTILITY_BILL, billId, PaymentTransaction.STATUS_PENDING)
                        .ifPresent(old -> {
                            old.setStatus(PaymentTransaction.STATUS_CANCELLED);
                            txRepository.save(old);
                        });
            }
        }

        // 4) Lưu giao dịch PENDING
        String code = generateTransactionCode();
        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionCode(code);
        tx.setHousehold(householdRepository.getReferenceById(householdId));
        tx.setUser(userRepository.getReferenceById(userId));
        tx.setTargetType(targetType);
        tx.setTargetId((isFeeBatch || isMixedBatch)
                ? (!batchPaymentIds.isEmpty() ? batchPaymentIds.get(0) : batchUtilityBillIds.get(0))
                : targetId);
        if (isFeeBatch || isMixedBatch) {
            tx.setTargetIds(joinIds(batchPaymentIds));
            tx.setTargetAmounts(joinAmounts(batchAmounts));
            if (isMixedBatch) {
                tx.setUtilityBillIds(joinIds(batchUtilityBillIds));
            }
        }
        tx.setAmount(amount);
        tx.setStatus(PaymentTransaction.STATUS_PENDING);
        txRepository.save(tx);

        // 5) Dựng URL VNPay (ký HMAC-SHA512) rồi lưu lại
        String orderInfo = (isFeeBatch || isMixedBatch)
                ? "Thanh toan nhieu muc " + (batchPaymentIds.size() + batchUtilityBillIds.size()) + " muc - " + code
                : "Thanh toan " + targetType + " #" + targetId + " - " + code;
        String paymentUrl = vnpayService.buildPaymentUrl(code, amount, orderInfo, ipAddr);
        tx.setPaymentUrl(paymentUrl);
        txRepository.save(tx);

        return new VnpayPaymentUrlResponse(paymentUrl, code);
    }

    // ============================ XỬ LÝ IPN VNPAY ===========================

    /**
     * Nguồn cập nhật trạng thái CHÍNH (server-to-server).
     * verify chữ ký → tìm tx (khoá ghi) → đối chiếu số tiền → idempotency → cập nhật.
     * Trả mã RspCode để controller relay về VNPay.
     */
    @Transactional
    public IpnResponse processVnpayIpn(Map<String, String> params) {

        // 1) Verify chữ ký — sai thì TỪ CHỐI, không cập nhật, ghi log cảnh báo
        if (!vnpayService.verifySignature(params)) {
            log.warn("VNPay IPN chữ ký không hợp lệ. params={}", params.keySet());
            return new IpnResponse("97", "Invalid signature");
        }

        String txnRef = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String vnpAmount = params.get("vnp_Amount");

        // 2) Tìm giao dịch (PESSIMISTIC_WRITE chống IPN gọi đồng thời)
        PaymentTransaction tx = txRepository.findByTransactionCodeForUpdate(txnRef).orElse(null);
        if (tx == null) {
            log.warn("VNPay IPN không tìm thấy transaction_code={}", txnRef);
            return new IpnResponse("01", "Order not found");
        }

        // 3) Đối chiếu số tiền (VNPay nhân 100, không phần thập phân)
        long expected = tx.getAmount().multiply(BigDecimal.valueOf(100)).longValueExact();
        if (vnpAmount == null || !String.valueOf(expected).equals(vnpAmount)) {
            log.warn("VNPay IPN lệch số tiền tx={} expected={} got={}", txnRef, expected, vnpAmount);
            return new IpnResponse("04", "Invalid amount");
        }

        // 4) Idempotency — đã ở trạng thái cuối thì ack 00 và KHÔNG cập nhật lại
        if (!PaymentTransaction.STATUS_PENDING.equals(tx.getStatus())) {
            return new IpnResponse("00", "Order already confirmed");
        }

        // 5) Lưu dữ liệu VNPay trả về (không lưu chữ ký)
        applyVnpayResult(tx, params);

        txRepository.save(tx);

        return new IpnResponse("00", "Confirm Success");
    }

    /** Return URL co the den truoc IPN, nen dung du lieu da ky de chot trang thai neu con PENDING. */
    @Transactional
    public String processVnpayReturn(Map<String, String> params) {
        if (!vnpayService.verifySignature(params)) {
            log.warn("VNPay return chu ky khong hop le. params={}", params.keySet());
            return "INVALID";
        }

        String txnRef = params.get("vnp_TxnRef");
        PaymentTransaction tx = txRepository.findByTransactionCodeForUpdate(txnRef).orElse(null);
        if (tx == null) {
            return "NOT_FOUND";
        }

        if (!PaymentTransaction.STATUS_PENDING.equals(tx.getStatus())) {
            return tx.getStatus();
        }

        String vnpAmount = params.get("vnp_Amount");
        long expected = tx.getAmount().multiply(BigDecimal.valueOf(100)).longValueExact();
        if (vnpAmount == null || !Objects.equals(String.valueOf(expected), vnpAmount)) {
            log.warn("VNPay return lech so tien tx={} expected={} got={}", txnRef, expected, vnpAmount);
            tx.setStatus(PaymentTransaction.STATUS_FAILED);
            tx.setVnpayResponseCode(params.get("vnp_ResponseCode"));
            txRepository.save(tx);
            return tx.getStatus();
        }

        applyVnpayResult(tx, params);
        txRepository.save(tx);
        return tx.getStatus();
    }

    private void applyVnpayResult(PaymentTransaction tx, Map<String, String> params) {
        String responseCode = params.get("vnp_ResponseCode");
        tx.setVnpayResponseCode(responseCode);
        tx.setVnpayTransactionNo(params.get("vnp_TransactionNo"));
        tx.setVnpayBankCode(params.get("vnp_BankCode"));
        tx.setVnpayPayDate(params.get("vnp_PayDate"));

        if ("00".equals(responseCode)) {
            tx.setStatus(PaymentTransaction.STATUS_SUCCESS);
            tx.setPaidAt(LocalDateTime.now());
            markTargetPaid(tx);
        } else if ("24".equals(responseCode)) {
            tx.setStatus(PaymentTransaction.STATUS_CANCELLED);
        } else {
            tx.setStatus(PaymentTransaction.STATUS_FAILED);
        }
    }

    /** Cập nhật bản ghi khoản phí/hoá đơn tương ứng khi VNPay thành công. */
    private void markTargetPaid(PaymentTransaction tx) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        if (PaymentTransaction.TARGET_FEE_PAYMENT.equals(tx.getTargetType())) {
            Payment p = paymentRepository.findById(tx.getTargetId())
                    .orElseThrow(() -> new NotFoundException(
                            "PAYMENT_NOT_FOUND", "Phiếu nộp không tồn tại id=" + tx.getTargetId()));
            p.setStatus(Payment.STATUS_PAID);
            p.setAmountPaid(tx.getAmount());
            if (isDonationPayment(p)) {
                p.setAmountDue(tx.getAmount());
            }
            p.setPaymentMethod(Payment.METHOD_ONLINE);
            p.setTransactionCode(tx.getTransactionCode());
            p.setPaidAt(now);
            p.setPaidDate(today);
            paymentRepository.save(p);
        } else if (PaymentTransaction.TARGET_FEE_PAYMENT_BATCH.equals(tx.getTargetType())) {
            List<Long> paymentIds = parseIds(tx.getTargetIds());
            List<BigDecimal> amounts = parseAmounts(tx.getTargetAmounts());
            for (int i = 0; i < paymentIds.size(); i++) {
                Long paymentId = paymentIds.get(i);
                BigDecimal lineAmount = i < amounts.size() ? amounts.get(i) : null;
                Payment p = paymentRepository.findById(paymentId)
                        .orElseThrow(() -> new NotFoundException(
                                "PAYMENT_NOT_FOUND", "Phieu nop khong ton tai id=" + paymentId));
                BigDecimal paidAmount = lineAmount != null ? lineAmount : p.getAmountDue();
                p.setStatus(Payment.STATUS_PAID);
                p.setAmountPaid(paidAmount);
                if (isDonationPayment(p)) {
                    p.setAmountDue(paidAmount);
                }
                p.setPaymentMethod(Payment.METHOD_ONLINE);
                p.setTransactionCode(tx.getTransactionCode());
                p.setPaidAt(now);
                p.setPaidDate(today);
                paymentRepository.save(p);
            }
        } else if (PaymentTransaction.TARGET_MIXED_PAYMENT_BATCH.equals(tx.getTargetType())) {
            List<Long> paymentIds = parseIds(tx.getTargetIds());
            List<BigDecimal> amounts = parseAmounts(tx.getTargetAmounts());
            for (int i = 0; i < paymentIds.size(); i++) {
                Long paymentId = paymentIds.get(i);
                BigDecimal lineAmount = i < amounts.size() ? amounts.get(i) : null;
                Payment p = paymentRepository.findById(paymentId)
                        .orElseThrow(() -> new NotFoundException(
                                "PAYMENT_NOT_FOUND", "Phieu nop khong ton tai id=" + paymentId));
                BigDecimal paidAmount = lineAmount != null ? lineAmount : p.getAmountDue();
                p.setStatus(Payment.STATUS_PAID);
                p.setAmountPaid(paidAmount);
                if (isDonationPayment(p)) {
                    p.setAmountDue(paidAmount);
                }
                p.setPaymentMethod(Payment.METHOD_ONLINE);
                p.setTransactionCode(tx.getTransactionCode());
                p.setPaidAt(now);
                p.setPaidDate(today);
                paymentRepository.save(p);
            }
            for (Long billId : parseIds(tx.getUtilityBillIds())) {
                UtilityBill b = utilityBillRepository.findById(billId)
                        .orElseThrow(() -> new NotFoundException(
                                "UTILITY_BILL_NOT_FOUND", "Hoa don khong ton tai id=" + billId));
                b.setStatus(UtilityBillStatus.PAID);
                b.setPaymentMethod(PaymentMethod.ONLINE);
                b.setTransactionCode(tx.getTransactionCode());
                b.setPaidAt(now);
                b.setPaidDate(today);
                utilityBillRepository.save(b);
            }
        } else if (PaymentTransaction.TARGET_UTILITY_BILL.equals(tx.getTargetType())) {
            UtilityBill b = utilityBillRepository.findById(tx.getTargetId())
                    .orElseThrow(() -> new NotFoundException(
                            "UTILITY_BILL_NOT_FOUND", "Hoá đơn không tồn tại id=" + tx.getTargetId()));
            b.setStatus(UtilityBillStatus.PAID);
            b.setPaymentMethod(PaymentMethod.ONLINE);
            b.setTransactionCode(tx.getTransactionCode());
            b.setPaidAt(now);
            b.setPaidDate(today);
            utilityBillRepository.save(b);
        }
    }

    // ==================== TRA CỨU GIAO DỊCH (Return / history / admin) =======

    /** Dùng cho Return URL: đọc trạng thái đã được IPN cập nhật (có thể vẫn PENDING). */
    @Transactional(readOnly = true)
    public String getTransactionStatusByCode(String transactionCode) {
        return txRepository.findByTransactionCode(transactionCode)
                .map(PaymentTransaction::getStatus)
                .orElse("NOT_FOUND");
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentTransactionDTO> listMyTransactions(Long householdId, Pageable pageable) {
        return PageResponse.of(txRepository.findByHousehold_Id(householdId, pageable)
                .map(PaymentTransactionDTO::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentTransactionDTO> searchTransactions(
            String status, Long householdId, String targetType,
            LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        LocalDateTime from = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime to = toDate != null ? toDate.atTime(23, 59, 59) : null;
        String s = (status == null || status.isBlank()) ? null : status.trim().toUpperCase();
        String tt = (targetType == null || targetType.isBlank()) ? null : targetType.trim().toUpperCase();
        return PageResponse.of(txRepository.search(s, householdId, tt, from, to, pageable)
                .map(PaymentTransactionDTO::from));
    }

    @Transactional(readOnly = true)
    public PaymentTransactionDTO getTransactionDetail(Long id) {
        return txRepository.findById(id)
                .map(PaymentTransactionDTO::from)
                .orElseThrow(() -> new NotFoundException(
                        "TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch id=" + id));
    }

    // ============================= HELPERS ==================================

    private List<Long> normalizeTargetIds(List<Long> ids) {
        if (ids == null) {
            return List.of();
        }
        Set<Long> unique = new LinkedHashSet<>();
        for (Long id : ids) {
            if (id != null) {
                unique.add(id);
            }
        }
        return new ArrayList<>(unique);
    }

    private String joinIds(List<Long> ids) {
        return String.join(",", ids.stream().map(String::valueOf).toList());
    }

    private List<Long> parseIds(String ids) {
        if (ids == null || ids.isBlank()) {
            return List.of();
        }
        List<Long> result = new ArrayList<>();
        for (String part : ids.split(",")) {
            if (!part.isBlank()) {
                result.add(Long.valueOf(part.trim()));
            }
        }
        return result;
    }

    private String joinAmounts(List<BigDecimal> amounts) {
        return String.join(",", amounts.stream().map(BigDecimal::toPlainString).toList());
    }

    private List<BigDecimal> parseAmounts(String amounts) {
        if (amounts == null || amounts.isBlank()) {
            return List.of();
        }
        List<BigDecimal> result = new ArrayList<>();
        for (String part : amounts.split(",")) {
            if (!part.isBlank()) {
                result.add(new BigDecimal(part.trim()));
            }
        }
        return result;
    }

    private String generateTransactionCode() {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // yyyyMMdd
        for (int i = 0; i < 5; i++) {
            String code = "BM-" + date + "-"
                    + String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            if (!txRepository.existsByTransactionCode(code)) {
                return code;
            }
        }
        return "BM-" + date + "-" + System.nanoTime();
    }

    private boolean isDonationPayment(Payment p) {
        return p.getFeePeriod() != null
                && p.getFeePeriod().getFee() != null
                && "DONATION".equalsIgnoreCase(p.getFeePeriod().getFee().getType());
    }
}
