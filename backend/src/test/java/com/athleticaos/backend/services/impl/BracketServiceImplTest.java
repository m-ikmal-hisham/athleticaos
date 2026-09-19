package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Team;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class)
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
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class)
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
                org.mockito.Mockito.mock(com.athleticaos.backend.repositories.EventRepository.class)
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
}

