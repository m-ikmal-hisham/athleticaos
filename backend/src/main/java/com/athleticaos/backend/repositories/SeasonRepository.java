package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Season;
import com.athleticaos.backend.enums.SeasonLevel;
import com.athleticaos.backend.enums.SeasonStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeasonRepository extends JpaRepository<Season, UUID> {
    List<Season> findByStatus(SeasonStatus status);

    List<Season> findByLevel(SeasonLevel level);
}
