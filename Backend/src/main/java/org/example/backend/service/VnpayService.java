package org.example.backend.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.config.VnpayConfig;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class VnpayService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNP_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VnpayConfig config;

    /** Dựng URL thanh toán VNPay Sandbox, ký HMAC-SHA512 trên tham số đã sắp xếp. */
    public String buildPaymentUrl(String txnRef, BigDecimal amount, String orderInfo, String ipAddr) {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);

        // VNPay yêu cầu amount * 100, kiểu integer (không thập phân)
        long vnpAmount = amount.multiply(BigDecimal.valueOf(100)).longValueExact();

        // TreeMap để các key tự sắp theo alphabet trước khi ký
        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", config.getVersion());
        params.put("vnp_Command", config.getCommand());
        params.put("vnp_TmnCode", config.getTmnCode());
        params.put("vnp_Amount", String.valueOf(vnpAmount));
        params.put("vnp_CurrCode", config.getCurrCode());
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", config.getOrderType());
        params.put("vnp_Locale", config.getLocale());
        params.put("vnp_ReturnUrl", config.getReturnUrl());
        params.put("vnp_IpAddr", ipAddr != null ? ipAddr : "127.0.0.1");
        params.put("vnp_CreateDate", now.format(VNP_DATE));
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(VNP_DATE));

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> e : params.entrySet()) {
            String value = e.getValue();
            if (value == null || value.isEmpty()) continue;
            if (!first) {
                hashData.append('&');
                query.append('&');
            }
            String encName = encode(e.getKey());
            String encVal = encode(value);
            hashData.append(encName).append('=').append(encVal);   // hashData cũng dùng giá trị đã encode
            query.append(encName).append('=').append(encVal);
            first = false;
        }

        String secureHash = hmacSHA512(config.getHashSecret(), hashData.toString());
        return config.getPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    /** Kiểm tra chữ ký phản hồi (Return/IPN): tính lại HMAC-SHA512 và so sánh. */
    public boolean verifySignature(Map<String, String> incoming) {
        String received = incoming.get("vnp_SecureHash");
        if (received == null || received.isBlank()) return false;

        TreeMap<String, String> params = new TreeMap<>(incoming);
        params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");

        StringBuilder hashData = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> e : params.entrySet()) {
            String value = e.getValue();
            if (value == null || value.isEmpty()) continue;
            if (!first) hashData.append('&');
            hashData.append(encode(e.getKey())).append('=').append(encode(value));
            first = false;
        }

        String calc = hmacSHA512(config.getHashSecret(), hashData.toString());
        return calc.equalsIgnoreCase(received);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
    }

    private static String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b & 0xff));
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể ký dữ liệu VNPay", ex);
        }
    }
}
