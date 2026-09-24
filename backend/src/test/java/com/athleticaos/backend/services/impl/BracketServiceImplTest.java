package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Team;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BracketServiceImplTest {

    @Test
    void nextPowerOfTwoPadsNonStandardDraws() {
        assertEquals(32, BracketServiceImpl.nextPowerOfTwo(22));
        assertEquals(32, BracketServiceImpl.nextPowerOfTwo(32));
        assertEquals(64, BracketServiceImpl.nextPowerOfTwo(33));
    }

    @Test
    void determineKnockoutStagesSupportsDrawsAbove64() {
        List<String> names = BracketServiceImpl.determineKnockoutStages(128).stream()
                .map(info -> info.getName())
                .toList();

        assertEquals(List.of(
                "Round of 128", "Round of 64", "Round of 32", "Round of 16",
                "Quarter Finals", "Semi Finals", "Final"), names);
    }

    @Test
    void nonPowerOfTwoDrawNeverCreatesAnEmptyVersusEmptyOpeningMatch() {
        List<Team> teams = java.util.stream.IntStream.range(0, 22)
                .mapToObj(index -> Team.builder().name("Team " + index).build())
                .toList();
        List<Team> slots = BracketServiceImpl.buildOpeningRoundSlots(teams, 32);

        assertEquals(32, slots.size());
        for (int index = 0; index < slots.size(); index += 2) {
            long populatedSlots = java.util.stream.Stream.of(slots.get(index), slots.get(index + 1))
                    .filter(java.util.Objects::nonNull)
                    .count();
            assertTrue(populatedSlots >= 1);
        }
    }

    @Test
    void rejectsUnreasonablyLargeDrawBeforeIntegerOverflow() {
        assertThrows(IllegalArgumentException.class,
                () -> BracketServiceImpl.nextPowerOfTwo((1 << 20) + 1));
    }

    @Test
    void normalizePlaceholder_trimsCollapsesWhitespaceAndLowercases() {
        assertEquals("round robin 1", BracketServiceImpl.normalizePlaceholder("Round Robin 1"));
        assertEquals("round robin1", BracketServiceImpl.normalizePlaceholder("round robin1"));
        assertEquals("round robin1", BracketServiceImpl.normalizePlaceholder("Round Robin1"));
        assertEquals("round robin 1", BracketServiceImpl.normalizePlaceholder("   Round   Robin   1   "));
        assertEquals("winner pool a", BracketServiceImpl.normalizePlaceholder("Winner Pool A"));
        assertEquals("winner pool a", BracketServiceImpl.normalizePlaceholder("WINNER   POOL   A"));
        assertEquals("runner-up pool b", BracketServiceImpl.normalizePlaceholder("Runner-up Pool B"));
        assertEquals("runner up pool b", BracketServiceImpl.normalizePlaceholder("Runner Up Pool B"));
        assertEquals("seed 1", BracketServiceImpl.normalizePlaceholder("Seed 1"));
        assertNull(BracketServiceImpl.normalizePlaceholder(null));
    }

    @Test
    void getPoolKnockoutPlaceholders_preservesTwoAndFourPoolPairings() {
        // 2 pools
        assertArrayEquals(new String[] { "Winner Pool A", "Runner-up Pool B" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(2, 0, 4));
        assertArrayEquals(new String[] { "Winner Pool B", "Runner-up Pool A" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(2, 1, 4));

        // 4 pools
        assertArrayEquals(new String[] { "Winner Pool A", "Runner-up Pool B" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(4, 0, 8));
        assertArrayEquals(new String[] { "Winner Pool D", "Runner-up Pool C" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(4, 1, 8));
        assertArrayEquals(new String[] { "Winner Pool B", "Runner-up Pool A" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(4, 2, 8));
        assertArrayEquals(new String[] { "Winner Pool C", "Runner-up Pool D" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(4, 3, 8));
    }

    @Test
    void getPoolKnockoutPlaceholders_generatesStandardBracketOrderForOtherPoolCounts() {
        // Standard bracket order for 8 slots: 1v8, 4v5, 3v6, 2v7 (top seeds meet only in final)
        assertArrayEquals(new String[] { "Seed 1", "Seed 8" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 0, 8));
        assertArrayEquals(new String[] { "Seed 4", "Seed 5" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 1, 8));
        assertArrayEquals(new String[] { "Seed 3", "Seed 6" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 2, 8));
        assertArrayEquals(new String[] { "Seed 2", "Seed 7" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 3, 8));

        // 1 pool with 4-team bracket (power of two): 1 v 4, 2 v 3
        assertArrayEquals(new String[] { "Seed 1", "Seed 4" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(1, 0, 4));
        assertArrayEquals(new String[] { "Seed 2", "Seed 3" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(1, 1, 4));

        // 1 pool with 2-team bracket: 1 v 2
        assertArrayEquals(new String[] { "Seed 1", "Seed 2" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(1, 0, 2));

        // Non-power-of-two draw (e.g. 6 slots): keeps consecutive fallback 1 v last, 2 v second-last, ...
        assertArrayEquals(new String[] { "Seed 1", "Seed 6" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 0, 6));
        assertArrayEquals(new String[] { "Seed 2", "Seed 5" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 1, 6));
        assertArrayEquals(new String[] { "Seed 3", "Seed 4" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 2, 6));
    }

    @Test
    void seedBracketsFromStandings_resolvesSeedPoolPositionAndWinnerRunnerUpLabels() {
        com.athleticaos.backend.repositories.MatchRepository matchRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchRepository.class);
        BracketServiceImpl service = new BracketServiceImpl(
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentStageRepository.class),
                matchRepository,
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentTeamRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchEventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchLineupRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchOfficialRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerSuspensionRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MediaAssetRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentVenueRepository.class)
        );

        java.util.UUID tournamentId = java.util.UUID.randomUUID();
        Team team1 = Team.builder().id(java.util.UUID.randomUUID()).name("Team 1").build();
        Team team2 = Team.builder().id(java.util.UUID.randomUUID()).name("Team 2").build();
        Team team3 = Team.builder().id(java.util.UUID.randomUUID()).name("Team 3").build();
        Team team4 = Team.builder().id(java.util.UUID.randomUUID()).name("Team 4").build();

        BracketServiceImpl.PoolStanding s1 = new BracketServiceImpl.PoolStanding(team1);
        s1.poolName = "Pool A";
        s1.poolPosition = 1;

        BracketServiceImpl.PoolStanding s2 = new BracketServiceImpl.PoolStanding(team2);
        s2.poolName = "Pool A";
        s2.poolPosition = 2;

        BracketServiceImpl.PoolStanding s3 = new BracketServiceImpl.PoolStanding(team3);
        s3.poolName = "Pool B";
        s3.poolPosition = 1;

        BracketServiceImpl.PoolStanding s4 = new BracketServiceImpl.PoolStanding(team4);
        s4.poolName = "Pool B";
        s4.poolPosition = 2;

        List<BracketServiceImpl.PoolStanding> ranked = List.of(s1, s3, s2, s4);

        com.athleticaos.backend.entities.TournamentStage stage = com.athleticaos.backend.entities.TournamentStage.builder()
                .isKnockoutStage(true)
                .build();

        // Match A: "Winner Pool A" vs "Runner-up Pool B"
        com.athleticaos.backend.entities.Match matchA = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeamPlaceholder("Winner Pool A")
                .awayTeamPlaceholder("Runner-up Pool B")
                .build();

        // Match B: "Pool A1" vs "Pool B 2"
        com.athleticaos.backend.entities.Match matchB = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeamPlaceholder("Pool A1")
                .awayTeamPlaceholder("Pool B 2")
                .build();

        // Match C: "Seed 1" vs "Seed 4"
        com.athleticaos.backend.entities.Match matchC = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeamPlaceholder("Seed 1")
                .awayTeamPlaceholder("Seed 4")
                .build();

        // Match D: whitespace and case variants: "  winner   pool a  " vs "Runner up Pool B"
        com.athleticaos.backend.entities.Match matchD = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeamPlaceholder("  winner   pool a  ")
                .awayTeamPlaceholder("Runner up Pool B")
                .build();

        // Match E: unresolvable feeder label: "Winner M3" vs "Pool Qualifier" -> must NOT resolve
        com.athleticaos.backend.entities.Match matchE = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeamPlaceholder("Winner M3")
                .awayTeamPlaceholder("Pool Qualifier")
                .build();

        org.mockito.Mockito.when(matchRepository.findByTournamentId(tournamentId))
                .thenReturn(List.of(matchA, matchB, matchC, matchD, matchE));

        service.seedBracketsFromStandings(tournamentId, null, ranked);

        // Match A resolved
        assertEquals(team1, matchA.getHomeTeam());
        assertEquals(team4, matchA.getAwayTeam());
        assertNull(matchA.getHomeTeamPlaceholder());
        assertNull(matchA.getAwayTeamPlaceholder());

        // Match B resolved
        assertEquals(team1, matchB.getHomeTeam());
        assertEquals(team4, matchB.getAwayTeam());
        assertNull(matchB.getHomeTeamPlaceholder());
        assertNull(matchB.getAwayTeamPlaceholder());

        // Match C resolved
        assertEquals(team1, matchC.getHomeTeam());
        assertEquals(team4, matchC.getAwayTeam());
        assertNull(matchC.getHomeTeamPlaceholder());
        assertNull(matchC.getAwayTeamPlaceholder());

        // Match D resolved with case/whitespace variations
        assertEquals(team1, matchD.getHomeTeam());
        assertEquals(team4, matchD.getAwayTeam());
        assertNull(matchD.getHomeTeamPlaceholder());
        assertNull(matchD.getAwayTeamPlaceholder());

        // Match E must NOT resolve
        assertNull(matchE.getHomeTeam());
        assertNull(matchE.getAwayTeam());
        assertEquals("Winner M3", matchE.getHomeTeamPlaceholder());
        assertEquals("Pool Qualifier", matchE.getAwayTeamPlaceholder());

        org.mockito.Mockito.verify(matchRepository).save(matchA);
        org.mockito.Mockito.verify(matchRepository).save(matchB);
        org.mockito.Mockito.verify(matchRepository).save(matchC);
        org.mockito.Mockito.verify(matchRepository).save(matchD);
        org.mockito.Mockito.verify(matchRepository, org.mockito.Mockito.never()).save(matchE);
    }

    @Test
    void seedBracketsFromStandings_neverOverwritesAssignedTeam() {
        com.athleticaos.backend.repositories.MatchRepository matchRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchRepository.class);
        BracketServiceImpl service = new BracketServiceImpl(
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentStageRepository.class),
                matchRepository,
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentTeamRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchEventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchLineupRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchOfficialRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerSuspensionRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MediaAssetRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentVenueRepository.class)
        );

        java.util.UUID tournamentId = java.util.UUID.randomUUID();
        Team assignedTeam = Team.builder().id(java.util.UUID.randomUUID()).name("Manually Assigned Team").build();
        Team rankedWinner = Team.builder().id(java.util.UUID.randomUUID()).name("Pool Winner").build();

        BracketServiceImpl.PoolStanding s1 = new BracketServiceImpl.PoolStanding(rankedWinner);
        s1.poolName = "Pool A";
        s1.poolPosition = 1;

        com.athleticaos.backend.entities.TournamentStage stage = com.athleticaos.backend.entities.TournamentStage.builder()
                .isKnockoutStage(true)
                .build();

        // Match already has homeTeam assigned, placeholder is still "Winner Pool A"
        com.athleticaos.backend.entities.Match match = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeam(assignedTeam)
                .homeTeamPlaceholder("Winner Pool A")
                .build();

        org.mockito.Mockito.when(matchRepository.findByTournamentId(tournamentId))
                .thenReturn(List.of(match));

        service.seedBracketsFromStandings(tournamentId, null, List.of(s1));

        // Must still be assignedTeam, never overwritten
        assertEquals(assignedTeam, match.getHomeTeam());
        // Placeholder preserved if not changed
        assertEquals("Winner Pool A", match.getHomeTeamPlaceholder());
        org.mockito.Mockito.verify(matchRepository, org.mockito.Mockito.never()).save(match);
    }

    @Test
    void getPoolKnockoutPlaceholders_and_seedBracketsFromStandings_supportsCustomPoolNames() {
        // 1. Verify placeholders generated with custom pool names e.g. "Group 1", "Group 2"
        List<String> customPools = List.of("Group 1", "Group 2");
        assertArrayEquals(new String[] { "Winner Group 1", "Runner-up Group 2" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(customPools, 0, 4));
        assertArrayEquals(new String[] { "Winner Group 2", "Runner-up Group 1" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(customPools, 1, 4));

        // 2. Verify seedBracketsFromStandings resolves matches using those custom pool labels
        com.athleticaos.backend.repositories.MatchRepository matchRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchRepository.class);
        BracketServiceImpl service = new BracketServiceImpl(
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentStageRepository.class),
                matchRepository,
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentTeamRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchEventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchLineupRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchOfficialRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerSuspensionRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MediaAssetRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentVenueRepository.class)
        );

        java.util.UUID tournamentId = java.util.UUID.randomUUID();
        Team team1 = Team.builder().id(java.util.UUID.randomUUID()).name("Group 1 Winner").build();
        Team team2 = Team.builder().id(java.util.UUID.randomUUID()).name("Group 2 Runner Up").build();

        BracketServiceImpl.PoolStanding s1 = new BracketServiceImpl.PoolStanding(team1);
        s1.poolName = "Group 1";
        s1.poolPosition = 1;

        BracketServiceImpl.PoolStanding s2 = new BracketServiceImpl.PoolStanding(team2);
        s2.poolName = "Group 2";
        s2.poolPosition = 2;

        com.athleticaos.backend.entities.TournamentStage stage = com.athleticaos.backend.entities.TournamentStage.builder()
                .isKnockoutStage(true)
                .build();

        com.athleticaos.backend.entities.Match match = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID())
                .stage(stage)
                .homeTeamPlaceholder("Winner Group 1")
                .awayTeamPlaceholder("Runner-up Group 2")
                .build();

        org.mockito.Mockito.when(matchRepository.findByTournamentId(tournamentId))
                .thenReturn(List.of(match));

        service.seedBracketsFromStandings(tournamentId, null, List.of(s1, s2));

        assertEquals(team1, match.getHomeTeam());
        assertEquals(team2, match.getAwayTeam());
        assertNull(match.getHomeTeamPlaceholder());
        assertNull(match.getAwayTeamPlaceholder());
        org.mockito.Mockito.verify(matchRepository).save(match);
    }

    @Test
    void ladderAbbreviationsMatchMatchCodeUtils() {
        // Progression and the manual bracket build codes through MatchCodeUtils, the ladder through
        // these literals; they must agree or later-created matches read differently.
        for (BracketServiceImpl.LadderRung rung : BracketServiceImpl.getPlacementLadder()) {
            assertEquals(rung.getAbbr(), com.athleticaos.backend.utils.MatchCodeUtils.bracketAbbr(rung.getType()),
                    "abbreviation for " + rung.getLabel());
        }
    }

    @Test
    @SuppressWarnings("null")
    void ladderOrderOfAllTenTiers() {
        List<BracketServiceImpl.LadderRung> ladder = BracketServiceImpl.getPlacementLadder();
        assertEquals(10, ladder.size());

        // The order IS the placement ranking (rung n covers places 4n+1..4n+4 at the default
        // bracket size), so it is pinned here as a whole before the per-rung assertions.
        assertEquals(
                List.of("Cup", "Plate", "Bowl", "Shield", "Spoon", "Fork",
                        "Saucer", "Chopstick", "Wooden Spoon", "Wooden Fork"),
                ladder.stream().map(BracketServiceImpl.LadderRung::getLabel).toList());

        assertEquals("Cup", ladder.get(0).getLabel());
        assertNull(ladder.get(0).getType());
        assertEquals("CUP", ladder.get(0).getAbbr());

        assertEquals("Plate", ladder.get(1).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.PLATE, ladder.get(1).getType());
        assertEquals("PLT", ladder.get(1).getAbbr());

        assertEquals("Bowl", ladder.get(2).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.BOWL, ladder.get(2).getType());
        assertEquals("BWL", ladder.get(2).getAbbr());

        assertEquals("Shield", ladder.get(3).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.SHIELD, ladder.get(3).getType());
        assertEquals("SHD", ladder.get(3).getAbbr());

        assertEquals("Spoon", ladder.get(4).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.SPOON, ladder.get(4).getType());
        assertEquals("SPN", ladder.get(4).getAbbr());

        assertEquals("Fork", ladder.get(5).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.FORK, ladder.get(5).getType());
        assertEquals("FRK", ladder.get(5).getAbbr());

        assertEquals("Saucer", ladder.get(6).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.SAUCER, ladder.get(6).getType());
        assertEquals("SAU", ladder.get(6).getAbbr());

        assertEquals("Chopstick", ladder.get(7).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.CHOPSTICK, ladder.get(7).getType());
        assertEquals("CHP", ladder.get(7).getAbbr());

        assertEquals("Wooden Spoon", ladder.get(8).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.WOODEN_SPOON, ladder.get(8).getType());
        assertEquals("WSP", ladder.get(8).getAbbr());

        assertEquals("Wooden Fork", ladder.get(9).getLabel());
        assertEquals(com.athleticaos.backend.enums.TournamentStageType.WOODEN_FORK, ladder.get(9).getType());
        assertEquals("WFK", ladder.get(9).getAbbr());
    }

    @Test
    void abbreviationHelperReturnsCorrectThreeLetterCodesForAllTenTiers() {
        assertEquals("CUP", BracketServiceImpl.getStageAbbreviation(null));
        assertEquals("PLT", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.PLATE));
        assertEquals("BWL", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.BOWL));
        assertEquals("SHD", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.SHIELD));
        assertEquals("SAU", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.SAUCER));
        assertEquals("CHP", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.CHOPSTICK));
        assertEquals("SPN", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.SPOON));
        assertEquals("FRK", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.FORK));
        assertEquals("WSP", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.WOODEN_SPOON));
        assertEquals("WFK", BracketServiceImpl.getStageAbbreviation(com.athleticaos.backend.enums.TournamentStageType.WOODEN_FORK));
    }

    @Test
    @SuppressWarnings("null")
    void fortyTeamTournamentGeneratesTenPlacementTiers() {
        com.athleticaos.backend.repositories.TournamentRepository tournamentRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentRepository.class);
        com.athleticaos.backend.repositories.TournamentStageRepository stageRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentStageRepository.class);
        com.athleticaos.backend.repositories.MatchRepository matchRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchRepository.class);
        com.athleticaos.backend.repositories.TournamentTeamRepository teamRepository =
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentTeamRepository.class);

        BracketServiceImpl service = new BracketServiceImpl(
                tournamentRepository,
                stageRepository,
                matchRepository,
                teamRepository,
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchEventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchLineupRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchOfficialRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerSuspensionRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MediaAssetRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentVenueRepository.class)
        );

        java.util.UUID tournamentId = java.util.UUID.randomUUID();
        com.athleticaos.backend.entities.Tournament tournament = com.athleticaos.backend.entities.Tournament.builder()
                .id(tournamentId)
                .name("40-Team Carnival")
                .hasPlacementStages(true)
                .build();

        List<com.athleticaos.backend.entities.TournamentTeam> tournamentTeams = new java.util.ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            Team team = Team.builder().id(java.util.UUID.randomUUID()).name("Club Team " + i).build();
            tournamentTeams.add(com.athleticaos.backend.entities.TournamentTeam.builder()
                    .tournament(tournament)
                    .team(team)
                    .build());
        }

        org.mockito.Mockito.when(tournamentRepository.findById(tournamentId))
                .thenReturn(java.util.Optional.of(tournament));
        org.mockito.Mockito.when(teamRepository.findByTournamentId(tournamentId))
                .thenReturn(tournamentTeams);
        org.mockito.Mockito.when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId))
                .thenReturn(java.util.Collections.emptyList());
        org.mockito.Mockito.when(stageRepository.save(org.mockito.Mockito.any(com.athleticaos.backend.entities.TournamentStage.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.when(matchRepository.save(org.mockito.Mockito.any(com.athleticaos.backend.entities.Match.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.generatePlacementLadder(tournament, 40, 4, 1, null);

        org.mockito.ArgumentCaptor<com.athleticaos.backend.entities.TournamentStage> stageCaptor =
                org.mockito.ArgumentCaptor.forClass(com.athleticaos.backend.entities.TournamentStage.class);
        org.mockito.Mockito.verify(stageRepository, org.mockito.Mockito.atLeast(10)).save(stageCaptor.capture());

        List<com.athleticaos.backend.entities.TournamentStage> savedStages = stageCaptor.getAllValues();
        List<com.athleticaos.backend.enums.TournamentStageType> distinctTypes = savedStages.stream()
                .map(com.athleticaos.backend.entities.TournamentStage::getStageType)
                .distinct()
                .toList();

        // 10 tiers: Cup (SEMI_FINAL/FINAL/THIRD_PLACE) plus 9 named rungs
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.PLATE));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.BOWL));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.SHIELD));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.SAUCER));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.CHOPSTICK));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.SPOON));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.FORK));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.WOODEN_SPOON));
        assertTrue(distinctTypes.contains(com.athleticaos.backend.enums.TournamentStageType.WOODEN_FORK));

        // 10 rungs * 3 stages each = 30 stages created
        assertEquals(30, savedStages.size());
    }

    @Test
    void getPoolKnockoutPlaceholders_eightPoolsSixteenSlotsGeneratesNamedPairingsWithoutSelfMatches() {
        int numberOfPools = 8;
        int totalSlots = 16;
        int openingMatches = 8;

        int winnerAMatchIndex = -1;
        int runnerUpAMatchIndex = -1;
        int winnerBMatchIndex = -1;

        for (int m = 0; m < openingMatches; m++) {
            String[] pair = BracketServiceImpl.getPoolKnockoutPlaceholders(numberOfPools, m, totalSlots);
            assertEquals(2, pair.length);
            assertTrue(pair[0].startsWith("Winner "));
            assertTrue(pair[1].startsWith("Runner-up "));

            String homePool = pair[0].substring("Winner ".length());
            String awayPool = pair[1].substring("Runner-up ".length());

            // No match pairs a pool against itself
            assertNotEquals(homePool, awayPool, "Match " + m + " pairs pool " + homePool + " against itself");

            if ("Pool A".equals(homePool)) {
                winnerAMatchIndex = m;
            }
            if ("Pool A".equals(awayPool)) {
                runnerUpAMatchIndex = m;
            }
            if ("Pool B".equals(homePool)) {
                winnerBMatchIndex = m;
            }
        }

        // Verify Match 0 has Winner Pool A vs Runner-up Pool B
        assertArrayEquals(new String[] { "Winner Pool A", "Runner-up Pool B" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(numberOfPools, 0, totalSlots));

        // In an 8-match opening round:
        // Top half: matches 0, 1, 2, 3 (indices 0..3)
        // Bottom half: matches 4, 5, 6, 7 (indices 4..7)
        assertTrue(winnerAMatchIndex >= 0 && winnerAMatchIndex < 4, "Winner A must be in top half");
        assertTrue(runnerUpAMatchIndex >= 4 && runnerUpAMatchIndex < 8, "Runner-up A must be in bottom half");
        assertTrue(winnerBMatchIndex >= 4 && winnerBMatchIndex < 8, "Winner B must be in bottom half");

        // Winner A and Runner-up A on opposite sides of the bracket
        assertTrue((winnerAMatchIndex < 4 && runnerUpAMatchIndex >= 4)
                || (winnerAMatchIndex >= 4 && runnerUpAMatchIndex < 4));

        // Winner A and Winner B on opposite sides of the bracket
        assertTrue((winnerAMatchIndex < 4 && winnerBMatchIndex >= 4)
                || (winnerAMatchIndex >= 4 && winnerBMatchIndex < 4));

        // Verify all 8 pools appear exactly twice: once as Winner, once as Runner-up
        java.util.Map<String, Integer> winnerCount = new java.util.HashMap<>();
        java.util.Map<String, Integer> runnerUpCount = new java.util.HashMap<>();
        for (int m = 0; m < openingMatches; m++) {
            String[] pair = BracketServiceImpl.getPoolKnockoutPlaceholders(numberOfPools, m, totalSlots);
            String homePool = pair[0].substring("Winner ".length());
            String awayPool = pair[1].substring("Runner-up ".length());
            winnerCount.put(homePool, winnerCount.getOrDefault(homePool, 0) + 1);
            runnerUpCount.put(awayPool, runnerUpCount.getOrDefault(awayPool, 0) + 1);
        }
        for (char p = 'A'; p <= 'H'; p++) {
            String pool = "Pool " + p;
            assertEquals(1, winnerCount.getOrDefault(pool, 0), "Pool " + pool + " should have exactly 1 winner");
            assertEquals(1, runnerUpCount.getOrDefault(pool, 0), "Pool " + pool + " should have exactly 1 runner-up");
        }

        // Verify stability across runs
        for (int m = 0; m < openingMatches; m++) {
            String[] run1 = BracketServiceImpl.getPoolKnockoutPlaceholders(numberOfPools, m, totalSlots);
            String[] run2 = BracketServiceImpl.getPoolKnockoutPlaceholders(numberOfPools, m, totalSlots);
            assertArrayEquals(run1, run2, "Output must be deterministic and stable across runs for match " + m);
        }
    }

    @Test
    void getPoolKnockoutPlaceholders_nonPowerOfTwoSlotCountFallsBackSafely() {
        // 3 pools with 6 slots (non-power-of-two): falls back to Seed N
        assertArrayEquals(new String[] { "Seed 1", "Seed 6" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 0, 6));
        assertArrayEquals(new String[] { "Seed 2", "Seed 5" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 1, 6));
        assertArrayEquals(new String[] { "Seed 3", "Seed 4" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(3, 2, 6));

        // 5 pools with 10 slots (non-power-of-two): falls back to Seed N
        assertArrayEquals(new String[] { "Seed 1", "Seed 10" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(5, 0, 10));
        assertArrayEquals(new String[] { "Seed 2", "Seed 9" },
                BracketServiceImpl.getPoolKnockoutPlaceholders(5, 1, 10));
    }

    private static BracketServiceImpl serviceWith(com.athleticaos.backend.repositories.TournamentRepository tournaments,
            com.athleticaos.backend.repositories.TournamentStageRepository stages,
            com.athleticaos.backend.repositories.MatchRepository matches) {
        return new BracketServiceImpl(
                tournaments, stages, matches,
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentTeamRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchEventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchLineupRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchOfficialRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerSuspensionRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MediaAssetRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class),
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentVenueRepository.class));
    }

    private static com.athleticaos.backend.entities.Match poolMatch(com.athleticaos.backend.entities.TournamentStage pool,
            Team home, Team away, Integer homeScore, Integer awayScore,
            com.athleticaos.backend.enums.MatchStatus status) {
        return com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID()).stage(pool).homeTeam(home).awayTeam(away)
                .homeScore(homeScore).awayScore(awayScore).status(status).build();
    }

    @Test
    @SuppressWarnings("null")
    void progressPoolsToKnockout_seedsOnlyCategoriesWhosePoolsAreFinished() {
        var tournaments = org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentRepository.class);
        var stages = org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentStageRepository.class);
        var matches = org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchRepository.class);
        BracketServiceImpl service = serviceWith(tournaments, stages, matches);

        java.util.UUID tournamentId = java.util.UUID.randomUUID();
        com.athleticaos.backend.entities.Tournament tournament = com.athleticaos.backend.entities.Tournament.builder()
                .id(tournamentId).name("JRC").build();
        org.mockito.Mockito.when(tournaments.findById(tournamentId)).thenReturn(java.util.Optional.of(tournament));

        com.athleticaos.backend.entities.TournamentCategory u11 = com.athleticaos.backend.entities.TournamentCategory.builder()
                .id(java.util.UUID.randomUUID()).name("Boys U11").build();
        com.athleticaos.backend.entities.TournamentCategory u16 = com.athleticaos.backend.entities.TournamentCategory.builder()
                .id(java.util.UUID.randomUUID()).name("Boys U16").build();
        com.athleticaos.backend.entities.TournamentStage poolU11 = com.athleticaos.backend.entities.TournamentStage.builder()
                .id(java.util.UUID.randomUUID()).name("Pool A U11").category(u11).isGroupStage(true).build();
        com.athleticaos.backend.entities.TournamentStage poolU16 = com.athleticaos.backend.entities.TournamentStage.builder()
                .id(java.util.UUID.randomUUID()).name("Pool A U16").category(u16).isGroupStage(true).build();
        org.mockito.Mockito.when(stages.findByTournamentIdOrderByDisplayOrderAsc(tournamentId))
                .thenReturn(List.of(poolU11, poolU16));

        Team a = Team.builder().id(java.util.UUID.randomUUID()).name("A").build();
        Team b = Team.builder().id(java.util.UUID.randomUUID()).name("B").build();
        Team c = Team.builder().id(java.util.UUID.randomUUID()).name("C").build();
        Team d = Team.builder().id(java.util.UUID.randomUUID()).name("D").build();
        org.mockito.Mockito.when(matches.findByStageId(poolU11.getId())).thenReturn(List.of(
                poolMatch(poolU11, a, b, 21, 7, com.athleticaos.backend.enums.MatchStatus.COMPLETED)));
        org.mockito.Mockito.when(matches.findByStageId(poolU16.getId())).thenReturn(List.of(
                poolMatch(poolU16, c, d, 14, 0, com.athleticaos.backend.enums.MatchStatus.COMPLETED),
                poolMatch(poolU16, d, c, null, null, com.athleticaos.backend.enums.MatchStatus.SCHEDULED)));

        com.athleticaos.backend.entities.TournamentStage cupU11 = com.athleticaos.backend.entities.TournamentStage.builder()
                .isKnockoutStage(true).category(u11).build();
        com.athleticaos.backend.entities.TournamentStage cupU16 = com.athleticaos.backend.entities.TournamentStage.builder()
                .isKnockoutStage(true).category(u16).build();
        com.athleticaos.backend.entities.Match finalU11 = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID()).stage(cupU11)
                .homeTeamPlaceholder("Pool A U11 1").awayTeamPlaceholder("Pool A U11 2").build();
        com.athleticaos.backend.entities.Match finalU16 = com.athleticaos.backend.entities.Match.builder()
                .id(java.util.UUID.randomUUID()).stage(cupU16)
                .homeTeamPlaceholder("Pool A U16 1").awayTeamPlaceholder("Pool A U16 2").build();
        org.mockito.Mockito.when(matches.findByTournamentId(tournamentId)).thenReturn(List.of(finalU11, finalU16));

        com.athleticaos.backend.dtos.tournament.PoolSeedingResult result = service.progressPoolsToKnockout(tournamentId);

        assertEquals(List.of("Boys U11"), result.getSeededCategories());
        assertEquals(List.of("Boys U16 (1 pool match left)"), result.getSkippedCategories());
        assertEquals(a, finalU11.getHomeTeam());
        assertEquals(b, finalU11.getAwayTeam());
        // The half-played category is left alone, so no provisional team gets locked in.
        assertNull(finalU16.getHomeTeam());
        assertEquals("Pool A U16 1", finalU16.getHomeTeamPlaceholder());
    }

    @Test
    @SuppressWarnings("null")
    void seedCategoryIfPoolsComplete_waitsForTheLastPoolMatchAndCountsCancelledAsDone() {
        var tournaments = org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentRepository.class);
        var stages = org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TournamentStageRepository.class);
        var matches = org.mockito.Mockito.mock(com.athleticaos.backend.repositories.MatchRepository.class);
        BracketServiceImpl service = serviceWith(tournaments, stages, matches);

        java.util.UUID tournamentId = java.util.UUID.randomUUID();
        com.athleticaos.backend.entities.TournamentCategory u14 = com.athleticaos.backend.entities.TournamentCategory.builder()
                .id(java.util.UUID.randomUUID()).name("Boys U14").build();
        com.athleticaos.backend.entities.TournamentStage pool = com.athleticaos.backend.entities.TournamentStage.builder()
                .id(java.util.UUID.randomUUID()).name("Pool A U14").category(u14).isGroupStage(true).build();
        org.mockito.Mockito.when(stages.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)).thenReturn(List.of(pool));

        Team a = Team.builder().id(java.util.UUID.randomUUID()).name("A").build();
        Team b = Team.builder().id(java.util.UUID.randomUUID()).name("B").build();
        org.mockito.Mockito.when(matches.findByStageId(pool.getId())).thenReturn(List.of(
                poolMatch(pool, a, b, 7, 0, com.athleticaos.backend.enums.MatchStatus.COMPLETED),
                poolMatch(pool, b, a, null, null, com.athleticaos.backend.enums.MatchStatus.SCHEDULED)));

        assertEquals(false, service.seedCategoryIfPoolsComplete(tournamentId, u14.getId()));
        org.mockito.Mockito.verify(tournaments, org.mockito.Mockito.never()).findById(tournamentId);

        org.mockito.Mockito.when(matches.findByStageId(pool.getId())).thenReturn(List.of(
                poolMatch(pool, a, b, 7, 0, com.athleticaos.backend.enums.MatchStatus.COMPLETED),
                poolMatch(pool, b, a, null, null, com.athleticaos.backend.enums.MatchStatus.CANCELLED)));
        org.mockito.Mockito.when(tournaments.findById(tournamentId)).thenReturn(java.util.Optional.of(
                com.athleticaos.backend.entities.Tournament.builder().id(tournamentId).name("JRC").build()));
        org.mockito.Mockito.when(matches.findByTournamentId(tournamentId)).thenReturn(List.of());

        assertEquals(true, service.seedCategoryIfPoolsComplete(tournamentId, u14.getId()));
    }
}

