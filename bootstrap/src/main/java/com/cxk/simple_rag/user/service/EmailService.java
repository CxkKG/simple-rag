package com.cxk.simple_rag.user.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * 邮件发送服务
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String from;

    /**
     * 发送验证码邮件
     *
     * @param to   收件人邮箱
     * @param code 验证码
     * @param type 场景类型（register / reset_password / change_password）
     */
    public void sendVerifyCode(String to, String code, String type) {
        String subject = switch (type) {
            case "register" -> "注册验证码";
            case "reset_password" -> "重置密码验证码";
            case "change_password" -> "修改密码验证码";
            default -> "验证码";
        };

        String content = buildVerifyCodeHtml(code, subject);
        sendHtmlEmail(to, subject, content);
    }

    private void sendHtmlEmail(String to, String subject, String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
            log.info("Email sent successfully: to={}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email: to={}", to, e);
            throw new RuntimeException("邮件发送失败，请稍后重试");
        }
    }

    private String buildVerifyCodeHtml(String code, String title) {
        return """
                <div style="max-width:480px;margin:0 auto;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <div style="background:#f8fafc;border-radius:12px;padding:32px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#1e3a8a;font-size:20px;">智能课程学习助手</h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">%s</p>
                    <div style="background:#eff6ff;border:2px dashed #3b82f6;border-radius:8px;padding:16px;margin:0 auto;max-width:240px;">
                      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e40af;">%s</span>
                    </div>
                    <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">验证码有效期为 5 分钟，请勿泄露给他人</p>
                  </div>
                </div>
                """.formatted(title, code);
    }
}
