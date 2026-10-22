function createReservationsRepository() {
    const reservations = [];
    let nextReservationId = 1;

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
                cancelledAt: null
            };
            reservations.push(reservation);
            return reservation;
        },
        async updateStatus(id, status) {
            const reservation = reservations.find(reservation => reservation.id === id);
            if (!reservation) return null;
            reservation.status = status;
            return reservation;
        }
    };
}

module.exports = { createReservationsRepository };
