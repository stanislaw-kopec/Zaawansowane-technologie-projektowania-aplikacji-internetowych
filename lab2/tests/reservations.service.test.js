const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createReservationsService } = require("../src/modules/reservations/reservations.service");
const { createRoomsRepository } = require("../src/modules/rooms/rooms.repository.memory");
const { createReservationsRepository } = require("../src/modules/reservations/reservations.repository.memory");

const fixedNow = new Date("2026-11-01T10:00:00Z");
const input = {
    roomId: 1, reservedBy: "Jan Kowalski", participants: 20,
    startTime: "2026-11-10T10:00:00Z", endTime: "2026-11-10T12:00:00Z"
};

function setup() {
    const reservationsRepository = createReservationsRepository();
    const service = createReservationsService({
        roomsRepository: createRoomsRepository(),
        reservationsRepository,
        now: () => fixedNow
    });
    return { service, reservationsRepository };
}

for (const [name, startTime, endTime, allowed] of [
    ["touching after", "12:00", "13:00", true],
    ["touching before", "08:00", "10:00", true],
    ["overlapping end", "11:00", "13:00", false],
    ["overlapping beginning", "09:00", "11:00", false],
    ["surrounding existing", "09:00", "13:00", false],
    ["inside existing", "10:30", "11:00", false],
    ["identical interval", "10:00", "12:00", false]
]) {
    test(name, async () => {
        const { service, reservationsRepository } = setup();
        await service.createReservation(input);
        const candidate = { ...input, startTime: `2026-11-10T${startTime}:00Z`, endTime: `2026-11-10T${endTime}:00Z` };
        if (allowed) {
            assert.equal((await service.createReservation(candidate)).status, "CONFIRMED");
        } else {
            await assert.rejects(service.createReservation(candidate), { code: "ROOM_ALREADY_BOOKED" });
            assert.equal((await reservationsRepository.list()).length, 1);
        }
    });
}

test("same time in another room is allowed", async () => {
    const { service } = setup();
    await service.createReservation(input);
    assert.equal((await service.createReservation({ ...input, roomId: 2 })).roomId, 2);
});

test("cancelled reservation does not block the room", async () => {
    const { service } = setup();
    const original = await service.createReservation(input);
    await service.cancelReservation(original.id);
    assert.equal((await service.createReservation(input)).status, "CONFIRMED");
});

test("equivalent timezone offsets conflict", async () => {
    const { service } = setup();
    await service.createReservation(input);
    await assert.rejects(service.createReservation({
        ...input, startTime: "2026-11-10T11:00:00+01:00", endTime: "2026-11-10T13:00:00+01:00"
    }), { code: "ROOM_ALREADY_BOOKED" });
});

for (const [name, duration, allowed] of [
    ["zero duration", 0, false],
    ["negative duration", -1000, false],
    ["one millisecond below 15 minutes", 15 * 60000 - 1, false],
    ["exactly 15 minutes", 15 * 60000, true],
    ["exactly 8 hours", 8 * 3600000, true],
    ["one millisecond above 8 hours", 8 * 3600000 + 1, false]
]) {
    test(name, async () => {
        const { service, reservationsRepository } = setup();
        const candidate = { ...input, endTime: new Date(Date.parse(input.startTime) + duration).toISOString() };
        if (allowed) {
            assert.equal((await service.createReservation(candidate)).status, "CONFIRMED");
        } else {
            await assert.rejects(service.createReservation(candidate), error =>
                error.code === "VALIDATION_ERROR" && error.details.some(d => d.field === "endTime")
            );
            assert.equal((await reservationsRepository.list()).length, 0);
        }
    });
}

test("start equal to injected clock is allowed", async () => {
    const { service } = setup();
    assert.equal((await service.createReservation({
        ...input, startTime: fixedNow.toISOString(), endTime: "2026-11-01T11:00:00Z"
    })).status, "CONFIRMED");
});

test("start one millisecond before injected clock is rejected", async () => {
    const { service } = setup();
    await assert.rejects(service.createReservation({
        ...input, startTime: new Date(fixedNow.getTime() - 1).toISOString(), endTime: "2026-11-01T11:00:00Z"
    }), error => error.code === "VALIDATION_ERROR" && error.details.some(d => d.field === "startTime"));
});

test("past start and wrong date order are reported together", async () => {
    const { service } = setup();
    await assert.rejects(service.createReservation({
        ...input, startTime: "2026-10-01T12:00:00Z", endTime: "2026-10-01T10:00:00Z"
    }), error => error.code === "VALIDATION_ERROR" &&
        error.details.some(d => d.field === "startTime") && error.details.some(d => d.field === "endTime"));
});

test("room capacity rule still applies", async () => {
    const { service } = setup();
    await assert.rejects(service.createReservation({ ...input, participants: 31 }), { code: "ROOM_CAPACITY_EXCEEDED" });
});
