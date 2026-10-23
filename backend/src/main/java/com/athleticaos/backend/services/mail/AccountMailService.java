package com.athleticaos.backend.services.mail;

import com.athleticaos.backend.entities.User;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
public class AccountMailService {

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String fromAddress;
    private final String appUrl;
    private final List<String> allowedRecipients;

    public AccountMailService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${app.accounts.mail-enabled:false}") boolean mailEnabled,
            @Value("${app.accounts.from:no-reply@athleticaos.com}") String fromAddress,
            @Value("${app.accounts.app-url:http://localhost:5173}") String appUrl,
            @Value("${app.accounts.allowed-recipients:}") String allowedRecipientsRaw) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress != null ? fromAddress.trim() : "no-reply@athleticaos.com";
        this.appUrl = cleanAppUrl(appUrl);
        this.allowedRecipients = parseAllowedRecipients(allowedRecipientsRaw);
    }

    public boolean isMailEnabled() {
        return mailEnabled && mailSender != null;
    }

    /**
     * Sends an invite email.
     * Returns true if sent, false if disabled, missing mail sender, skipped by allow-list, or sending failed.
     */
    public boolean sendInviteEmail(User recipient, String rawToken, User invitedBy) {
        if (!mailEnabled || mailSender == null) {
            return false;
        }

        String email = recipient.getEmail();
        if (!isRecipientAllowed(email)) {
            log.info("account email skipped (not on allow-list): {}", maskEmail(email));
            return false;
        }

        try {
            String subject = "You're invited to " + EmailLayout.BRAND_NAME;
            String acceptUrl = appUrl + "/accept-invite?token=" + rawToken;

            String firstName = recipient.getFirstName() != null ? recipient.getFirstName().trim() : "there";
            String inviterName = invitedBy != null ? ((invitedBy.getFirstName() != null ? invitedBy.getFirstName() : "") + " " +
                    (invitedBy.getLastName() != null ? invitedBy.getLastName() : "")).trim() : "";
            // The organisation the new user JOINS is their own (recipient's) organisation; the inviter's
            // organisation is only shown next to the inviter's name, e.g. "Super Admin (Malaysia Rugby)".
            String orgName = recipient.getOrganisation() != null && recipient.getOrganisation().getName() != null
                    ? recipient.getOrganisation().getName()
                    : "";
            String inviterOrgName = (invitedBy != null && invitedBy.getOrganisation() != null
                    && invitedBy.getOrganisation().getName() != null)
                    ? invitedBy.getOrganisation().getName()
                    : "";
            String inviterLabel = (inviterName.isEmpty() ? "An administrator" : inviterName)
                    + (inviterOrgName.isEmpty() || inviterOrgName.equals(orgName) ? "" : " (" + inviterOrgName + ")");

            String escFirstName = HtmlUtils.htmlEscape(firstName);
            String escInviter = HtmlUtils.htmlEscape(inviterLabel);
            String escOrg = HtmlUtils.htmlEscape(orgName.isEmpty() ? "your organisation" : orgName);

            // Plain text
            StringBuilder plain = new StringBuilder();
            plain.append("Hi ").append(firstName).append(",\n\n");
            plain.append(inviterLabel)
                    .append(" has invited you to join ")
                    .append(orgName.isEmpty() ? "your organisation" : orgName)
                    .append(" on ").append(EmailLayout.BRAND_NAME).append(".\n\n");
            plain.append("Set your password to accept this invitation:\n");
            plain.append(acceptUrl).append("\n\n");
            plain.append("This link is valid for 72 hours.\n\n");
            plain.append("If you didn't expect this, ignore this email.\n");

            // HTML inner body
            StringBuilder htmlBody = new StringBuilder();
            htmlBody.append("              <h1 style=\"font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #0D1B2A; margin: 0 0 16px 0; padding: 0;\">")
                    .append("Hi ").append(escFirstName).append(",</h1>\n");
            htmlBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #0D1B2A; margin: 0 0 20px 0;\">")
                    .append("<strong>").append(escInviter).append("</strong> has invited you to join <strong>").append(escOrg).append("</strong> on ").append(EmailLayout.BRAND_NAME).append(".</p>\n");
            htmlBody.append(EmailLayout.renderButton(acceptUrl, "Accept invitation"));
            htmlBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; text-align: center; margin: 12px 0 20px 0;\">This link is valid for 72 hours.</p>\n");
            htmlBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; margin: 24px 0 0 0;\">If you didn't expect this, ignore this email.</p>\n");

            String footer = "Sent by " + EmailLayout.BRAND_NAME;
            String fullHtml = EmailLayout.wrapHtml(subject, "You're invited to join " + EmailLayout.BRAND_NAME, "Invitation", htmlBody.toString(), footer);

            sendMimeMessage(email, subject, plain.toString(), fullHtml);
            return true;
        } catch (Exception ex) {
            log.warn("Failed to send invite email to recipient {}: {}", maskEmail(email), ex.getClass().getSimpleName());
            return false;
        }
    }

    /**
     * Sends a password reset email.
     * Returns true if sent, false if disabled, missing mail sender, skipped by allow-list, or sending failed.
     */
    public boolean sendPasswordResetEmail(User recipient, String rawToken) {
        if (!mailEnabled || mailSender == null) {
            return false;
        }

        String email = recipient.getEmail();
        if (!isRecipientAllowed(email)) {
            log.info("account email skipped (not on allow-list): {}", maskEmail(email));
            return false;
        }

        try {
            String subject = "Reset your " + EmailLayout.BRAND_NAME + " password";
            String resetUrl = appUrl + "/reset-password?token=" + rawToken;

            String firstName = recipient.getFirstName() != null ? recipient.getFirstName().trim() : "there";
            String escFirstName = HtmlUtils.htmlEscape(firstName);

            // Plain text
            StringBuilder plain = new StringBuilder();
            plain.append("Hi ").append(firstName).append(",\n\n");
            plain.append("We received a request to reset your password for ").append(EmailLayout.BRAND_NAME).append(".\n\n");
            plain.append("Reset your password using the link below:\n");
            plain.append(resetUrl).append("\n\n");
            plain.append("This link is valid for 60 minutes.\n\n");
            plain.append("If you didn't expect this, ignore this email.\n");

            // HTML inner body
            StringBuilder htmlBody = new StringBuilder();
            htmlBody.append("              <h1 style=\"font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #0D1B2A; margin: 0 0 16px 0; padding: 0;\">")
                    .append("Hi ").append(escFirstName).append(",</h1>\n");
            htmlBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #0D1B2A; margin: 0 0 20px 0;\">")
                    .append("We received a request to reset your password for ").append(EmailLayout.BRAND_NAME).append(".</p>\n");
            htmlBody.append(EmailLayout.renderButton(resetUrl, "Reset password"));
            htmlBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; text-align: center; margin: 12px 0 20px 0;\">This link is valid for 60 minutes.</p>\n");
            htmlBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; margin: 24px 0 0 0;\">If you didn't expect this, ignore this email.</p>\n");

            String footer = "Sent by " + EmailLayout.BRAND_NAME;
            String fullHtml = EmailLayout.wrapHtml(subject, "Password reset request for " + EmailLayout.BRAND_NAME, "Password reset", htmlBody.toString(), footer);

            sendMimeMessage(email, subject, plain.toString(), fullHtml);
            return true;
        } catch (Exception ex) {
            log.warn("Failed to send password reset email to recipient {}: {}", maskEmail(email), ex.getClass().getSimpleName());
            return false;
        }
    }

    private void sendMimeMessage(String recipientEmail, String subject, String plainText, String htmlText) throws Exception {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

        helper.setTo(recipientEmail);

        String cleanFrom = stripHeaderLineBreaks(fromAddress);
        InternetAddress[] fromParsed = InternetAddress.parse(cleanFrom);
        if (fromParsed != null && fromParsed.length > 0) {
            helper.setFrom(fromParsed[0]);
        } else {
            helper.setFrom(cleanFrom);
        }

        helper.setSubject(stripHeaderLineBreaks(subject));
        helper.setText(plainText, htmlText);

        mailSender.send(mimeMessage);
    }

    public boolean isRecipientAllowed(String email) {
        if (allowedRecipients.isEmpty()) {
            return true;
        }
        if (email == null || email.isBlank()) {
            return false;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        for (String rule : allowedRecipients) {
            if (rule.startsWith("@")) {
                if (normalizedEmail.endsWith(rule)) {
                    return true;
                }
            } else if (normalizedEmail.equals(rule)) {
                return true;
            }
        }
        return false;
    }

    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "***";
        }
        String trimmed = email.trim();
        int atIndex = trimmed.indexOf('@');
        if (atIndex <= 0 || atIndex == trimmed.length() - 1) {
            return "***";
        }
        String localPart = trimmed.substring(0, atIndex);
        String domain = trimmed.substring(atIndex + 1);
        char firstChar = localPart.charAt(0);
        return firstChar + "***@" + domain;
    }

    static List<String> parseAllowedRecipients(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private static String cleanAppUrl(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:5173";
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private static String stripHeaderLineBreaks(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\r\\n]", "").trim();
    }
}
