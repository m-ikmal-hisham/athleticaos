# V163 — rehearse the migration on a local restore of staging

Why: Flyway runs V163 automatically when the backend starts, and V163 ends with
an assertion. If that assertion trips on staging, **Flyway fails and the
backend will not boot** — a down API plus a failed `flyway_schema_history` row
to clean up. Ten minutes locally avoids that.

Known versions: staging RDS **17.9**, local `pg_dump` **18.3** (fine — newer
client, older server). `docker-compose.yml` pins **postgres:15-alpine**, which
*cannot* restore a 17.9 dump, so this runbook uses a throwaway Postgres 17
container on port **5433** and never touches the dev database on 5432.

Fill in from DBeaver's connection settings: `<RDS_HOST>`, `<SRC_USER>`,
`<SRC_DB>`. RDS is restricted to the EC2 security group, so the dump goes
through an SSH tunnel.

---

## 1. Open the SSH tunnel

In a dedicated terminal tab. `-N` opens no shell — it sits silently, which is
correct. Leave it running for the whole dump.

```
ssh -i ~/Downloads/athleticaos-staging-backend.pem -N \
    -L 15432:<RDS_HOST>:5432 ec2-user@staging-api.athleticaos.com
```

## 2. Confirm the tunnel (second tab)

```
nc -zv -w 5 localhost 15432
```

## 3. Dump through the tunnel

Prompts for the password.

```
pg_dump -h localhost -p 15432 -U <SRC_USER> -d <SRC_DB> -Fc -f /tmp/staging.dump
ls -lh /tmp/staging.dump
```

A near-zero file means it failed. Close the tunnel (Ctrl-C in tab 1) when done.

## 4. Start a throwaway Postgres 17

```
docker run -d --name pg17-v163-test \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=athleticaos_v163_test \
  -p 5433:5432 postgres:17-alpine
```

```
docker exec pg17-v163-test psql -U postgres -c "SHOW server_version;"
```

## 5. Restore, using the container's own pg_restore

Matches the dump's major version exactly, rather than the local 18.3 client.

```
docker cp /tmp/staging.dump pg17-v163-test:/tmp/staging.dump
docker exec pg17-v163-test pg_restore -U postgres -d athleticaos_v163_test \
  --no-owner --no-privileges /tmp/staging.dump
```

Ownership and extension warnings are normal. Errors naming `matches` or
`tournaments` are not.

## 6. Confirm the restore is pre-migration

Expect **V162** on top, and a null result for the new table.

```
docker exec pg17-v163-test psql -U postgres -d athleticaos_v163_test \
  -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3;"
docker exec pg17-v163-test psql -U postgres -d athleticaos_v163_test \
  -c "SELECT to_regclass('public.tournament_venues');"
```

## 7. Start the backend against it — this applies V163

Port **5433**. Needs JDK 21.

```
cd backend && SPRING_PROFILES_ACTIVE=dev \
  SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5433/athleticaos_v163_test' \
  SPRING_DATASOURCE_USERNAME=postgres SPRING_DATASOURCE_PASSWORD=postgres \
  ./mvnw spring-boot:run
```

**"Started BackendApplication" is the pass condition.** If the assertion trips,
Flyway fails and it will not start — that is the failure being rehearsed.
Ctrl-C once it is up.

## 8. Verify — all three must pass

**a. JRC must have exactly 3 venues.** A 4th means the `tournaments.venue`
guard did not hold and a phantom venue came back.

```
docker exec pg17-v163-test psql -U postgres -d athleticaos_v163_test \
  -c "SELECT t.name, count(*) AS venues FROM tournament_venues v JOIN tournaments t ON t.id = v.tournament_id WHERE NOT v.deleted GROUP BY 1 ORDER BY 2 DESC LIMIT 10;"
```

**b. No match may lose its venue.** Must be 0.

```
docker exec pg17-v163-test psql -U postgres -d athleticaos_v163_test \
  -c "SELECT count(*) AS orphans FROM matches WHERE venue IS NOT NULL AND trim(venue) <> '' AND venue_id IS NULL;"
```

**c. The old index must be gone.** Both present means the drop did not fire and
two competing constraints exist.

```
docker exec pg17-v163-test psql -U postgres -d athleticaos_v163_test \
  -c "SELECT indexname FROM pg_indexes WHERE tablename='matches' AND indexname LIKE '%venue%';"
```

Expect `uq_matches_tournament_venue_id_match_number` and NOT
`uq_matches_tournament_venue_match_number`.

## 9. Clean up

The dump holds real personal data; PDPA applies. Removing the container drops
its data with it.

```
docker rm -f pg17-v163-test
rm -f /tmp/staging.dump
```

## 10. Then deploy

Once all three checks pass, staging is a normal build and restart — Flyway
applies V163 on boot. Keep `matches_venue_backup_20260922`, `jrc_ref` and
`jrc_fix` until it is verified on staging.

---

## If step 7 fails

Send the Flyway error. The likely causes, in order:

1. **Assertion trips** — some match has a non-blank `venue` that matched no
   `tournament_venues` row. Run check 8b against the pre-migration restore to
   find which tournament.
2. **Unique violation on `uq_tournament_venue_name`** — two venue spellings in
   one tournament differ only by case or whitespace. JRC is clean, but another
   tournament may not be.
3. **Unique violation on the new numbering index** — two matches share a
   `(tournament, venue, match_number)` after the backfill.
