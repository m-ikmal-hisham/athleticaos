# Refined ERD Documentation - AthleticaOS Rugby

## 1. Overview
This document details the Entity-Relationship Diagram (ERD) for the AthleticaOS Rugby module. The schema is designed to support a hierarchical organisation structure, comprehensive player lifecycle management, and detailed match event logging.

## 2. Entity Relationships

### 2.1 User & Organisation Hierarchy
- **User <-> Role**: Many-to-Many relationship managed by `User_Role`. Allows users to have multiple system-wide roles.
- **Organisation (Self-Referencing)**: `parent_org_id` allows for an infinite hierarchy (National -> State -> District -> Club).
- **User <-> Organisation**: Many-to-Many via `User_Organisation`. A user can be an Admin for a Club and a Coach for a specific Team.

### 2.2 Player Identity & Lifecycle
- **Person -> Player**: One-to-One. `Person` holds PII (Personal Identifiable Information) which is strictly protected. `Player` holds rugby-specific attributes.
- **Player -> Player_Season_Lifecycle**: One-to-Many. Tracks a player's status and age group for each specific year/season. This enables historical tracking of a player's development.

### 2.3 Team Structure
- **Organisation -> Team**: One-to-Many. An organisation (Club/School) can have multiple teams (U15, U18, Senior).
- **Team <-> Player**: Many-to-Many via `Team_Player`. A player can belong to multiple teams over time, or even concurrently (e.g., School Team and State Team).

### 2.4 Tournament & Matches
- **Organisation -> Tournament**: One-to-Many. An organisation (e.g., State Union) creates and owns tournaments.
- **Tournament -> Team**: Many-to-Many via `Tournament_Team`. Tracks which teams are participating in a specific tournament.
- **Tournament -> Match**: One-to-Many. A tournament consists of multiple matches.
- **Match -> Match_Event**: One-to-Many. Each match has a log of events (scores, cards, subs).

## 3. Diagram Source
The following Graphviz DOT definition represents the refined schema:

```dot
digraph ERD {
  node [shape=record, fontname=Helvetica];
  User [label="{User|id|email|password_hash|phone|is_active|created_at|updated_at}"];
  Role [label="{Role|id|name}"];
  User_Role [label="{User_Role|user_id|role_id}"];
  Organisation [label="{Organisation|id|name|org_type|parent_org_id|primary_color|secondary_color|logo_url|created_at}"];
  User_Organisation [label="{User_Organisation|user_id|organisation_id|role}"];
  Person [label="{Person|id|first_name|last_name|gender|dob|ic_or_passport|nationality|email|phone|address|created_at}"];
  Player [label="{Player|id|person_id|status|dominant_hand|dominant_leg|height_cm|weight_kg|created_at}"];
  Player_Season_Lifecycle [label="{Player_Season_Lifecycle|id|player_id|organisation_id|season_year|age_group|auto_age_up}"];
  Team [label="{Team|id|organisation_id|name|category|age_group|created_at}"];
  Team_Player [label="{Team_Player|id|team_id|player_id|position_primary|position_secondary|joined_at}"];
  Tournament [label="{Tournament|id|name|level|organiser_org_id|start_date|end_date|venue|is_published|created_at}"];
  Tournament_Team [label="{Tournament_Team|id|tournament_id|team_id|pool_number}"];
  Match [label="{Match|id|tournament_id|home_team_id|away_team_id|status|start_time|field_number|winner_team_id|created_at}"];
  Match_Event [label="{Match_Event|id|match_id|player_id|event_type|minute|notes}"];
  Event [label="{Event|id|organisation_id|title|description|event_type|start_datetime|end_datetime|linked_tournament_id|linked_match_id}"];
  Theme_Config [label="{Theme_Config|id|organisation_id|primary_color|secondary_color|logo_url|updated_at}"];
  Audit_Log [label="{Audit_Log|id|user_id|action|entity|entity_id|timestamp}"];

  User_Role -> User;
  User_Role -> Role;
  User_Organisation -> User;
  User_Organisation -> Organisation;
  Player -> Person;
  Player_Season_Lifecycle -> Player;
  Player_Season_Lifecycle -> Organisation;
  Team -> Organisation;
  Team_Player -> Team;
  Team_Player -> Player;
  Tournament_Team -> Tournament;
  Tournament_Team -> Team;
  Match -> Tournament;
  Match_Event -> Match;
  Match_Event -> Player;
  Event -> Organisation;
  Theme_Config -> Organisation;
  Audit_Log -> User;
}
```
