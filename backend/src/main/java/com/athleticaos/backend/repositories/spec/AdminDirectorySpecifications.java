package com.athleticaos.backend.repositories.spec;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Database-side specifications for admin directory lists (players, teams).
 */
public final class AdminDirectorySpecifications {

    private static final char ESCAPE = '\\';

    private AdminDirectorySpecifications() {
    }

    public enum PlayerSort {
        RECENT,
        NAME;

        public static PlayerSort from(String value) {
            return value != null && "name".equalsIgnoreCase(value.trim()) ? NAME : RECENT;
        }
    }

    /**
     * Builds a specification for admin players list and status counts.
     */
    public static Specification<Player> adminPlayers(
            String search,
            String status,
            UUID teamId,
            Collection<UUID> targetOrgIds,
            boolean restrictToOrgIds,
            boolean isDisjoint,
            PlayerSort sort) {
        return (root, query, cb) -> {
            if (isDisjoint) {
                return cb.disjunction();
            }

            boolean canFetch = isFetchAllowed(query, Player.class);
            Join<Player, Person> person = canFetch
                    ? fetchJoin(root, "person", JoinType.INNER)
                    : root.join("person", JoinType.INNER);

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("deleted")));

            // Scope filter: reproduced via EXISTS subquery matching findPlayersWithPersonByOrganisationIds / findPlayersByTeamId
            if (teamId != null) {
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<PlayerTeam> pt = sub.from(PlayerTeam.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(pt.get("player"), root),
                        cb.isTrue(pt.get("isActive")),
                        cb.equal(pt.get("team").get("id"), teamId));
                predicates.add(cb.exists(sub));
            } else if (restrictToOrgIds) {
                if (targetOrgIds == null || targetOrgIds.isEmpty()) {
                    return cb.disjunction();
                }
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<PlayerTeam> pt = sub.from(PlayerTeam.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(pt.get("player"), root),
                        cb.isTrue(pt.get("isActive")),
                        pt.get("team").get("organisation").get("id").in(targetOrgIds));
                predicates.add(cb.exists(sub));
            }

            // Search filter: trimmed, case-insensitive contains on first name, last name, "first last", email
            String q = normalize(search);
            if (q != null) {
                String pattern = containsPattern(q);
                Expression<String> first = cb.lower(person.get("firstName"));
                Expression<String> last = cb.lower(person.get("lastName"));
                Expression<String> firstLast = cb.concat(cb.concat(first, " "), last);
                Expression<String> email = cb.lower(person.get("email"));

                predicates.add(cb.or(
                        cb.like(first, pattern, ESCAPE),
                        cb.like(last, pattern, ESCAPE),
                        cb.like(firstLast, pattern, ESCAPE),
                        cb.like(email, pattern, ESCAPE)));
            }

            // Status filter: equals
            String st = normalizeOption(status);
            if (st != null) {
                predicates.add(cb.equal(cb.upper(root.get("status")), st.toUpperCase(Locale.ROOT)));
            }

            if (canFetch && query != null) {
                if (sort == PlayerSort.NAME) {
                    query.orderBy(
                            cb.asc(cb.lower(person.get("lastName"))),
                            cb.asc(cb.lower(person.get("firstName"))),
                            cb.asc(root.get("id")));
                } else {
                    query.orderBy(
                            cb.desc(root.get("createdAt")),
                            cb.asc(root.get("id")));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Builds a specification for admin teams list and category counts.
     */
    public static Specification<Team> adminTeams(
            String search,
            String category,
            String ageGroup,
            String state,
            Collection<UUID> targetOrgIds,
            boolean restrictToOrgIds,
            boolean isDisjoint) {
        return (root, query, cb) -> {
            if (isDisjoint) {
                return cb.disjunction();
            }

            boolean canFetch = isFetchAllowed(query, Team.class);
            Join<Team, Organisation> organisation = canFetch
                    ? fetchJoin(root, "organisation", JoinType.LEFT)
                    : root.join("organisation", JoinType.LEFT);

            List<Predicate> predicates = new ArrayList<>();

            // Scope filter: all statuses included
            if (restrictToOrgIds) {
                if (targetOrgIds == null || targetOrgIds.isEmpty()) {
                    return cb.disjunction();
                }
                predicates.add(organisation.get("id").in(targetOrgIds));
            }

            // Search filter: name, shortName, organisation name, division
            String q = normalize(search);
            if (q != null) {
                String pattern = containsPattern(q);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern, ESCAPE),
                        cb.like(cb.lower(root.get("shortName")), pattern, ESCAPE),
                        cb.like(cb.lower(organisation.get("name")), pattern, ESCAPE),
                        cb.like(cb.lower(root.get("division")), pattern, ESCAPE)));
            }

            String cat = normalizeOption(category);
            if (cat != null) {
                predicates.add(cb.equal(cb.lower(root.get("category")), cat));
            }

            String ag = normalizeOption(ageGroup);
            if (ag != null) {
                predicates.add(cb.equal(cb.lower(root.get("ageGroup")), ag));
            }

            String st = normalizeOption(state);
            if (st != null) {
                predicates.add(cb.equal(cb.lower(root.get("state")), st));
            }

            if (canFetch && query != null) {
                query.orderBy(
                        cb.asc(cb.lower(root.get("name"))),
                        cb.asc(root.get("id")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    @SuppressWarnings("unchecked")
    private static <X, Y> Join<X, Y> fetchJoin(Root<X> root, String attribute, JoinType type) {
        return (Join<X, Y>) root.fetch(attribute, type);
    }

    private static boolean isFetchAllowed(CriteriaQuery<?> query, Class<?> targetEntityClass) {
        if (query == null) {
            return false;
        }
        Class<?> type = query.getResultType();
        return type != null && targetEntityClass.isAssignableFrom(type);
    }

    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    public static String normalizeOption(String value) {
        String normalized = normalize(value);
        return normalized == null || "all".equals(normalized) ? null : normalized;
    }

    public static String containsPattern(String lowerCased) {
        String escaped = lowerCased
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
