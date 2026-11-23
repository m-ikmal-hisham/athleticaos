package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.certificate.PublicCertificateVerificationResponse;
import com.athleticaos.backend.services.CertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/certificates")
@RequiredArgsConstructor
public class PublicCertificateController {

    private final CertificateService certificateService;

    @GetMapping("/{code}")
    public ResponseEntity<PublicCertificateVerificationResponse> verify(@PathVariable String code) {
        PublicCertificateVerificationResponse response = certificateService.verifyPublic(code);
        return ResponseEntity.ok()
                .header("X-Robots-Tag", "noindex, nofollow")
                .cacheControl(CacheControl.noStore())
                .body(response);
    }
}
