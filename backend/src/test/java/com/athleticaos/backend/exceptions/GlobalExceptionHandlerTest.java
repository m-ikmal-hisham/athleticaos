package com.athleticaos.backend.exceptions;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.SQLException;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({GlobalExceptionHandler.class, GlobalExceptionHandlerTest.TestController.class})
@SuppressWarnings("null")
public class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private com.athleticaos.backend.security.JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void missingServletRequestParameter_returns400WithParameterName() throws Exception {
        mockMvc.perform(get("/test-errors/param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("requiredParam")));
    }

    @Test
    void handlerMethodValidation_returns400ListingFieldsAndRows() throws Exception {
        List<TestDto> invalidList = List.of(
                new TestDto("", "valueB"),
                new TestDto("valueA", "")
        );

        mockMvc.perform(post("/test-errors/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidList)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("fieldA")))
                .andExpect(jsonPath("$.message").value(containsString("fieldB")));
    }

    @Test
    void dataIntegrityViolation_uniqueViolationIc_returns409WithDuplicateIc() throws Exception {
        mockMvc.perform(get("/test-errors/unique-violation-ic"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_IC"))
                .andExpect(jsonPath("$.message").value("Person with this IC/Passport already exists"))
                .andExpect(jsonPath("$.message").value(not(containsString("uc_persons_identification_hash"))));
    }

    @Test
    void dataIntegrityViolation_uniqueViolationOther_returns409WithGenericMessage() throws Exception {
        mockMvc.perform(get("/test-errors/unique-violation-other"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("A record with this identifier already exists."))
                .andExpect(jsonPath("$.message").value(not(containsString("uk_tournaments_name"))));
    }

    @Test
    void dataIntegrityViolation_notNullViolation_returns400Not409() throws Exception {
        mockMvc.perform(get("/test-errors/not-null-violation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Required data is missing or invalid."))
                .andExpect(jsonPath("$.message").value(not(containsString("ic_or_passport"))));
    }

    @Test
    void dataIntegrityViolation_checkViolation_returns400() throws Exception {
        mockMvc.perform(get("/test-errors/check-violation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Data validation constraint violated."))
                .andExpect(jsonPath("$.message").value(not(containsString("chk_persons"))));
    }

    @Test
    void genericException_returns500WithCorrelationIdAndNoInternalDetail() throws Exception {
        mockMvc.perform(get("/test-errors/generic-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value(containsString("reference ID:")))
                .andExpect(jsonPath("$.errorCode").isNotEmpty())
                .andExpect(jsonPath("$.message").value(not(containsString("Sensitive internal database connection detail"))))
                .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    void identificationReentryRequired_returns400WithCorrectErrorCode() throws Exception {
        mockMvc.perform(get("/test-errors/identification-reentry"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("IDENTIFICATION_REENTRY_REQUIRED"))
                .andExpect(jsonPath("$.message").value(
                        "Changing date of birth or gender requires re-entering the identification number."))
                // Must not contain any digit in the message
                .andExpect(jsonPath("$.message").value(not(org.hamcrest.Matchers.matchesRegex(".*\\d.*"))));
    }

    @Test
    void identityVerificationMismatch_returns400WithErrorCode() throws Exception {
        mockMvc.perform(get("/test-errors/identity-mismatch"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("IDENTITY_VERIFICATION_MISMATCH"))
                .andExpect(jsonPath("$.message").value("The identification number entered does not match the record on file."));
    }

    @Test
    void identityVerificationNotAllowed_returns409WithErrorCode() throws Exception {
        mockMvc.perform(get("/test-errors/identity-not-allowed"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("IDENTITY_VERIFICATION_NOT_ALLOWED"))
                .andExpect(jsonPath("$.message").value("This record is already verified."));
    }

    @Test
    void identityVerificationLocked_returns429WithErrorCode() throws Exception {
        mockMvc.perform(get("/test-errors/identity-locked"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.errorCode").value("IDENTITY_VERIFICATION_LOCKED"))
                .andExpect(jsonPath("$.message").value("Too many verification attempts for this record. Try again in 15 minutes."));
    }

    @Test
    void duplicateEmailException_returns409WithDuplicateEmailCode() throws Exception {
        mockMvc.perform(get("/test-errors/duplicate-email"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_EMAIL"))
                .andExpect(jsonPath("$.message").value("A person with this email already exists."))
                .andExpect(jsonPath("$.message").value(not(containsString("@"))));
    }

    @Test
    void dataIntegrityViolation_uniqueViolationEmail_returns409WithDuplicateEmailCode() throws Exception {
        mockMvc.perform(get("/test-errors/unique-violation-email"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_EMAIL"))
                .andExpect(jsonPath("$.message").value("A person with this email already exists."))
                .andExpect(jsonPath("$.message").value(not(containsString("idx_persons_email_unique"))))
                .andExpect(jsonPath("$.message").value(not(containsString("@"))));
    }

    @RestController
    @RequestMapping("/test-errors")
    static class TestController {

        @GetMapping("/param")
        public String testParam(@RequestParam("requiredParam") String requiredParam) {
            return "ok: " + requiredParam;
        }

        @PostMapping("/bulk")
        public String testBulk(@RequestBody @Valid List<TestDto> items) {
            return "ok: " + items.size();
        }

        @GetMapping("/unique-violation-ic")
        public String testUniqueViolationIc() {
            SQLException sqlEx = new SQLException("duplicate key value violates unique constraint \"uc_persons_identification_hash\"", "23505");
            ConstraintViolationException cve = new ConstraintViolationException("Unique violation", sqlEx, "uc_persons_identification_hash");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/unique-violation-other")
        public String testUniqueViolationOther() {
            SQLException sqlEx = new SQLException("duplicate key value violates unique constraint \"uk_tournaments_name\"", "23505");
            ConstraintViolationException cve = new ConstraintViolationException("Unique violation", sqlEx, "uk_tournaments_name");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/not-null-violation")
        public String testNotNullViolation() {
            SQLException sqlEx = new SQLException("null value in column \"ic_or_passport\" violates not-null constraint", "23502");
            ConstraintViolationException cve = new ConstraintViolationException("Not null violation", sqlEx, "persons_ic_or_passport_not_null");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/check-violation")
        public String testCheckViolation() {
            SQLException sqlEx = new SQLException("new row for relation \"persons\" violates check constraint \"chk_persons_identification_hash_format\"", "23514");
            ConstraintViolationException cve = new ConstraintViolationException("Check constraint violation", sqlEx, "chk_persons_identification_hash_format");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/generic-error")
        public String testGenericError() {
            throw new RuntimeException("Sensitive internal database connection detail or secret message");
        }

        @GetMapping("/identification-reentry")
        public String testIdentificationReentry() {
            throw new IdentificationReentryRequiredException();
        }

        @GetMapping("/identity-mismatch")
        public String testIdentityMismatch() {
            throw new IdentityVerificationMismatchException();
        }

        @GetMapping("/identity-not-allowed")
        public String testIdentityNotAllowed() {
            throw new IdentityVerificationNotAllowedException("This record is already verified.");
        }

        @GetMapping("/identity-locked")
        public String testIdentityLocked() {
            throw new IdentityVerificationLockedException();
        }

        @GetMapping("/duplicate-email")
        public String testDuplicateEmail() {
            throw new DuplicateEmailException();
        }

        @GetMapping("/unique-violation-email")
        public String testUniqueViolationEmail() {
            SQLException sqlEx = new SQLException("duplicate key value violates unique constraint \"idx_persons_email_unique\"", "23505");
            ConstraintViolationException cve = new ConstraintViolationException("Unique violation", sqlEx, "idx_persons_email_unique");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }
    }

    public static class TestDto {
        @NotBlank(message = "fieldA is required")
        private String fieldA;

        @NotBlank(message = "fieldB is required")
        private String fieldB;

        public TestDto() {
        }

        public TestDto(String fieldA, String fieldB) {
            this.fieldA = fieldA;
            this.fieldB = fieldB;
        }

        public String getFieldA() {
            return fieldA;
        }

        public void setFieldA(String fieldA) {
            this.fieldA = fieldA;
        }

        public String getFieldB() {
            return fieldB;
        }

        public void setFieldB(String fieldB) {
            this.fieldB = fieldB;
        }
    }
}
