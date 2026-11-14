const path = require("node:path");
const { z } = require("zod");
try { process.loadEnvFile(path.join(__dirname, "../../.env")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(0).max(65535).default(3001),
    DATABASE_URL: z.url().refine(value => /^postgres(?:ql)?:\/\//.test(value), "Use a PostgreSQL URL"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must have at least 32 characters"),
    JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d*(s|m|h|d)$/, "Use a positive duration, e.g. 15m").default("15m"),
    RUN_DB_TESTS: z.enum(["0", "1"]).default("0"),
    BASE_URL: z.url().default("http://localhost:3001"),
    ACCESS_TOKEN: z.string().optional()
}).refine(value => value.PORT > 0 || value.NODE_ENV === "test", { path: ["PORT"], message: "PORT must be at least 1 outside tests" });
const result = schema.safeParse(process.env);
if (!result.success) {
    console.error("Invalid environment configuration:");
    for (const issue of result.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
}
// Child processes in integration tests inherit environment through this module only.
module.exports = Object.freeze({ ...result.data, getEnvironment: () => ({ ...process.env }) });
