# Sprawozdanie — Room Booking API

**Imię i nazwisko:** [UZUPEŁNIJ]  
**Numer indeksu:** [UZUPEŁNIJ]

API wykonano w Node.js i Express. Dane sal i rezerwacji są przechowywane w pamięci serwera.

## Zadanie 1 — pobieranie sal

Endpointy zwracają listę sal lub jedną salę wskazaną przez ID.

**Poprawne requesty:**

```http
GET http://localhost:3000/api/rooms
GET http://localhost:3000/api/rooms/1
```

> **[SCREEN KODU]** Fragment `server.js`: tablica `rooms` oraz endpointy `GET /api/rooms` i `GET /api/rooms/:id`.

> **[SCREEN ENDPOINTU W POSTMANIE]** `GET /api/rooms`: metoda, adres, status `200 OK` i lista sal w odpowiedzi.

> **[SCREEN ENDPOINTU W POSTMANIE]** `GET /api/rooms/1`: metoda, adres, status `200 OK` i dane sali A101.

## Zadanie 2 — tworzenie rezerwacji

Endpoint sprawdza wymagane dane i tworzy rezerwację ze statusem `CONFIRMED`.

**Poprawny request:**

```http
POST http://localhost:3000/api/reservations
Content-Type: application/json

{
  "roomId": 1,
  "reservedBy": "Jan Kowalski",
  "participants": 20,
  "date": "2026-10-10"
}
```

> **[SCREEN KODU]** Fragment `POST /api/reservations`: walidacja danych oraz utworzenie obiektu `reservation`, zapis do tablicy i odpowiedź `201`.

> **[SCREEN ENDPOINTU W POSTMANIE]** Powyższy POST: metoda, adres, body, status `201 Created` i odpowiedź z `id` oraz `status: "CONFIRMED"`.

## Zadanie 3 — kontrola pojemności sali

Rezerwacja przekraczająca pojemność sali jest odrzucana kodem `409 Conflict`.

**Poprawny request:** POST z zadania 2 z `participants: 30` — oczekiwany status `201 Created` (sala ma 30 miejsc).

**Przykład obsłużonego błędu:**

```http
POST http://localhost:3000/api/reservations
Content-Type: application/json

{
  "roomId": 1,
  "reservedBy": "Jan Kowalski",
  "participants": 40,
  "date": "2026-10-10"
}
```

**Oczekiwana odpowiedź:** `409 Conflict`.

```json
{"message": "Room capacity exceeded"}
```

> **[SCREEN KODU]** Warunek `if (participants > room.capacity)` wraz z odpowiedzią `409`.

> **[SCREEN ENDPOINTU W POSTMANIE]** POST z `participants: 30`: metoda, adres, body, status `201 Created` i utworzona rezerwacja.

> **[SCREEN BŁĘDU W POSTMANIE]** POST z `participants: 40`: metoda, adres, body, status `409 Conflict` i komunikat `Room capacity exceeded`.

## Zadanie 4 — lista i filtrowanie rezerwacji

Endpoint zwraca wszystkie rezerwacje lub tylko rezerwacje wskazanej sali.

**Poprawne requesty:**

```http
GET http://localhost:3000/api/reservations
GET http://localhost:3000/api/reservations?roomId=1
```

> **[SCREEN KODU]** Endpoint `GET /api/reservations`: odczyt `roomId`, filtrowanie przez `filter()` i zwrócenie wyniku.

> **[SCREEN ENDPOINTU W POSTMANIE]** `GET /api/reservations`: metoda, adres, status `200 OK` i lista rezerwacji. Wcześniej utwórz rezerwacje dla sal 1 i 2.

> **[SCREEN ENDPOINTU W POSTMANIE]** `GET /api/reservations?roomId=1`: metoda, adres z filtrem, status `200 OK` i rezerwacje wyłącznie z `roomId: 1`.

## Zadanie 5 — anulowanie rezerwacji

Endpoint zmienia status rezerwacji na `CANCELLED`, pozostawiając ją na liście.

**Poprawny request** dla istniejącej rezerwacji o ID `1` (użyj ID otrzymanego w zadaniu 2; bez body):

```http
PATCH http://localhost:3000/api/reservations/1/cancel
```

> **[SCREEN KODU]** Endpoint `PATCH /api/reservations/:id/cancel`: wyszukanie rezerwacji, zmiana statusu na `CANCELLED` i odpowiedź `200`.

> **[SCREEN ENDPOINTU W POSTMANIE]** Powyższy PATCH: metoda, adres z ID rezerwacji, status `200 OK` i odpowiedź z `status: "CANCELLED"`.
