package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.MediaAsset;
import com.athleticaos.backend.repositories.MediaAssetRepository;
import com.athleticaos.backend.services.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.lang.NonNull;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class MediaServiceImpl implements MediaService {

    private final MediaAssetRepository mediaAssetRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MediaAsset> getAssetsForMatch(UUID matchId) {
        return mediaAssetRepository.findByMatchId(matchId);
    }

    @Override
    @Transactional
    @NonNull
    public MediaAsset uploadAsset(UUID matchId, String url, String type, String description) {
        MediaAsset asset = MediaAsset.builder()
                .matchId(matchId)
                .url(url)
                .type(type)
                .description(description)
                .uploadedAt(LocalDateTime.now()) // Explicitly set if needed, or rely on @CreationTimestamp
                .build();
        return mediaAssetRepository.save(asset);
    }
}
