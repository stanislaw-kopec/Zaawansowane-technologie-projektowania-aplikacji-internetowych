const { z } = require("zod");

const idParams = z.object({
    id: z.coerce.number().int().positive()
});

const createRoomBody = z.object({
    buildingId: z.number().int().positive(),
    name: z.string().trim().min(1).max(120),
    capacity: z.number().int().positive().max(2147483647)
}).strict();

module.exports = { idParams, createRoomBody };
