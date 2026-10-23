package com.athleticaos.backend.services.mail;

import com.athleticaos.backend.entities.ContactMessage;
import org.springframework.web.util.HtmlUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class ContactEmailRenderer {

    public static final ZoneId MALAYSIA_ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("EEE, d MMM yyyy · h:mm a", Locale.ENGLISH);

    public record RenderResult(String subject, String plainText, String html) {}

    public static RenderResult render(ContactMessage message, ZonedDateTime receivedAt) {
        String subject = renderSubject(message);
        String plainText = renderPlainText(message, receivedAt);
        String html = renderHtml(message, receivedAt);
        return new RenderResult(subject, plainText, html);
    }

    public static String renderSubject(ContactMessage message) {
        String label = message.getSubject() != null ? message.getSubject().getLabel() : "Enquiry";
        String cleanLabel = stripHeaderLineBreaks(label);
        String cleanName = stripHeaderLineBreaks(message.getName() != null ? message.getName() : "");
        String trimmedName = trimName(cleanName, 60);
        return "New enquiry · " + cleanLabel + " · " + trimmedName;
    }

    public static String formatReceivedTime(ZonedDateTime receivedAt) {
        ZonedDateTime myTime = (receivedAt != null ? receivedAt : ZonedDateTime.now(MALAYSIA_ZONE))
                .withZoneSameInstant(MALAYSIA_ZONE);
        return DATE_FORMATTER.format(myTime) + " (Malaysia time)";
    }

    public static String trimName(String name, int maxLength) {
        if (name == null) {
            return "";
        }
        String trimmed = name.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength) + "…";
    }

    private static String getShortId(ContactMessage message) {
        if (message == null || message.getId() == null) {
            return "UNKNOWN";
        }
        String idStr = message.getId().toString().replace("-", "");
        return (idStr.length() >= 8 ? idStr.substring(0, 8) : idStr).toUpperCase(Locale.ROOT);
    }

    public static String renderPlainText(ContactMessage message, ZonedDateTime receivedAt) {
        String name = message.getName() != null ? message.getName().trim() : "";
        String subjectLabel = message.getSubject() != null ? message.getSubject().getLabel() : "";
        String receivedTime = formatReceivedTime(receivedAt);
        String msgContent = message.getMessage() != null ? message.getMessage().trim() : "";
        String email = message.getEmail() != null ? message.getEmail().trim() : "";
        String org = message.getOrganisation() != null ? message.getOrganisation().trim() : "";
        String shortId = getShortId(message);
        String fullId = message.getId() != null ? message.getId().toString() : "unknown";

        StringBuilder sb = new StringBuilder();
        sb.append(name).append(" sent you a message (").append(subjectLabel).append(")\n");
        sb.append(receivedTime).append("\n\n");
        sb.append(msgContent).append("\n\n");
        sb.append("Email: ").append(email).append("\n");
        if (!org.isEmpty()) {
            sb.append("Organisation: ").append(org).append("\n");
        }
        sb.append("\nReply to this email to answer them.\n");
        sb.append("Ref ").append(shortId).append(" · full id ").append(fullId).append("\n");

        return sb.toString();
    }

    public static String renderHtml(ContactMessage message, ZonedDateTime receivedAt) {
        String rawName = message.getName() != null ? message.getName().trim() : "";
        String rawEmail = message.getEmail() != null ? message.getEmail().trim() : "";
        String rawOrg = message.getOrganisation() != null ? message.getOrganisation().trim() : "";
        String rawSubject = message.getSubject() != null ? message.getSubject().getLabel() : "Enquiry";
        String rawMsg = message.getMessage() != null ? message.getMessage().trim() : "";

        String escName = HtmlUtils.htmlEscape(rawName);
        String escEmail = HtmlUtils.htmlEscape(rawEmail);
        String escOrg = HtmlUtils.htmlEscape(rawOrg);
        String escSubject = HtmlUtils.htmlEscape(rawSubject);

        // Preheader: first 90 characters of the message
        String preheaderText = rawMsg.length() > 90 ? rawMsg.substring(0, 90) : rawMsg;
        String escPreheader = HtmlUtils.htmlEscape(preheaderText);

        // Message body with HTML escaping and newlines to <br>
        String escapedMsg = HtmlUtils.htmlEscape(rawMsg);
        String formattedMsg = escapedMsg
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .replace("\n", "<br>");

        String receivedTime = HtmlUtils.htmlEscape(formatReceivedTime(receivedAt));
        String shortId = getShortId(message);

        // URL encoded subject for mailto CTA
        String mailtoSubject = "Re: " + rawSubject;
        String encodedSubject = URLEncoder.encode(mailtoSubject, StandardCharsets.UTF_8).replace("+", "%20");
        String mailtoHref = "mailto:" + escEmail + "?subject=" + encodedSubject;

        StringBuilder innerBody = new StringBuilder();
        // a. Subject pill
        innerBody.append("              <div style=\"margin: 0 0 12px 0;\">\n");
        innerBody.append("                <span style=\"display: inline-block; background-color: #E6EDF7; color: #0047AB; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 12px;\">")
                .append(escSubject)
                .append("</span>\n");
        innerBody.append("              </div>\n");

        // b. Heading
        innerBody.append("              <h1 style=\"font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #0D1B2A; margin: 0 0 6px 0; padding: 0;\">")
                .append(escName)
                .append(" sent you a message</h1>\n");

        // c. Received time
        innerBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; margin: 0 0 20px 0; padding: 0;\">")
                .append(receivedTime)
                .append("</p>\n");

        // d. The message
        innerBody.append("              <div style=\"border-left: 3px solid #0047AB; background-color: #F8FAFC; padding: 14px 18px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #0D1B2A; margin: 0 0 24px 0;\">\n");
        innerBody.append("                ").append(formattedMsg).append("\n");
        innerBody.append("              </div>\n");

        // e. Details table
        innerBody.append("              <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse: collapse; margin: 0 0 28px 0;\">\n");
        innerBody.append("                <tr>\n");
        innerBody.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; padding: 10px 0; border-top: 1px solid #E5E7EB; width: 110px; font-weight: 500;\">Name</td>\n");
        innerBody.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #0D1B2A; padding: 10px 0; border-top: 1px solid #E5E7EB; font-weight: 600;\">").append(escName).append("</td>\n");
        innerBody.append("                </tr>\n");
        innerBody.append("                <tr>\n");
        innerBody.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; padding: 10px 0; border-top: 1px solid #E5E7EB; width: 110px; font-weight: 500;\">Email</td>\n");
        innerBody.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #0D1B2A; padding: 10px 0; border-top: 1px solid #E5E7EB;\"><a href=\"mailto:").append(escEmail).append("\" style=\"color: #0047AB; text-decoration: none;\">").append(escEmail).append("</a></td>\n");
        innerBody.append("                </tr>\n");
        if (!rawOrg.isEmpty()) {
            innerBody.append("                <tr>\n");
            innerBody.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; padding: 10px 0; border-top: 1px solid #E5E7EB; width: 110px; font-weight: 500;\">Organisation</td>\n");
            innerBody.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #0D1B2A; padding: 10px 0; border-top: 1px solid #E5E7EB;\">").append(escOrg).append("</td>\n");
            innerBody.append("                </tr>\n");
        }
        innerBody.append("              </table>\n");

        // f. Button & helper text
        innerBody.append(EmailLayout.renderButton(mailtoHref, "Reply to " + escName));
        innerBody.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; text-align: center; margin: 0 0 16px 0; padding: 0;\">Or press Reply \u2014 it goes straight to ").append(escEmail).append(".</p>\n");

        String footer = "Sent from the contact form on www.athleticaos.com · Ref " + shortId;

        return EmailLayout.wrapHtml("New enquiry", escPreheader, "New enquiry", innerBody.toString(), footer);
    }

    private static String stripHeaderLineBreaks(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\r\\n]", "").trim();
    }
}
