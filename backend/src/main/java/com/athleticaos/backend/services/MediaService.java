package com.athleticaos.backend.services;

// Entity import
import com.athleticaos.backend.entities.MediaAsset;

import java.util.List;
import java.util.UUID;

import org.springframework.lang.NonNull;

public interface MediaService {
    List<MediaAsset> getAssetsForMatch(UUID matchId);

    @NonNull
    MediaAsset uploadAsset(UUID matchId, String url, String type, String description);
}
