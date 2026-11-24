package com.athleticaos.backend.dtos.certificate;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * Pre-loaded, detached payload for streaming ZIP or combined PDF downloads without touching JPA.
 */
@Value
@Builder
public class CertificateDownloadPayload {
    String downloadFileName;
    String auditScopeDescription;
    List<Entry> entries;

    @Value
    @Builder
    public static class Entry {
        String categoryFolder;
        String teamFolder;
        String recipientName;
        CertificateRenderData renderData;
    }
}
