package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.contact.ContactRequest;
import com.athleticaos.backend.entities.ContactMessage;
import com.athleticaos.backend.repositories.ContactMessageRepository;
import com.athleticaos.backend.services.ContactService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class ContactServiceImpl implements ContactService {

    private final ContactMessageRepository contactMessageRepository;
    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String recipient;
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
        this.recipient = recipient != null ? recipient.trim() : "";
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
        if (mailEnabled && !recipient.isEmpty()) {
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
            String cleanRecipient = stripHeaderLineBreaks(recipient);
            String cleanFrom = stripHeaderLineBreaks(fromAddress);
            String subjectLabel = stripHeaderLineBreaks(message.getSubject().getLabel());

            // Subject format: "[AthleticaOS] <subject label> – <name>"
            String emailSubject = "[AthleticaOS] " + subjectLabel + " \u2013 " + cleanName;

            StringBuilder body = new StringBuilder();
            body.append("New contact form submission received:\n\n");
            body.append("Message ID: ").append(message.getId()).append("\n");
            body.append("Name: ").append(message.getName()).append("\n");
            body.append("Email: ").append(message.getEmail()).append("\n");
            body.append("Organisation: ")
                    .append(message.getOrganisation() != null ? message.getOrganisation() : "\u2014")
                    .append("\n");
            body.append("Subject: ").append(message.getSubject().getLabel()).append("\n\n");
            body.append("Message:\n").append(message.getMessage()).append("\n");

            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(cleanRecipient);
            mailMessage.setFrom(cleanFrom);
            mailMessage.setReplyTo(cleanEmail);
            mailMessage.setSubject(emailSubject);
            mailMessage.setText(body.toString());

            mailSender.send(mailMessage);

            message.setMailSent(true);
            contactMessageRepository.save(message);
        } catch (Exception ex) {
            // Mail failure must be logged (without the message body or email address) and must not fail the request
            log.error("Failed to send contact notification email for message id {}: {}", message.getId(), ex.getMessage());
        }
    }

    private String stripHeaderLineBreaks(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\r\\n]", "").trim();
    }
}
