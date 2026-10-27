function createReservationsRepository({ includeStartedReservation = false } = {}) {
    const reservations = [];
    let nextReservationId = 1;

    // Dane demonstracyjne do testowania anulowania rozpoczetej rezerwacji.
    if (includeStartedReservation) {
        const createdAt = new Date();
        reservations.push({
            id: nextReservationId++,
            roomId: 1,
            userId: 1, user: { id: 1, email: "jan.kowalski@example.com" },
            participants: 5,
            startTime: new Date(createdAt.getTime() - 2 * 60 * 60 * 1000),
            endTime: new Date(createdAt.getTime() - 60 * 60 * 1000),
            status: "CONFIRMED",
            createdAt,
            cancelledAt: null,
            internalNote: "seed for cancellation demo"
        });
    }

    return {
        async list({ roomId } = {}) {
            return reservations.filter(reservation =>
                roomId === undefined || reservation.roomId === roomId
            );
        },
        async findById(id) {
            return reservations.find(reservation => reservation.id === id) ?? null;
        },
        async create(data) {
            const reservation = {
                ...data,
                id: nextReservationId++,
                createdAt: new Date(),
                cancelledAt: null,
                internalNote: "created via API v2"
            };
            reservations.push(reservation);
            return reservation;
        },
        async updateStatus(id, status, cancelledAt) {
            const reservation = reservations.find(reservation => reservation.id === id);
            if (!reservation) return null;
            reservation.status = status;
            reservation.cancelledAt = cancelledAt;
            return reservation;
        }
    };
}

module.exports = { createReservationsRepository };
