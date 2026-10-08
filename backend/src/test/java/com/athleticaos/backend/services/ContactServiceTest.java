package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.contact.ContactRequest;
import com.athleticaos.backend.entities.ContactMessage;
import com.athleticaos.backend.enums.ContactSubject;
import com.athleticaos.backend.repositories.ContactMessageRepository;
import com.athleticaos.backend.services.impl.ContactServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {

    @Mock
    private ContactMessageRepository contactMessageRepository;

    @Mock
    private JavaMailSender mailSender;

    private ContactServiceImpl contactService;

    @BeforeEach
    void setUp() {
        contactService = new ContactServiceImpl(
                contactMessageRepository,
                mailSender,
                true,
                "contact-inbox@athleticaos.local",
                "no-reply@athleticaos.com"
        );

        lenient().doAnswer(invocation -> {
            ContactMessage msg = invocation.getArgument(0);
            if (msg.getId() == null) {
                msg.setId(UUID.randomUUID());
            }
            return msg;
        }).when(contactMessageRepository).save(any(ContactMessage.class));
    }

    @Test
    @DisplayName("Stores message and sends notification email on valid submission")
    void processContactMessage_storesAndSendsEmail() {
        ContactRequest request = ContactRequest.builder()
                .name("Alice Tan\r\n")
                .email("alice@example.com\n")
                .organisation("Rugby Academy\r")
                .subject(ContactSubject.PARTNERSHIP)
                .message("We would like to partner with AthleticaOS.")
                .website(null)
                .build();

        contactService.processContactMessage(request);

        // Verify repository save called twice: first initial save, second update mailSent = true
        ArgumentCaptor<ContactMessage> messageCaptor = ArgumentCaptor.forClass(ContactMessage.class);
        verify(contactMessageRepository, times(2)).save(messageCaptor.capture());

        ContactMessage initial = messageCaptor.getAllValues().get(0);
        assertThat(initial.getName()).isEqualTo("Alice Tan");
        assertThat(initial.getEmail()).isEqualTo("alice@example.com");
        assertThat(initial.getOrganisation()).isEqualTo("Rugby Academy");
        assertThat(initial.getSubject()).isEqualTo(ContactSubject.PARTNERSHIP);
        assertThat(initial.getStatus()).isEqualTo("NEW");

        ContactMessage updated = messageCaptor.getAllValues().get(1);
        assertThat(updated.getMailSent()).isTrue();

        // Verify email sent with CRLF stripped from headers
        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mailCaptor.capture());

        SimpleMailMessage sentMail = mailCaptor.getValue();
        assertThat(sentMail.getTo()).containsExactly("contact-inbox@athleticaos.local");
        assertThat(sentMail.getFrom()).isEqualTo("no-reply@athleticaos.com");
        assertThat(sentMail.getReplyTo()).isEqualTo("alice@example.com");
        assertThat(sentMail.getSubject()).isEqualTo("[AthleticaOS] Partnership \u2013 Alice Tan");
        assertThat(sentMail.getText()).contains("We would like to partner with AthleticaOS.");
        assertThat(sentMail.getText()).contains(initial.getId().toString());
    }

    @Test
    @DisplayName("Honeypot non-empty returns success without storing or sending")
    void processContactMessage_honeypotNonEmpty_skipsStoreAndSend() {
        ContactRequest request = ContactRequest.builder()
                .name("Bot User")
                .email("bot@spam.com")
                .subject(ContactSubject.GENERAL)
                .message("This is automated spam.")
                .website("https://spam-link.com")
                .build();

        contactService.processContactMessage(request);

        verify(contactMessageRepository, never()).save(any());
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Mail failure is swallowed, logged, and does not fail the request")
    void processContactMessage_mailFailure_stillSucceeds() {
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        ContactRequest request = ContactRequest.builder()
                .name("Bob Lee")
                .email("bob@example.com")
                .subject(ContactSubject.ORGANISATION_REGISTRATION)
                .message("Registering our rugby club.")
                .build();

        assertThatCode(() -> contactService.processContactMessage(request))
                .doesNotThrowAnyException();

        // Saved once, mailSent remains false
        ArgumentCaptor<ContactMessage> messageCaptor = ArgumentCaptor.forClass(ContactMessage.class);
        verify(contactMessageRepository, times(1)).save(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getMailSent()).isFalse();
    }

    @Test
    @DisplayName("When mail-enabled is false, stores message but does not send email")
    void processContactMessage_mailDisabled_storesWithoutSending() {
        ContactServiceImpl disabledMailService = new ContactServiceImpl(
                contactMessageRepository,
                mailSender,
                false,
                "contact-inbox@athleticaos.local",
                "no-reply@athleticaos.com"
        );

        ContactRequest request = ContactRequest.builder()
                .name("Charlie")
                .email("charlie@example.com")
                .subject(ContactSubject.MEDIA)
                .message("Press media enquiry for upcoming match.")
                .build();

        disabledMailService.processContactMessage(request);

        verify(contactMessageRepository, times(1)).save(any());
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }
}
