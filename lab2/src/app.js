const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");
const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");

function createApp({ roomsRepository, reservationsRepository }) {
    const app = express();
    app.use(express.json());

    const roomsService = createRoomsService({ roomsRepository });
    const reservationsService = createReservationsService({ roomsRepository, reservationsRepository });
    app.use("/api/rooms", createRoomsRouter(createRoomsController(roomsService)));
    app.use("/api/reservations", createReservationsRouter(createReservationsController(reservationsService)));
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
