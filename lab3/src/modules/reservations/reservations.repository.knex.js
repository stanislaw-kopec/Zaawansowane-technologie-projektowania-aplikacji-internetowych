function toReservation(row) {
    return row ? {
        id: row.id, roomId: row.room_id, reservedBy: row.reserved_by,
        participants: row.participants, startTime: row.start_time, endTime: row.end_time,
        status: row.status, cancelledAt: row.cancelled_at, createdAt: row.created_at,
        room: { id: row.room_id, name: row.room_name, building: { id: row.building_id, name: row.building_name } }
    } : null;
}
function createReservationsRepository(db) {
    const query = () => db("reservations as res")
        .join("rooms as r", "r.id", "res.room_id")
        .join("buildings as b", "b.id", "r.building_id")
        .select("res.*", "r.name as room_name", "b.id as building_id", "b.name as building_name");
    const findById = async id => toReservation(await query().where("res.id", id).first());
    return {
        async list({ roomId } = {}) {
            const rows = query().orderBy("res.id");
            if (roomId !== undefined) rows.where("res.room_id", roomId);
            return (await rows).map(toReservation);
        },
        findById,
        async create({ roomId, reservedBy, participants, startTime, endTime, status }) {
            const [row] = await db("reservations").insert({
                room_id: roomId, reserved_by: reservedBy, participants,
                start_time: startTime, end_time: endTime, status
            }).returning("*");
            return row ? findById(row.id) : null;
        },
        async updateStatus(id, status, cancelledAt) {
            const [row] = await db("reservations").where({ id })
                .update({ status, cancelled_at: cancelledAt }).returning("*");
            return row ? findById(row.id) : null;
        }
    };
}
module.exports = { createReservationsRepository };
