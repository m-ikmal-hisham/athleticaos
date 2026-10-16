package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.contact.ContactRequest;
import com.athleticaos.backend.entities.ContactMessage;
import com.athleticaos.backend.repositories.ContactMessageRepository;
import com.athleticaos.backend.services.ContactService;
import com.athleticaos.backend.services.mail.ContactEmailRenderer;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Slf4j
@Service
public class ContactServiceImpl implements ContactService {

    private final ContactMessageRepository contactMessageRepository;
    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final java.util.List<String> recipients;
    private final String fromAddress;

    public ContactServiceImpl(
            ContactMessageRepository contactMessageRepository,
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${app.contact.mail-enabled:false}") boolean mailEnabled,
            @Value("${app.contact.recipient:}") String recipient,
            @Value("${app.contact.from:no-reply@athleticaos.com}") String fromAddress) {
        this.contactMessageRepository = contactMessageRepository;
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.recipients = parseRecipients(recipient);
        this.fromAddress = fromAddress != null ? fromAddress.trim() : "no-reply@athleticaos.com";
    }

    @Override
    @Transactional
    public void processContactMessage(ContactRequest request) {
        // Honeypot check: if non-empty, return success without storing or sending
        if (request.getWebsite() != null && !request.getWebsite().trim().isEmpty()) {
            log.debug("Honeypot field populated; dropping submission silently");
            return;
        }

        // Save to database
        ContactMessage message = ContactMessage.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim())
                .organisation(request.getOrganisation() != null && !request.getOrganisation().trim().isEmpty()
                        ? request.getOrganisation().trim()
                        : null)
                .subject(request.getSubject())
                .message(request.getMessage().trim())
                .status("NEW")
                .mailSent(false)
                .build();

        message = contactMessageRepository.save(message);

        // Send email if mail is enabled and recipient is configured
        if (mailEnabled && !recipients.isEmpty()) {
            sendNotificationEmail(message);
        }
    }

    private void sendNotificationEmail(ContactMessage message) {
        if (mailSender == null) {
            log.warn("Contact email dispatch enabled but JavaMailSender bean is not configured.");
            return;
        }

        try {
            String cleanName = stripHeaderLineBreaks(message.getName());
            String cleanEmail = stripHeaderLineBreaks(message.getEmail());
            String cleanFrom = stripHeaderLineBreaks(fromAddress);

            ZonedDateTime receivedAt = ZonedDateTime.now(ZoneId.of("Asia/Kuala_Lumpur"));
            ContactEmailRenderer.RenderResult rendered = ContactEmailRenderer.render(message, receivedAt);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

            String[] toAddresses = recipients.stream()
                    .map(this::stripHeaderLineBreaks)
                    .filter(s -> !s.isEmpty())
                    .toArray(String[]::new);

            helper.setTo(toAddresses);

            InternetAddress[] fromParsed = InternetAddress.parse(cleanFrom);
            if (fromParsed != null && fromParsed.length > 0) {
                helper.setFrom(fromParsed[0]);
            } else {
                helper.setFrom(cleanFrom);
            }

            if (cleanName.isEmpty()) {
                helper.setReplyTo(new InternetAddress(cleanEmail));
            } else {
                helper.setReplyTo(new InternetAddress(cleanEmail, cleanName, StandardCharsets.UTF_8.name()));
            }

            helper.setSubject(rendered.subject());
            helper.setText(rendered.plainText(), rendered.html());

            mailSender.send(mimeMessage);

            message.setMailSent(true);
            contactMessageRepository.save(message);
        } catch (Exception ex) {
            // Mail failure must be logged (without the message body or email address) and must not fail the request
            log.error("Failed to send contact notification email for message id {}: {}", message.getId(), ex.getMessage());
        }
    }

    /**
     * app.contact.recipient may list several addresses separated by commas or semicolons
     * (e.g. the shared contact@ alias and an owner's address). Blank entries are ignored.
     */
    static java.util.List<String> parseRecipients(String value) {
        if (value == null || value.isBlank()) {
            return java.util.List.of();
        }
        return java.util.Arrays.stream(value.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
    }

    private String stripHeaderLineBreaks(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\r\\n]", "").trim();
    }
}
