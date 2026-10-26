const { test } = require("node:test");
const assert = require("node:assert/strict");
const knex = require("knex");
const { createApp } = require("../src/app");
const { createRoomsRepository } = require("../src/modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("../src/modules/reservations/reservations.repository.knex");
const { runDoubleBooking } = require("../scripts/double-booking");

test("double booking demonstration", { skip: process.env.RUN_DB_TESTS !== "1", timeout: 60000 }, async () => {
    const config = require("../knexfile");
    const admin = knex(config);
    const schema = `lab3_race_${process.pid}`;
    const url = new URL(config.connection);
    url.searchParams.set("options", `-c search_path=${schema},public`);
    const db = knex({ client: "pg", connection: url.toString(), pool: { min: 0, max: 12 } });
    const input = { roomId: 1, reservedBy: "Concurrency test", participants: 1,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString() };
    function repositories(connection) {
        const roomsRepository = createRoomsRepository(connection);
        const reservationsRepository = createReservationsRepository(connection);
        const create = reservationsRepository.create;
        // Test-only delay after the collision check; never present in the API implementation.
        reservationsRepository.create = async data => {
            await new Promise(resolve => setTimeout(resolve, 250));
            return create(data);
        };
        return { roomsRepository, reservationsRepository };
    }
    async function scenario(label, options) {
        console.log(label);
        const server = createApp(options).listen(0);
        await new Promise(resolve => server.once("listening", resolve));
        try {
            return await runDoubleBooking({ db, baseUrl: `http://localhost:${server.address().port}`, input });
        } finally { await new Promise(resolve => server.close(resolve)); }
    }
    try {
        await admin.raw("CREATE SCHEMA ??", [schema]);
        await require("../src/db/migrations/202610260001_create_booking_tables").up(db);
        await db("buildings").insert({ name: "Race test", address: "Test" });
        await db("rooms").insert({ building_id: 1, name: "101", capacity: 10 });
        const unsafe = repositories(db);
        unsafe.roomsRepository.lockById = async () => {};
        const before = await scenario("BEFORE FIX", unsafe);
        assert.ok(before.count > 1);
        assert.equal(before.results.filter(r => r.status === 201).length, before.count);
        await db("reservations").del();
        const migration = require("../src/db/migrations/202610260002_prevent_double_booking");
        await migration.up(db);
        await migration.down(db);
        await migration.up(db);
        function assertProtected(result) {
            assert.equal(result.count, 1);
            assert.equal(result.results.filter(r => r.status === 201).length, 1);
            assert.equal(result.results.filter(r => r.status === 409).length, 9);
            for (const r of result.results.filter(r => r.status === 409)) assert.equal(r.body.error.code, "ROOM_ALREADY_BOOKED");
        }
        const protectedOptions = {
            ...repositories(db),
            runInTransaction: work => db.transaction(trx => work(repositories(trx)))
        };
        const after = await scenario("TRANSACTION + ROOM LOCK + CONSTRAINT", protectedOptions);
        assertProtected(after);
        await db("reservations").del();
        const databaseOnly = repositories(db);
        databaseOnly.roomsRepository.lockById = async () => {};
        databaseOnly.reservationsRepository.list = async () => [];
        const constraintOnly = await scenario("DATABASE CONSTRAINT ONLY", databaseOnly);
        assertProtected(constraintOnly);
        // Database-level checks also work without any service validation.
        const original = await db("reservations").first();
        const adjacent = { room_id: 1, reserved_by: "Adjacent", participants: 1, status: "CONFIRMED",
            start_time: input.endTime, end_time: new Date(Date.parse(input.endTime) + 3600000) };
        await db("reservations").insert(adjacent);
        await db("reservations").where({ id: original.id }).update({ status: "CANCELLED", cancelled_at: new Date() });
        const duplicate = { room_id: 1, reserved_by: "Replacement", participants: 1, status: "CONFIRMED",
            start_time: input.startTime, end_time: input.endTime };
        await db("reservations").insert(duplicate);
        await assert.rejects(db("reservations").insert(duplicate), { code: "23P01" });
        await assert.rejects(db("reservations").where({ id: original.id }).update({ status: "CONFIRMED" }), { code: "23P01" });
        console.log("Adjacent intervals and replacement after cancellation: OK");
    } finally {
        await db.destroy();
        await admin.raw("DROP SCHEMA IF EXISTS ?? CASCADE", [schema]);
        await admin.destroy();
    }
});
