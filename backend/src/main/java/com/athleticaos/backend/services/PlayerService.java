package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final PersonRepository personRepository;

    public List<PlayerResponse> getAllPlayers() {
        return playerRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public PlayerResponse getPlayerById(UUID id) {
        return playerRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public PlayerResponse createPlayer(PlayerCreateRequest request) {
        // Create Person first
        Person person = Person.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .gender(request.getGender())
                .dob(request.getDob())
                .icOrPassport(request.getIcOrPassport()) // Should be encrypted in real impl
                .nationality(request.getNationality())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .build();

        person = personRepository.save(person);

        // Create Player
        Player player = Player.builder()
                .person(person)
                .status("ACTIVE")
                .dominantHand(request.getDominantHand())
                .dominantLeg(request.getDominantLeg())
                .heightCm(request.getHeightCm())
                .weightKg(request.getWeightKg())
                .build();

        return mapToResponse(playerRepository.save(player));
    }

    private PlayerResponse mapToResponse(Player player) {
        Person p = player.getPerson();
        return PlayerResponse.builder()
                .id(player.getId())
                .personId(p.getId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .gender(p.getGender())
                .dob(p.getDob())
                .nationality(p.getNationality())
                .status(player.getStatus())
                .dominantHand(player.getDominantHand())
                .dominantLeg(player.getDominantLeg())
                .heightCm(player.getHeightCm())
                .weightKg(player.getWeightKg())
                .build();
    }
}
