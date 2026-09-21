package com.athleticaos.backend.exceptions;

import com.athleticaos.backend.dtos.person.PossibleDuplicateMatch;
import com.fasterxml.jackson.databind.JsonNode;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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
                .andExpect(jsonPath("$.message").value(not(containsString("first_name"))));
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
    void recordVerificationNotAllowed_returns409WithErrorCode() throws Exception {
        mockMvc.perform(get("/test-errors/record-not-allowed"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("RECORD_VERIFICATION_NOT_ALLOWED"))
                .andExpect(jsonPath("$.message").value("This record is already verified."));
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

    @Test
    void emailRequiredException_returns400WithEmailRequiredCode() throws Exception {
        mockMvc.perform(get("/test-errors/email-required"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("EMAIL_REQUIRED"))
                .andExpect(jsonPath("$.message").value("Email is required"));
    }

    @Test
    void possibleDuplicatePersonException_returns409WithCorrectContract() throws Exception {
        String responseContent = mockMvc.perform(get("/test-errors/possible-duplicate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("POSSIBLE_DUPLICATE_PERSON"))
                .andExpect(jsonPath("$.matches").isArray())
                .andExpect(jsonPath("$.otherOrganisationMatches").value(2))
                .andExpect(jsonPath("$.matches[0].registrationNo").value("AOS-000001"))
                .andExpect(jsonPath("$.matches[0].firstName").value("Jane"))
                .andExpect(jsonPath("$.matches[0].lastName").value("Doe"))
                .andExpect(jsonPath("$.matches[0].email").doesNotExist())
                .andExpect(jsonPath("$.matches[0].dob").doesNotExist())
                .andExpect(jsonPath("$.matches[0].id").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        JsonNode root = objectMapper.readTree(responseContent);
        org.assertj.core.api.Assertions.assertThat(root.has("matches")).isTrue();
        org.assertj.core.api.Assertions.assertThat(root.has("otherOrganisationMatches")).isTrue();
        JsonNode matchNode = root.get("matches").get(0);
        org.assertj.core.api.Assertions.assertThat(matchNode.has("registrationNo")).isTrue();
        org.assertj.core.api.Assertions.assertThat(matchNode.has("firstName")).isTrue();
        org.assertj.core.api.Assertions.assertThat(matchNode.has("lastName")).isTrue();
        org.assertj.core.api.Assertions.assertThat(matchNode.has("email")).isFalse();
        org.assertj.core.api.Assertions.assertThat(matchNode.has("dob")).isFalse();
        org.assertj.core.api.Assertions.assertThat(matchNode.has("id")).isFalse();
    }

    @Test
    void noResourceFoundException_returns404WithNeutralMessageAndNoPathEchoed() throws Exception {
        mockMvc.perform(get("/test-errors/resource-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.message").value(not(containsString("sensitive-resource"))));
    }

    @Test
    void noHandlerFoundException_returns404WithNeutralMessageAndNoPathEchoed() throws Exception {
        mockMvc.perform(get("/test-errors/handler-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.message").value(not(containsString("sensitive-handler"))));
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

        @GetMapping("/unique-violation-other")
        public String testUniqueViolationOther() {
            SQLException sqlEx = new SQLException("duplicate key value violates unique constraint \"uk_tournaments_name\"", "23505");
            ConstraintViolationException cve = new ConstraintViolationException("Unique violation", sqlEx, "uk_tournaments_name");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/not-null-violation")
        public String testNotNullViolation() {
            SQLException sqlEx = new SQLException("null value in column \"first_name\" violates not-null constraint", "23502");
            ConstraintViolationException cve = new ConstraintViolationException("Not null violation", sqlEx, "persons_first_name_not_null");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/check-violation")
        public String testCheckViolation() {
            SQLException sqlEx = new SQLException("new row for relation \"persons\" violates check constraint \"chk_persons_gender\"", "23514");
            ConstraintViolationException cve = new ConstraintViolationException("Check constraint violation", sqlEx, "chk_persons_gender");
            throw new DataIntegrityViolationException("Data integrity violation", cve);
        }

        @GetMapping("/generic-error")
        public String testGenericError() {
            throw new RuntimeException("Sensitive internal database connection detail or secret message");
        }

        @GetMapping("/record-not-allowed")
        public String testRecordNotAllowed() {
            throw new RecordVerificationNotAllowedException("This record is already verified.");
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

        @GetMapping("/email-required")
        public String testEmailRequired() {
            throw new EmailRequiredException("Email is required");
        }

        @GetMapping("/possible-duplicate")
        public String testPossibleDuplicate() {
            List<PossibleDuplicateMatch> matches = List.of(
                    new PossibleDuplicateMatch("AOS-000001", "Jane", "Doe")
            );
            throw new PossibleDuplicatePersonException(matches, 2);
        }

        @GetMapping("/resource-not-found")
        public String testResourceNotFound() throws Exception {
            throw new NoResourceFoundException(HttpMethod.GET, "sensitive-resource");
        }

        @GetMapping("/handler-not-found")
        public String testNoHandlerFound() throws Exception {
            throw new NoHandlerFoundException("GET", "/test-errors/sensitive-handler", new HttpHeaders());
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
