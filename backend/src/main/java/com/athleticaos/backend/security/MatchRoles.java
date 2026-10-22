package com.athleticaos.backend.security;

public final class MatchRoles {

    private MatchRoles() {}

    public static final String MATCH_WRITE =
            "hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_ORG_ADMIN','ROLE_CLUB_ADMIN')";

    public static final String OPERATIONS_VIEW =
            "hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_ORG_ADMIN','ROLE_CLUB_ADMIN')";
}
