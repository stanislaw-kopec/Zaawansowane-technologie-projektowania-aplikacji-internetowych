const express = require("express");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");
const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");

function createApp({ roomsRepository, reservationsRepository, now, enableDebugRoutes = false }) {
    const app = express();
    app.use(requestLogger);
    app.use(express.json());

    const roomsService = createRoomsService({ roomsRepository });
    const reservationsService = createReservationsService({ roomsRepository, reservationsRepository, now });
    app.use("/api/rooms", createRoomsRouter(createRoomsController(roomsService)));
    app.use("/api/reservations", createReservationsRouter(createReservationsController(reservationsService)));
    // Tymczasowy endpoint do demonstracji 500; wlaczany jawnie podczas uruchamiania.
    if (enableDebugRoutes) {
        app.get("/api/debug/crash", async () => {
            throw new Error("boom");
        });
    }

    app.use(notFound);
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
