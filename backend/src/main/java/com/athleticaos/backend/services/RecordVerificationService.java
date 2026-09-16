package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.RecordVerificationRequest;
import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/**
 * Service for administrator record verification attestation and revocation.
 */
public interface RecordVerificationService {

    /**
     * Attests that a person record has been verified against a source record or document.
     *
     * @param personId the person being verified
     * @param request the verification request (method and attestation confirmation)
     * @param http the HTTP servlet request for audit logging
     * @return the updated person response
     */
    PersonResponseDTO verify(UUID personId, RecordVerificationRequest request, HttpServletRequest http);

    /**
     * Revokes an existing record verification, resetting the record to UNVERIFIED.
     *
     * @param personId the person whose verification is to be revoked
     * @param http the HTTP servlet request for audit logging
     * @return the updated person response
     */
    PersonResponseDTO revoke(UUID personId, HttpServletRequest http);
}
