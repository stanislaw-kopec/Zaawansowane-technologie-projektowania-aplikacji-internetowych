const express = require("express");
const app = express();

app.use(express.json());

const rooms = [
    { id: 1, name: "A101", capacity: 30},
    { id: 2, name: "A102", capacity: 20},
    { id: 3, name: "B201", capacity: 50},
    { id: 4, name: "B202", capacity: 15}
];

const reservations = [];
let nextReservationId = 1;

app.get("/api/rooms", (req, res) => {
    res.json(rooms);
});

app.get("/api/rooms/:id", (req, res) => {
    const id = Number(req.params.id);
    const room = rooms.find(room => room.id === id);

    if (!room) {
        return res.status(404).json({
            message: "Room not found"
        });
    }

    res.json(room);
});

app.get("/api/reservations", (req, res) => {
    if (req.query.roomId === undefined) {
        return res.json(reservations);
    }

    const roomId = Number(req.query.roomId);
    const filteredReservations = reservations.filter(reservation => reservation.roomId === roomId);

    res.json(filteredReservations);
});

app.post("/api/reservations", (req, res) => {
    const { roomId, reservedBy, participants, date } = req.body ?? {};

    if (!Number.isInteger(roomId) || roomId <= 0) {
        return res.status(400).json({
            message: "roomId must be a positive integer"
        });
    }

    if (typeof reservedBy !== "string" || reservedBy.trim() === "") {
        return res.status(400).json({
            message: "reservedBy is required"
        });
    }

    if (!Number.isFinite(participants) || participants <= 0) {
        return res.status(400).json({
            message: "participants must be a number greater than 0"
        });
    }

    if (typeof date !== "string" || date.trim() === "") {
        return res.status(400).json({
            message: "date is required"
        });
    }

    const room = rooms.find(room => room.id === roomId);

    if (!room) {
        return res.status(404).json({
            message: "Room not found"
        });
    }

    if (participants > room.capacity) {
        return res.status(409).json({
            message: "Room capacity exceeded"
        });
    }

    const reservation = {
        id: nextReservationId++,
        roomId,
        reservedBy: reservedBy.trim(),
        participants,
        date: date.trim(),
        status: "CONFIRMED"
    };

    reservations.push(reservation);
    res.status(201).json(reservation);
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
