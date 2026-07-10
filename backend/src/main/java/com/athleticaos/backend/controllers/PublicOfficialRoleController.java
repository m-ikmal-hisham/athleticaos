package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.official.OfficialRoleDTO;
import com.athleticaos.backend.repositories.OfficialRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/official-roles")
@RequiredArgsConstructor
public class PublicOfficialRoleController {

    private final OfficialRoleRepository officialRoleRepository;

    @GetMapping
    public ResponseEntity<List<OfficialRoleDTO>> getOfficialRoles() {
        List<OfficialRoleDTO> roles = officialRoleRepository.findAll().stream()
                .map(role -> OfficialRoleDTO.builder()
                        .id(role.getId())
                        .name(role.getName())
                        .description(role.getDescription())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }
}
