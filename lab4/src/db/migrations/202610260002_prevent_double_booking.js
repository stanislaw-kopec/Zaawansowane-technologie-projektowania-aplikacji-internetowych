exports.up = async function (knex) {
    await knex.raw("CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public");
    await knex.raw(`ALTER TABLE reservations
        ADD CONSTRAINT reservations_no_overlap
        EXCLUDE USING gist (
            room_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        ) WHERE (status = 'CONFIRMED')`);
};

exports.down = async function (knex) {
    await knex.raw("ALTER TABLE reservations DROP CONSTRAINT reservations_no_overlap");
    // Keep the shared extension: other tables may also use it.
};
