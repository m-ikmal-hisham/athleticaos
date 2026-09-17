package com.athleticaos.backend.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Principal carrying the password-lifecycle state the JWT filter needs.
 * credentialsNonExpired is false while a forced password change is pending, which makes
 * DaoAuthenticationProvider throw CredentialsExpiredException only after the password has matched.
 */
public class AthleticaUserDetails extends org.springframework.security.core.userdetails.User {

    private static final long serialVersionUID = 1L;

    private final LocalDateTime passwordChangedAt;

    public AthleticaUserDetails(com.athleticaos.backend.entities.User user) {
        super(user.getEmail(),
                user.getPasswordHash(),
                user.isActive(),
                true,
                !user.isMustChangePassword(),
                true,
                user.getRoles().stream()
                        .map(role -> new SimpleGrantedAuthority(role.getName()))
                        .collect(Collectors.toList()));
        this.passwordChangedAt = user.getPasswordChangedAt();
    }

    public LocalDateTime getPasswordChangedAt() {
        return passwordChangedAt;
    }
}
