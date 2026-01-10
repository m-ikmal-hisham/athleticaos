package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.SponsorPackage;
import com.athleticaos.backend.entities.SubscriptionTier;

import java.util.List;
import java.util.UUID;

public interface MonetizationService {
    List<SponsorPackage> getAllSponsorPackages(boolean activeOnly);

    SponsorPackage createSponsorPackage(SponsorPackage pkg);

    SponsorPackage updateSponsorPackage(UUID id, SponsorPackage pkg);

    void deleteSponsorPackage(UUID id);

    List<SubscriptionTier> getAllSubscriptionTiers(boolean activeOnly);

    SubscriptionTier createSubscriptionTier(SubscriptionTier tier);
}
