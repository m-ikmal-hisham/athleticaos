package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchFormatTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/match-formats")
@RequiredArgsConstructor
public class MatchFormatController {

    @GetMapping("/templates")
    public ResponseEntity<List<MatchFormatTemplate>> getTemplates() {
        return ResponseEntity.ok(List.of(
                MatchFormatTemplate.builder()
                        .formatCode("RUGBY_XV")
                        .label("Rugby XV")
                        .startingPlayers(15)
                        .substitutes(8)
                        .periods(2)
                        .periodDuration(40)
                        .build(),
                MatchFormatTemplate.builder()
                        .formatCode("RUGBY_7S")
                        .label("Rugby 7s")
                        .startingPlayers(7)
                        .substitutes(5)
                        .periods(2)
                        .periodDuration(7)
                        .build(),
                MatchFormatTemplate.builder()
                        .formatCode("RUGBY_10S")
                        .label("Rugby 10s")
                        .startingPlayers(10)
                        .substitutes(8)
                        .periods(2)
                        .periodDuration(10)
                        .build(),
                MatchFormatTemplate.builder()
                        .formatCode("RUGBY_LEAGUE")
                        .label("Rugby League")
                        .startingPlayers(13)
                        .substitutes(4)
                        .periods(2)
                        .periodDuration(40)
                        .build()));
    }
}
