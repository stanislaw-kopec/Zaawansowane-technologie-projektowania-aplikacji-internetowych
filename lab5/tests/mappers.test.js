const { test } = require("node:test");
const assert = require("node:assert/strict");
const { toReservationResponse } = require("../src/modules/reservations/reservations.mapper");
const { toRoomResponse } = require("../src/modules/rooms/rooms.mapper");

const reservation = {
    id: 1, roomId: 2, user: { id: 1, email: "jan@example.com" }, participants: 10,
    startTime: "2026-11-10T10:00:00+01:00", endTime: "2026-11-10T12:00:00+01:00",
    createdAt: new Date("2026-10-22T12:00:00Z"), status: "CONFIRMED",
    internalNote: "private", secret: "also private"
};

test("reservation DTO exposes only explicit fields and normalizes dates to UTC", () => {
    assert.deepEqual(toReservationResponse(reservation), {
        id: 1, roomId: 2, user: { id: 1, email: "jan@example.com" }, participants: 10,
        startTime: "2026-11-10T09:00:00.000Z", endTime: "2026-11-10T11:00:00.000Z",
        createdAt: "2026-10-22T12:00:00.000Z", status: "CONFIRMED", cancelledAt: null
    });
});

test("cancelledAt is serialized as ISO UTC", () => {
    const dto = toReservationResponse({ ...reservation, status: "CANCELLED", cancelledAt: "2026-10-23T15:00:00+02:00" });
    assert.equal(dto.cancelledAt, "2026-10-23T13:00:00.000Z");
});

test("room DTO excludes additional internal fields", () => {
    assert.deepEqual(toRoomResponse({ id: 1, name: "A101", capacity: 30, internalNote: "private" }), {
        id: 1, name: "A101", capacity: 30
    });
});
