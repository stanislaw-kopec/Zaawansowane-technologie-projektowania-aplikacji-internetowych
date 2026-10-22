# Room Booking API - Postman po zadaniu 5

Aktualna kolekcja: `Room-Booking-API.postman_collection.json` (102 żądań z testami).
Archiwa: `Lab2-Task1.postman_collection.json` `Lab2-Task2.postman_collection.json` `Lab2-Task3.postman_collection.json` i `Lab2-Task4.postman_collection.json`.
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
| 7 | Wszystkie przypadki z tabeli nakładania, identyczne przedziały i równoważne strefy czasowe |
| 8 | Kolejność dat, granice 15 minut / 8 godzin, przeszłość oraz porządki |
| 9 | Zadanie 5A: przyszła rezerwacja, anulowanie, idempotencja i odmowa anulowania rozpoczętej |
| 10 | Zadanie 5B: Location, jawne response DTO, UTC i ukrycie internalNote |

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
Reguły czasu i nakładania są zaimplementowane w serwisie. Anulowanie i response DTO z zadania 5 również są zaimplementowane.

## Daty i powtarzalność po zadaniu 5

Żądanie **1.01** ustawia daty startowe za 14 dni. W body widzisz zmienne, które Postman podstawia przy wysyłaniu.
Uruchom **1.01** przed ręcznymi testami pozostałych folderów.
Pełny przebieg anuluje wszystkie utworzone przez siebie rezerwacje, więc można go powtórzyć na tym samym serwerze. Startowa rezerwacja w przeszłości pozostaje aktywna — celowo nie można jej anulować.
Po przerwanym przebiegu albo wcześniejszych ręcznych testach zrestartuj serwer, żeby usunąć kolidujące dane.

Folder **7** uruchamiaj w podanej kolejności. Rezerwacja bazowa trwa 10:00-12:00; przyjęte rezerwacje stykające się z nią pozostają aktywne do końca scenariusza.
W **7.11** ponownie zajmujemy termin po anulowaniu rezerwacji bazowej. Nie dotyka on aktywnych rezerwacji sąsiednich.
Do sprawozdania użyj **7.01-7.11** oraz **8.01-8.10**. Wyniki wszystkich przypadków zostaną też zapisane podczas automatycznej weryfikacji w `examples/task4-results.json`.

Porównania czasu wykonujemy na timestampach. Koniec jednego przedziału może być początkiem następnego.
Minimum 15 minut i maksimum 8 godzin są dopuszczalne. Początek równy aktualnemu czasowi jest dopuszczalny; testujemy to ze stałym zegarem w testach serwisu.

## Testy serwisu

Z głównego katalogu repozytorium uruchom: npm --prefix lab2 test.
Testy używają stałego zegara i nie wymagają uruchomionego serwera ani Postmana.

## Zadanie 5 - część A: anulowanie

Serwer automatycznie tworzy jedną rezerwację startową o nazwie `Started reservation (seed)`, która rozpoczęła się dwie godziny przed jego uruchomieniem.
Żądanie **9.04** znajduje jej ID i zapisuje je do zmiennej; **9.05** próbuje anulować ją i oczekuje 409 `RESERVATION_ALREADY_STARTED`.
Wykonaj **9.04** przed ręcznym wysłaniem **9.05** i **9.06**.
Przypadki **9.01-9.03** uruchamiaj w kolejności: tworzenie, pierwsze anulowanie, ponowne anulowanie z porównaniem całej odpowiedzi, w tym `cancelledAt`.

## Zadanie 5 - część B: response DTO

**10.01** pokazuje 201 i nagłówek `Location: /api/reservations/{id}`. Nie dodajemy nowego endpointu GET pod ten adres — polecenie wymaga nagłówka, a przegląd rezerwacji odbywa się przez listę.
Wszystkie poprawne odpowiedzi rezerwacji są sprawdzane globalnie: dokładny zestaw pól, daty UTC i `cancelledAt` jako null albo data.
`internalNote` istnieje w repozytorium, ale nie jest zwracane przez mapper przy tworzeniu, listowaniu ani anulowaniu.
Do sprawozdania użyj **9.02**, **9.03**, **9.05** i **10.01** (z widocznymi nagłówkami).
Wyniki automatycznej weryfikacji zapisujemy w `examples/task5-results.json`.
