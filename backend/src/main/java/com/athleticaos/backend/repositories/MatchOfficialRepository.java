package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.MatchOfficial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchOfficialRepository extends JpaRepository<MatchOfficial, UUID> {
    List<MatchOfficial> findByMatchId(UUID matchId);

    List<MatchOfficial> findByOfficialId(UUID officialId);
}
