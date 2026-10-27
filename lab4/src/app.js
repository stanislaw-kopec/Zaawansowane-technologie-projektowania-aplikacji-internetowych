const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./docs/openapi.json");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");
const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");

const { createBuildingsService } = require("./modules/buildings/buildings.service");
const { createBuildingsController } = require("./modules/buildings/buildings.controller");
const { createBuildingsRouter } = require("./modules/buildings/buildings.routes");

const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthRouter } = require("./modules/auth/auth.routes");

const authorize = require("./middleware/authorize");
const authenticate = require("./middleware/authenticate");

function createApp({ jwtSecret, jwtExpiresIn, usersRepository, buildingsRepository, roomsRepository, reservationsRepository, now, runInTransaction, enableDebugRoutes = false }) {
    const app = express();
    app.use(requestLogger);
    app.use(express.json());

    const roomsService = createRoomsService({ roomsRepository, buildingsRepository });
    const reservationsService = createReservationsService({ roomsRepository, reservationsRepository, now, runInTransaction });
    app.use("/api/auth", createAuthRouter(createAuthService({ usersRepository, jwtSecret, jwtExpiresIn }), authenticate(jwtSecret)));
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));
    app.use(authenticate(jwtSecret));
    const requireAdmin = authorize("ADMIN");
    app.use(["/api/buildings", "/api/rooms"], (req, res, next) => {
        if (["POST", "PATCH", "DELETE"].includes(req.method)) return requireAdmin(req, res, next);
        next();
    });
    app.use("/api/buildings", createBuildingsRouter(createBuildingsController(createBuildingsService({ buildingsRepository, roomsRepository }))));
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
