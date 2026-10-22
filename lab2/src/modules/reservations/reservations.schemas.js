const AppError = require("../../errors/AppError");

// Reczna walidacja na etapie zadania 1; w zadaniu 2 zastapimy ja Zod.
function parseCreateReservation(body) {
    const { roomId, reservedBy, participants, startTime, endTime } = body ?? {};
    if (!Number.isInteger(roomId) || roomId <= 0) {
        throw new AppError("roomId must be a positive integer", 400);
    }
    if (typeof reservedBy !== "string" || reservedBy.trim() === "") {
        throw new AppError("reservedBy is required", 400);
    }
    if (!Number.isFinite(participants) || participants <= 0) {
        throw new AppError("participants must be a number greater than 0", 400);
    }
    for (const [field, value] of Object.entries({ startTime, endTime })) {
        if (typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
            !Number.isFinite(Date.parse(value))) {
            throw new AppError(`${field} must be an ISO 8601 datetime with timezone`, 400);
        }
    }
    return { roomId, reservedBy: reservedBy.trim(), participants, startTime, endTime };
}

function parseReservationId(value) {
    return Number(value);
}

function parseReservationFilters(query) {
    return { roomId: query.roomId === undefined ? undefined : Number(query.roomId) };
}

module.exports = { parseCreateReservation, parseReservationId, parseReservationFilters };
