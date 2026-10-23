package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.services.mail.AccountMailService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class AccountMailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private AccountMailService mailService;
    private User invitedUser;
    private User inviterUser;

    @BeforeEach
    void setUp() {
        mailService = new AccountMailService(
                mailSender,
                true,
                "no-reply@athleticaos.com",
                "http://localhost:5173",
                "allowed@example.com,@athleticaos.com"
        );

        Organisation org = Organisation.builder().id(UUID.randomUUID()).name("Crusaders RFC").build();

        invitedUser = User.builder()
                .id(UUID.randomUUID())
                .email("allowed@example.com")
                .firstName("John")
                .lastName("Doe")
                .organisation(org)
                .build();

        inviterUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@athleticaos.com")
                .firstName("Super")
                .lastName("Admin")
                .build();
    }

    @Test
    @DisplayName("isMailEnabled returns true only when mailEnabled is true and mailSender is present")
    void isMailEnabled() {
        assertThat(mailService.isMailEnabled()).isTrue();

        AccountMailService disabledService = new AccountMailService(
                mailSender, false, "no-reply@athleticaos.com", "http://localhost:5173", ""
        );
        assertThat(disabledService.isMailEnabled()).isFalse();

        AccountMailService nullSenderService = new AccountMailService(
                null, true, "no-reply@athleticaos.com", "http://localhost:5173", ""
        );
        assertThat(nullSenderService.isMailEnabled()).isFalse();
    }

    @Test
    @DisplayName("maskEmail masks local part preserving first char and domain")
    void maskEmailFormatting() {
        assertThat(AccountMailService.maskEmail("johndoe@example.com")).isEqualTo("j***@example.com");
        assertThat(AccountMailService.maskEmail("ab@example.com")).isEqualTo("a***@example.com");
        assertThat(AccountMailService.maskEmail("a@example.com")).isEqualTo("a***@example.com");
        assertThat(AccountMailService.maskEmail("invalid-email")).isEqualTo("***");
        assertThat(AccountMailService.maskEmail(null)).isEqualTo("***");
        assertThat(AccountMailService.maskEmail("")).isEqualTo("***");
    }

    @Test
    @DisplayName("sendInviteEmail sends email when recipient matches allowed list")
    void sendInviteEmailAllowedRecipient() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        boolean sent = mailService.sendInviteEmail(invitedUser, "sample-token-abc", inviterUser);

        assertThat(sent).isTrue();
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("sendInviteEmail skips email when recipient does NOT match allowed list")
    void sendInviteEmailDisallowedRecipient() {
        User disallowedUser = User.builder()
                .id(UUID.randomUUID())
                .email("stranger@otherdomain.com")
                .firstName("Stranger")
                .lastName("User")
                .build();

        boolean sent = mailService.sendInviteEmail(disallowedUser, "sample-token-abc", inviterUser);

        assertThat(sent).isFalse();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("sendInviteEmail skips when mail is disabled without throwing exception")
    void sendInviteEmailWhenDisabled() {
        AccountMailService disabledService = new AccountMailService(
                mailSender, false, "no-reply@athleticaos.com", "http://localhost:5173", ""
        );

        boolean sent = disabledService.sendInviteEmail(invitedUser, "sample-token-abc", inviterUser);

        assertThat(sent).isFalse();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("sendPasswordResetEmail sends reset link when allowed")
    void sendPasswordResetEmailAllowed() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        boolean sent = mailService.sendPasswordResetEmail(invitedUser, "reset-token-xyz");

        assertThat(sent).isTrue();
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Invite email names the organisation the user joins, with the inviter's organisation beside their name")
    void sendInviteEmailNamesRecipientOrganisation() throws Exception {
        MimeMessage message = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(message);
        inviterUser.setOrganisation(Organisation.builder().id(UUID.randomUUID()).name("Malaysia Rugby").build());

        boolean sent = mailService.sendInviteEmail(invitedUser, "raw-token", inviterUser);

        assertThat(sent).isTrue();
        message.saveChanges();
        String text = collectText(message.getContent());
        assertThat(text).contains("Super Admin (Malaysia Rugby) has invited you to join Crusaders RFC");
        assertThat(text).doesNotContain("join Malaysia Rugby");
    }

    private static String collectText(Object content) throws Exception {
        if (content instanceof String str) {
            return str;
        }
        if (content instanceof jakarta.mail.Multipart multipart) {
            StringBuilder all = new StringBuilder();
            for (int i = 0; i < multipart.getCount(); i++) {
                all.append(collectText(multipart.getBodyPart(i).getContent())).append('\n');
            }
            return all.toString();
        }
        return "";
    }
}
