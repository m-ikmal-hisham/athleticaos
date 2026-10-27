package com.athleticaos.backend.services.standings;

public record TeamMatchPoints(
        int tablePoints,
        int basePoints,
        int bonusPoints,
        int tryBonusPoints,
        int losingBonusPoints,
        boolean triesKnown
) {
    public static TeamMatchPoints zero(boolean triesKnown) {
        return new TeamMatchPoints(0, 0, 0, 0, 0, triesKnown);
    }
}
