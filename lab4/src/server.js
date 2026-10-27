const { createApp } = require("./app");
const db = require("./db/knex");
const { createBuildingsRepository } = require("./modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.knex");

const { createUsersRepository } = require("./modules/auth/users.repository.knex");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Set JWT_SECRET to at least 32 characters in lab4/.env");
}
const app = createApp({
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
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

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on http://localhost:${server.address().port}`);
});
