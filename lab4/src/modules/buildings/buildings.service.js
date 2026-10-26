const NotFoundError = require("../../errors/NotFoundError");
function createBuildingsService({ buildingsRepository, roomsRepository }) {
    return {
        async listRooms(id) {
            const building = await buildingsRepository.findById(id);
            if (!building) throw new NotFoundError("Building");
            return roomsRepository.list({ buildingId: id });
        },
        async listBuildings() { return buildingsRepository.list(); },
        async getBuilding(id) {
            const building = await buildingsRepository.findById(id);
            if (!building) throw new NotFoundError("Building");
            return building;
        },
        async createBuilding(input) { return buildingsRepository.create(input); }
    };
}
module.exports = { createBuildingsService };
