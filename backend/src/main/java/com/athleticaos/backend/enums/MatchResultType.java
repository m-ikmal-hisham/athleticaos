package com.athleticaos.backend.enums;

/**
 * How a match result came about.
 *
 * A null value means the same thing as {@link #NORMAL} — a match played and decided on
 * scores — so existing rows need no backfill.
 */
public enum MatchResultType {
    /** Played out, winner derived from the scores. */
    NORMAL,

    /** One side forfeited or failed to appear. The winner is recorded explicitly. */
    WALKOVER,

    /** No opponent, so nothing was played. The single entered team advances. */
    BYE
}
