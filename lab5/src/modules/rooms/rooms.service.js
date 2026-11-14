const NotFoundError = require("../../errors/NotFoundError");

function createRoomsService({ roomsRepository, buildingsRepository }) {
    return {
        async createRoom(input) {
            const building = await buildingsRepository.findById(input.buildingId);
            if (!building) throw new NotFoundError("Building");
            return roomsRepository.create(input);
        },
        async listRooms() {
            return roomsRepository.list();
        },
        async getRoom(id) {
            const room = await roomsRepository.findById(id);
            if (!room) throw new NotFoundError("Room");
            return room;
        }
    };
}

module.exports = { createRoomsService };
