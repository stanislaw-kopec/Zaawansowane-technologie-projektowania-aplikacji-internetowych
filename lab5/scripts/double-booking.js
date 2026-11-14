async function runDoubleBooking({ db, baseUrl, input, token }) {
    const results = await Promise.all(Array.from({ length: 10 }, async (_, index) => {
        const response = await fetch(`${baseUrl}/api/reservations`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input)
        });
        const body = await response.json();
        console.log(`Request ${index + 1}: ${response.status}`);
        return { status: response.status, body };
    }));
    const { count } = await db("reservations").where({ room_id: input.roomId, status: "CONFIRMED" })
        .where("start_time", input.startTime).where("end_time", input.endTime).count("*").first();
    console.log(`CONFIRMED in database: ${count}`);
    return { results, count: Number(count) };
}

if (require.main === module) {
    const config = require("../src/config");
    const db = require("../src/db/knex");
    const startTime = process.argv[3] || new Date(Date.now() + 86400000).toISOString();
    runDoubleBooking({
        db, baseUrl: config.BASE_URL, token: config.ACCESS_TOKEN,
        input: { roomId: Number(process.argv[2] || 1), participants: 1,
            startTime, endTime: new Date(Date.parse(startTime) + 3600000).toISOString() }
    }).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.destroy());
}
module.exports = { runDoubleBooking };
