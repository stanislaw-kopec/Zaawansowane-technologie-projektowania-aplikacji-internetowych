const NotFoundError = require("../../errors/NotFoundError");
const ConflictError = require("../../errors/ConflictError");
const ForbiddenError = require("../../errors/ForbiddenError");
const ValidationError = require("../../errors/ValidationError");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

// A: dozwolone przejscia stanow rezerwacji.
const ALLOWED_TRANSITIONS = {
    CONFIRMED: ["CANCELLED"],
    CANCELLED: []
};

function createReservationsService({ roomsRepository, reservationsRepository, eventBus, now = () => new Date(),
    runInTransaction = work => work({ roomsRepository, reservationsRepository })
}) {
    return {
        async getReservation(id, currentUser) {
            const reservation = await reservationsRepository.findById(id);
            if (!reservation || (currentUser.role !== "ADMIN" && reservation.userId !== currentUser.id)) {
                throw new NotFoundError("Reservation");
            }
            return reservation;
        },
        async listReservations(filters, currentUser) {
            if (currentUser.role !== "ADMIN") {
                if (filters.userId !== undefined) throw new ForbiddenError("userId filter is only available to ADMIN");
                return reservationsRepository.listPage({ ...filters, userId: currentUser.id });
            }
            return reservationsRepository.listPage(filters);
        },
        async createReservation(input, currentUser) {
            const created = await runInTransaction(async ({ roomsRepository, reservationsRepository }) => {
                await roomsRepository.lockById(input.roomId);
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

                return reservationsRepository.create({ ...input, userId: currentUser.id, status: "CONFIRMED" });
            });
            await eventBus?.publish("reservation.created", {
                reservationId: created.id, roomId: created.roomId, userId: created.userId,
                startTime: created.startTime, endTime: created.endTime
            });
            return created;
        },
        async cancelReservation(id, currentUser) {
            let changed = false;
            const cancelled = await runInTransaction(async ({ reservationsRepository }) => {
                const reservation = await reservationsRepository.findById(id, true);
                if (!reservation || (currentUser.role !== "ADMIN" && reservation.userId !== currentUser.id)) {
                    throw new NotFoundError("Reservation");
                }
                // Ponowienie anulowania nie zmienia danych, nawet gdy termin juz minal.
                if (reservation.status === "CANCELLED") return reservation;
                if (!ALLOWED_TRANSITIONS[reservation.status]?.includes("CANCELLED")) {
                    throw new ConflictError(
                        `Cannot change status from ${reservation.status} to CANCELLED`,
                        "INVALID_STATUS_TRANSITION"
                    );
                }

                const cancelledAt = now();
                if (new Date(reservation.startTime).getTime() <= cancelledAt.getTime()) {
                    throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
                }
                changed = true;
                return reservationsRepository.updateStatus(id, "CANCELLED", cancelledAt);
            });
            if (changed) await eventBus?.publish("reservation.cancelled", {
                reservationId: id, roomId: cancelled.roomId, userId: cancelled.userId, cancelledBy: currentUser.id
            });
            return cancelled;
        }
    };
}

module.exports = { createReservationsService };
