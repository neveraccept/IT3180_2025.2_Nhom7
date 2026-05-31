package org.example.backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) { this.mailSender = mailSender; }

    public void sendOtpEmail(String to, String otp) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(to);
        msg.setSubject("BlueMoon - Mã OTP xác thực");
        msg.setText(String.format("Mã OTP của bạn là %s. Mã có hiệu lực 5 phút. Nếu bạn không yêu cầu mã, hãy bỏ qua.", otp));
        mailSender.send(msg);
    }
}

