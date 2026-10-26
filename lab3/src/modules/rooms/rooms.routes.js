const { Router } = require("express");
const validate = require("../../middleware/validate");
const { idParams } = require("./rooms.schemas");

function createRoomsRouter(controller) {
    const router = Router();
    router.get("/", controller.list);
    router.get("/:id", validate({ params: idParams }), controller.get);
    return router;
}

module.exports = { createRoomsRouter };
