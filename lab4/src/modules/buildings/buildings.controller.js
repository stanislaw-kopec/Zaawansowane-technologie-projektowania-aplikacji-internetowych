const { toRoomResponse } = require("../rooms/rooms.mapper");
function toBuildingResponse({ id, name, address, roomsCount }) {
    return { id, name, address, ...(roomsCount !== undefined ? { roomsCount } : {}) };
}
function createBuildingsController(service) {
    return {
        async rooms(req, res) { res.json((await service.listRooms(req.validated.params.id)).map(toRoomResponse)); },
        async list(req, res) { res.json((await service.listBuildings()).map(toBuildingResponse)); },
        async get(req, res) { res.json(toBuildingResponse(await service.getBuilding(req.validated.params.id))); },
        async create(req, res) {
            const building = await service.createBuilding(req.validated.body);
            res.location(`/api/buildings/${building.id}`).status(201).json(toBuildingResponse(building));
        }
    };
}
module.exports = { createBuildingsController };
