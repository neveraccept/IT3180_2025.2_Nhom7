package org.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Autowired
    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    public void sendOtpEmail(String toEmail, String plainOtp, String purpose) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);

        String subject = "";
        String text = "";

        // Phân loại nội dung template theo mục đích sử dụng
        if ("REGISTER".equals(purpose)) {
            subject = "Mã xác thực đăng ký tài khoản chung cư BlueMoon";
            text = "Xin chào,\n\n"
                    + "Mã OTP để xác thực đăng ký tài khoản của bạn là: " + plainOtp + "\n\n"
                    + "Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.\n\n"
                    + "Trân trọng,\nBan quản trị chung cư BlueMoon.";
        } else if ("FORGOT_PASSWORD".equals(purpose)) {
            subject = "Mã xác thực đặt lại mật khẩu chung cư BlueMoon";
            text = "Xin chào,\n\n"
                    + "Mã OTP để đặt lại mật khẩu của bạn là: " + plainOtp + "\n\n"
                    + "Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.\n\n"
                    + "Trân trọng,\nBan quản trị chung cư BlueMoon.";
        } else {
            throw new IllegalArgumentException("Mục đích gửi OTP không hợp lệ.");
        }

        message.setSubject(subject);
        message.setText(text);

        // Thực hiện gửi email qua SMTP
        javaMailSender.send(message);
    }

    public void sendRejectionEmail(String toEmail, String reason) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("[BlueMoon] Thông báo kết quả phê duyệt tài khoản cư dân");

            // Khối lý do từ chối (chỉ chèn khi Admin có nhập) — escape HTML để tránh lỗi hiển thị/chèn thẻ.
            String reasonBlock = "";
            if (reason != null && !reason.isBlank()) {
                String safeReason = reason.trim()
                        .replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;");
                reasonBlock = "<p style=\"background-color: #fff8e1; color: #8d6e00; padding: 12px; "
                        + "border-left: 4px solid #f9a825; border-radius: 4px;\">"
                        + "<strong>Lý do từ chối:</strong> " + safeReason + "</p>";
            }

            // Nội dung email viết sẵn dưới dạng HTML để hiển thị đẹp mắt
            String htmlContent = ("""
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">Thông Báo Từ Ban Quản Trị BlueMoon</h2>
                        <p>Kính gửi Cư dân,</p>
                    
                        <p>Ban quản trị chung cư <strong>BlueMoon</strong> đã tiến hành rà soát yêu cầu đăng ký tài khoản cư dân của bạn trên hệ thống.</p>
                    
                        <p style="background-color: #ffebee; color: #c62828; padding: 12px; border-left: 4px solid #d32f2f; border-radius: 4px;">
                            <strong>Kết quả:</strong> Yêu cầu đăng ký tài khoản của bạn <strong>KHÔNG ĐƯỢC PHÊ DUYỆT</strong>.
                        </p>
                    """ + reasonBlock + """
                        <p><strong>Lý do phổ biến:</strong> Thông tin bạn khai báo (Họ tên, Số điện thoại hoặc Mã căn hộ) chưa chính xác hoặc không trùng khớp với dữ liệu cư trú thực tế đang được lưu trữ tại tòa nhà.</p>
                    
                        <p>Vui lòng thực hiện các bước sau để đăng ký lại:</p>
                        <ol>
                            <li>Kiểm tra chính xác <strong>Mã căn hộ</strong> bạn đang sinh sống hoặc sở hữu.</li>
                            <li>Đảm bảo các thông tin cá nhân trùng khớp với giấy tờ định danh/hợp đồng mua bán hoặc thuê nhà.</li>
                            <li>Truy cập lại trang web để tiến hành đăng ký mới.</li>
                        </ol>
                    
                        <p>Nếu bạn cho rằng đây là một sự nhầm lẫn hoặc cần hỗ trợ trực tiếp, vui lòng mang giấy tờ tùy thân đến <strong>Văn phòng Ban quản trị</strong> để được nhân viên đối soát và kích hoạt thủ công.</p>
                    
                        <br/>
                        <p style="border-top: 1px solid #e0e0e0; padding-top: 15px; font-size: 0.9em; color: #666;">
                            Trân trọng,<br/>
                            <strong>Ban quản trị chung cư BlueMoon</strong><br/>
                            <i>Đây là email tự động từ hệ thống, vui lòng không phản hồi lại email này.</i>
                        </p>
                    </div>
                    """);

            helper.setText(htmlContent, true); // tham số 'true' kích hoạt chế độ gửi HTML
            javaMailSender.send(message);

        } catch (Exception e) {
            // Ghi log lỗi để phục vụ chẩn đoán nếu cấu hình SMTP gặp vấn đề
            throw new RuntimeException("Thất bại khi gửi email từ chối tới " + toEmail + ": " + e.getMessage());
        }
    }
}