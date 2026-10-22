const NotFoundError = require("../../errors/NotFoundError");
const ConflictError = require("../../errors/ConflictError");

function createReservationsService({ roomsRepository, reservationsRepository }) {
    return {
        async listReservations(filters) {
            return reservationsRepository.list(filters);
        },
        async createReservation(input) {
            const room = await roomsRepository.findById(input.roomId);
            if (!room) throw new NotFoundError("Room");
            if (input.participants > room.capacity) {
                throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
            }
            return reservationsRepository.create({ ...input, status: "CONFIRMED" });
        },
        async cancelReservation(id) {
            const reservation = await reservationsRepository.findById(id);
            if (!reservation) throw new NotFoundError("Reservation");
            return reservationsRepository.updateStatus(id, "CANCELLED");
        }
    };
}

module.exports = { createReservationsService };
