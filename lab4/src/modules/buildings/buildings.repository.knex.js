function toBuilding(row) {
    return row ? { id: row.id, name: row.name, address: row.address, createdAt: row.created_at } : null;
}
function createBuildingsRepository(db) {
    return {
        async list() {
            const rows = await db("buildings as b").leftJoin("rooms as r", "r.building_id", "b.id")
                .select("b.*").count({ rooms_count: "r.id" }).groupBy("b.id").orderBy("b.id");
            return rows.map(row => ({ ...toBuilding(row), roomsCount: Number(row.rooms_count) }));
        },
        async findById(id) { return toBuilding(await db("buildings").where({ id }).first()); },
        async create({ name, address }) {
            const [row] = await db("buildings").insert({ name, address }).returning("*");
            return toBuilding(row);
        }
    };
}
module.exports = { createBuildingsRepository };
