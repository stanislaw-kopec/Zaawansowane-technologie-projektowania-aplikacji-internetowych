const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const config = require("../src/config");
for (const [field, value] of [["JWT_SECRET", ""], ["JWT_SECRET", "short"], ["DATABASE_URL", "invalid"],
    ["DATABASE_URL", "https://example.com"], ["PORT", "invalid"], ["PORT", "70000"], ["JWT_EXPIRES_IN", "invalid"]]) {
    test(`server refuses invalid ${field}: ${value}`, () => {
        const result = spawnSync(process.execPath, ["src/server.js"], {
            cwd: path.join(__dirname, ".."), env: { ...config.getEnvironment(), [field]: value }, encoding: "utf8", timeout: 5000
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Invalid environment configuration/);
        assert.ok(result.stderr.includes(field));
        assert.ok(!result.stdout.includes("Server running"));
        assert.ok(!result.stderr.includes(config.JWT_SECRET));
    });
}
test("OpenAPI references resolve and errors reuse one schema", () => {
    const doc = require("../src/docs/openapi.json");
    const walk = value => {
        if (!value || typeof value !== "object") return;
        if (value.$ref) assert.ok(value.$ref.split("/").slice(1).reduce((v, k) => v?.[k], doc), value.$ref);
        for (const child of Object.values(value)) walk(child);
    };
    walk(doc);
    for (const operations of Object.values(doc.paths)) for (const op of Object.values(operations)) {
        for (const [code, response] of Object.entries(op.responses)) {
            if (Number(code) >= 400) assert.equal(response.content["application/json"].schema.$ref, "#/components/schemas/Error");
        }
    }
    assert.equal(doc.components.securitySchemes.bearerAuth.scheme, "bearer");
});
