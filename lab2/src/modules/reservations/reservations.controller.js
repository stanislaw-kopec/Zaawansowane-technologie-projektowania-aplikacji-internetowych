const { parseCreateReservation, parseReservationId, parseReservationFilters } = require("./reservations.schemas");
const { toReservationResponse } = require("./reservations.mapper");

function createReservationsController(reservationsService) {
    return {
        async list(req, res) {
            const reservations = await reservationsService.listReservations(parseReservationFilters(req.query));
            res.json(reservations.map(toReservationResponse));
        },
        async create(req, res) {
            const input = parseCreateReservation(req.body);
            const reservation = await reservationsService.createReservation(input);
            res.status(201).json(toReservationResponse(reservation));
        },
        async cancel(req, res) {
            const reservation = await reservationsService.cancelReservation(parseReservationId(req.params.id));
            res.json(toReservationResponse(reservation));
        }
    };
}

module.exports = { createReservationsController };
