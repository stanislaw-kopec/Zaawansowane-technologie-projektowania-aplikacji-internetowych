const { toRoomResponse } = require("./rooms.mapper");

function createRoomsController(roomsService) {
    return {
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
