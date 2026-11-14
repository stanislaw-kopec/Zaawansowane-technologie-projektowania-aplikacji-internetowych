const { test } = require("node:test");
const assert = require("node:assert/strict");
const knex = require("knex");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("node:crypto");
const { createApp } = require("../src/app");
test("migration with existing reservations, token protection and token-only identity", {
    skip: require("../src/config").RUN_DB_TESTS !== "1", timeout: 30000
}, async () => {
    const config = require("../knexfile");
    const admin = knex(config);
    const schema = `lab4_identity_${process.pid}`;
    const url = new URL(config.connection);
    url.searchParams.set("options", `-c search_path=${schema},public`);
    const db = knex({ client: "pg", connection: url.toString() });
    const jwtSecret = randomBytes(48).toString("base64");
    let server;
    try {
        await admin.raw("CREATE SCHEMA ??", [schema]);
        for (const file of ["202610260001_create_booking_tables", "202610260002_prevent_double_booking", "202610260003_create_users"]) {
            await require("../src/db/migrations/" + file).up(db);
        }
        await db("buildings").insert({ name: "Migration", address: "Test" });
        await db("rooms").insert({ building_id: 1, name: "101", capacity: 10 });
        const old = await db("reservations").insert([
            { room_id: 1, reserved_by: "Jan Kowalski", participants: 1, start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z" },
            { room_id: 1, reserved_by: "Other legacy name", participants: 2, start_time: "2026-01-02T10:00:00Z", end_time: "2026-01-02T11:00:00Z" }
        ]).returning("*");
        const migration = require("../src/db/migrations/202610270001_reservations_user");
        await db.transaction(trx => migration.up(trx));
        const migrated = await db("reservations").orderBy("id");
        assert.equal(migrated.length, old.length);
        for (let i = 0; i < old.length; i++) {
            const { reserved_by, ...expected } = old[i];
            const { user_id, ...actual } = migrated[i];
            assert.deepEqual(actual, expected);
            assert.ok(await db("users").where({ id: user_id }).first());
        }
        assert.notEqual(migrated[0].user_id, migrated[1].user_id);
        await db.transaction(trx => migration.down(trx));
        assert.equal(await db.schema.hasColumn("reservations", "reserved_by"), true);
        await db.transaction(trx => migration.up(trx));
        assert.equal(await db.schema.hasColumn("reservations", "reserved_by"), false);
        const usersRepository = require("../src/modules/auth/users.repository.knex").createUsersRepository(db);
        const rooms = require("../src/modules/rooms/rooms.repository.knex").createRoomsRepository;
        const reservations = require("../src/modules/reservations/reservations.repository.knex").createReservationsRepository;
        server = createApp({ jwtSecret, jwtExpiresIn: "10s", usersRepository,
            roomsRepository: rooms(db), reservationsRepository: reservations(db),
            buildingsRepository: require("../src/modules/buildings/buildings.repository.knex").createBuildingsRepository(db),
            runInTransaction: work => db.transaction(trx => work({ roomsRepository: rooms(trx), reservationsRepository: reservations(trx) }))
        }).listen(0);
        await new Promise(resolve => server.once("listening", resolve));
        async function request(method, route, body, authorization) {
            const response = await fetch(`http://localhost:${server.address().port}${route}`, {
                method, headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
            return { status: response.status, body: await response.json() };
        }
        const login = await request("POST", "/api/auth/login", { email: "jan.kowalski@example.com", password: "user-password-123" });
        assert.equal(login.status, 200);
        const token = login.body.accessToken;
        const payload = jwt.decode(token);
        assert.equal(payload.exp - payload.iat, 10);
        for (const [method, route] of [["GET", "/api/rooms"], ["GET", "/api/buildings/1/rooms"],
            ["GET", "/api/reservations"], ["GET", "/api/reservations/1"], ["POST", "/api/reservations"],
            ["POST", "/api/buildings"], ["POST", "/api/rooms"], ["PATCH", "/api/reservations/1/cancel"]]) {
            assert.equal((await request(method, route)).status, 401);
        }
        const parts = token.split(".");
        const modified = [parts[0], Buffer.from(JSON.stringify({ ...payload, role: "ADMIN" })).toString("base64url"), parts[2]].join(".");
        const wrongSignature = [...parts.slice(0, 2), (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1)].join(".");
        for (const header of [undefined, "Basic abc", "Bearer", "Bearer invalid", `Bearer ${wrongSignature}`, `Bearer ${modified}`]) {
            assert.equal((await request("GET", "/api/rooms", undefined, header)).status, 401);
        }
        const auth = `Bearer ${token}`;
        const input = { roomId: 1, participants: 1, startTime: "2035-01-01T10:00:00Z", endTime: "2035-01-01T11:00:00Z" };
        for (const extra of [{ userId: 999 }, { reservedBy: "Other" }]) {
            assert.equal((await request("POST", "/api/reservations", { ...input, ...extra }, auth)).status, 400);
        }
        const created = await request("POST", "/api/reservations", input, auth);
        assert.equal(created.status, 201);
        assert.deepEqual(created.body.user, { id: Number(payload.sub), email: "jan.kowalski@example.com" });
        assert.equal(created.body.reservedBy, undefined);
        assert.equal((await db("reservations").where({ id: created.body.id }).first()).user_id, Number(payload.sub));
        assert.equal((await request("GET", "/api/reservations/1", undefined, auth)).body.user.email, "jan.kowalski@example.com");
        await new Promise(resolve => setTimeout(resolve, 11000));
        const expired = await request("GET", "/api/rooms", undefined, auth);
        assert.equal(expired.status, 401);
        assert.equal(expired.body.error.message, "Token expired");
        console.log("Existing data preserved; all required 401 cases and token-only ownership: OK.");
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await db.destroy();
        await admin.raw("DROP SCHEMA IF EXISTS ?? CASCADE", [schema]);
        await admin.destroy();
    }
});
