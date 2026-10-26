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
    url.searchParams.set("options", `-c search_path=${schema}`);
    const db = knex({ client: "pg", connection: url.toString() });
    let server;
    let base;
    async function start() {
        server = spawn(process.execPath, ["src/server.js"], {
            cwd: path.join(__dirname, ".."),
            env: { ...process.env, DATABASE_URL: url.toString(), PORT: "0" },
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
            method, headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
    }
    try {
        await admin.raw("CREATE SCHEMA ??", [schema]);
        await require("../src/db/migrations/202610260001_create_booking_tables").up(db);
        const seed = require("../src/db/seeds/01_booking").seed;
        const snapshot = async () => Promise.all(["buildings", "rooms", "reservations"].map(t => db(t).orderBy("id")));
        await seed(db);
        const first = await snapshot();
        await seed(db);
        assert.deepEqual(await snapshot(), first);
        assert.deepEqual(first.map(rows => rows.length), [2, 5, 5]);
        for (const rows of first) assert.equal(rows[0].id, 1);
        assert.ok(first[2].some(r => r.status === "CANCELLED"));
        assert.ok(first[2].some(r => r.status === "CONFIRMED" && r.start_time < new Date()));
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
        const reservationInput = { roomId: room.id, reservedBy: "Jan Test", participants: 5, startTime, endTime };
        const reservation = await request("POST", "/reservations", reservationInput, 201);
        await request("POST", "/reservations", reservationInput, 409);
        await stop();
        await start();
        assert.deepEqual(await request("GET", `/buildings/${building.id}`, undefined, 200), building);
        assert.deepEqual(await request("GET", `/rooms/${room.id}`, undefined, 200), room);
        assert.deepEqual(await request("GET", `/reservations?roomId=${room.id}`, undefined, 200), [reservation]);
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
