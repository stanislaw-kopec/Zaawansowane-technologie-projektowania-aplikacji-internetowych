const { toReservationResponse } = require("./reservations.mapper");

function createReservationsController(reservationsService) {
    return {
        async get(req, res) {
            res.json(toReservationResponse(await reservationsService.getReservation(req.validated.params.id, req.user)));
        },
        async list(req, res) {
            const { page, limit } = req.validated.query;
            const { items, total } = await reservationsService.listReservations(req.validated.query, req.user);
            res.json({
                data: items.map(toReservationResponse),
                meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        },
        async create(req, res) {
            const input = req.validated.body;
            const reservation = await reservationsService.createReservation(input, req.user);
            res.location(`/api/reservations/${reservation.id}`)
                .status(201)
                .json(toReservationResponse(reservation));
        },
        async cancel(req, res) {
            const reservation = await reservationsService.cancelReservation(req.validated.params.id, req.user);
            res.json(toReservationResponse(reservation));
        }
    };
}

module.exports = { createReservationsController };
