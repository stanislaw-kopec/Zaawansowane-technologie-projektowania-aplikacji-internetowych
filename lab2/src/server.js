const { createApp } = require("./app");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.memory");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.memory");

const app = createApp({
    roomsRepository: createRoomsRepository(),
    reservationsRepository: createReservationsRepository(),
    enableDebugRoutes: process.argv.includes("--debug")
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
