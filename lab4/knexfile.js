const path = require("node:path");

const config = require("./src/config");

module.exports = {
    client: "pg",
    connection: config.DATABASE_URL,
    migrations: { directory: path.join(__dirname, "src/db/migrations") },
    seeds: { directory: path.join(__dirname, "src/db/seeds") }
};
