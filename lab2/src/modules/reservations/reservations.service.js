const NotFoundError = require("../../errors/NotFoundError");
const ConflictError = require("../../errors/ConflictError");
const ValidationError = require("../../errors/ValidationError");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

function createReservationsService({ roomsRepository, reservationsRepository, now = () => new Date() }) {
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
            const start = new Date(input.startTime).getTime();
            const end = new Date(input.endTime).getTime();
            const duration = end - start;
            const details = [];

            if (start < now().getTime()) {
                details.push({ location: "body", field: "startTime", message: "startTime must not be in the past" });
            }
            if (end <= start) {
                details.push({ location: "body", field: "endTime", message: "endTime must be later than startTime" });
            } else if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
                details.push({ location: "body", field: "endTime", message: "Reservation must last between 15 minutes and 8 hours" });
            }
            if (details.length > 0) throw new ValidationError(details);

            const reservations = await reservationsRepository.list({ roomId: input.roomId });
            const overlaps = reservations.some(reservation =>
                reservation.status === "CONFIRMED" &&
                start < new Date(reservation.endTime).getTime() &&
                new Date(reservation.startTime).getTime() < end
            );
            if (overlaps) {
                throw new ConflictError("Room already booked for this time interval", "ROOM_ALREADY_BOOKED");
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
