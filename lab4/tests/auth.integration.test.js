const { test } = require("node:test");
const assert = require("node:assert/strict");
const knex = require("knex");
const bcrypt = require("bcryptjs");
const { createApp } = require("../src/app");
const { createUsersRepository } = require("../src/modules/auth/users.repository.knex");

test("registration, bcrypt, validation, admin seed and concurrent duplicate emails", {
    skip: process.env.RUN_DB_TESTS !== "1", timeout: 30000
}, async () => {
    const config = require("../knexfile");
    const admin = knex(config);
    const schema = `lab4_auth_${process.pid}`;
    const url = new URL(config.connection);
    url.searchParams.set("options", `-c search_path=${schema},public`);
    const db = knex({ client: "pg", connection: url.toString() });
    let server;
    try {
        await admin.raw("CREATE SCHEMA ??", [schema]);
        const migration = require("../src/db/migrations/202610260003_create_users");
        await migration.up(db);
        await migration.down(db);
        await migration.up(db);
        const seed = require("../src/db/seeds/02_admin").seed;
        await seed(db);
        const seeded = await db("users").first();
        await seed(db);
        assert.deepEqual(await db("users"), [seeded]);
        assert.equal(seeded.role, "ADMIN");
        assert.ok(await bcrypt.compare("admin-password-123", seeded.password_hash));
        await assert.rejects(db("users").insert({ email: "bad@example.com", password_hash: "test", role: "BAD" }), { code: "23514" });
        const usersRepository = createUsersRepository(db);
        const lookup = usersRepository.findByEmail;
        let arrivals = 0;
        let release;
        const barrier = new Promise(resolve => { release = resolve; });
        // Force all ten requests past the precheck to verify the database error mapping.
        usersRepository.findByEmail = async email => {
            const result = await lookup(email);
            if (email === "race@example.com") {
                if (++arrivals === 10) release();
                await barrier;
            }
            return result;
        };
        server = createApp({ usersRepository }).listen(0);
        await new Promise(resolve => server.once("listening", resolve));
        async function register(body) {
            const response = await fetch(`http://localhost:${server.address().port}/api/auth/register`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
            });
            return { status: response.status, body: await response.json() };
        }
        const input = { email: "Jan.Kowalski@example.com", password: "bardzo-dlugie-haslo" };
        const created = await register(input);
        assert.equal(created.status, 201);
        assert.deepEqual(Object.keys(created.body).sort(), ["createdAt", "email", "id", "role"]);
        assert.equal(created.body.email, input.email.toLowerCase());
        assert.equal(created.body.role, "USER");
        assert.ok(!Number.isNaN(Date.parse(created.body.createdAt)));
        const saved = await db("users").where({ id: created.body.id }).first();
        assert.notEqual(saved.password_hash, input.password);
        assert.ok(bcrypt.getRounds(saved.password_hash) >= 10);
        assert.ok(await bcrypt.compare(input.password, saved.password_hash));
        const duplicate = await register({ ...input, email: "JAN.KOWALSKI@EXAMPLE.COM" });
        assert.equal(duplicate.status, 409);
        assert.equal(duplicate.body.error.code, "EMAIL_TAKEN");
        for (const body of [
            { ...input, role: "ADMIN" }, { ...input, extra: true },
            { ...input, password: "123456789" }, { ...input, password: "a".repeat(73) },
            { ...input, password: "ż".repeat(37) }, { ...input, email: "invalid" },
            { email: "missing@example.com" }
        ]) assert.equal((await register(body)).status, 400);
        for (const length of [10, 72]) {
            assert.equal((await register({ email: `length${length}@example.com`, password: "a".repeat(length) })).status, 201);
        }
        const parallel = await Promise.all(Array.from({ length: 10 }, (_, i) => register({
            email: i % 2 ? "RACE@example.com" : "race@example.com", password: input.password
        })));
        assert.equal(parallel.filter(r => r.status === 201).length, 1);
        assert.equal(parallel.filter(r => r.status === 409).length, 9);
        for (const r of parallel.filter(r => r.status === 409)) {
            assert.equal(r.body.error.code, "EMAIL_TAKEN");
            assert.equal(r.body.error.message, duplicate.body.error.message);
            assert.equal(r.body.error.detail, undefined);
        }
        assert.equal((await db("users").where({ email: "race@example.com" })).length, 1);
        console.log("Concurrent registration: 1 x 201, 9 x 409 EMAIL_TAKEN, no 500.");
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await db.destroy();
        await admin.raw("DROP SCHEMA IF EXISTS ?? CASCADE", [schema]);
        await admin.destroy();
    }
});
