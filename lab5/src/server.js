const config = require("./config");
const { createApp } = require("./app");
const db = require("./db/knex");
const { createBuildingsRepository } = require("./modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.knex");

const { createUsersRepository } = require("./modules/auth/users.repository.knex");
const { createEventBus } = require("./events/eventBus");
const { registerListeners, createAuditReader } = require("./events/audit");
const eventBus = createEventBus();
registerListeners(eventBus, db);

const app = createApp({
    eventBus,
    readAuditLog: createAuditReader(db),
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
    usersRepository: createUsersRepository(db),
    buildingsRepository: createBuildingsRepository(db),
    roomsRepository: createRoomsRepository(db),
    reservationsRepository: createReservationsRepository(db),
    runInTransaction: work => db.transaction(trx => work({
        roomsRepository: createRoomsRepository(trx),
        reservationsRepository: createReservationsRepository(trx)
    })),
    enableDebugRoutes: process.argv.includes("--debug")
});

const server = app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${server.address().port}`);
});

process.once("SIGTERM", () => {
    console.log("SIGTERM: closing HTTP server");
    server.close(async () => {
        await db.destroy();
        console.log("HTTP server and database pool closed");
    });
});
