const bcrypt = require("bcryptjs");
const { randomBytes, createHash } = require("node:crypto");
exports.up = async function (knex) {
    await knex.schema.alterTable("reservations", table => {
        table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
    });
    const owners = await knex("reservations").distinct("reserved_by");
    for (const { reserved_by: name } of owners) {
        const email = name === "Jan Kowalski" ? "jan.kowalski@example.com"
            : `legacy-${createHash("sha256").update(name).digest("hex")}@example.invalid`;
        const password = name === "Jan Kowalski" ? "user-password-123" : randomBytes(32).toString("hex");
        await knex("users").insert({ email, password_hash: await bcrypt.hash(password, 10), role: "USER" })
            .onConflict("email").ignore();
        const user = await knex("users").where({ email }).first();
        await knex("reservations").where({ reserved_by: name }).update({ user_id: user.id });
    }
    await knex.schema.alterTable("reservations", table => {
        table.integer("user_id").notNullable().alter();
        table.dropColumn("reserved_by");
    });
};
exports.down = async function (knex) {
    await knex.schema.alterTable("reservations", table => table.string("reserved_by", 100));
    await knex.raw(`UPDATE reservations r SET reserved_by =
        CASE WHEN u.email = 'jan.kowalski@example.com' THEN 'Jan Kowalski' ELSE LEFT(u.email, 100) END
        FROM users u WHERE u.id = r.user_id`);
    await knex.schema.alterTable("reservations", table => {
        table.string("reserved_by", 100).notNullable().alter();
        table.dropColumn("user_id");
    });
};
