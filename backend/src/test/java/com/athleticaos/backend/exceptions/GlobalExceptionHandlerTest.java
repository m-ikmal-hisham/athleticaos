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
