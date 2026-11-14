function toRoom(row) {
    return row ? {
        id: row.id, buildingId: row.building_id, name: row.name,
        capacity: row.capacity, createdAt: row.created_at,
        building: { id: row.building_id, name: row.building_name }
    } : null;
}
function createRoomsRepository(db) {
    const query = () => db("rooms as r").join("buildings as b", "b.id", "r.building_id")
        .select("r.*", "b.name as building_name");
    const findById = async id => toRoom(await query().where("r.id", id).first());
    return {
        async list({ buildingId } = {}) {
            const rows = query().orderBy("r.id");
            if (buildingId !== undefined) rows.where("r.building_id", buildingId);
            return (await rows).map(toRoom);
        },
        findById,
        async lockById(id) { await db("rooms").where({ id }).forUpdate().first(); },
        async create({ buildingId, name, capacity }) {
            const [row] = await db("rooms").insert({ building_id: buildingId, name, capacity }).returning("id");
            return findById(row.id);
        }
    };
}
module.exports = { createRoomsRepository };
