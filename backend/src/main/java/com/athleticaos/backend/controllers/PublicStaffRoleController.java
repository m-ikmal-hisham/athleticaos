package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.team.StaffRoleDTO;
import com.athleticaos.backend.repositories.StaffRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/staff-roles")
@RequiredArgsConstructor
public class PublicStaffRoleController {

    private final StaffRoleRepository staffRoleRepository;

    @GetMapping
    public ResponseEntity<List<StaffRoleDTO>> getStaffRoles() {
        List<StaffRoleDTO> roles = staffRoleRepository.findAll().stream()
                .map(role -> StaffRoleDTO.builder()
                        .id(role.getId())
                        .name(role.getName())
                        .description(role.getDescription())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }
}
