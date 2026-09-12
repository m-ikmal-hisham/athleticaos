package com.athleticaos.backend.audit;

import com.athleticaos.backend.dtos.audit.AuditLogEntry;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.StaffRole;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.TeamStaff;
import com.athleticaos.backend.services.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PersonAuditCoverageTest {

    @Mock
    private AuditLogService auditLogService;

    private AuditLogger auditLogger;

    @BeforeEach
    void setUp() {
        auditLogger = new AuditLogger(auditLogService);
    }

    @Test
    @DisplayName("logPersonCreated writes PERSON_CREATED without IC, hash, or DOB in summary")
    void logPersonCreated_WritesAuditLog_WithoutPii() {
        UUID personId = UUID.randomUUID();
        String icNumber = "990101-14-5555";
        String icHash = "abc123hashdef456";
        LocalDate dob = LocalDate.of(1999, 1, 1);

        Person person = Person.builder()
                .id(personId)
                .firstName("Ali")
                .lastName("Ahmad")
                .identificationType("MALAYSIAN_IC")
                .identificationValue(icNumber)
                .identificationHash(icHash)
                .dob(dob)
                .build();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");

        auditLogger.logPersonCreated(person, "Harimau Club", request);

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogService).log(captor.capture(), eq("10.0.0.1"), any());

        AuditLogEntry log = captor.getValue();
        assertThat(log.getActionType()).isEqualTo("PERSON_CREATED");
        assertThat(log.getEntityType()).isEqualTo("PERSON");
        assertThat(log.getEntityId()).isEqualTo(personId);

        assertThat(log.getEntitySummary()).contains("Ali Ahmad");
        assertThat(log.getEntitySummary()).contains("Harimau Club");
        assertThat(log.getEntitySummary()).doesNotContain(icNumber);
        assertThat(log.getEntitySummary()).doesNotContain(icHash);
        assertThat(log.getEntitySummary()).doesNotContain(dob.toString());
        assertThat(log.getEntitySummary()).doesNotContain("MALAYSIAN_IC");
    }

    @Test
    @DisplayName("logPersonUpdated writes PERSON_UPDATED without IC, hash, or DOB in summary")
    void logPersonUpdated_WritesAuditLog_WithoutPii() {
        UUID personId = UUID.randomUUID();
        String icNumber = "880202-08-6666";
        String icHash = "hash789xyz";
        LocalDate dob = LocalDate.of(1988, 2, 2);

        Person person = Person.builder()
                .id(personId)
                .firstName("Badrul")
                .lastName("Hisham")
                .identificationType("PASSPORT")
                .identificationValue(icNumber)
                .identificationHash(icHash)
                .dob(dob)
                .build();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");

        auditLogger.logPersonUpdated(person, "Eagle Academy", request);

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogService).log(captor.capture(), eq("10.0.0.2"), any());

        AuditLogEntry log = captor.getValue();
        assertThat(log.getActionType()).isEqualTo("PERSON_UPDATED");
        assertThat(log.getEntityType()).isEqualTo("PERSON");
        assertThat(log.getEntityId()).isEqualTo(personId);

        assertThat(log.getEntitySummary()).contains("Badrul Hisham");
        assertThat(log.getEntitySummary()).contains("Eagle Academy");
        assertThat(log.getEntitySummary()).doesNotContain(icNumber);
        assertThat(log.getEntitySummary()).doesNotContain(icHash);
        assertThat(log.getEntitySummary()).doesNotContain(dob.toString());
    }

    @Test
    @DisplayName("logTeamStaffAdded writes TEAM_STAFF_ADDED audit entry")
    void logTeamStaffAdded_WritesAuditLog() {
        UUID staffId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        Organisation org = Organisation.builder().id(orgId).name("Thunder Club").build();
        Team team = Team.builder().id(teamId).name("Thunder U18").organisation(org).build();
        Person person = Person.builder().id(UUID.randomUUID()).firstName("Coach").lastName("Carter").build();
        StaffRole role = StaffRole.builder().id(1).name("Head Coach").build();

        TeamStaff staff = TeamStaff.builder()
                .id(staffId)
                .team(team)
                .person(person)
                .staffRole(role)
                .build();

        MockHttpServletRequest request = new MockHttpServletRequest();
        auditLogger.logTeamStaffAdded(staff, request);

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogService).log(captor.capture(), any(), any());

        AuditLogEntry log = captor.getValue();
        assertThat(log.getActionType()).isEqualTo("TEAM_STAFF_ADDED");
        assertThat(log.getEntityType()).isEqualTo("TEAM_STAFF");
        assertThat(log.getEntityId()).isEqualTo(staffId);
        assertThat(log.getEntitySummary()).contains("Coach Carter");
        assertThat(log.getEntitySummary()).contains("Thunder U18");
        assertThat(log.getEntitySummary()).contains("Head Coach");
    }

    @Test
    @DisplayName("logBulkAction writes non-null entityId and proper summary")
    void logBulkAction_WritesAuditLog() {
        UUID teamId = UUID.randomUUID();
        MockHttpServletRequest request = new MockHttpServletRequest();

        auditLogger.logBulkAction("BATCH_PLAYER_IMPORT", "PLAYER", teamId, "Imported 15 players", request);

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogService).log(captor.capture(), any(), any());

        AuditLogEntry log = captor.getValue();
        assertThat(log.getActionType()).isEqualTo("BATCH_PLAYER_IMPORT");
        assertThat(log.getEntityType()).isEqualTo("PLAYER");
        assertThat(log.getEntityId()).isEqualTo(teamId);
        assertThat(log.getEntitySummary()).contains("15");
    }
}
