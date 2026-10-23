package com.athleticaos.backend.services.mail;

public class EmailLayout {

    public static final String BRAND_NAME = "AthleticaOS Rugby";

    /**
     * Renders a primary button inside a table container for email compatibility.
     */
    public static String renderButton(String href, String text) {
        return "              <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin: 0 0 8px 0;\">\n" +
                "                <tr>\n" +
                "                  <td align=\"center\">\n" +
                "                    <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse: separate;\">\n" +
                "                      <tr>\n" +
                "                        <td align=\"center\" bgcolor=\"#0047AB\" style=\"background-color: #0047AB; border-radius: 6px; padding: 12px 24px;\">\n" +
                "                          <a href=\"" + href + "\" target=\"_blank\" style=\"font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #FFFFFF; text-decoration: none; display: inline-block;\">" + text + "</a>\n" +
                "                        </td>\n" +
                "                      </tr>\n" +
                "                    </table>\n" +
                "                  </td>\n" +
                "                </tr>\n" +
                "              </table>\n";
    }

    /**
     * Wraps inner body HTML and footer in the shared email card layout.
     */
    public static String wrapHtml(String title, String preheader, String headerRightText, String innerBodyHtml, String footerHtml) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n");
        html.append("<html lang=\"en\">\n");
        html.append("<head>\n");
        html.append("  <meta charset=\"UTF-8\">\n");
        html.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        html.append("  <title>").append(title != null ? title : BRAND_NAME).append("</title>\n");
        html.append("</head>\n");
        html.append("<body style=\"margin: 0; padding: 24px 0; background-color: #F0F4F8; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;\">\n");

        if (preheader != null && !preheader.isEmpty()) {
            html.append("  <span style=\"display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;\">")
                    .append(preheader)
                    .append("</span>\n");
        }

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
        html.append("                  <td align=\"left\" style=\"font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #FFFFFF;\">").append(BRAND_NAME).append("</td>\n");
        if (headerRightText != null && !headerRightText.isEmpty()) {
            html.append("                  <td align=\"right\" style=\"font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #8CACD9;\">").append(headerRightText).append("</td>\n");
        }
        html.append("                </tr>\n");
        html.append("              </table>\n");
        html.append("            </td>\n");
        html.append("          </tr>\n");

        // Body content
        html.append("          <tr>\n");
        html.append("            <td style=\"background-color: #FFFFFF; padding: 28px 24px 24px 24px; color: #0D1B2A;\">\n");
        html.append(innerBodyHtml);
        html.append("            </td>\n");
        html.append("          </tr>\n");

        // Footer
        if (footerHtml != null && !footerHtml.isEmpty()) {
            html.append("          <tr>\n");
            html.append("            <td style=\"background-color: #F5F7FA; padding: 16px 24px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;\">\n");
            html.append("              ").append(footerHtml).append("\n");
            html.append("            </td>\n");
            html.append("          </tr>\n");
        }

        html.append("        </table>\n");
        html.append("      </td>\n");
        html.append("    </tr>\n");
        html.append("  </table>\n");
        html.append("</body>\n");
        html.append("</html>");

        return html.toString();
    }
}
