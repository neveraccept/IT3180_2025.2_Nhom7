package org.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;

    // Bảng màu thương hiệu BlueMoon — dùng chung cho mọi email để giao diện đồng nhất.
    private static final String BRAND_PRIMARY = "#1e88e5";   // xanh dương BlueMoon
    private static final String BRAND_DARK = "#0d47a1";
    private static final String TEXT_COLOR = "#2c3e50";
    private static final String MUTED_COLOR = "#7f8c8d";
    private static final String PAGE_BG = "#f4f6f8";

    @Autowired
    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    public void sendOtpEmail(String toEmail, String plainOtp, String purpose) {
        String subject;
        String heading;
        String intro;

        // Phân loại nội dung template theo mục đích sử dụng
        if ("REGISTER".equals(purpose)) {
            subject = "Mã xác thực đăng ký tài khoản chung cư BlueMoon";
            heading = "Xác thực đăng ký tài khoản";
            intro = "Cảm ơn bạn đã đăng ký tài khoản cư dân tại chung cư <strong>BlueMoon</strong>. "
                    + "Vui lòng dùng mã OTP dưới đây để hoàn tất việc xác thực email của bạn:";
        } else if ("FORGOT_PASSWORD".equals(purpose)) {
            subject = "Mã xác thực đặt lại mật khẩu chung cư BlueMoon";
            heading = "Đặt lại mật khẩu";
            intro = "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. "
                    + "Vui lòng dùng mã OTP dưới đây để tiếp tục:";
        } else {
            throw new IllegalArgumentException("Mục đích gửi OTP không hợp lệ.");
        }

        // Khối hiển thị mã OTP nổi bật ở giữa email.
        String otpBlock = """
                <div style="text-align: center; margin: 28px 0;">
                    <div style="display: inline-block; background-color: #e8f1fc; border: 1px dashed %s;
                                border-radius: 10px; padding: 16px 32px;">
                        <span style="font-size: 34px; font-weight: 700; letter-spacing: 10px; color: %s;
                                     font-family: 'Courier New', monospace;">%s</span>
                    </div>
                </div>
                """.formatted(BRAND_PRIMARY, BRAND_DARK, escape(plainOtp));

        String body = """
                <p style="margin: 0 0 16px;">Xin chào,</p>
                <p style="margin: 0 0 8px;">%s</p>
                %s
                <p style="margin: 0 0 8px; text-align: center; color: %s; font-size: 14px;">
                    Mã có hiệu lực trong <strong>5 phút</strong>.
                </p>
                <p style="background-color: #fff8e1; color: #8d6e00; padding: 12px 16px;
                          border-left: 4px solid #f9a825; border-radius: 6px; margin: 24px 0 0; font-size: 14px;">
                    🔒 Vui lòng <strong>không chia sẻ</strong> mã này với bất kỳ ai. Ban quản trị sẽ không bao giờ
                    yêu cầu bạn cung cấp mã OTP qua điện thoại hay tin nhắn.
                </p>
                """.formatted(intro, otpBlock, MUTED_COLOR);

        sendHtml(toEmail, subject, wrap(heading, BRAND_PRIMARY, body));
    }

    public void sendRejectionEmail(String toEmail, String reason) {
        String subject = "[BlueMoon] Kết quả phê duyệt tài khoản cư dân";

        // Khối lý do từ chối (chỉ chèn khi Admin có nhập).
        String reasonBlock = "";
        if (reason != null && !reason.isBlank()) {
            reasonBlock = """
                    <p style="background-color: #fff8e1; color: #8d6e00; padding: 12px 16px;
                              border-left: 4px solid #f9a825; border-radius: 6px; margin: 0 0 16px;">
                        <strong>Lý do từ chối:</strong> %s
                    </p>
                    """.formatted(escape(reason.trim()));
        }

        String body = """
                <p style="margin: 0 0 16px;">Kính gửi Quý cư dân,</p>
                <p style="margin: 0 0 16px;">
                    Ban quản trị chung cư <strong>BlueMoon</strong> đã rà soát yêu cầu đăng ký tài khoản cư dân
                    của bạn trên hệ thống.
                </p>
                <p style="background-color: #ffebee; color: #c62828; padding: 12px 16px;
                          border-left: 4px solid #d32f2f; border-radius: 6px; margin: 0 0 16px;">
                    <strong>Kết quả:</strong> Yêu cầu đăng ký <strong>CHƯA ĐƯỢC PHÊ DUYỆT</strong>.
                </p>
                %s
                <p style="margin: 0 0 8px;"><strong>Lý do thường gặp:</strong> Thông tin khai báo (Họ tên,
                    Số điện thoại hoặc Mã căn hộ) chưa chính xác hoặc không trùng khớp với dữ liệu cư trú
                    đang được lưu trữ tại tòa nhà.</p>
                <p style="margin: 16px 0 8px;">Bạn có thể đăng ký lại theo các bước sau:</p>
                <ol style="margin: 0 0 16px; padding-left: 20px;">
                    <li style="margin-bottom: 6px;">Kiểm tra chính xác <strong>Mã căn hộ</strong> bạn đang sinh sống hoặc sở hữu.</li>
                    <li style="margin-bottom: 6px;">Đảm bảo thông tin cá nhân trùng khớp với giấy tờ định danh / hợp đồng mua bán hoặc thuê nhà.</li>
                    <li style="margin-bottom: 6px;">Truy cập lại trang web để tiến hành đăng ký mới.</li>
                </ol>
                <p style="margin: 0;">Nếu bạn cho rằng đây là một nhầm lẫn hoặc cần hỗ trợ trực tiếp, vui lòng mang
                    giấy tờ tùy thân đến <strong>Văn phòng Ban quản trị</strong> để được đối soát và kích hoạt thủ công.</p>
                """.formatted(reasonBlock);

        try {
            sendHtml(toEmail, subject, wrap("Thông báo kết quả phê duyệt", "#d32f2f", body));
        } catch (Exception e) {
            throw new RuntimeException("Thất bại khi gửi email từ chối tới " + toEmail + ": " + e.getMessage());
        }
    }

    /**
     * Gửi email báo tài khoản cư dân đã được Ban quản trị PHÊ DUYỆT thành công.
     */
    public void sendApprovalEmail(String toEmail, String fullName, String username, String apartmentCode) {
        String subject = "[BlueMoon] Tài khoản cư dân của bạn đã được phê duyệt";

        String greetingName = (fullName != null && !fullName.isBlank()) ? escape(fullName.trim()) : "Quý cư dân";

        // Bảng tóm tắt thông tin tài khoản (chỉ hiện dòng nào có dữ liệu).
        StringBuilder infoRows = new StringBuilder();
        if (username != null && !username.isBlank()) {
            infoRows.append(infoRow("Tên đăng nhập", escape(username.trim())));
        }
        if (apartmentCode != null && !apartmentCode.isBlank()) {
            infoRows.append(infoRow("Mã căn hộ", escape(apartmentCode.trim())));
        }
        String infoTable = infoRows.isEmpty() ? "" : """
                <table style="width: 100%%; border-collapse: collapse; margin: 8px 0 20px;
                              background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
                    %s
                </table>
                """.formatted(infoRows.toString());

        String body = """
                <p style="margin: 0 0 16px;">Kính gửi <strong>%s</strong>,</p>
                <p style="background-color: #e8f5e9; color: #2e7d32; padding: 12px 16px;
                          border-left: 4px solid #43a047; border-radius: 6px; margin: 0 0 20px;">
                    🎉 <strong>Chúc mừng!</strong> Yêu cầu đăng ký tài khoản cư dân của bạn đã được
                    Ban quản trị chung cư <strong>BlueMoon</strong> <strong>PHÊ DUYỆT</strong> thành công.
                </p>
                %s
                <p style="margin: 0 0 16px;">Bạn đã có thể đăng nhập vào hệ thống để:</p>
                <ul style="margin: 0 0 16px; padding-left: 20px;">
                    <li style="margin-bottom: 6px;">Tra cứu thông tin căn hộ và nhân khẩu trong hộ.</li>
                    <li style="margin-bottom: 6px;">Theo dõi và thanh toán các khoản thu phí, điện nước, gửi xe.</li>
                    <li style="margin-bottom: 6px;">Gửi khiếu nại và nhận thông báo từ Ban quản trị.</li>
                </ul>
                <p style="margin: 0;">Vì lý do bảo mật, bạn nên đăng nhập và đổi mật khẩu trong lần sử dụng đầu tiên.
                    Nếu cần hỗ trợ, vui lòng liên hệ <strong>Văn phòng Ban quản trị</strong>.</p>
                """.formatted(greetingName, infoTable);

        try {
            sendHtml(toEmail, subject, wrap("Tài khoản đã được phê duyệt", "#2e7d32", body));
        } catch (Exception e) {
            throw new RuntimeException("Thất bại khi gửi email duyệt tới " + toEmail + ": " + e.getMessage());
        }
    }

    // ----------------------------------------------------------------------
    // Helpers dùng chung
    // ----------------------------------------------------------------------

    /** Gửi một email dạng HTML qua SMTP. */
    private void sendHtml(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // 'true' = bật chế độ HTML
            javaMailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi gửi email tới " + toEmail + ": " + e.getMessage(), e);
        }
    }

    /**
     * Bọc nội dung trong bố cục email chuẩn của BlueMoon: header có thương hiệu (màu theo loại email),
     * thân nội dung và footer.
     */
    private String wrap(String headingText, String headerColor, String innerBody) {
        return """
                <div style="background-color: %s; padding: 24px 12px; font-family: 'Segoe UI', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;
                                border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <div style="background-color: %s; padding: 24px 28px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                                🏢 BlueMoon
                            </h1>
                            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">%s</p>
                        </div>
                        <div style="padding: 28px; color: %s; font-size: 15px; line-height: 1.6;">
                            %s
                        </div>
                        <div style="border-top: 1px solid #ecf0f1; padding: 18px 28px; background-color: #fafbfc;">
                            <p style="margin: 0; color: %s; font-size: 13px; line-height: 1.5;">
                                Trân trọng,<br/>
                                <strong style="color: %s;">Ban quản trị chung cư BlueMoon</strong><br/>
                                <em>Đây là email tự động từ hệ thống, vui lòng không phản hồi lại email này.</em>
                            </p>
                        </div>
                    </div>
                </div>
                """.formatted(PAGE_BG, headerColor, escape(headingText), TEXT_COLOR, innerBody, MUTED_COLOR, BRAND_DARK);
    }

    /** Một dòng trong bảng thông tin tài khoản. */
    private String infoRow(String label, String value) {
        return """
                <tr>
                    <td style="padding: 10px 16px; color: %s; font-size: 14px; border-bottom: 1px solid #ecf0f1;
                               width: 40%%;">%s</td>
                    <td style="padding: 10px 16px; color: %s; font-size: 14px; font-weight: 600;
                               border-bottom: 1px solid #ecf0f1;">%s</td>
                </tr>
                """.formatted(MUTED_COLOR, label, TEXT_COLOR, value);
    }

    /** Escape các ký tự HTML để tránh lỗi hiển thị / chèn thẻ từ dữ liệu người dùng. */
    private String escape(String raw) {
        if (raw == null) return "";
        return raw.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
