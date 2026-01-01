package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.SponsorPackage;
import com.athleticaos.backend.entities.SubscriptionTier;
import com.athleticaos.backend.repositories.SponsorPackageRepository;
import com.athleticaos.backend.repositories.SubscriptionTierRepository;
import com.athleticaos.backend.services.MonetizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Objects;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class MonetizationServiceImpl implements MonetizationService {

    private final SponsorPackageRepository sponsorPackageRepository;
    private final SubscriptionTierRepository subscriptionTierRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SponsorPackage> getAllSponsorPackages(boolean activeOnly) {
        if (activeOnly) {
            return sponsorPackageRepository.findByActiveTrue();
        }
        return sponsorPackageRepository.findAll();
    }

    @Override
    @Transactional
    public SponsorPackage createSponsorPackage(SponsorPackage pkg) {
        return sponsorPackageRepository.save(pkg);
    }

    @Override
    @Transactional
    public SponsorPackage updateSponsorPackage(UUID id, SponsorPackage pkg) {
        SponsorPackage existing = sponsorPackageRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Package not found"));

        existing.setName(pkg.getName());
        existing.setDescription(pkg.getDescription());
        existing.setPrice(pkg.getPrice());
        existing.setCurrency(pkg.getCurrency());
        existing.setFeatures(pkg.getFeatures());
        existing.setActive(pkg.isActive());

        return sponsorPackageRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteSponsorPackage(UUID id) {
        sponsorPackageRepository.deleteById(Objects.requireNonNull(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionTier> getAllSubscriptionTiers(boolean activeOnly) {
        if (activeOnly) {
            return subscriptionTierRepository.findByActiveTrue();
        }
        return subscriptionTierRepository.findAll();
    }

    @Override
    @Transactional
    public SubscriptionTier createSubscriptionTier(SubscriptionTier tier) {
        return subscriptionTierRepository.save(tier);
    }
}
