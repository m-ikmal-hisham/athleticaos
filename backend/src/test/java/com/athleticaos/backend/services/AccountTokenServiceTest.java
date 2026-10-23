package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.AccountToken;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.AccountTokenPurpose;
import com.athleticaos.backend.repositories.AccountTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class AccountTokenServiceTest {

    @Mock
    private AccountTokenRepository tokenRepository;

    private AccountTokenService tokenService;
    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        tokenService = new AccountTokenService(tokenRepository);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("rugby-player@example.com")
                .firstName("John")
                .lastName("Doe")
                .isActive(true)
                .build();

        adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@athleticaos.com")
                .firstName("Admin")
                .lastName("User")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("createToken invalidates prior unused tokens and generates new unconsumed token")
    void createTokenSuccess() {
        when(tokenRepository.save(any(AccountToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String rawToken = tokenService.createToken(testUser, AccountTokenPurpose.INVITE, adminUser, "127.0.0.1");

        assertThat(rawToken).isNotBlank();

        verify(tokenRepository).invalidateUnusedTokens(eq(testUser), eq(AccountTokenPurpose.INVITE), any(LocalDateTime.class));

        ArgumentCaptor<AccountToken> captor = ArgumentCaptor.forClass(AccountToken.class);
        verify(tokenRepository).save(captor.capture());

        AccountToken saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(testUser);
        assertThat(saved.getPurpose()).isEqualTo(AccountTokenPurpose.INVITE);
        assertThat(saved.getTokenHash()).isEqualTo(AccountTokenService.sha256Hex(rawToken));
        assertThat(saved.getCreatedBy()).isEqualTo(adminUser);
        assertThat(saved.getRequestIp()).isEqualTo("127.0.0.1");
        assertThat(saved.getUsedAt()).isNull();
    }

    @Test
    @DisplayName("findValidToken returns token when present, unexpired, unused, purpose matches, and user active")
    void findValidTokenSuccess() {
        AccountToken token = AccountToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .purpose(AccountTokenPurpose.INVITE)
                .expiresAt(LocalDateTime.now().plusHours(2))
                .usedAt(null)
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(any(), any())).thenReturn(Optional.of(token));

        AccountToken found = tokenService.findValidToken("raw-token-string", AccountTokenPurpose.INVITE);

        assertThat(found).isEqualTo(token);
        assertThat(found.isUsed()).isFalse();
        verify(tokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("findValidToken throws IllegalArgumentException when token not found in repository")
    void findValidTokenNotFound() {
        when(tokenRepository.findByTokenHashAndPurpose(any(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tokenService.findValidToken("non-existent-token", AccountTokenPurpose.INVITE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This link is invalid or has expired.");
    }

    @Test
    @DisplayName("findValidToken throws IllegalArgumentException when token has expired")
    void findValidTokenExpired() {
        AccountToken token = AccountToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .purpose(AccountTokenPurpose.INVITE)
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .usedAt(null)
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(any(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> tokenService.findValidToken("expired-token", AccountTokenPurpose.INVITE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This link is invalid or has expired.");
    }

    @Test
    @DisplayName("findValidToken throws IllegalArgumentException when token is already used")
    void findValidTokenAlreadyUsed() {
        AccountToken token = AccountToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .purpose(AccountTokenPurpose.INVITE)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .usedAt(LocalDateTime.now().minusMinutes(10))
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(any(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> tokenService.findValidToken("used-token", AccountTokenPurpose.INVITE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This link is invalid or has expired.");
    }

    @Test
    @DisplayName("findValidToken throws IllegalArgumentException when token purpose does not match")
    void findValidTokenWrongPurpose() {
        when(tokenRepository.findByTokenHashAndPurpose(any(), eq(AccountTokenPurpose.INVITE))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tokenService.findValidToken("token", AccountTokenPurpose.INVITE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This link is invalid or has expired.");
    }

    @Test
    @DisplayName("findValidToken throws IllegalArgumentException when user is deactivated")
    void findValidTokenDeactivatedUser() {
        testUser.setActive(false);

        AccountToken token = AccountToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .purpose(AccountTokenPurpose.INVITE)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .usedAt(null)
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(any(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> tokenService.findValidToken("token", AccountTokenPurpose.INVITE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This link is invalid or has expired.");
    }

    @Test
    @DisplayName("consumeToken sets usedAt timestamp and persists token")
    void consumeTokenSetsUsedAt() {
        AccountToken token = AccountToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .purpose(AccountTokenPurpose.INVITE)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .usedAt(null)
                .build();

        when(tokenRepository.save(token)).thenReturn(token);

        tokenService.consumeToken(token);

        assertThat(token.isUsed()).isTrue();
        assertThat(token.getUsedAt()).isNotNull();
        verify(tokenRepository).save(token);
    }

    @Test
    @DisplayName("A1: Bad password does not consume token, keeping token usable on subsequent attempt")
    void badPasswordDoesNotConsumeToken() {
        AccountToken token = AccountToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .purpose(AccountTokenPurpose.RESET)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .usedAt(null)
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(any(), any())).thenReturn(Optional.of(token));

        // Read token (read-only)
        AccountToken found1 = tokenService.findValidToken("raw-token", AccountTokenPurpose.RESET);
        assertThat(found1).isNotNull();
        assertThat(found1.isUsed()).isFalse();

        // Password policy would fail here without calling consumeToken(...)
        verify(tokenRepository, never()).save(any());

        // Subsequent attempt still finds token valid
        AccountToken found2 = tokenService.findValidToken("raw-token", AccountTokenPurpose.RESET);
        assertThat(found2).isNotNull();
        assertThat(found2.isUsed()).isFalse();

        // After valid password, consumeToken is called
        when(tokenRepository.save(found2)).thenReturn(found2);
        tokenService.consumeToken(found2);
        assertThat(found2.isUsed()).isTrue();
        verify(tokenRepository).save(found2);
    }

    @Test
    @DisplayName("invalidateUnusedTokens marks all unused tokens for user and purpose as used")
    void invalidateUnusedTokensCallsRepository() {
        tokenService.invalidateUnusedTokens(testUser, AccountTokenPurpose.INVITE);

        verify(tokenRepository).invalidateUnusedTokens(eq(testUser), eq(AccountTokenPurpose.INVITE), any(LocalDateTime.class));
    }
}
