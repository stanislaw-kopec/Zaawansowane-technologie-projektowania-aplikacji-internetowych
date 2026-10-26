# Laboratorium 3 — zadania 1-2

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

## Zadanie 2

Po migracji uruchom `npm run db:seed`, a następnie `npm start`.
Seed usuwa dotychczasowe dane demonstracyjne i tworzy zawsze te same 2 budynki, 5 sal i 5 rezerwacji. ID zaczynają się od 1. Daty są stałe, aby powtórne uruchomienie dawało identyczne dane.

API działa na `http://localhost:3000` i zapisuje dane w PostgreSQL. Restart serwera nie usuwa danych; nie uruchamiaj ponownie seeda, gdy sprawdzasz trwałość.

Nowe endpointy:

- `GET /api/buildings`
- `GET /api/buildings/:id`
- `POST /api/buildings` — `{"name":"Budynek C","address":"ul. Testowa 1"}`
- `POST /api/rooms` — `{"buildingId":1,"name":"104","capacity":20}`

Nieistniejący budynek przy tworzeniu sali: `404`. Duplikat nazwy w tym samym budynku: `409`. Błędne dane: `400`.

Testy: `npm test`. Test bazy i restartu API (w osobnym, tymczasowym schemacie):

```powershell
$env:RUN_DB_TESTS = "1"
npm test
Remove-Item Env:RUN_DB_TESTS
```
