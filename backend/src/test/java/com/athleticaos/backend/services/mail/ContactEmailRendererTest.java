package com.athleticaos.backend.services.mail;

import com.athleticaos.backend.entities.ContactMessage;
import com.athleticaos.backend.enums.ContactSubject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ContactEmailRendererTest {

    private static final ZonedDateTime FIXED_TIME = ZonedDateTime.of(
            2026, 10, 16, 17, 30, 0, 0, ZoneId.of("Asia/Kuala_Lumpur")
    );

    @Test
    @DisplayName("Subject format matches specification and trims name to 60 characters with ellipsis")
    void renderSubject_formatsAndTrimsLongName() {
        ContactMessage msg = ContactMessage.builder()
                .name("Alice Tan")
                .subject(ContactSubject.PARTNERSHIP)
                .build();

        String subject = ContactEmailRenderer.renderSubject(msg);
        assertThat(subject).isEqualTo("New enquiry · Partnership · Alice Tan");

        // 70 character name
        String longName = "A".repeat(70);
        ContactMessage longMsg = ContactMessage.builder()
                .name(longName)
                .subject(ContactSubject.GENERAL)
                .build();

        String trimmedSubject = ContactEmailRenderer.renderSubject(longMsg);
        assertThat(trimmedSubject).isEqualTo("New enquiry · General enquiry · " + "A".repeat(60) + "…");
    }

    @Test
    @DisplayName("HTML escapes script tags in name and message, with no raw '<script' in output")
    void renderHtml_escapesHtmlAndXssPayloads() {
        ContactMessage msg = ContactMessage.builder()
                .id(UUID.randomUUID())
                .name("<script>alert(1)</script>")
                .email("test@example.com")
                .organisation("<script>alert(2)</script>")
                .subject(ContactSubject.MEDIA)
                .message("Hello <script>alert(3)</script> world")
                .build();

        ContactEmailRenderer.RenderResult result = ContactEmailRenderer.render(msg, FIXED_TIME);

        assertThat(result.html()).doesNotContain("<script");
        assertThat(result.html()).contains("&lt;script&gt;alert(1)&lt;/script&gt;");
        assertThat(result.html()).contains("&lt;script&gt;alert(2)&lt;/script&gt;");
        assertThat(result.html()).contains("&lt;script&gt;alert(3)&lt;/script&gt;");
    }

    @Test
    @DisplayName("Converts line breaks in message to <br>")
    void renderHtml_convertsNewlinesToBr() {
        ContactMessage msg = ContactMessage.builder()
                .id(UUID.randomUUID())
                .name("Bob Lee")
                .email("bob@example.com")
                .subject(ContactSubject.GENERAL)
                .message("Line 1\nLine 2\r\nLine 3\rLine 4")
                .build();

        ContactEmailRenderer.RenderResult result = ContactEmailRenderer.render(msg, FIXED_TIME);
        assertThat(result.html()).contains("Line 1<br>Line 2<br>Line 3<br>Line 4");
    }

    @Test
    @DisplayName("Organisation row is omitted when organisation is null or empty")
    void renderHtml_omitsOrganisationRowWhenNullOrEmpty() {
        ContactMessage msgNullOrg = ContactMessage.builder()
                .id(UUID.randomUUID())
                .name("Charlie")
                .email("charlie@example.com")
                .organisation(null)
                .subject(ContactSubject.GENERAL)
                .message("Testing null org")
                .build();

        ContactEmailRenderer.RenderResult nullOrgResult = ContactEmailRenderer.render(msgNullOrg, FIXED_TIME);
        assertThat(nullOrgResult.html()).doesNotContain("Organisation");
        assertThat(nullOrgResult.plainText()).doesNotContain("Organisation:");

        ContactMessage msgEmptyOrg = ContactMessage.builder()
                .id(UUID.randomUUID())
                .name("Charlie")
                .email("charlie@example.com")
                .organisation("   ")
                .subject(ContactSubject.GENERAL)
                .message("Testing empty org")
                .build();

        ContactEmailRenderer.RenderResult emptyOrgResult = ContactEmailRenderer.render(msgEmptyOrg, FIXED_TIME);
        assertThat(emptyOrgResult.html()).doesNotContain("Organisation");
        assertThat(emptyOrgResult.plainText()).doesNotContain("Organisation:");

        ContactMessage msgWithOrg = ContactMessage.builder()
                .id(UUID.randomUUID())
                .name("Charlie")
                .email("charlie@example.com")
                .organisation("Kuala Lumpur Rugby Club")
                .subject(ContactSubject.GENERAL)
                .message("Testing with org")
                .build();

        ContactEmailRenderer.RenderResult withOrgResult = ContactEmailRenderer.render(msgWithOrg, FIXED_TIME);
        assertThat(withOrgResult.html()).contains("Organisation");
        assertThat(withOrgResult.html()).contains("Kuala Lumpur Rugby Club");
        assertThat(withOrgResult.plainText()).contains("Organisation: Kuala Lumpur Rugby Club");
    }

    @Test
    @DisplayName("Hidden preheader is present with first 90 chars of message")
    void renderHtml_includesHiddenPreheader() {
        String longMessage = "1234567890".repeat(12); // 120 chars
        ContactMessage msg = ContactMessage.builder()
                .id(UUID.randomUUID())
                .name("Dana")
                .email("dana@example.com")
                .subject(ContactSubject.GENERAL)
                .message(longMessage)
                .build();

        ContactEmailRenderer.RenderResult result = ContactEmailRenderer.render(msg, FIXED_TIME);

        String expectedPreheader = "1234567890".repeat(9); // exactly 90 chars
        assertThat(result.html()).contains(expectedPreheader);
        assertThat(result.html()).contains("display: none !important;");
    }

    @Test
    @DisplayName("Formats received time in Malaysia time correctly regardless of input zone")
    void formatReceivedTime_formatsMalaysiaTime() {
        // 17:30 in KL is 09:30 UTC
        ZonedDateTime utcTime = ZonedDateTime.of(2026, 10, 16, 9, 30, 0, 0, ZoneId.of("UTC"));
        String formatted = ContactEmailRenderer.formatReceivedTime(utcTime);

        assertThat(formatted).isEqualTo("Fri, 16 Oct 2026 · 5:30 PM (Malaysia time)");
    }

    @Test
    @DisplayName("Plain text part contains message, short ref, and full uuid")
    void renderPlainText_containsExpectedContent() {
        UUID id = UUID.fromString("12345678-9abc-def0-1234-56789abcdef0");
        ContactMessage msg = ContactMessage.builder()
                .id(id)
                .name("Evan")
                .email("evan@example.com")
                .organisation("Selangor Rugby")
                .subject(ContactSubject.TOURNAMENT_SUPPORT)
                .message("We need assistance setting up brackets.")
                .build();

        ContactEmailRenderer.RenderResult result = ContactEmailRenderer.render(msg, FIXED_TIME);

        assertThat(result.plainText()).contains("Evan sent you a message (Tournament organiser support)");
        assertThat(result.plainText()).contains("Fri, 16 Oct 2026 · 5:30 PM (Malaysia time)");
        assertThat(result.plainText()).contains("We need assistance setting up brackets.");
        assertThat(result.plainText()).contains("Email: evan@example.com");
        assertThat(result.plainText()).contains("Organisation: Selangor Rugby");
        assertThat(result.plainText()).contains("Reply to this email to answer them.");
        assertThat(result.plainText()).contains("Ref 12345678 · full id 12345678-9abc-def0-1234-56789abcdef0");
    }

    @Test
    @DisplayName("Generates sample preview HTML file at target/contact-email-preview.html")
    void generatePreviewHtmlFile() throws IOException {
        UUID sampleId = UUID.fromString("c9bf9e57-1685-4c89-bafb-ff5af830be8a");
        ContactMessage sampleMessage = ContactMessage.builder()
                .id(sampleId)
                .name("Aina Rahman")
                .email("aina@example.com")
                .organisation("Example Rugby Club")
                .subject(ContactSubject.PARTNERSHIP)
                .message("Hello from Example Rugby Club.\n\nWe would like to run our club tournament on AthleticaOS this season, with live scoring and team rosters.\n\nCould we arrange a short call next week?")
                .build();

        ContactEmailRenderer.RenderResult result = ContactEmailRenderer.render(sampleMessage, FIXED_TIME);

        Path targetDir = Path.of("target");
        Files.createDirectories(targetDir);
        Path previewPath = targetDir.resolve("contact-email-preview.html");
        Files.writeString(previewPath, result.html());

        assertThat(Files.exists(previewPath)).isTrue();
        assertThat(Files.size(previewPath)).isGreaterThan(500);
    }
}
