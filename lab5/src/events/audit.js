function registerListeners(bus, db) {
    const save = event => db("audit_log").insert({
        event_type: event.name, payload: event.payload, created_at: event.occurredAt
    });
    bus.subscribe("reservation.created", save);
    bus.subscribe("reservation.cancelled", save);
    bus.subscribe("reservation.cancelled", async ({ payload }) => {
        // Only an administrator can cancel another user's reservation.
        if (payload.cancelledBy === payload.userId) return;
        const owner = await db("users").select("email").where({ id: payload.userId }).first();
        console.log(`[notification] to: ${owner.email} - reservation ${payload.reservationId} cancelled`);
    });
}

function createAuditReader(db) {
    return async ({ page, limit, eventType }) => {
        const query = db("audit_log");
        if (eventType) query.where("event_type", eventType);
        const [{ count }] = await query.clone().count("* as count");
        const data = await query.select("id", "event_type as eventType", "payload", "created_at as createdAt")
            .orderBy("created_at", "desc").orderBy("id", "desc").offset((page - 1) * limit).limit(limit);
        const total = Number(count);
        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    };
}
module.exports = { registerListeners, createAuditReader };
