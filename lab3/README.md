# Laboratorium 3 — zadanie 1

## Uruchomienie bazy i migracji

W katalogu `lab3`:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Ustaw własne POSTGRES_USER, POSTGRES_PASSWORD i zgodny DATABASE_URL w .env.
npm ci
docker compose up -d
npm run db:migrate
npm run db:status
```

PostgreSQL 16 używa nazwanego volume `room-booking-lab3_pgdata`.
Port lokalny to `5433`, aby nie zajmować standardowego portu lokalnego PostgreSQL.
Plik `.env` jest ignorowany przez główny `.gitignore`; `.env.example` pozostaje w repozytorium.

Sprawdzenie odwracalności migracji na pustej bazie (rollback usuwa tabele i ich dane):

```powershell
npm run db:rollback
npm run db:migrate
```

Podgląd schematu (użyj użytkownika i bazy ze swojego `.env`):

```powershell
docker compose exec db psql -U TWOJ_UZYTKOWNIK -d room_booking_lab3
```

W `psql`: `\dt`, `\d reservations`, `\q`.

Oba klucze obce używają `ON DELETE RESTRICT`: nie można usunąć budynku z salami ani sali z rezerwacjami. Dzięki temu usunięcie sali nie usuwa historii rezerwacji.

Na tym etapie API nadal korzysta z repozytoriów w pamięci z laboratorium 2. Podłączenie repozytoriów Knex i seedy należą do zadania 2.
