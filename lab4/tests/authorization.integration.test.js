const { test } = require("node:test");
const assert = require("node:assert/strict");
const knex = require("knex");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("node:crypto");
const { createApp } = require("../src/app");

test("roles, private reservations, filtered pagination and ADMIN business rules", {
    skip: require("../src/config").RUN_DB_TESTS !== "1", timeout: 30000
}, async () => {
    const config = require("../knexfile");
    const admin = knex(config);
    const schema = `lab4_roles_${process.pid}`;
    const url = new URL(config.connection);
    url.searchParams.set("options", `-c search_path=${schema},public`);
    const db = knex({ ...config, connection: url.toString() });
    let server;
    try {
        await admin.raw("CREATE SCHEMA ??", [schema]);
        await db.migrate.latest();
        await require("../src/db/seeds/01_booking").seed(db);
        const owner = await db("users").where({ email: "jan.kowalski@example.com" }).first();
        const [other] = await db("users").insert({ email: "other@example.com", password_hash: "unused", role: "USER" }).returning("*");
        const [manager] = await db("users").insert({ email: "manager@example.com", password_hash: "unused", role: "ADMIN" }).returning("*");
        const jwtSecret = randomBytes(48).toString("base64");
        const tokens = { none: undefined };
        for (const [name, user] of Object.entries({ owner, other, admin: manager })) {
            tokens[name] = jwt.sign({ role: user.role }, jwtSecret, { subject: String(user.id), expiresIn: "15m" });
        }
        const rooms = require("../src/modules/rooms/rooms.repository.knex").createRoomsRepository;
        const reservations = require("../src/modules/reservations/reservations.repository.knex").createReservationsRepository;
        server = createApp({ jwtSecret,
            buildingsRepository: require("../src/modules/buildings/buildings.repository.knex").createBuildingsRepository(db),
            roomsRepository: rooms(db), reservationsRepository: reservations(db),
            runInTransaction: work => db.transaction(trx => work({ roomsRepository: rooms(trx), reservationsRepository: reservations(trx) }))
        }).listen(0);
        await new Promise(resolve => server.once("listening", resolve));
        async function request(method, route, role, body, expected) {
            const response = await fetch(`http://localhost:${server.address().port}/api${route}`, {
                method, headers: { "Content-Type": "application/json", ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
            const data = await response.json();
            assert.equal(response.status, expected, `${method} ${route} ${role}: ${JSON.stringify(data)}`);
            console.log(`${method} ${route} | ${role} -> ${response.status}`);
            return data;
        }
        for (const role of ["none", "owner", "other", "admin"]) {
            for (const route of ["/buildings", "/rooms"]) {
                await request("GET", route, role, undefined, role === "none" ? 401 : 200);
            }
            const result = await request("GET", "/reservations?limit=2&sort=-startTime", role, undefined, role === "none" ? 401 : 200);
            if (role !== "none") {
                assert.equal(result.meta.total, role === "other" ? 0 : 5);
                assert.equal(result.data.length, role === "other" ? 0 : 2);
            }
            await request("GET", "/reservations/3", role, undefined, role === "none" ? 401 : role === "other" ? 404 : 200);
            await request("POST", "/buildings", role, { name: "Role test", address: "Test" }, role === "none" ? 401 : role === "admin" ? 201 : 403);
            await request("POST", "/rooms", role, { buildingId: 1, name: "Role test", capacity: 10 }, role === "none" ? 401 : role === "admin" ? 201 : 403);
        }
        // PATCH/DELETE are not implemented yet, but USER cannot access write operations.
        for (const method of ["PATCH", "DELETE"]) for (const route of ["/rooms/1", "/buildings/1"]) {
            await request(method, route, "other", undefined, 403);
        }
        await request("GET", `/reservations?userId=${owner.id}`, "other", undefined, 403);
        await request("GET", `/reservations?userId=${owner.id}`, "owner", undefined, 403);
        const filtered = await request("GET", `/reservations?userId=${owner.id}&status=CONFIRMED&buildingId=1&limit=1&page=2`, "admin", undefined, 200);
        assert.equal(filtered.meta.total, 2);
        assert.equal(filtered.data.length, 1);
        assert.equal(filtered.data[0].user.id, owner.id);
        const empty = await request("GET", `/reservations?userId=${other.id}`, "admin", undefined, 200);
        assert.equal(empty.meta.total, 0);
        const ownPage = await request("GET", "/reservations?status=CONFIRMED&buildingId=1&limit=1&page=2", "owner", undefined, 200);
        assert.equal(ownPage.meta.total, 2);
        // Fix dates in these fixtures so cancellation tests remain valid in the future.
        await db("reservations").where({ id: 3 }).update({ start_time: "2035-01-01T10:00:00Z", end_time: "2035-01-01T11:00:00Z" });
        await db("reservations").where({ id: 4 }).update({ start_time: "2035-01-02T10:00:00Z", end_time: "2035-01-02T11:00:00Z" });
        await request("PATCH", "/reservations/3/cancel", "none", undefined, 401);
        await request("PATCH", "/reservations/3/cancel", "other", undefined, 404);
        assert.equal((await db("reservations").where({ id: 3 }).first()).status, "CONFIRMED");
        await request("PATCH", "/reservations/3/cancel", "owner", undefined, 200);
        await request("PATCH", "/reservations/3/cancel", "other", undefined, 404);
        await request("PATCH", "/reservations/4/cancel", "admin", undefined, 200);
        const past = await request("PATCH", "/reservations/1/cancel", "admin", undefined, 409);
        assert.equal(past.error.code, "RESERVATION_ALREADY_STARTED");
        const input = { roomId: 1, participants: 1, startTime: "2035-02-01T10:00:00Z", endTime: "2035-02-01T11:00:00Z" };
        await request("POST", "/reservations", "none", input, 401);
        const booked = await request("POST", "/reservations", "other", input, 201);
        await request("GET", `/reservations/${booked.id}`, "owner", undefined, 404);
        const overlap = await request("POST", "/reservations", "admin", input, 409);
        assert.equal(overlap.error.code, "ROOM_ALREADY_BOOKED");
        const capacity = await request("POST", "/reservations", "admin", { ...input, participants: 31 }, 409);
        assert.equal(capacity.error.code, "ROOM_CAPACITY_EXCEEDED");
        await request("POST", "/reservations", "admin", { ...input, startTime: "2035-02-01T11:00:00Z", endTime: "2035-02-01T12:00:00Z" }, 201);
        const ownList = await request("GET", "/reservations", "other", undefined, 200);
        assert.equal(ownList.meta.total, 1);
        assert.deepEqual(ownList.data.map(r => r.id), [booked.id]);
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await db.destroy();
        await admin.raw("DROP SCHEMA IF EXISTS ?? CASCADE", [schema]);
        await admin.destroy();
    }
});
