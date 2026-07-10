package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.federation.SanctioningCreateRequest;
import com.athleticaos.backend.dtos.federation.SanctioningRequestResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.SanctioningRequest;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.SanctioningRequestRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.SanctioningService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class SanctioningServiceImpl implements SanctioningService {

    private final SanctioningRequestRepository sanctioningRequestRepository;
    private final TournamentRepository tournamentRepository;
    private final OrganisationRepository organisationRepository;

    @Override
    @Transactional
    public SanctioningRequestResponse requestSanctioning(SanctioningCreateRequest request) {
        Tournament tournament = tournamentRepository.findById(Objects.requireNonNull(request.getTournamentId()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        Organisation approverOrg = organisationRepository.findById(Objects.requireNonNull(request.getApproverOrgId()))
                .orElseThrow(() -> new EntityNotFoundException("Approver Organization not found"));

        // Prevent duplicate pending requests
        List<SanctioningRequest> existing = sanctioningRequestRepository.findByTournamentId(tournament.getId());
        boolean hasPending = existing.stream()
                .anyMatch(r -> r.getStatus() == SanctioningRequest.SanctioningStatus.PENDING);
        if (hasPending) {
            throw new IllegalStateException("A pending sanctioning request already exists for this tournament.");
        }

        boolean isAlreadyApproved = existing.stream()
                .anyMatch(r -> r.getStatus() == SanctioningRequest.SanctioningStatus.APPROVED);
        if (isAlreadyApproved) {
            throw new IllegalStateException("This tournament is already sanctioned.");
        }

        SanctioningRequest sanctioningRequest = SanctioningRequest.builder()
                .tournament(tournament)
                .requesterOrg(tournament.getOrganiserOrg())
                .approverOrg(approverOrg)
                .status(SanctioningRequest.SanctioningStatus.PENDING)
                .notes(request.getNotes())
                .build();

        SanctioningRequest saved = sanctioningRequestRepository.save(sanctioningRequest);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SanctioningRequestResponse approveSanctioning(UUID requestId, String notes) {
        SanctioningRequest request = sanctioningRequestRepository.findById(Objects.requireNonNull(requestId))
                .orElseThrow(() -> new EntityNotFoundException("Sanctioning Request not found"));

        if (request.getStatus() != SanctioningRequest.SanctioningStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state.");
        }

        request.setStatus(SanctioningRequest.SanctioningStatus.APPROVED);
        if (notes != null) {
            request.setNotes(request.getNotes() != null ? request.getNotes() + "\nApprover Note: " + notes
                    : "Approver Note: " + notes);
        }

        return mapToResponse(sanctioningRequestRepository.save(request));
    }

    @Override
    @Transactional
    public SanctioningRequestResponse rejectSanctioning(UUID requestId, String notes) {
        SanctioningRequest request = sanctioningRequestRepository.findById(Objects.requireNonNull(requestId))
                .orElseThrow(() -> new EntityNotFoundException("Sanctioning Request not found"));

        if (request.getStatus() != SanctioningRequest.SanctioningStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state.");
        }

        request.setStatus(SanctioningRequest.SanctioningStatus.REJECTED);
        if (notes != null) {
            request.setNotes(request.getNotes() != null ? request.getNotes() + "\nRejection Note: " + notes
                    : "Rejection Note: " + notes);
        }

        return mapToResponse(sanctioningRequestRepository.save(request));
    }

    @Override
    @Transactional(readOnly = true)
    public SanctioningRequestResponse getSanctioningRequest(UUID requestId) {
        SanctioningRequest request = sanctioningRequestRepository.findById(Objects.requireNonNull(requestId))
                .orElseThrow(() -> new EntityNotFoundException("Sanctioning Request not found"));
        return mapToResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SanctioningRequestResponse> getRequestsForApprover(UUID approverOrgId) {
        return sanctioningRequestRepository.findByApproverOrgId(approverOrgId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SanctioningRequestResponse> getRequestsFromRequester(UUID requesterOrgId) {
        return sanctioningRequestRepository.findByRequesterOrgId(requesterOrgId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private SanctioningRequestResponse mapToResponse(SanctioningRequest req) {
        return SanctioningRequestResponse.builder()
                .id(req.getId())
                .tournamentId(req.getTournament().getId())
                .tournamentName(req.getTournament().getName())
                .requesterOrgId(req.getRequesterOrg().getId())
                .requesterOrgName(req.getRequesterOrg().getName())
                .approverOrgId(req.getApproverOrg().getId())
                .approverOrgName(req.getApproverOrg().getName())
                .status(req.getStatus().name())
                .notes(req.getNotes())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .build();
    }
}
