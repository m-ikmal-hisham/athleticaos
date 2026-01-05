-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 2. Organisations
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    org_type VARCHAR(20) NOT NULL, -- NATIONAL, STATE, DISTRICT, CLUB, SCHOOL
    parent_org_id UUID REFERENCES organisations(id),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    logo_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_organisations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, organisation_id, role)
);

-- 3. People & Players
CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL, -- MALE, FEMALE
    dob DATE NOT NULL,
    ic_or_passport VARCHAR(255) NOT NULL, -- Encrypted
    nationality VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- ACTIVE, INACTIVE, BANNED
    dominant_hand VARCHAR(10),
    dominant_leg VARCHAR(10),
    height_cm INT,
    weight_kg INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_season_lifecycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    season_year INT NOT NULL,
    age_group VARCHAR(10) NOT NULL,
    auto_age_up BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(player_id, season_year)
);

-- 4. Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL, -- MENS, WOMENS, MIXED
    age_group VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    position_primary VARCHAR(20),
    position_secondary VARCHAR(20),
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(team_id, player_id)
);

-- 5. Tournaments & Matches
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL, -- NATIONAL, STATE, SCHOOL
    organiser_org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pool_number VARCHAR(10),
    UNIQUE(tournament_id, team_id)
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES teams(id),
    away_team_id UUID NOT NULL REFERENCES teams(id),
    status VARCHAR(20) NOT NULL, -- SCHEDULED, LIVE, COMPLETED
    start_time TIMESTAMP NOT NULL,
    field_number VARCHAR(20),
    winner_team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    event_type VARCHAR(30) NOT NULL, -- TRY, CONVERSION, etc.
    minute INT NOT NULL,
    notes TEXT
);

-- 6. Events & Config
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    linked_tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    linked_match_id UUID REFERENCES matches(id) ON DELETE SET NULL
);

CREATE TABLE theme_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    logo_url VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
