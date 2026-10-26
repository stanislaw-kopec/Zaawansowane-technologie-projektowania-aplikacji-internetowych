exports.seed = async function (knex) {
    await knex.transaction(async trx => {
        await trx.raw("TRUNCATE reservations, rooms, buildings RESTART IDENTITY");
        const createdAt = "2026-01-01T08:00:00Z";
        await trx("buildings").insert([
            { name: "Budynek A", address: "ul. Warszawska 24, Krakow", created_at: createdAt },
            { name: "Budynek B", address: "ul. Warszawska 26, Krakow", created_at: createdAt }
        ]);
        await trx("rooms").insert([
            { building_id: 1, name: "101", capacity: 30 },
            { building_id: 1, name: "102", capacity: 20 },
            { building_id: 1, name: "103", capacity: 10 },
            { building_id: 2, name: "101", capacity: 50 },
            { building_id: 2, name: "102", capacity: 15 }
        ].map(room => ({ ...room, created_at: createdAt })));
        await trx("reservations").insert([
            { room_id: 1, start_time: "2026-01-02T10:00:00Z", end_time: "2026-01-02T11:00:00Z", status: "CONFIRMED", cancelled_at: null },
            { room_id: 2, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:00:00Z", status: "CANCELLED", cancelled_at: "2026-01-03T10:00:00Z" },
            { room_id: 3, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:00:00Z", status: "CONFIRMED", cancelled_at: null },
            { room_id: 4, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:00:00Z", status: "CONFIRMED", cancelled_at: null },
            { room_id: 5, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:00:00Z", status: "CONFIRMED", cancelled_at: null }
        ].map(row => ({ ...row, reserved_by: "Jan Kowalski", participants: 5, created_at: createdAt })));
    });
};
