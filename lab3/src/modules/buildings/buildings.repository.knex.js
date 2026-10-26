function toBuilding(row) {
    return row ? { id: row.id, name: row.name, address: row.address, createdAt: row.created_at } : null;
}
function createBuildingsRepository(db) {
    return {
        async list() { return (await db("buildings").orderBy("id")).map(toBuilding); },
        async findById(id) { return toBuilding(await db("buildings").where({ id }).first()); },
        async create({ name, address }) {
            const [row] = await db("buildings").insert({ name, address }).returning("*");
            return toBuilding(row);
        }
    };
}
module.exports = { createBuildingsRepository };
