const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const knex = require("knex");

test("Knex seeds, HTTP endpoints and persistence after server restart", {
    skip: process.env.RUN_DB_TESTS !== "1", timeout: 30000
}, async () => {
    const config = require("../knexfile");
    const admin = knex(config);
    const schema = `lab3_test_${process.pid}`;
    const url = new URL(config.connection);
    url.searchParams.set("options", `-c search_path=${schema},public`);
    const db = knex({ client: "pg", connection: url.toString() });
    const jwtSecret = require("node:crypto").randomBytes(48).toString("base64");
    let token;
    let userId;
    let server;
    let base;
    async function start() {
        server = spawn(process.execPath, ["src/server.js"], {
            cwd: path.join(__dirname, ".."),
            env: { ...process.env, DATABASE_URL: url.toString(), PORT: "0", JWT_SECRET: jwtSecret },
            stdio: ["ignore", "pipe", "pipe"]
        });
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.once("exit", code => reject(new Error(`Server exited: ${code}`)));
            server.stdout.on("data", data => {
                const match = data.toString().match(/http:\/\/localhost:(\d+)/);
                if (match) { base = match[0]; resolve(); }
            });
            server.stderr.on("data", data => process.stderr.write(data));
        });
    }
    async function stop() {
        if (!server || server.exitCode !== null) return;
        await new Promise(resolve => { server.once("exit", resolve); server.kill(); });
    }
    async function request(method, route, body, status) {
        const response = await fetch(base + "/api" + route, {
            method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
    }
    try {
        await admin.raw("CREATE SCHEMA ??", [schema]);
        await require("../src/db/migrations/202610260001_create_booking_tables").up(db);
        await require("../src/db/migrations/202610260002_prevent_double_booking").up(db);
        await require("../src/db/migrations/202610260003_create_users").up(db);
        await require("../src/db/migrations/202610270001_reservations_user").up(db);
        const seed = require("../src/db/seeds/01_booking").seed;
        const snapshot = async () => Promise.all(["buildings", "rooms", "reservations"].map(t => db(t).orderBy("id")));
        await seed(db);
        const first = await snapshot();
        userId = (await db("users").where({ email: "jan.kowalski@example.com" }).first()).id;
        token = require("jsonwebtoken").sign({ role: "USER" }, jwtSecret, { subject: String(userId), expiresIn: "15m" });
        await seed(db);
        assert.deepEqual(await snapshot(), first);
        assert.deepEqual(first.map(rows => rows.length), [2, 5, 5]);
        for (const rows of first) assert.equal(rows[0].id, 1);
        assert.ok(first[2].some(r => r.status === "CANCELLED"));
        assert.ok(first[2].some(r => r.status === "CONFIRMED" && r.start_time < new Date()));
        // Count actual SQL queries made by HTTP handlers using the same repositories.
        const { createApp } = require("../src/app");
        const app = createApp({ jwtSecret,
            buildingsRepository: require("../src/modules/buildings/buildings.repository.knex").createBuildingsRepository(db),
            roomsRepository: require("../src/modules/rooms/rooms.repository.knex").createRoomsRepository(db),
            reservationsRepository: require("../src/modules/reservations/reservations.repository.knex").createReservationsRepository(db),
            runInTransaction: work => db.transaction(trx => work({
                roomsRepository: require("../src/modules/rooms/rooms.repository.knex").createRoomsRepository(trx),
                reservationsRepository: require("../src/modules/reservations/reservations.repository.knex").createReservationsRepository(trx)
            }))
        });
        const http = app.listen(0);
        await new Promise(resolve => http.once("listening", resolve));
        const queries = [];
        const capture = query => queries.push(query.sql);
        db.on("query", capture);
        async function countedGet(route, count, status = 200) {
            queries.length = 0;
            const response = await fetch(`http://localhost:${http.address().port}/api${route}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            assert.equal(response.status, status);
            assert.equal(queries.length, count, route);
            console.log(`${route}: ${queries.length} SQL queries`);
            return data;
        }
        try {
            const buildings = await countedGet("/buildings", 1);
            assert.deepEqual(buildings.map(b => b.roomsCount), [3, 2]);
            const room = await countedGet("/rooms/1", 1);
            assert.deepEqual(room.building, { id: 1, name: "Budynek A" });
            assert.equal((await countedGet("/buildings/1/rooms", 2)).length, 3);
            await countedGet("/buildings/999999/rooms", 1, 404);
            const [empty] = await db("buildings").insert({ name: "Empty", address: "Test" }).returning("id");
            assert.deepEqual(await countedGet(`/buildings/${empty.id}/rooms`, 2), []);
            assert.equal((await countedGet("/buildings", 1)).find(b => b.id === empty.id).roomsCount, 0);
            await db("buildings").where({ id: empty.id }).del();
            const detail = await countedGet("/reservations/1", 1);
            assert.deepEqual(detail.room, { id: 1, name: "101", building: { id: 1, name: "Budynek A" } });
            assert.equal(detail.roomId, undefined);
            await countedGet("/reservations/999999", 1, 404);
            await countedGet("/reservations/invalid", 0, 400);
            const five = await countedGet("/reservations", 2);
            assert.equal(five.data.length, 5);
            assert.deepEqual(five.data[0], detail);
            console.log("5 reservations: " + queries.join("; "));
            const added = await db("reservations").insert(Array.from({ length: 15 }, (_, i) => ({
                room_id: 1, user_id: userId, participants: 1,
                start_time: new Date(Date.UTC(2030, 0, i + 1, 10)),
                end_time: new Date(Date.UTC(2030, 0, i + 1, 11)), status: "CONFIRMED"
            }))).returning("id");
            const twenty = await countedGet("/reservations", 2);
            assert.equal(twenty.data.length, 20);
            assert.deepEqual(twenty.data[0], detail);
            assert.ok(twenty.data.every(r => r.room.building.name));
            console.log("20 reservations: " + queries.join("; "));
            assert.deepEqual(five.meta, { page: 1, limit: 20, total: 5, totalPages: 1 });
            async function checkPage(params, ids, meta) {
                const result = await countedGet("/reservations?" + params, 2);
                assert.deepEqual(result.data.map(r => r.id), ids);
                assert.deepEqual(result.meta, meta);
                console.log(params + " SQL: " + queries.join("; "));
            }
            await checkPage("buildingId=1&status=CONFIRMED&page=2&limit=2&sort=startTime",
                added.slice(0, 2).map(r => r.id), { page: 2, limit: 2, total: 17, totalPages: 9 });
            await checkPage("roomId=2&status=CANCELLED&sort=-createdAt",
                [2], { page: 1, limit: 20, total: 1, totalPages: 1 });
            await checkPage("from=2026-11-10T10:15:00Z&to=2026-11-10T10:30:00Z&sort=-participants&limit=2",
                [2, 3], { page: 1, limit: 2, total: 4, totalPages: 2 });
            await checkPage("buildingId=2&sort=-startTime&page=99&limit=1",
                [], { page: 99, limit: 1, total: 2, totalPages: 2 });
            await checkPage("roomId=2&from=2026-11-10T11:00:00Z", [], { page: 1, limit: 20, total: 0, totalPages: 0 });
            await checkPage("roomId=2&to=2026-11-10T10:00:00Z", [], { page: 1, limit: 20, total: 0, totalPages: 0 });
            await checkPage("roomId=2&buildingId=2", [], { page: 1, limit: 20, total: 0, totalPages: 0 });
            for (const sort of ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"]) {
                const rows = await db("reservations");
                const field = { startTime: "start_time", createdAt: "created_at", participants: "participants" }[sort.replace("-", "")];
                rows.sort((a, b) => (sort.startsWith("-") ? -1 : 1) * (a[field] - b[field]) || a.id - b.id);
                await checkPage(`sort=${sort}&limit=100`, rows.map(r => r.id), { page: 1, limit: 100, total: 20, totalPages: 1 });
            }
            for (const params of ["page=0", "page=1.5", "limit=0", "limit=101", "limit=abc", "roomId=-1", "buildingId=abc",
                "status=INVALID", "sort=unknown", "sort=start_time", "from=bad",
                "from=2026-11-10T11:00:00Z&to=2026-11-10T10:00:00Z",
                "from=2026-11-10T11:00:00Z&to=2026-11-10T11:00:00Z"]) {
                await countedGet("/reservations?" + params, 0, 400);
            }
            // A conflict beyond the first page must still be detected.
            const more = await db("reservations").insert(Array.from({ length: 6 }, (_, i) => ({
                room_id: 1, user_id: userId, participants: 1,
                start_time: new Date(Date.UTC(2031, 0, i + 1, 10)),
                end_time: new Date(Date.UTC(2031, 0, i + 1, 11)), status: "CONFIRMED"
            }))).returning("id");
            const conflictResponse = await fetch(`http://localhost:${http.address().port}/api/reservations`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ roomId: 1, participants: 1,
                    startTime: "2031-01-06T10:00:00Z", endTime: "2031-01-06T11:00:00Z" })
            });
            assert.equal(conflictResponse.status, 409);
            assert.equal((await conflictResponse.json()).error.code, "ROOM_ALREADY_BOOKED");
            const defaultPage = await countedGet("/reservations", 2);
            assert.equal(defaultPage.data.length, 20);
            assert.deepEqual(defaultPage.meta, { page: 1, limit: 20, total: 26, totalPages: 2 });
            await db("reservations").whereIn("id", [...added, ...more].map(r => r.id)).del();
        } finally {
            db.off("query", capture);
            await new Promise(resolve => http.close(resolve));
        }
        await start();
        assert.equal((await request("GET", "/buildings", undefined, 200)).length, 2);
        await request("GET", "/buildings/1", undefined, 200);
        await request("GET", "/buildings/999999", undefined, 404);
        await request("POST", "/buildings", { name: "", address: "" }, 400);
        const building = await request("POST", "/buildings", { name: "Test", address: "Test address" }, 201);
        await request("POST", "/buildings", { name: "Test", address: "Test address" }, 409);
        const input = { buildingId: building.id, name: "101", capacity: 10 };
        await request("POST", "/rooms", { ...input, buildingId: 999999 }, 404);
        await request("POST", "/rooms", { ...input, capacity: 0 }, 400);
        await request("POST", "/rooms", { name: "101", capacity: 10 }, 400);
        const room = await request("POST", "/rooms", input, 201);
        const conflict = await request("POST", "/rooms", input, 409);
        assert.equal(conflict.error.code, "CONFLICT");
        assert.equal(conflict.error.message, "Resource already exists");
        assert.equal(conflict.error.detail, undefined);
        const startTime = new Date(Date.now() + 86400000).toISOString();
        const endTime = new Date(Date.parse(startTime) + 3600000).toISOString();
        const reservationInput = { roomId: room.id, participants: 5, startTime, endTime };
        const reservation = await request("POST", "/reservations", reservationInput, 201);
        await request("POST", "/reservations", reservationInput, 409);
        await stop();
        await start();
        assert.deepEqual(await request("GET", `/buildings/${building.id}`, undefined, 200), building);
        assert.deepEqual(await request("GET", `/rooms/${room.id}`, undefined, 200), room);
        assert.deepEqual((await request("GET", `/reservations?roomId=${room.id}`, undefined, 200)).data, [reservation]);
        const cancelled = await request("PATCH", `/reservations/${reservation.id}/cancel`, undefined, 200);
        assert.equal(cancelled.status, "CANCELLED");
        assert.ok(cancelled.cancelledAt);
        assert.deepEqual(await request("PATCH", `/reservations/${reservation.id}/cancel`, undefined, 200), cancelled);
        await request("POST", "/reservations", reservationInput, 201);
        await request("PATCH", "/reservations/1/cancel", undefined, 409);
        await request("PATCH", "/reservations/999999/cancel", undefined, 404);
    } finally {
        await stop();
        await db.destroy();
        await admin.raw("DROP SCHEMA IF EXISTS ?? CASCADE", [schema]);
        await admin.destroy();
    }
});
