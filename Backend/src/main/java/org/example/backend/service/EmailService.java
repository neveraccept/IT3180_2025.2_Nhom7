package org.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
}