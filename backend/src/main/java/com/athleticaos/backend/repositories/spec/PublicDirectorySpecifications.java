package com.athleticaos.backend.repositories.spec;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.TournamentPlayer;
import com.athleticaos.backend.entities.TournamentTeam;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Database-side filters for the public players / teams directories.
 *
 * <p>Each specification fetches its to-one association (player → person, team → organisation)
 * for the page query and uses a plain join for the count query, and sets its own ORDER BY
 * (so callers pass an unsorted {@code Pageable}). Membership filters use EXISTS subqueries so
 * a player in several teams is never returned twice and the count stays exact.
 */
public final class PublicDirectorySpecifications {

    private static final char ESCAPE = '\\';

    private PublicDirectorySpecifications() {
    }

    public enum PlayerSort {
        /** Last name, first name, id. */
        NAME,
        /** Newest first (createdAt desc, id). */
        RECENT;

        public static PlayerSort from(String value) {
            return value != null && "recent".equalsIgnoreCase(value.trim()) ? RECENT : NAME;
        }
    }

    public static Specification<Player> publicPlayers(String search, String state, String position,
            UUID teamId, UUID tournamentId, PlayerSort sort) {
        return (root, query, cb) -> {
            boolean count = isCountQuery(query);
            Join<Player, Person> person = count
                    ? root.join("person", JoinType.INNER)
                    : fetchJoin(root, "person", JoinType.INNER);

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("deleted")));

            String q = normalize(search);
            if (q != null) {
                String pattern = containsPattern(q);
                Expression<String> first = cb.lower(person.get("firstName"));
                Expression<String> last = cb.lower(person.get("lastName"));

                Subquery<Integer> teamName = query.subquery(Integer.class);
                Root<PlayerTeam> pt = teamName.from(PlayerTeam.class);
                teamName.select(cb.literal(1)).where(
                        cb.equal(pt.get("player"), root),
                        cb.isTrue(pt.get("isActive")),
                        cb.like(cb.lower(pt.get("team").get("name")), pattern, ESCAPE));

                predicates.add(cb.or(
                        cb.like(first, pattern, ESCAPE),
                        cb.like(last, pattern, ESCAPE),
                        cb.like(cb.concat(cb.concat(first, " "), last), pattern, ESCAPE),
                        cb.like(cb.lower(root.get("slug")), pattern, ESCAPE),
                        cb.exists(teamName)));
            }

            String st = normalizeOption(state);
            if (st != null) {
                predicates.add(cb.equal(cb.lower(person.get("state")), st));
            }

            String pos = normalizeOption(position);
            if (pos != null) {
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<PlayerTeam> pt = sub.from(PlayerTeam.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(pt.get("player"), root),
                        cb.isTrue(pt.get("isActive")),
                        cb.like(cb.lower(pt.get("position")), containsPattern(pos), ESCAPE));
                predicates.add(cb.exists(sub));
            }

            if (teamId != null) {
                // Same rule as PlayerTeamRepository.findPlayersByTeamId
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<PlayerTeam> pt = sub.from(PlayerTeam.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(pt.get("player"), root),
                        cb.isTrue(pt.get("isActive")),
                        cb.equal(pt.get("team").get("id"), teamId));
                predicates.add(cb.exists(sub));
            }

            if (tournamentId != null) {
                // Same rule as TournamentPlayerRepository.findByTournamentIdAndIsActiveTrueWithPlayerAndPerson
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<TournamentPlayer> tp = sub.from(TournamentPlayer.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(tp.get("player"), root),
                        cb.isTrue(tp.get("isActive")),
                        cb.equal(tp.get("tournament").get("id"), tournamentId));
                predicates.add(cb.exists(sub));
            }

            if (!count) {
                if (sort == PlayerSort.RECENT) {
                    query.orderBy(cb.desc(root.get("createdAt")), cb.asc(root.get("id")));
                } else {
                    query.orderBy(
                            cb.asc(cb.lower(person.get("lastName"))),
                            cb.asc(cb.lower(person.get("firstName"))),
                            cb.asc(root.get("id")));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Team> publicTeams(String search, String category, String state, UUID tournamentId) {
        return (root, query, cb) -> {
            boolean count = isCountQuery(query);
            Join<Team, Organisation> organisation = count
                    ? root.join("organisation", JoinType.LEFT)
                    : fetchJoin(root, "organisation", JoinType.LEFT);

            List<Predicate> predicates = new ArrayList<>();
            // Same rule as TeamRepository.findAllActiveWithOrganisation
            predicates.add(activeTeam(root, cb));

            String q = normalize(search);
            if (q != null) {
                String pattern = containsPattern(q);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern, ESCAPE),
                        cb.like(cb.lower(root.get("shortName")), pattern, ESCAPE),
                        cb.like(cb.lower(organisation.get("name")), pattern, ESCAPE),
                        cb.like(cb.lower(root.get("state")), pattern, ESCAPE)));
            }

            String cat = normalizeOption(category);
            if (cat != null) {
                predicates.add(cb.equal(cb.lower(root.get("category")), cat));
            }

            String st = normalizeOption(state);
            if (st != null) {
                predicates.add(cb.equal(cb.lower(root.get("state")), st));
            }

            if (tournamentId != null) {
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<TournamentTeam> tt = sub.from(TournamentTeam.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(tt.get("team"), root),
                        cb.isTrue(tt.get("isActive")),
                        cb.isFalse(tt.get("deleted")),
                        cb.equal(tt.get("tournament").get("id"), tournamentId));
                predicates.add(cb.exists(sub));
            }

            if (!count) {
                query.orderBy(cb.asc(cb.lower(root.get("name"))), cb.asc(root.get("id")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate activeTeam(Root<Team> root, CriteriaBuilder cb) {
        Expression<String> status = root.get("status");
        return cb.or(cb.isNull(status), cb.notEqual(cb.lower(status), "inactive"));
    }

    @SuppressWarnings("unchecked")
    private static <X, Y> Join<X, Y> fetchJoin(Root<X> root, String attribute, JoinType type) {
        // Hibernate's fetch implementation is also a Join, so it can be used in predicates and ORDER BY.
        return (Join<X, Y>) root.fetch(attribute, type);
    }

    private static boolean isCountQuery(CriteriaQuery<?> query) {
        Class<?> type = query.getResultType();
        return Long.class.equals(type) || long.class.equals(type);
    }

    /** Trimmed, lower-cased search text, or null when blank. */
    static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    /** Like {@link #normalize} but "all" also means no filter (dropdown default). */
    static String normalizeOption(String value) {
        String normalized = normalize(value);
        return normalized == null || "all".equals(normalized) ? null : normalized;
    }

    /** {@code %text%} with LIKE wildcards in the user's text escaped. */
    static String containsPattern(String lowerCased) {
        String escaped = lowerCased
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
