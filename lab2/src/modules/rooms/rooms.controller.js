const { parseRoomId } = require("./rooms.schemas");
const { toRoomResponse } = require("./rooms.mapper");

function createRoomsController(roomsService) {
    return {
        async list(req, res) {
            const rooms = await roomsService.listRooms();
            res.json(rooms.map(toRoomResponse));
        },
        async get(req, res) {
            const room = await roomsService.getRoom(parseRoomId(req.params.id));
            res.json(toRoomResponse(room));
        }
    };
}

module.exports = { createRoomsController };
