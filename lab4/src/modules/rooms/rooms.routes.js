const { Router } = require("express");
const validate = require("../../middleware/validate");
const { idParams, createRoomBody } = require("./rooms.schemas");

function createRoomsRouter(controller) {
    const router = Router();
    router.get("/", controller.list);
    router.post("/", validate({ body: createRoomBody }), controller.create);
    router.get("/:id", validate({ params: idParams }), controller.get);
    return router;
}

module.exports = { createRoomsRouter };
