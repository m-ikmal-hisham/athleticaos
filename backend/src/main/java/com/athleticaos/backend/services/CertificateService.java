package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.certificate.CertificateDownloadPayload;
import com.athleticaos.backend.dtos.certificate.CertificateIssueResponse;
import com.athleticaos.backend.dtos.certificate.CertificateRosterResponse;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsResponse;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsUpdateRequest;
import com.athleticaos.backend.dtos.certificate.PublicCertificateVerificationResponse;
import com.athleticaos.backend.enums.CertificateDesign;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface CertificateService {

    record SignatureBinary(byte[] bytes, String contentType) {}

    CertificateSettingsResponse getSettings(UUID tournamentId);

    CertificateSettingsResponse updateSettings(UUID tournamentId, CertificateSettingsUpdateRequest request, HttpServletRequest httpRequest);

    CertificateSettingsResponse uploadSignature(UUID tournamentId, int slot, MultipartFile file, HttpServletRequest httpRequest);

    CertificateSettingsResponse deleteSignature(UUID tournamentId, int slot, HttpServletRequest httpRequest);

    SignatureBinary getSignature(UUID tournamentId, int slot);

    CertificateRosterResponse getRoster(UUID tournamentId);

    CertificateIssueResponse issueCertificates(UUID tournamentId, UUID teamId, HttpServletRequest httpRequest);

    byte[] renderPreviewPdf(UUID tournamentId, CertificateDesign designOverride);

    CertificateDownloadPayload prepareTournamentZipPayload(UUID tournamentId);

    CertificateDownloadPayload prepareTeamDownloadPayload(UUID tournamentId, UUID teamId);

    CertificateIssueResponse.CertificateSummaryDto revokeCertificate(UUID tournamentId, UUID certificateId, HttpServletRequest httpRequest);

    PublicCertificateVerificationResponse verifyPublic(String rawCode);
}
