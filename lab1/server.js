const express = require("express");
const app = express();

const rooms = [
    { id: 1, name: "A101", capacity: 30},
    { id: 2, name: "A102", capacity: 20},
    { id: 3, name: "B201", capacity: 50},
    { id: 4, name: "B202", capacity: 15}
];

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

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
