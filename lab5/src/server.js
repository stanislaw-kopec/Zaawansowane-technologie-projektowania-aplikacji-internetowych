const config = require("./config");
const { createApp } = require("./app");
const db = require("./db/knex");
const { createBuildingsRepository } = require("./modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.knex");

const { createUsersRepository } = require("./modules/auth/users.repository.knex");

const app = createApp({
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
