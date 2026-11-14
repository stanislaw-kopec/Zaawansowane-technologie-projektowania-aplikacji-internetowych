const { Router } = require("express");
const validate = require("../../middleware/validate");
const { idParams, createBuildingBody } = require("./buildings.schemas");
function createBuildingsRouter(controller) {
    const router = Router();
    router.get("/", controller.list);
    router.get("/:id/rooms", validate({ params: idParams }), controller.rooms);
    router.get("/:id", validate({ params: idParams }), controller.get);
    router.post("/", validate({ body: createBuildingBody }), controller.create);
    return router;
}
module.exports = { createBuildingsRouter };
