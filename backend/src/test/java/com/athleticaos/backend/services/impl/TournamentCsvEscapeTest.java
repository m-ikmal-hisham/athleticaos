package com.athleticaos.backend.services.impl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class TournamentCsvEscapeTest {

    @InjectMocks
    private TournamentServiceImpl tournamentService;

    @Test
    @DisplayName("escape(null) returns empty string")
    void escape_Null_ReturnsEmptyString() {
        assertThat(tournamentService.escape(null)).isEqualTo("");
    }

    @Test
    @DisplayName("escape plain value returns identical string")
    void escape_PlainValue_ReturnsUnchanged() {
        assertThat(tournamentService.escape("Test Club A")).isEqualTo("Test Club A");
    }

    @Test
    @DisplayName("escape value with comma returns double-quoted string")
    void escape_ValueWithComma_ReturnsQuoted() {
        assertThat(tournamentService.escape("Test, Club")).isEqualTo("\"Test, Club\"");
    }

    @Test
    @DisplayName("escape value with double quote escapes quote and wraps in double quotes")
    void escape_ValueWithDoubleQuote_EscapesAndQuotes() {
        assertThat(tournamentService.escape("Test \"Club\" A")).isEqualTo("\"Test \"\"Club\"\" A\"");
    }

    @Test
    @DisplayName("escape value with newline replaces line break with space and quotes")
    void escape_ValueWithNewline_ReplacesWithSpaceAndQuotes() {
        assertThat(tournamentService.escape("Test\nClub")).isEqualTo("\"Test Club\"");
        assertThat(tournamentService.escape("Test\r\nClub")).isEqualTo("\"Test Club\"");
    }

    @Test
    @DisplayName("escape value with line break and comma preserves line break replacement")
    void escape_ValueWithLineBreakAndComma_ReplacesLineBreakAndQuotes() {
        assertThat(tournamentService.escape("Test\nClub, A")).isEqualTo("\"Test Club, A\"");
        assertThat(tournamentService.escape("Test\r\nClub, \"A\"")).isEqualTo("\"Test Club, \"\"A\"\"\"");
    }

    @Test
    @DisplayName("escape value starting with = prefixes with single quote")
    void escape_StartingWithEquals_PrefixesSingleQuote() {
        assertThat(tournamentService.escape("=1+1")).isEqualTo("'=1+1");
        assertThat(tournamentService.escape("=cmd,calc")).isEqualTo("\"'=cmd,calc\"");
    }

    @Test
    @DisplayName("escape value starting with + prefixes with single quote")
    void escape_StartingWithPlus_PrefixesSingleQuote() {
        assertThat(tournamentService.escape("+44123456789")).isEqualTo("'+44123456789");
        assertThat(tournamentService.escape("+44,123")).isEqualTo("\"'+44,123\"");
    }

    @Test
    @DisplayName("escape value starting with - prefixes with single quote")
    void escape_StartingWithMinus_PrefixesSingleQuote() {
        assertThat(tournamentService.escape("-100")).isEqualTo("'-100");
        assertThat(tournamentService.escape("-100,50")).isEqualTo("\"'-100,50\"");
    }

    @Test
    @DisplayName("escape value starting with @ prefixes with single quote")
    void escape_StartingWithAt_PrefixesSingleQuote() {
        assertThat(tournamentService.escape("@username")).isEqualTo("'@username");
        assertThat(tournamentService.escape("@user,name")).isEqualTo("\"'@user,name\"");
    }

    @Test
    @DisplayName("escape value starting with tab prefixes with single quote")
    void escape_StartingWithTab_PrefixesSingleQuote() {
        assertThat(tournamentService.escape("\tvalue")).isEqualTo("'\tvalue");
        assertThat(tournamentService.escape("\tvalue,item")).isEqualTo("\"'\tvalue,item\"");
    }

    @Test
    @DisplayName("escape value starting with carriage return prefixes with single quote, replaces break, and quotes")
    void escape_StartingWithCarriageReturn_PrefixesAndReplaces() {
        assertThat(tournamentService.escape("\rvalue")).isEqualTo("\"' value\"");
    }
}
