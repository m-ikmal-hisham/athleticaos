package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.contact.ContactRequest;
import com.athleticaos.backend.enums.ContactSubject;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.ContactRateLimiter;
import com.athleticaos.backend.services.ContactService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicContactController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PublicContactControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ContactService contactService;

    @MockBean
    private ContactRateLimiter contactRateLimiter;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Valid submission returns 202 Accepted with {\"status\":\"received\"}")
    void submitContact_validPayload_returns202() throws Exception {
        when(contactRateLimiter.tryAcquire(anyString())).thenReturn(true);

        ContactRequest request = ContactRequest.builder()
                .name("Alex Wong")
                .email("alex@example.com")
                .organisation("Rugby Union")
                .subject(ContactSubject.PARTNERSHIP)
                .message("Inquiring about tournament integration partnership.")
                .build();

        mockMvc.perform(post("/api/public/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("received"));

        verify(contactService).processContactMessage(any(ContactRequest.class));
    }

    @Test
    @DisplayName("Rate limited request returns 429 with expected message")
    void submitContact_rateLimited_returns429() throws Exception {
        when(contactRateLimiter.tryAcquire(anyString())).thenReturn(false);

        ContactRequest request = ContactRequest.builder()
                .name("Alex Wong")
                .email("alex@example.com")
                .subject(ContactSubject.GENERAL)
                .message("General enquiry about membership.")
                .build();

        mockMvc.perform(post("/api/public/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many messages. Please try again later."));

        verify(contactService, never()).processContactMessage(any());
    }

    @Test
    @DisplayName("Invalid payload returns 400 Bad Request via GlobalExceptionHandler")
    void submitContact_invalidPayload_returns400() throws Exception {
        ContactRequest invalid = ContactRequest.builder()
                .name("A") // min 2
                .email("not-an-email") // invalid email
                .subject(null) // required
                .message("short") // min 10
                .build();

        mockMvc.perform(post("/api/public/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists());

        verify(contactService, never()).processContactMessage(any());
    }
}
