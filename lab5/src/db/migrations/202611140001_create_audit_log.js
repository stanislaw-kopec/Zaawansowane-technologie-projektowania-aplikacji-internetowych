exports.up = knex => knex.schema.createTable("audit_log", table => {
    table.increments("id").primary();
    table.string("event_type").notNullable();
    table.jsonb("payload").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable();
});
exports.down = knex => knex.schema.dropTable("audit_log");
