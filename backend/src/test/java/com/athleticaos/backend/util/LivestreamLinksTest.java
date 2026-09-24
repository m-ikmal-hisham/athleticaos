package com.athleticaos.backend.util;

import com.athleticaos.backend.entities.LivestreamLink;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LivestreamLinksTest {

    @Test
    void acceptsHttpsAndTrims() {
        assertThat(LivestreamLinks.normaliseUrl("  https://www.youtube.com/live/abc?si=1  "))
                .isEqualTo("https://www.youtube.com/live/abc?si=1");
        assertThat(LivestreamLinks.normaliseUrl("http://example.com/stream")).isEqualTo("http://example.com/stream");
    }

    @Test
    void blankClears() {
        assertThat(LivestreamLinks.normaliseUrl(null)).isNull();
        assertThat(LivestreamLinks.normaliseUrl("   ")).isNull();
    }

    @Test
    void rejectsScriptAndRelativeLinks() {
        for (String bad : List.of("javascript:alert(1)", "data:text/html,hi", "youtube.com/live/abc", "/live", "ftp://x.com/a")) {
            assertThatThrownBy(() -> LivestreamLinks.normaliseUrl(bad))
                    .as(bad)
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void normaliseDropsEmptyRowsAndTrimsLabels() {
        List<LivestreamLink> result = LivestreamLinks.normalise(Arrays.asList(
                new LivestreamLink("  Pitch A ", "https://youtu.be/a"),
                new LivestreamLink("Unused", "  "),
                null,
                new LivestreamLink("   ", "https://youtu.be/b")));

        assertThat(result).containsExactly(
                new LivestreamLink("Pitch A", "https://youtu.be/a"),
                new LivestreamLink(null, "https://youtu.be/b"));
    }

    @Test
    void capsTheNumberOfLinks() {
        List<LivestreamLink> tooMany = new ArrayList<>();
        for (int i = 0; i <= LivestreamLinks.MAX_LINKS; i++) {
            tooMany.add(new LivestreamLink(null, "https://youtu.be/" + i));
        }
        assertThatThrownBy(() -> LivestreamLinks.normalise(tooMany)).isInstanceOf(IllegalArgumentException.class);
    }
}
