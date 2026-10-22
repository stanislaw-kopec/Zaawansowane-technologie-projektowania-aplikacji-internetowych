# Room Booking API — kolekcja Postmana

Plik `Room-Booking-API.postman_collection.json` zawiera 24 żądania z automatycznymi testami. Foldery odpowiadają zadaniom 1–5. Osobny plik środowiska nie jest potrzebny.

## Uruchomienie

1. W terminalu, w głównym katalogu repozytorium, uruchom serwer:

   ```powershell
   node lab2/src/server.js
   ```

   Jeśli uruchamiasz projekt na nowym komputerze, najpierw wykonaj `npm ci` w katalogu `lab2`.

2. W Postmanie wybierz **Import** i wskaż `Room-Booking-API.postman_collection.json`.
3. W zmiennych kolekcji sprawdź `baseUrl`: domyślnie `http://localhost:3000`.
4. Uruchom całą kolekcję w **Collection Runnerze**: wszystkie żądania zaznaczone, kolejność bez zmian, **1 iteracja**.
5. Sprawdź wyniki testów. Odpowiedzi **400**, **404** i **409** w nazwanych scenariuszach błędów są oczekiwane — ich testy powinny przejść.

Przy korzystaniu z przeglądarkowej wersji Postmana wybierz Desktop Agent do połączenia z lokalnym API. W aplikacji desktopowej można wysyłać żądania bezpośrednio.

## Co jest sprawdzane

| Folder | Scenariusze |
| --- | --- |
| 1. Sale | Lista minimum czterech sal, sala nr 1, nieistniejąca sala |
| 2. Tworzenie rezerwacji i walidacja | Dwie poprawne rezerwacje, brak każdego wymaganego pola, zero i ujemna liczba uczestników, liczba przesłana jako tekst, puste nazwisko, nieistniejąca sala |
| 3. Pojemność sali | Odrzucenie 40 uczestników przy 30 miejscach oraz akceptacja dokładnie 30 |
| 4. Lista i filtrowanie | Wszystkie rezerwacje, filtrowanie po salach 1 i 2, pusta tablica dla braku wyników |
| 5. Anulowanie | Anulowanie, ponowne anulowanie, nieistniejące ID, sprawdzenie listy po anulowaniu |

## Ręczne wysyłanie żądań

Otwórz wybrane żądanie i kliknij **Send**. Body i nagłówki są już przygotowane. Dla żądań PATCH anulujących rezerwację body nie jest potrzebne.

Przed testowaniem folderów 4 i 5 wyślij kolejno **2.01** i **2.02**. Ich skrypty zapisują `reservationId`, `secondReservationId` oraz kopię pierwszej rezerwacji. ID w adresie anulowania zostanie podstawione automatycznie.

Żądanie **5.02** wyślij po **5.01**, a **5.04** po anulowaniu. Po restarcie serwera uruchom kolekcję od początku albo ponownie wyślij **2.01** i **2.02**, ponieważ dane API są przechowywane tylko w pamięci.

Każdy pełny przebieg tworzy trzy rezerwacje i anuluje pierwszą z nich. Kolekcję można uruchamiać ponownie na tym samym serwerze: pobiera nowe ID i nie zakłada stałej liczby zapisanych rezerwacji.

## Materiały do sprawozdania

Przydatne screenshoty: **1.01**, **1.02**, **2.01**, **2.07**, **3.01**, **3.02**, **4.02**, **4.04** i **5.01**. Na zrzucie pokaż metodę, adres, body żądania (jeśli występuje), status HTTP i odpowiedź JSON. Zapisz też podsumowanie pełnego przebiegu w Runnerze.

## Dokumentacja Postmana

- [Import kolekcji](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/)
- [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs/)
- [Zmienne używane w skryptach](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables/)

