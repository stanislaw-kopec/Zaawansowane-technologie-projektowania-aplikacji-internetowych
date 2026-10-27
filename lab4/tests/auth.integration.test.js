const { test } = require("node:test");
const assert = require("node:assert/strict");
const knex = require("knex");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("node:crypto");
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
    const jwtSecret = randomBytes(48).toString("base64");
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
        server = createApp({ usersRepository, jwtSecret }).listen(0);
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
        async function login(email, password) {
            const response = await fetch(`http://localhost:${server.address().port}/api/auth/login`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password })
            });
            return { status: response.status, body: await response.json() };
        }
        async function me(token) {
            const response = await fetch(`http://localhost:${server.address().port}/api/auth/me`, {
                headers: token === undefined ? {} : { Authorization: `Bearer ${token}` }
            });
            return { status: response.status, body: await response.json() };
        }
        const loggedIn = await login("JAN.KOWALSKI@EXAMPLE.COM", input.password);
        assert.equal(loggedIn.status, 200);
        assert.equal(loggedIn.body.tokenType, "Bearer");
        assert.equal(loggedIn.body.expiresIn, "15m");
        const token = loggedIn.body.accessToken;
        const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
        assert.equal(jwt.decode(token, { complete: true }).header.alg, "HS256");
        assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
        assert.equal(payload.sub, String(created.body.id));
        assert.equal(payload.role, "USER");
        assert.equal(payload.exp - payload.iat, 900);
        assert.deepEqual(await me(token), { status: 200, body: created.body });
        const badEmail = await login("absent@example.com", input.password);
        const badPassword = await login(input.email, "wrong-password");
        for (const response of [badEmail, badPassword]) {
            assert.equal(response.status, 401);
            assert.equal(response.body.error.code, "UNAUTHORIZED");
            assert.equal(response.body.error.message, "Invalid email or password");
        }
        assert.equal((await me()).status, 401);
        assert.equal((await me(jwt.sign({ role: "USER" }, "wrong-secret", { subject: payload.sub, expiresIn: "15m" }))).status, 401);
        assert.equal((await me(jwt.sign({ role: "USER" }, jwtSecret, { subject: payload.sub, algorithm: "HS384", expiresIn: "15m" }))).status, 401);
        const expired = await me(jwt.sign({ role: "USER" }, jwtSecret, { subject: payload.sub, expiresIn: -1 }));
        assert.equal(expired.status, 401);
        assert.equal(expired.body.error.message, "Token expired");
        const auth = require("../src/modules/auth/auth.service").createAuthService({ usersRepository, jwtSecret, jwtExpiresIn: "10s" });
        const short = await auth.login({ email: input.email.toLowerCase(), password: input.password });
        const shortPayload = jwt.verify(short.accessToken, jwtSecret, { algorithms: ["HS256"] });
        assert.equal(short.expiresIn, "10s");
        assert.equal(shortPayload.exp - shortPayload.iat, 10);
        assert.throws(() => jwt.verify(short.accessToken, jwtSecret, { algorithms: ["HS256"], clockTimestamp: shortPayload.exp }), { name: "TokenExpiredError" });
        const adminLogin = await login("admin@example.com", "admin-password-123");
        assert.equal(adminLogin.status, 200);
        assert.equal((await me(adminLogin.body.accessToken)).body.role, "ADMIN");
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
