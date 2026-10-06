package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.contact.ContactRequest;
import com.athleticaos.backend.services.ContactRateLimiter;
import com.athleticaos.backend.services.ContactService;
import com.athleticaos.backend.utils.ClientIpUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/contact")
public class PublicContactController {

    private final ContactService contactService;
    private final ContactRateLimiter contactRateLimiter;

    public PublicContactController(ContactService contactService, ContactRateLimiter contactRateLimiter) {
        this.contactService = contactService;
        this.contactRateLimiter = contactRateLimiter;
    }

    @PostMapping
    public ResponseEntity<?> submitContact(
            @Valid @RequestBody ContactRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = ClientIpUtils.getClientIp(httpRequest);
        if (!contactRateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many messages. Please try again later."));
        }

        contactService.processContactMessage(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("status", "received"));
    }
}
