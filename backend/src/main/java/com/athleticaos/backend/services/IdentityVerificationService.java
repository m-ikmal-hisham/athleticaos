package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.person.IdentityVerificationRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/**
 * Service for administrator identity-verification attestation and revocation.
 */
public interface IdentityVerificationService {

    /**
     * Verifies a person's identity against the stored hash using a re-typed identification number.
     *
     * @param personId the ID of the person to verify
     * @param request the verification request payload
     * @param http the incoming HTTP request for audit logging
     * @return the updated PersonResponseDTO
     */
    PersonResponseDTO verify(UUID personId, IdentityVerificationRequest request, HttpServletRequest http);

    /**
     * Revokes an existing identity verification attestation.
     *
     * @param personId the ID of the person whose verification to revoke
     * @param http the incoming HTTP request for audit logging
     * @return the updated PersonResponseDTO
     */
    PersonResponseDTO revoke(UUID personId, HttpServletRequest http);
}
