const { toRoomResponse } = require("./rooms.mapper");

function createRoomsController(roomsService) {
    return {
        async create(req, res) {
            const room = await roomsService.createRoom(req.validated.body);
            res.location(`/api/rooms/${room.id}`).status(201).json(toRoomResponse(room));
        },
        async list(req, res) {
            const rooms = await roomsService.listRooms();
            res.json(rooms.map(toRoomResponse));
        },
        async get(req, res) {
            const room = await roomsService.getRoom(req.validated.params.id);
            res.json(toRoomResponse(room));
        }
    };
}

module.exports = { createRoomsController };
