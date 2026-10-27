const SORT_COLUMNS = { startTime: "res.start_time", createdAt: "res.created_at", participants: "res.participants" };

function toReservation(row) {
    return row ? {
        id: row.id, roomId: row.room_id, userId: row.user_id, user: { id: row.user_id, email: row.user_email },
        participants: row.participants, startTime: row.start_time, endTime: row.end_time,
        status: row.status, cancelledAt: row.cancelled_at, createdAt: row.created_at,
        room: { id: row.room_id, name: row.room_name, building: { id: row.building_id, name: row.building_name } }
    } : null;
}
function createReservationsRepository(db) {
    const query = () => db("reservations as res")
        .join("rooms as r", "r.id", "res.room_id")
        .join("buildings as b", "b.id", "r.building_id")
        .join("users as u", "u.id", "res.user_id")
        .select("u.email as user_email", "res.*", "r.name as room_name", "b.id as building_id", "b.name as building_name");
    const findById = async id => toReservation(await query().where("res.id", id).first());
    return {
        async listPage({ userId, roomId, buildingId, status, from, to, page = 1, limit = 20, sort = "startTime" } = {}) {
            const base = query();
            if (userId !== undefined) base.where("res.user_id", userId);
            if (roomId !== undefined) base.where("res.room_id", roomId);
            if (buildingId !== undefined) base.where("r.building_id", buildingId);
            if (status !== undefined) base.where("res.status", status);
            if (from !== undefined) base.where("res.end_time", ">", from);
            if (to !== undefined) base.where("res.start_time", "<", to);
            const descending = sort.startsWith("-");
            const column = SORT_COLUMNS[descending ? sort.slice(1) : sort];
            const [rows, count] = await Promise.all([
                base.clone().orderBy(column, descending ? "desc" : "asc").orderBy("res.id", "asc")
                    .limit(limit).offset((page - 1) * limit),
                base.clone().clearSelect().count({ total: "res.id" }).first()
            ]);
            return { items: rows.map(toReservation), total: Number(count.total) };
        },
        async list({ roomId } = {}) {
            const rows = query().orderBy("res.id");
            if (roomId !== undefined) rows.where("res.room_id", roomId);
            return (await rows).map(toReservation);
        },
        findById,
        async create({ roomId, userId, participants, startTime, endTime, status }) {
            const [row] = await db("reservations").insert({
                room_id: roomId, user_id: userId, participants,
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
