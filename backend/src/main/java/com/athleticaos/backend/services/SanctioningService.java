package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.federation.SanctioningCreateRequest;
import com.athleticaos.backend.dtos.federation.SanctioningRequestResponse;
import java.util.List;
import java.util.UUID;

public interface SanctioningService {
    SanctioningRequestResponse requestSanctioning(SanctioningCreateRequest request);

    SanctioningRequestResponse approveSanctioning(UUID requestId, String notes);

    SanctioningRequestResponse rejectSanctioning(UUID requestId, String notes);

    SanctioningRequestResponse getSanctioningRequest(UUID requestId);

    List<SanctioningRequestResponse> getRequestsForApprover(UUID approverOrgId);

    List<SanctioningRequestResponse> getRequestsFromRequester(UUID requesterOrgId);
}
