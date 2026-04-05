package com.vencedores.ski.service;

import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${EMAIL_FROM:}")
    private String emailFrom;

    public EmailService(JavaMailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    @Async
    public void sendConfirmationEmailAsync(String to, String name, String eventName,
                                           String confirmationId, double total) {
        if (smtpUser == null || smtpUser.isBlank()) {
            log.info("[Email] SMTP not configured — skipping confirmation email");
            return;
        }

        try {
            var context = new Context();
            context.setVariable("name", name);
            context.setVariable("eventName", eventName);
            context.setVariable("confirmationId", confirmationId);
            context.setVariable("total", String.format("$%.2f USD", total));
            context.setVariable("date", LocalDate.now()
                    .format(DateTimeFormatter.ofPattern("M/d/yyyy")));
            context.setVariable("smtpUser", smtpUser);

            String html = templateEngine.process("confirmation-email", context);

            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            String from = (emailFrom != null && !emailFrom.isBlank())
                    ? emailFrom
                    : "\"Vencedores Ski\" <" + smtpUser + ">";
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("✓ Registro Confirmado — " + eventName + " #" + confirmationId);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("[Email] Confirmation sent to {}", to);
        } catch (MessagingException e) {
            log.error("[Email] Failed to send confirmation: {}", e.getMessage());
        }
    }
}
