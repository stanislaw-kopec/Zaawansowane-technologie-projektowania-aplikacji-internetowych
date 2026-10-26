const { toReservationResponse } = require("./reservations.mapper");

function createReservationsController(reservationsService) {
    return {
        async list(req, res) {
            const reservations = await reservationsService.listReservations(req.validated.query);
            res.json(reservations.map(toReservationResponse));
        },
        async create(req, res) {
            const input = req.validated.body;
            const reservation = await reservationsService.createReservation(input);
            res.location(`/api/reservations/${reservation.id}`)
                .status(201)
                .json(toReservationResponse(reservation));
        },
        async cancel(req, res) {
            const reservation = await reservationsService.cancelReservation(req.validated.params.id);
            res.json(toReservationResponse(reservation));
        }
    };
}

module.exports = { createReservationsController };
