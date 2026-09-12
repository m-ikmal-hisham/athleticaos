package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.audit.AuditLogEntry;
import com.athleticaos.backend.dtos.official.AssignOfficialRequest;
import com.athleticaos.backend.dtos.official.MatchOfficialDTO;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.impl.OfficialServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class OfficialServiceAuditTest {

    @Mock
    private OfficialRegistryRepository officialRepository;
    @Mock
    private MatchOfficialRepository matchOfficialRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PersonRepository personRepository;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private OfficialRoleRepository officialRoleRepository;
    @Mock
    private TournamentOfficialRepository tournamentOfficialRepository;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private ObjectProvider<HttpServletRequest> requestProvider;

    @Mock
    private AuditLogService auditLogService;

    private OfficialServiceImpl officialService;

    @BeforeEach
    void setUp() {
        officialService = new OfficialServiceImpl(
                officialRepository,
                matchOfficialRepository,
                userRepository,
                personRepository,
                matchRepository,
                tournamentRepository,
                officialRoleRepository,
                tournamentOfficialRepository,
                auditLogger,
                requestProvider
        );
    }

    @Test
    @DisplayName("assignOfficialToMatch logs official assignment with active HttpServletRequest in web context")
    void assignOfficialToMatch_WithActiveWebRequest_PassesRequestToAuditLogger() {
        UUID matchId = UUID.randomUUID();
        UUID officialId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        Match match = Match.builder().id(matchId).matchCode("M-101").build();
        Person person = Person.builder().id(UUID.randomUUID()).firstName("John").lastName("Ref").build();
        OfficialRegistry official = OfficialRegistry.builder().id(officialId).person(person).build();

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(officialRepository.findById(officialId)).thenReturn(Optional.of(official));

        MatchOfficial savedAssignment = MatchOfficial.builder()
                .id(assignmentId)
                .match(match)
                .official(official)
                .assignedRole("REFEREE")
                .isConfirmed(true)
                .build();
        when(matchOfficialRepository.save(any(MatchOfficial.class))).thenReturn(savedAssignment);

        MockHttpServletRequest mockRequest = new MockHttpServletRequest();
        mockRequest.setRemoteAddr("192.168.1.100");
        mockRequest.addHeader("User-Agent", "AthleticaOS-Web/1.0");
        when(requestProvider.getIfAvailable()).thenReturn(mockRequest);

        AssignOfficialRequest req = new AssignOfficialRequest();
        req.setOfficialId(officialId);
        req.setAssignedRole("REFEREE");

        MatchOfficialDTO result = officialService.assignOfficialToMatch(matchId, req);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(assignmentId);

        // Verify audit logger received the active web request
        verify(auditLogger).logOfficialAssigned(savedAssignment, mockRequest);
    }

    @Test
    @DisplayName("assignOfficialToMatch tolerates missing HttpServletRequest in headless mode")
    void assignOfficialToMatch_InHeadlessMode_PassesNullRequestToAuditLogger() {
        UUID matchId = UUID.randomUUID();
        UUID officialId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        Match match = Match.builder().id(matchId).matchCode("M-102").build();
        Person person = Person.builder().id(UUID.randomUUID()).firstName("Jane").lastName("Judge").build();
        OfficialRegistry official = OfficialRegistry.builder().id(officialId).person(person).build();

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(officialRepository.findById(officialId)).thenReturn(Optional.of(official));

        MatchOfficial savedAssignment = MatchOfficial.builder()
                .id(assignmentId)
                .match(match)
                .official(official)
                .assignedRole("TOUCH_JUDGE")
                .isConfirmed(true)
                .build();
        when(matchOfficialRepository.save(any(MatchOfficial.class))).thenReturn(savedAssignment);

        // In headless mode, ObjectProvider returns null
        when(requestProvider.getIfAvailable()).thenReturn(null);

        AssignOfficialRequest req = new AssignOfficialRequest();
        req.setOfficialId(officialId);
        req.setAssignedRole("TOUCH_JUDGE");

        MatchOfficialDTO result = officialService.assignOfficialToMatch(matchId, req);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(assignmentId);

        // Verify audit logger received null request and completed without throwing
        verify(auditLogger).logOfficialAssigned(savedAssignment, null);
    }

    @Test
    @DisplayName("AuditLogger.logOfficialAssigned safely handles both null and non-null HttpServletRequest")
    void auditLogger_logOfficialAssigned_HandlesNullAndNonNullRequest() {
        AuditLogger realAuditLogger = new AuditLogger(auditLogService);

        Match match = Match.builder().id(UUID.randomUUID()).matchCode("M-200").build();
        Person person = Person.builder().id(UUID.randomUUID()).firstName("David").lastName("Whistle").build();
        OfficialRegistry official = OfficialRegistry.builder().id(UUID.randomUUID()).person(person).build();
        MatchOfficial assignment = MatchOfficial.builder()
                .id(UUID.randomUUID())
                .match(match)
                .official(official)
                .assignedRole("LEAD_REFEREE")
                .isConfirmed(true)
                .build();

        // 1. With active request
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("User-Agent", "TestBrowser/1.0");

        realAuditLogger.logOfficialAssigned(assignment, request);

        ArgumentCaptor<AuditLogEntry> entryCaptor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogService).log(entryCaptor.capture(), eq("10.0.0.5"), eq("TestBrowser/1.0"));
        assertThat(entryCaptor.getValue().getActionType()).isEqualTo("OFFICIAL_ASSIGNED");
        assertThat(entryCaptor.getValue().getEntitySummary()).contains("Whistle");
        assertThat(entryCaptor.getValue().getEntitySummary()).contains("LEAD_REFEREE");
        assertThat(entryCaptor.getValue().getEntitySummary()).contains("M-200");

        // 2. With null request (headless)
        realAuditLogger.logOfficialAssigned(assignment, null);
        verify(auditLogService).log(any(AuditLogEntry.class), isNull(), isNull());
    }
}
