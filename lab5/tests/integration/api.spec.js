const request = require("supertest");
const knex = require("knex");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { createApp } = require("../../src/app");
const { createEventBus } = require("../../src/events/eventBus");
const { registerListeners, createAuditReader } = require("../../src/events/audit");
const { createUsersRepository } = require("../../src/modules/auth/users.repository.knex");
const { createBuildingsRepository } = require("../../src/modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("../../src/modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("../../src/modules/reservations/reservations.repository.knex");

let db, api, token, userId, roomId;
const credentials = { email: "owner@example.com", password: "password-for-test" };
const interval = { participants: 2, startTime: "2030-05-10T10:00:00Z", endTime: "2030-05-10T11:00:00Z" };

beforeAll(async () => {
    const connection = process.env.TEST_DATABASE_URL;
    if (!connection || !/^\/[a-zA-Z0-9_]+_test$/.test(new URL(connection).pathname)) {
        throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test");
    }
    db = knex({ client: "pg", connection, migrations: { directory: path.resolve(__dirname, "../../src/db/migrations") } });
    await db.migrate.latest();
    const eventBus = createEventBus();
    registerListeners(eventBus, db);
    api = request(createApp({
        eventBus, readAuditLog: createAuditReader(db),
        jwtSecret: randomBytes(32).toString("hex"),
        usersRepository: createUsersRepository(db),
        roomsRepository: createRoomsRepository(db),
        reservationsRepository: createReservationsRepository(db),
        buildingsRepository: createBuildingsRepository(db),
        now: () => new Date("2030-05-01T00:00:00Z"),
        runInTransaction: work => db.transaction(trx => work({
            roomsRepository: createRoomsRepository(trx),
            reservationsRepository: createReservationsRepository(trx)
        }))
    }));
});

async function registerAndLogin(account) {
    const registered = await api.post("/api/auth/register").send(account).expect(201);
    const login = await api.post("/api/auth/login").send(account).expect(200);
    return { id: registered.body.id, token: login.body.accessToken };
}

beforeEach(async () => {
    await db.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY");
    const [building] = await db("buildings").insert({ name: "A", address: "Test" }).returning("id");
    const [room] = await db("rooms").insert({ building_id: building.id, name: "101", capacity: 10 }).returning("id");
    roomId = room.id;
    const owner = await registerAndLogin(credentials);
    token = owner.token;
    userId = owner.id;
});

afterAll(async () => { if (db) await db.destroy(); });

function reserve(fields = {}) {
    return api.post("/api/reservations").auth(token, { type: "bearer" }).send({ roomId, ...interval, ...fields });
}

test("ADMIN audit log contains only committed changes, newest first", async () => {
    const account = { email: "admin@example.com", password: credentials.password };
    const admin = await registerAndLogin(account);
    await db("users").where({ id: admin.id }).update({ role: "ADMIN" });
    const login = await api.post("/api/auth/login").send(account).expect(200);
    const adminAuth = "Bearer " + login.body.accessToken;
    const { body } = await reserve().expect(201);
    await reserve().expect(409);
    const cancel = () => api.patch(`/api/reservations/${body.id}/cancel`).set("Authorization", adminAuth).expect(200);
    await Promise.all([cancel(), cancel()]);
    await cancel();
    const route = "/api/admin/audit-log";
    await api.get(route).expect(401);
    await api.get(route).auth(token, { type: "bearer" }).expect(403);
    const result = await api.get(route).set("Authorization", adminAuth).expect(200);
    expect(result.body.data.map(row => row.eventType)).toEqual(["reservation.cancelled", "reservation.created"]);
    expect(result.body.data[0].payload).toEqual({ reservationId: body.id, roomId, userId, cancelledBy: admin.id });
    const filtered = await api.get(route).query({ eventType: "reservation.created", limit: 1 }).set("Authorization", adminAuth).expect(200);
    expect(filtered.body.meta.total).toBe(1);
    expect(filtered.body.data[0].eventType).toBe("reservation.created");
    const page = await api.get(route).query({ page: 2, limit: 1 }).set("Authorization", adminAuth).expect(200);
    expect(page.body.data).toEqual(filtered.body.data);
});

test("failed audit insert logs an error and the reservation still returns 201", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    await db.raw("ALTER TABLE audit_log ADD CONSTRAINT demo_listener_failure CHECK (false)");
    try {
        const response = await reserve().expect(201);
        expect(await db("reservations").where({ id: response.body.id }).first()).toBeDefined();
        expect(log).toHaveBeenCalledWith("[event:reservation.created] handler failed", expect.stringContaining("demo_listener_failure"));
    } finally {
        log.mockRestore();
        await db.raw("ALTER TABLE audit_log DROP CONSTRAINT demo_listener_failure");
    }
});

test("registration and login give access to the same user's profile", async () => {
    const response = await api.get("/api/auth/me").auth(token, { type: "bearer" }).expect(200);
    expect(response.body).toMatchObject({ id: userId, email: credentials.email, role: "USER" });
});

test("201 gives the reservation location and persists it in PostgreSQL", async () => {
    const response = await reserve().expect(201);
    expect(response.headers.location).toBe(`/api/reservations/${response.body.id}`);
    const row = await db("reservations").where({ id: response.body.id }).first();
    expect(row).toMatchObject({ user_id: userId, room_id: roomId, participants: 2, status: "CONFIRMED" });
});

test("400 identifies the invalid body field", async () => {
    const response = await reserve({ participants: 0 }).expect(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR", details: [
        { location: "body", field: "participants", message: expect.any(String) }
    ] });
});

test("401 without a token", async () => {
    await api.get("/api/reservations").expect(401);
});

test("403 when a USER creates a room", async () => {
    await api.post("/api/rooms").auth(token, { type: "bearer" })
        .send({ buildingId: 1, name: "102", capacity: 5 }).expect(403);
});

test("404 when another USER reads a private reservation", async () => {
    const created = await reserve().expect(201);
    const other = await registerAndLogin({ ...credentials, email: "other@example.com" });
    await api.get(`/api/reservations/${created.body.id}`).auth(other.token, { type: "bearer" }).expect(404);
});

test("409 ROOM_ALREADY_BOOKED for overlapping reservations", async () => {
    await reserve().expect(201);
    const response = await reserve({ startTime: "2030-05-10T10:30:00Z" }).expect(409);
    expect(response.body.error.code).toBe("ROOM_ALREADY_BOOKED");
});

test("pagination returns one item and counts both reservations", async () => {
    await reserve().expect(201);
    await reserve({ startTime: interval.endTime, endTime: "2030-05-10T12:00:00Z" }).expect(201);
    const response = await api.get("/api/reservations?limit=1").auth(token, { type: "bearer" }).expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(2);
});
