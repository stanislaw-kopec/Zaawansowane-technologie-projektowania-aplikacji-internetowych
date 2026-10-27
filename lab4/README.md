# Laboratorium 4 — zadania 1-3

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

W `.env`: `JWT_SECRET` (losowy sekret co najmniej 32 znaki) i `JWT_EXPIRES_IN=15m`. Zmiana czasu ważności wymaga restartu API. Pozostałe endpointy wymagają teraz tokenu.

## Zadanie 3

Uruchom `npm run db:migrate`, następnie zrestartuj API. Nie trzeba ponownie uruchamiać seeda.

Poza rejestracją i logowaniem endpointy wymagają `Authorization: Bearer <token>`. Brak nagłówka, zły format, podpis lub zmieniony payload zwracają `401`. Wygasły token: `401 Token expired`. Publiczna dokumentacja `/api/docs` należy do zadania 5.

Migracja zastępuje `reserved_by` kolumną `user_id` (NOT NULL, FK, ON DELETE RESTRICT), zachowując rekordy. Rezerwacje seeda przypisuje do `jan.kowalski@example.com`. Jeśli konto nie istnieje, tworzy je z demonstracyjnym hasłem `user-password-123`. Dla pozostałych dawnych nazw tworzy osobne konta techniczne z losowymi hasłami. Istniejące konta nie są nadpisywane. Cofnięcie migracji odtwarza tekst właściciela z emaila (dla konta demonstracyjnego: Jan Kowalski); nie usuwa użytkowników.

`POST /api/reservations` przyjmuje:

```json
{"roomId":1,"participants":5,"startTime":"2035-02-01T10:00:00Z","endTime":"2035-02-01T11:00:00Z"}
```

Użytkownik pochodzi wyłącznie z tokenu; `userId` i `reservedBy` w body zwracają `400`. Odpowiedź zawiera `user: { id, email }`. Role i prywatność rezerwacji należą do zadania 4.

Skrypt współbieżności wymaga tokenu w zmiennej `ACCESS_TOKEN` i domyślnie używa portu 3001.
