const path = require("node:path");

try {
    process.loadEnvFile(path.join(__dirname, ".env"));
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL in lab3/.env or the environment");
}

module.exports = {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: { directory: path.join(__dirname, "src/db/migrations") }
};
