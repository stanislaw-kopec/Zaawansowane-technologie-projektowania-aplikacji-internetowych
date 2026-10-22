const { Router } = require("express");

function createRoomsRouter(controller) {
    const router = Router();
    router.get("/", controller.list);
    router.get("/:id", controller.get);
    return router;
}

module.exports = { createRoomsRouter };
