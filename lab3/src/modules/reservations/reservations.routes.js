const { Router } = require("express");
const validate = require("../../middleware/validate");
const { idParams, listReservationsQuery, createReservationBody } = require("./reservations.schemas");

function createReservationsRouter(controller) {
    const router = Router();
    router.get("/", validate({ query: listReservationsQuery }), controller.list);
    router.post("/", validate({ body: createReservationBody }), controller.create);
    router.patch("/:id/cancel", validate({ params: idParams }), controller.cancel);
    return router;
}

module.exports = { createReservationsRouter };
