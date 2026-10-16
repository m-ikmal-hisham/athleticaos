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

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n");
        html.append("<html lang=\"en\">\n");
        html.append("<head>\n");
        html.append("  <meta charset=\"UTF-8\">\n");
        html.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        html.append("  <title>New enquiry</title>\n");
        html.append("</head>\n");
        html.append("<body style=\"margin: 0; padding: 24px 0; background-color: #F0F4F8; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;\">\n");

        // Hidden preheader
        html.append("  <span style=\"display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;\">")
                .append(escPreheader)
                .append("</span>\n");

        // Outer container
        html.append("  <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color: #F0F4F8; margin: 0; padding: 0;\">\n");
        html.append("    <tr>\n");
        html.append("      <td align=\"center\" style=\"padding: 0 12px;\">\n");

        // Email card (560px max width)
        html.append("        <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-collapse: separate; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);\">\n");

        // Header bar
        html.append("          <tr>\n");
        html.append("            <td style=\"background-color: #0D1B2A; padding: 16px 24px;\">\n");
        html.append("              <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n");
        html.append("                <tr>\n");
        html.append("                  <td align=\"left\" style=\"font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #FFFFFF;\">AthleticaOS</td>\n");
        html.append("                  <td align=\"right\" style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #8CACD9;\">New enquiry</td>\n");
        html.append("                </tr>\n");
        html.append("              </table>\n");
        html.append("            </td>\n");
        html.append("          </tr>\n");

        // Body content
        html.append("          <tr>\n");
        html.append("            <td style=\"background-color: #FFFFFF; padding: 28px 24px 24px 24px; color: #0D1B2A;\">\n");

        // a. Subject pill
        html.append("              <div style=\"margin: 0 0 12px 0;\">\n");
        html.append("                <span style=\"display: inline-block; background-color: #E6EDF7; color: #0047AB; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 12px;\">")
                .append(escSubject)
                .append("</span>\n");
        html.append("              </div>\n");

        // b. Heading
        html.append("              <h1 style=\"font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #0D1B2A; margin: 0 0 6px 0; padding: 0;\">")
                .append(escName)
                .append(" sent you a message</h1>\n");

        // c. Received time
        html.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; margin: 0 0 20px 0; padding: 0;\">")
                .append(receivedTime)
                .append("</p>\n");

        // d. The message
        html.append("              <div style=\"border-left: 3px solid #0047AB; background-color: #F8FAFC; padding: 14px 18px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #0D1B2A; margin: 0 0 24px 0;\">\n");
        html.append("                ").append(formattedMsg).append("\n");
        html.append("              </div>\n");

        // e. Details table
        html.append("              <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse: collapse; margin: 0 0 28px 0;\">\n");
        html.append("                <tr>\n");
        html.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; padding: 10px 0; border-top: 1px solid #E5E7EB; width: 110px; font-weight: 500;\">Name</td>\n");
        html.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #0D1B2A; padding: 10px 0; border-top: 1px solid #E5E7EB; font-weight: 600;\">").append(escName).append("</td>\n");
        html.append("                </tr>\n");
        html.append("                <tr>\n");
        html.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; padding: 10px 0; border-top: 1px solid #E5E7EB; width: 110px; font-weight: 500;\">Email</td>\n");
        html.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #0D1B2A; padding: 10px 0; border-top: 1px solid #E5E7EB;\"><a href=\"mailto:").append(escEmail).append("\" style=\"color: #0047AB; text-decoration: none;\">").append(escEmail).append("</a></td>\n");
        html.append("                </tr>\n");
        if (!rawOrg.isEmpty()) {
            html.append("                <tr>\n");
            html.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; padding: 10px 0; border-top: 1px solid #E5E7EB; width: 110px; font-weight: 500;\">Organisation</td>\n");
            html.append("                  <td style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #0D1B2A; padding: 10px 0; border-top: 1px solid #E5E7EB;\">").append(escOrg).append("</td>\n");
            html.append("                </tr>\n");
        }
        html.append("              </table>\n");

        // f. Button & helper text
        html.append("              <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin: 0 0 8px 0;\">\n");
        html.append("                <tr>\n");
        html.append("                  <td align=\"center\">\n");
        html.append("                    <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse: separate;\">\n");
        html.append("                      <tr>\n");
        html.append("                        <td align=\"center\" bgcolor=\"#0047AB\" style=\"background-color: #0047AB; border-radius: 6px; padding: 12px 24px;\">\n");
        html.append("                          <a href=\"").append(mailtoHref).append("\" target=\"_blank\" style=\"font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #FFFFFF; text-decoration: none; display: inline-block;\">Reply to ").append(escName).append("</a>\n");
        html.append("                        </td>\n");
        html.append("                      </tr>\n");
        html.append("                    </table>\n");
        html.append("                  </td>\n");
        html.append("                </tr>\n");
        html.append("              </table>\n");
        html.append("              <p style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; text-align: center; margin: 0 0 16px 0; padding: 0;\">Or press Reply \u2014 it goes straight to ").append(escEmail).append(".</p>\n");

        html.append("            </td>\n");
        html.append("          </tr>\n");

        // Footer
        html.append("          <tr>\n");
        html.append("            <td style=\"background-color: #F5F7FA; padding: 16px 24px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;\">\n");
        html.append("              Sent from the contact form on www.athleticaos.com · Ref ").append(shortId).append("\n");
        html.append("            </td>\n");
        html.append("          </tr>\n");

        html.append("        </table>\n");
        html.append("      </td>\n");
        html.append("    </tr>\n");
        html.append("  </table>\n");
        html.append("</body>\n");
        html.append("</html>");

        return html.toString();
    }

    private static String stripHeaderLineBreaks(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\r\\n]", "").trim();
    }
}
