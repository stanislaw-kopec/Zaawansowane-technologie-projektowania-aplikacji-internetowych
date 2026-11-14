const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createRoomsRepository } = require("../../src/modules/rooms/rooms.repository.memory");
const { createReservationsRepository } = require("../../src/modules/reservations/reservations.repository.memory");

const owner = { id: 1, role: "USER" };
const input = {
    roomId: 1, participants: 2,
    startTime: "2030-04-10T10:00:00Z", endTime: "2030-04-10T11:00:00Z"
};
let service, clock;

beforeEach(() => {
    clock = new Date("2030-04-10T09:00:00Z");
    service = createReservationsService({
        roomsRepository: createRoomsRepository(),
        reservationsRepository: createReservationsRepository(),
        now: () => clock
    });
});

test.each([
    ["partial overlap", "10:30", "11:30", 1, false],
    ["existing interval contains new", "10:15", "10:45", 1, false],
    ["new interval contains existing", "09:30", "11:30", 1, false],
    ["touching after", "11:00", "12:00", 1, true],
    ["touching before", "09:00", "10:00", 1, true],
    ["same interval in another room", "10:00", "11:00", 2, true]
])("%s", async (_name, start, end, roomId, allowed) => {
    await service.createReservation(input, owner);
    const result = service.createReservation({
        ...input, roomId, startTime: `2030-04-10T${start}:00Z`, endTime: `2030-04-10T${end}:00Z`
    }, owner);
    if (allowed) await expect(result).resolves.toMatchObject({ roomId, status: "CONFIRMED" });
    else await expect(result).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
});

test("a cancelled reservation frees its interval", async () => {
    const reservation = await service.createReservation(input, owner);
    await service.cancelReservation(reservation.id, owner);
    await expect(service.createReservation(input, owner)).resolves.toMatchObject({ status: "CONFIRMED" });
});

test.each([[30, true], [31, false]])("room capacity 30, participants %i", async (participants, allowed) => {
    const result = service.createReservation({ ...input, participants }, owner);
    if (allowed) await expect(result).resolves.toMatchObject({ participants });
    else await expect(result).rejects.toMatchObject({ code: "ROOM_CAPACITY_EXCEEDED" });
});

test.each([[14, false], [15, true], [480, true], [481, false]])("duration %i minutes", async (minutes, allowed) => {
    const endTime = new Date(Date.parse(input.startTime) + minutes * 60000).toISOString();
    const result = service.createReservation({ ...input, endTime }, owner);
    if (allowed) await expect(result).resolves.toMatchObject({ status: "CONFIRMED" });
    else await expect(result).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
});

test("a started reservation cannot be cancelled", async () => {
    const reservation = await service.createReservation(input, owner);
    clock = new Date(input.startTime);
    await expect(service.cancelReservation(reservation.id, owner)).rejects.toMatchObject({ code: "RESERVATION_ALREADY_STARTED" });
});

test("repeated cancellation keeps the original timestamp", async () => {
    const reservation = await service.createReservation(input, owner);
    const first = await service.cancelReservation(reservation.id, owner);
    const timestamp = first.cancelledAt.getTime();
    expect(timestamp).toBe(clock.getTime());
    clock = new Date("2030-04-10T09:30:00Z");
    const repeated = await service.cancelReservation(reservation.id, owner);
    expect(repeated.status).toBe("CANCELLED");
    expect(repeated.cancelledAt.getTime()).toBe(timestamp);
});

test("another USER cannot read or cancel the reservation", async () => {
    const reservation = await service.createReservation(input, owner);
    const other = { id: 2, role: "USER" };
    await expect(service.getReservation(reservation.id, other)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.cancelReservation(reservation.id, other)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("ADMIN can read and cancel another user's reservation", async () => {
    const reservation = await service.createReservation(input, owner);
    const admin = { id: 2, role: "ADMIN" };
    await expect(service.getReservation(reservation.id, admin)).resolves.toMatchObject({ id: reservation.id });
    await expect(service.cancelReservation(reservation.id, admin)).resolves.toMatchObject({ status: "CANCELLED" });
});
