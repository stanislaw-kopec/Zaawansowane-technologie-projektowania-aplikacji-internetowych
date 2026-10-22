# Room Booking API - Postman po zadaniu 3

Aktualna kolekcja: `Room-Booking-API.postman_collection.json` (65 żądań z testami).
Archiwa: `Lab2-Task1.postman_collection.json` i `Lab2-Task2.postman_collection.json`.
Archiwa pasują do wcześniejszych wersji kodu; aktualne API testuj aktualną kolekcją.

## Uruchomienie

1. Z głównego katalogu repozytorium wykonaj `npm --prefix lab2 ci`, jeżeli instalujesz zależności po raz pierwszy.
2. Zatrzymaj poprzedni serwer i uruchom `npm --prefix lab2 run start:debug`.
3. W Postmanie zaimportuj aktualny plik kolekcji. `baseUrl` domyślnie wynosi `http://localhost:3000`.
4. Uruchom całą kolekcję w **Collection Runnerze**, w podanej kolejności, jedna iteracja.
5. Odpowiedzi 400, 404, 409, 413, 415 i 500 są w scenariuszach błędów oczekiwane. Sprawdzaj wyniki testów.

Osobny plik środowiska nie jest potrzebny. Całą kolekcję można uruchamiać wielokrotnie.
Zwykłe `npm --prefix lab2 start` nie włącza tymczasowego endpointu `/api/debug/crash`; w tym trybie jego wywołanie zwróci 404 zamiast 500.

## Zakres folderów

| Folder | Scenariusze |
| --- | --- |
| 1 | Poprawne endpointy, trim, daty UTC i filtrowanie |
| 2 | Niepoprawne params i query |
| 3 | Niepoprawne body, brakujące i nieznane pola |
| 4 | Wiele błędów walidacji jednocześnie |
| 5 | Nieistniejące zasoby, pojemność i anulowanie |
| 6 | Nieznana ścieżka/metoda, niepoprawny JSON, 500, requestId oraz błędy parsera 413 i 415 |

Testy na poziomie kolekcji sprawdzają identyfikator każdego żądania oraz wspólny format każdej odpowiedzi z błędem.

## Ręczne testowanie

Wyślij **1.03** przed żądaniami anulowania **5.04** i **5.05**. Po restarcie serwera wykonaj **1.03** ponownie.
Żądanie **6.07** wyślij po **6.06**. Pozostałe demonstracje z folderu 6 możesz wysyłać samodzielnie.

## Materiał do sprawozdania

- **4.01**: wiele błędów walidacji w jednym żądaniu.
- **5.02**: konflikt pojemności sali z kodem `ROOM_CAPACITY_EXCEEDED`.
- **6.01**: nieznana ścieżka zwraca JSON 404.
- **6.03**: niepoprawny JSON zwraca 400 `INVALID_JSON`.
- **6.04**: odpowiedź 500 bez stack trace. W terminalu znajdź `lab2-task3-crash`.

Przy **6.04** pokaż odpowiedź klienta oraz terminal: szczegóły `Error: boom` i wpis zakończenia żądania mają identyczny identyfikator `lab2-task3-crash` jak nagłówek i JSON odpowiedzi.
Każdy wpis zakończenia zawiera ID, metodę, URL, status i czas w ms. Tymczasowy endpoint zachowujemy do zebrania materiału do sprawozdania.

## Format błędu

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Room not found",
    "requestId": "..."
  }
}
```

Walidacja dodaje `details`. Nieoczekiwany błąd ma ogólny komunikat; pełne szczegóły pojawiają się tylko w terminalu.
Reguły czasu i nakładania rezerwacji oraz rozbudowane anulowanie zostają na zadania 4 i 5.
