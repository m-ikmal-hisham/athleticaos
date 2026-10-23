package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.AccountToken;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.AccountTokenPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountTokenRepository extends JpaRepository<AccountToken, UUID> {

    Optional<AccountToken> findByTokenHashAndPurpose(String tokenHash, AccountTokenPurpose purpose);

    @Modifying
    @Query("UPDATE AccountToken t SET t.usedAt = :usedAt WHERE t.user = :user AND t.purpose = :purpose AND t.usedAt IS NULL")
    int invalidateUnusedTokens(@Param("user") User user, @Param("purpose") AccountTokenPurpose purpose, @Param("usedAt") LocalDateTime usedAt);

    @Modifying
    @Query("UPDATE AccountToken t SET t.usedAt = :usedAt WHERE t.user = :user AND t.usedAt IS NULL")
    int invalidateAllUnusedTokens(@Param("user") User user, @Param("usedAt") LocalDateTime usedAt);
}
