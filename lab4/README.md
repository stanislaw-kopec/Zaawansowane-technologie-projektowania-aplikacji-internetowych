# Laboratorium 4 — zadania 1-2

W katalogu `lab4`:

```powershell
docker compose up -d
npm ci
npm run db:migrate
npm run db:seed
npm start
```

PostgreSQL: port `5434`, osobny wolumen `room-booking-lab4_pgdata`. API: `http://localhost:3001` (PORT w `.env`). Przy konfiguracji od zera skopiuj `.env.example` do `.env` i ustaw własne dane bazy. Seed danych rezerwacji usuwa poprzednie dane demonstracyjne.

`POST /api/auth/register`:

```json
{"email":"Jan.Kowalski@example.com","password":"bardzo-dlugie-haslo"}
```

Odpowiedź `201`: `id`, email małymi literami, `role: USER`, `createdAt`. Hash nie jest zwracany. Hasło ma 10–72 znaki i najwyżej 72 bajty UTF-8 (limit bcrypt); bcrypt cost 10.

Błędy: `400` dla niepoprawnych danych lub dodatkowych pól (np. `role`); `409 EMAIL_TAKEN` dla zajętego emaila, również przy równoległych requestach.

Seed administratora: `admin@example.com` / `admin-password-123` — publiczne dane demonstracyjne do lokalnego laboratorium. Seed nie nadpisuje istniejących kont. 

Testy z bazą (osobne schematy testowe):

```powershell
$env:RUN_DB_TESTS = "1"
npm test
Remove-Item Env:RUN_DB_TESTS
```

## Zadanie 2

`POST /api/auth/login` przyjmuje `email` i `password`. Zwraca `accessToken`, `tokenType: Bearer`, `expiresIn` (domyślnie `15m`).

`GET /api/auth/me` wymaga nagłówka `Authorization: Bearer <accessToken>` i zwraca użytkownika bez hasha.

Token HS256 zawiera wyłącznie `sub`, `role`, `iat`, `exp`. Zły email i złe hasło zwracają `401 UNAUTHORIZED` z komunikatem `Invalid email or password`. Identyfikator requestu pozostaje indywidualny.

W `.env`: `JWT_SECRET` (losowy sekret co najmniej 32 znaki) i `JWT_EXPIRES_IN=15m`. Zmiana czasu ważności wymaga restartu API. Pozostałe endpointy zostaną zabezpieczone w zadaniu 3.
