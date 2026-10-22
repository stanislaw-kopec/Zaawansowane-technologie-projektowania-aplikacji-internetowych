# Room Booking API - Postman po zadaniu 2

Aktualna kolekcja: `Room-Booking-API.postman_collection.json` (56 żądań z automatycznymi testami).
Archiwum stanu po zadaniu 1: `Lab2-Task1.postman_collection.json`.
Archiwalna kolekcja służy do poprzedniej wersji kodu; część jej oczekiwań walidacyjnych nie pasuje do zadania 2.

## Uruchomienie

1. Z głównego katalogu repozytorium wykonaj `npm --prefix lab2 ci`, a następnie `npm --prefix lab2 start`.
2. W Postmanie wybierz **Import** i aktualny plik kolekcji.
3. Zmienna kolekcji `baseUrl` ma domyślnie wartość `http://localhost:3000`.
4. Uruchom całą kolekcję w **Collection Runnerze**, w podanej kolejności, jedna iteracja.
5. Oczekiwane odpowiedzi 400, 404 i 409 oznaczają poprawne działanie scenariuszy błędów. Sprawdzaj wyniki testów, nie sam status.

Osobny plik środowiska nie jest potrzebny. Jeśli poprzedni serwer nadal działa, zatrzymaj go i uruchom ponownie po zmianie kodu.

## Foldery

| Folder | Co sprawdza |
| --- | --- |
| 1 | Endpointy z lab1, trim nazwiska, daty z Z i offsetem, filtrowanie po roomId |
| 2 | Niepoprawne ID w params i roomId w query, także puste i powtórzone query |
| 3 | Brakujące pola, błędne typy, liczby ułamkowe, długość nazwiska, daty, odrzucanie status i id |
| 4 | Jedno żądanie z czterema błędami, pełne details i requestId |
| 5 | Brak sali, przekroczenie pojemności, anulowanie i ponowne anulowanie |

## Testowanie ręczne

Najpierw wyślij **1.03**, które zapisuje `reservationId`. Potem możesz wywoływać **5.04** i **5.05**.
Po restarcie serwera wykonaj **1.03** ponownie. Cała kolekcja może być uruchamiana wielokrotnie bez restartu: nie zakłada stałej liczby rezerwacji ani stałego ID.

## Materiał do sprawozdania

Żądanie **4.01** zawiera krótkie nazwisko, zero uczestników, niepoprawne endTime i niedozwolone pole status.
Pokaż body żądania, odpowiedź 400 z pełnym details oraz zgodne requestId w JSON i nagłówku X-Request-Id.

## Zakres aktualnego etapu

Nie ma jeszcze kontroli nakładania przedziałów ani ograniczeń długości/czasu rezerwacji z zadania 4.
Zadanie 3 ujednolici pozostałe błędy i doda logowanie. Obecnie format `error.code/details/requestId` dotyczy błędów walidacji.
