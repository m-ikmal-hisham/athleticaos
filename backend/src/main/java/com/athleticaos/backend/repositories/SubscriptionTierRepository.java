package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.SubscriptionTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubscriptionTierRepository extends JpaRepository<SubscriptionTier, UUID> {
    List<SubscriptionTier> findByActiveTrue();
}
