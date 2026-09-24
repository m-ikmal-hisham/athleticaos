package com.athleticaos.backend.util;

import com.athleticaos.backend.entities.LivestreamLink;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

/**
 * Checks livestream links before they are stored. The public pages render them as hrefs, so only
 * absolute http(s) addresses are accepted: anything else (javascript:, data:, a bare "youtube")
 * is rejected with a 400 rather than saved and served to every visitor.
 */
public final class LivestreamLinks {

    public static final int MAX_LINKS = 10;
    private static final int MAX_URL_LENGTH = 500;
    private static final int MAX_LABEL_LENGTH = 60;

    private LivestreamLinks() {
    }

    /** Trimmed url, or null when blank (which clears the link). Throws on anything not http(s). */
    public static String normaliseUrl(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String url = raw.trim();
        if (url.length() > MAX_URL_LENGTH) {
            throw new IllegalArgumentException("Livestream link is longer than " + MAX_URL_LENGTH + " characters.");
        }
        try {
            URI uri = new URI(url);
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException(
                        "Livestream link must be a full web address starting with https:// (got '" + url + "').");
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Livestream link is not a valid web address: '" + url + "'.");
        }
        return url;
    }

    /** Drops rows without a url, trims labels, validates every url. Order is kept. */
    public static List<LivestreamLink> normalise(List<LivestreamLink> links) {
        List<LivestreamLink> result = new ArrayList<>();
        if (links == null) {
            return result;
        }
        for (LivestreamLink link : links) {
            if (link == null) {
                continue;
            }
            String url = normaliseUrl(link.getUrl());
            if (url == null) {
                continue;
            }
            String label = link.getLabel() == null || link.getLabel().isBlank() ? null : link.getLabel().trim();
            if (label != null && label.length() > MAX_LABEL_LENGTH) {
                throw new IllegalArgumentException("Livestream label is longer than " + MAX_LABEL_LENGTH + " characters.");
            }
            result.add(new LivestreamLink(label, url));
        }
        if (result.size() > MAX_LINKS) {
            throw new IllegalArgumentException("A tournament can list at most " + MAX_LINKS + " livestream links.");
        }
        return result;
    }
}
