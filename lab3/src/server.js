const { createApp } = require("./app");
const db = require("./db/knex");
const { createBuildingsRepository } = require("./modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.knex");

const app = createApp({
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
