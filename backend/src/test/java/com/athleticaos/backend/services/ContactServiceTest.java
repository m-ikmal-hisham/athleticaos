package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.contact.ContactRequest;
import com.athleticaos.backend.entities.ContactMessage;
import com.athleticaos.backend.enums.ContactSubject;
import com.athleticaos.backend.repositories.ContactMessageRepository;
import com.athleticaos.backend.services.impl.ContactServiceImpl;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
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
                "AthleticaOS <no-reply@athleticaos.com>"
        );

        lenient().when(mailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage((Session) null));

        lenient().doAnswer(invocation -> {
            ContactMessage msg = invocation.getArgument(0);
            if (msg.getId() == null) {
                msg.setId(UUID.randomUUID());
            }
            return msg;
        }).when(contactMessageRepository).save(any(ContactMessage.class));
    }

    @Test
    @DisplayName("Stores message and sends multipart notification email on valid submission")
    void processContactMessage_storesAndSendsEmail() throws Exception {
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

        // Verify MimeMessage sent
        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mailCaptor.capture());

        MimeMessage sentMail = mailCaptor.getValue();

        // Recipients
        assertThat(sentMail.getAllRecipients()).hasSize(1);
        assertThat(sentMail.getAllRecipients()[0].toString()).isEqualTo("contact-inbox@athleticaos.local");

        // From with display name
        assertThat(sentMail.getFrom()).hasSize(1);
        InternetAddress from = (InternetAddress) sentMail.getFrom()[0];
        assertThat(from.getAddress()).isEqualTo("no-reply@athleticaos.com");
        assertThat(from.getPersonal()).isEqualTo("AthleticaOS");

        // Reply-To with visitor name and email
        assertThat(sentMail.getReplyTo()).hasSize(1);
        InternetAddress replyTo = (InternetAddress) sentMail.getReplyTo()[0];
        assertThat(replyTo.getAddress()).isEqualTo("alice@example.com");
        assertThat(replyTo.getPersonal()).isEqualTo("Alice Tan");

        // Subject
        assertThat(sentMail.getSubject()).isEqualTo("New enquiry · Partnership · Alice Tan");

        // Multipart content (text/plain and text/html)
        sentMail.saveChanges();
        assertThat(sentMail.getContent()).isInstanceOf(Multipart.class);
        Multipart rootMultipart = (Multipart) sentMail.getContent();

        java.util.Map<String, String> bodyParts = new java.util.HashMap<>();
        extractBodyParts(rootMultipart, bodyParts);

        assertThat(bodyParts).containsKey("text/plain");
        assertThat(bodyParts).containsKey("text/html");

        String plainText = bodyParts.get("text/plain");
        assertThat(plainText).contains("Alice Tan sent you a message (Partnership)");
        assertThat(plainText).contains("We would like to partner with AthleticaOS.");
        assertThat(plainText).contains("Email: alice@example.com");
        assertThat(plainText).contains("Organisation: Rugby Academy");
        assertThat(plainText).contains(initial.getId().toString());

        String htmlText = bodyParts.get("text/html");
        assertThat(htmlText).contains("Alice Tan sent you a message");
        assertThat(htmlText).contains("We would like to partner with AthleticaOS.");
        assertThat(htmlText).contains("Rugby Academy");
    }

    private void extractBodyParts(Multipart multipart, java.util.Map<String, String> bodyParts) throws Exception {
        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart part = multipart.getBodyPart(i);
            if (part.getContent() instanceof Multipart nested) {
                extractBodyParts(nested, bodyParts);
            } else if (part.isMimeType("text/html")) {
                bodyParts.put("text/html", (String) part.getContent());
            } else if (part.isMimeType("text/plain")) {
                bodyParts.put("text/plain", (String) part.getContent());
            }
        }
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
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Mail failure is swallowed, logged, and does not fail the request")
    void processContactMessage_mailFailure_stillSucceeds() {
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(MimeMessage.class));

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
                "AthleticaOS <no-reply@athleticaos.com>"
        );

        ContactRequest request = ContactRequest.builder()
                .name("Charlie")
                .email("charlie@example.com")
                .subject(ContactSubject.MEDIA)
                .message("Press media enquiry for upcoming match.")
                .build();

        disabledMailService.processContactMessage(request);

        verify(contactMessageRepository, times(1)).save(any());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Sends one notification to every configured recipient (comma or semicolon separated)")
    void processContactMessage_multipleRecipients_sendsToAll() throws Exception {
        ContactServiceImpl multiRecipientService = new ContactServiceImpl(
                contactMessageRepository,
                mailSender,
                true,
                " contact@athleticaos.local, owner@example.com ; ,contact@athleticaos.local ",
                "AthleticaOS <no-reply@athleticaos.com>"
        );

        ContactRequest request = ContactRequest.builder()
                .name("Dana")
                .email("dana@example.com")
                .subject(ContactSubject.PARTNERSHIP)
                .message("Two people should receive this.")
                .build();

        multiRecipientService.processContactMessage(request);

        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(1)).send(mailCaptor.capture());
        MimeMessage sentMail = mailCaptor.getValue();
        assertThat(java.util.Arrays.stream(sentMail.getAllRecipients()).map(Object::toString).toList())
                .containsExactly("contact@athleticaos.local", "owner@example.com");
    }

    @Test
    @DisplayName("Blank recipient list stores the message without sending")
    void processContactMessage_blankRecipients_storesWithoutSending() {
        ContactServiceImpl noRecipientService = new ContactServiceImpl(
                contactMessageRepository,
                mailSender,
                true,
                " , ; ",
                "AthleticaOS <no-reply@athleticaos.com>"
        );

        ContactRequest request = ContactRequest.builder()
                .name("Eve")
                .email("eve@example.com")
                .subject(ContactSubject.MEDIA)
                .message("Nobody configured to receive this.")
                .build();

        noRecipientService.processContactMessage(request);

        verify(contactMessageRepository, times(1)).save(any());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }
}
