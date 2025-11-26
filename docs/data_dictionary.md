# Data Dictionary - AthleticaOS Rugby

## 1. User & Access Management

### User
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| email | VARCHAR | 255 | No | Unique email address. |
| password_hash | VARCHAR | 255 | No | BCrypt hashed password. |
| phone | VARCHAR | 20 | Yes | Contact number. |
| is_active | BOOLEAN | - | No | Account status (default: true). |
| created_at | TIMESTAMP | - | No | Record creation time. |
| updated_at | TIMESTAMP | - | No | Record update time. |

### Role
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | INT | - | No | Primary Key. |
| name | VARCHAR | 50 | No | Role name (e.g., ROLE_ADMIN). |

### User_Role
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| user_id | UUID | - | No | FK to User. |
| role_id | INT | - | No | FK to Role. |

### Organisation
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| name | VARCHAR | 100 | No | Organisation name. |
| org_type | VARCHAR | 20 | No | ENUM: NATIONAL, STATE, DISTRICT, CLUB, SCHOOL. |
| parent_org_id | UUID | - | Yes | FK to Organisation (Parent). |
| primary_color | VARCHAR | 7 | Yes | Hex code (e.g., #FF0000). |
| secondary_color | VARCHAR | 7 | Yes | Hex code. |
| logo_url | VARCHAR | 255 | Yes | URL to logo image. |
| created_at | TIMESTAMP | - | No | Record creation time. |

### User_Organisation
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| user_id | UUID | - | No | FK to User. |
| organisation_id | UUID | - | No | FK to Organisation. |
| role | VARCHAR | 50 | No | Role within org (e.g., CLUB_ADMIN). |

## 2. Player Management

### Person
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| first_name | VARCHAR | 100 | No | First name. |
| last_name | VARCHAR | 100 | No | Last name. |
| gender | VARCHAR | 10 | No | MALE / FEMALE. |
| dob | DATE | - | No | Date of Birth. |
| ic_or_passport | VARCHAR | 255 | No | **ENCRYPTED** ID number. |
| nationality | VARCHAR | 50 | No | Country code (e.g., MY). |
| email | VARCHAR | 255 | Yes | Personal email. |
| phone | VARCHAR | 20 | Yes | Personal phone. |
| address | TEXT | - | Yes | Residential address. |
| created_at | TIMESTAMP | - | No | Record creation time. |

### Player
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| person_id | UUID | - | No | FK to Person. |
| status | VARCHAR | 20 | No | ACTIVE, INACTIVE, BANNED. |
| dominant_hand | VARCHAR | 10 | Yes | LEFT / RIGHT. |
| dominant_leg | VARCHAR | 10 | Yes | LEFT / RIGHT. |
| height_cm | INT | - | Yes | Height in cm. |
| weight_kg | INT | - | Yes | Weight in kg. |
| created_at | TIMESTAMP | - | No | Record creation time. |

### Player_Season_Lifecycle
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| player_id | UUID | - | No | FK to Player. |
| organisation_id | UUID | - | No | FK to Organisation (Club/School). |
| season_year | INT | - | No | Year (e.g., 2025). |
| age_group | VARCHAR | 10 | No | Calculated age group (e.g., U15). |
| auto_age_up | BOOLEAN | - | No | Flag for auto-progression. |

## 3. Team & Match Management

### Team
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| organisation_id | UUID | - | No | FK to Organisation. |
| name | VARCHAR | 100 | No | Team name (e.g., "U15 Tigers"). |
| category | VARCHAR | 20 | No | MENS, WOMENS, MIXED. |
| age_group | VARCHAR | 10 | No | Target age group. |
| created_at | TIMESTAMP | - | No | Record creation time. |

### Team_Player
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| team_id | UUID | - | No | FK to Team. |
| player_id | UUID | - | No | FK to Player. |
| position_primary | VARCHAR | 20 | Yes | e.g., PROP, FLYHALF. |
| position_secondary | VARCHAR | 20 | Yes | Alternate position. |
| joined_at | DATE | - | No | Date joined team. |

### Tournament
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| name | VARCHAR | 100 | No | Tournament name. |
| level | VARCHAR | 20 | No | NATIONAL, STATE, SCHOOL. |
| organiser_org_id | UUID | - | No | FK to Organisation. |
| start_date | DATE | - | No | Start date. |
| end_date | DATE | - | No | End date. |
| venue | VARCHAR | 255 | No | Main venue location. |
| is_published | BOOLEAN | - | No | Visibility flag. |
| created_at | TIMESTAMP | - | No | Record creation time. |

### Match
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| tournament_id | UUID | - | No | FK to Tournament. |
| home_team_id | UUID | - | No | FK to Team. |
| away_team_id | UUID | - | No | FK to Team. |
| status | VARCHAR | 20 | No | SCHEDULED, LIVE, COMPLETED. |
| start_time | TIMESTAMP | - | No | Kick-off time. |
| field_number | VARCHAR | 20 | Yes | Field identifier. |
| winner_team_id | UUID | - | Yes | FK to Team (Winner). |
| created_at | TIMESTAMP | - | No | Record creation time. |

### Match_Event
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| match_id | UUID | - | No | FK to Match. |
| player_id | UUID | - | Yes | FK to Player (Subject). |
| event_type | VARCHAR | 30 | No | TRY, CONVERSION, RED_CARD, etc. |
| minute | INT | - | No | Match minute (1-80+). |
| notes | TEXT | - | Yes | Optional remarks. |

## 4. System & Config

### Audit_Log
| Field | Type | Length | Nullable | Description |
|---|---|---|---|---|
| id | UUID | - | No | Primary Key. |
| user_id | UUID | - | No | FK to User (Actor). |
| action | VARCHAR | 50 | No | Action type (e.g., CREATE_PLAYER). |
| entity | VARCHAR | 50 | No | Target entity name. |
| entity_id | UUID | - | No | Target entity ID. |
| timestamp | TIMESTAMP | - | No | Time of action. |
