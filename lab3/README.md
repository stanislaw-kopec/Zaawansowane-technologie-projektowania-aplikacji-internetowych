# Laboratorium 3 — zadania 1-5

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

## Zadanie 3

- `GET /api/rooms/:id` zwraca również `building`.
- `GET /api/buildings/:id/rooms` zwraca sale budynku; pusty budynek: `[]`, brak budynku: `404`.
- `GET /api/reservations/:id` oraz lista rezerwacji zawierają `room` z zagnieżdżonym `building`.
- `GET /api/buildings` zawiera liczbowe `roomsCount`, również `0` dla pustego budynku.

Lista sal budynku wykonuje 2 zapytania (istnienie budynku i sale). Pozostałe wymienione odczyty wykonują po 1 zapytaniu, z wyjątkiem listy rezerwacji: od zadania 4 wykonuje 2 (dane strony i licznik). Test bazy sprawdza także listę przy 5 i 20 rezerwacjach w oddzielnym schemacie.

Logi SQL podczas pracy API:

```powershell
$env:DEBUG = "knex:query"
npm start
```

Po zakończeniu: `Remove-Item Env:DEBUG`.

## Zadanie 4

`GET /api/reservations` zwraca `{ data: [...], meta: { page, limit, total, totalPages } }`.

Parametry opcjonalne: `roomId`, `buildingId`, `status` (`CONFIRMED` / `CANCELLED`), `from`, `to`, `page` (domyślnie 1), `limit` (1–100, domyślnie 20), `sort` (domyślnie `startTime`). Sortowanie: `startTime`, `createdAt`, `participants`; prefiks `-` oznacza malejąco. Remisy rozstrzyga `id` rosnąco.

Przykłady:

```text
/api/reservations?buildingId=1&status=CONFIRMED&page=2&limit=2&sort=startTime
/api/reservations?roomId=2&status=CANCELLED&sort=-createdAt
/api/reservations?from=2026-11-10T10:15:00Z&to=2026-11-10T10:30:00Z&sort=-participants&limit=2
/api/reservations?buildingId=2&sort=-startTime&page=99&limit=1
```

Daty filtrują nakładanie się przedziałów: `end_time > from` i `start_time < to`. Niepoprawne parametry, w tym `from >= to`, zwracają `400`. Strona poza zakresem zwraca `200` z pustym `data`, zachowując licznik pasujących rekordów.

## Zadanie 5

Tworzenie rezerwacji wykonuje się w jednej transakcji. `SELECT ... FOR UPDATE` blokuje wiersz sali przed sprawdzeniem kolizji i zapisem. Blokujemy salę, ponieważ istnieje także wtedy, gdy nie ma jeszcze żadnej rezerwacji. Równoległy request dla tej samej sali czeka na zakończenie poprzedniej transakcji.

Sama transakcja przy domyślnym `READ COMMITTED` nie wystarcza: dwa requesty mogą jednocześnie odczytać brak kolizji i oba zapisać rezerwację. Blokada sali wymusza kolejność sprawdzeń.

Nowa migracja dodaje `btree_gist` i exclusion constraint dla `CONFIRMED`. Przedział `[)` dopuszcza stykające się rezerwacje. Błąd PostgreSQL `23P01` zwraca `409 ROOM_ALREADY_BOOKED`.

Po pobraniu zmian uruchom `npm run db:migrate`, a potem `npm start`.
W drugim terminalu, w katalogu `lab3`:

```powershell
node scripts/double-booking.js 1
```

Skrypt wysyła 10 requestów na salę 1, na godzinę zaczynającą się jutro. Wypisuje status każdego requestu i liczbę identycznych rezerwacji `CONFIRMED` odczytaną SQL-em. Zostawia utworzoną rezerwację w bazie. Opcjonalnie można podać konkretny przyszły termin jako drugi argument, np. `node scripts/double-booking.js 1 2030-12-01T10:00:00Z`.

Test trzech wariantów, bez zmiany danych użytkownika:

```powershell
$env:RUN_DB_TESTS = "1"
node --test tests/concurrency.integration.test.js
Remove-Item Env:RUN_DB_TESTS
```

Wyniki zapisano w `scripts/double-booking-results.txt`:

- Przed naprawą: 10 × `201`, 10 rezerwacji.
- Transakcja, blokada i constraint: 1 × `201`, 9 × `409`, 1 rezerwacja.
- Sam constraint: 1 × `201`, 9 × `409`, 1 rezerwacja.

Opóźnienie 250 ms oraz wyłączanie zabezpieczeń występują wyłącznie w izolowanym teście demonstracyjnym. Kod API nie zawiera sztucznego opóźnienia ani przełącznika wyłączającego zabezpieczenia.
