function toReservation(row) {
    return row ? {
        id: row.id, roomId: row.room_id, reservedBy: row.reserved_by,
        participants: row.participants, startTime: row.start_time, endTime: row.end_time,
        status: row.status, cancelledAt: row.cancelled_at, createdAt: row.created_at
    } : null;
}
function createReservationsRepository(db) {
    return {
        async list({ roomId } = {}) {
            const query = db("reservations").orderBy("id");
            if (roomId !== undefined) query.where("room_id", roomId);
            return (await query).map(toReservation);
        },
        async findById(id) { return toReservation(await db("reservations").where({ id }).first()); },
        async create({ roomId, reservedBy, participants, startTime, endTime, status }) {
            const [row] = await db("reservations").insert({
                room_id: roomId, reserved_by: reservedBy, participants,
                start_time: startTime, end_time: endTime, status
            }).returning("*");
            return toReservation(row);
        },
        async updateStatus(id, status, cancelledAt) {
            const [row] = await db("reservations").where({ id })
                .update({ status, cancelled_at: cancelledAt }).returning("*");
            return toReservation(row);
        }
    };
}
module.exports = { createReservationsRepository };
