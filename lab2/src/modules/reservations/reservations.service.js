const AppError = require("../../errors/AppError");

function createReservationsService({ roomsRepository, reservationsRepository }) {
    return {
        async listReservations(filters) {
            return reservationsRepository.list(filters);
        },
        async createReservation(input) {
            const room = await roomsRepository.findById(input.roomId);
            if (!room) throw new AppError("Room not found", 404);
            if (input.participants > room.capacity) {
                throw new AppError("Room capacity exceeded", 409);
            }
            return reservationsRepository.create({ ...input, status: "CONFIRMED" });
        },
        async cancelReservation(id) {
            const reservation = await reservationsRepository.findById(id);
            if (!reservation) throw new AppError("Reservation not found", 404);
            return reservationsRepository.updateStatus(id, "CANCELLED");
        }
    };
}

module.exports = { createReservationsService };
