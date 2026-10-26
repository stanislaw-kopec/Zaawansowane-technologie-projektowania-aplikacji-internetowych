function toBuildingResponse({ id, name, address }) { return { id, name, address }; }
function createBuildingsController(service) {
    return {
        async list(req, res) { res.json((await service.listBuildings()).map(toBuildingResponse)); },
        async get(req, res) { res.json(toBuildingResponse(await service.getBuilding(req.validated.params.id))); },
        async create(req, res) {
            const building = await service.createBuilding(req.validated.body);
            res.location(`/api/buildings/${building.id}`).status(201).json(toBuildingResponse(building));
        }
    };
}
module.exports = { createBuildingsController };
