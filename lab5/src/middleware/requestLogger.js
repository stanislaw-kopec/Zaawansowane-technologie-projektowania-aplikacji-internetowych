const { randomUUID } = require("node:crypto");

function requestLogger(req, res, next) {
    req.id = req.get("X-Request-Id") || randomUUID();
    res.set("X-Request-Id", req.id);
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const milliseconds = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`[${req.id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${milliseconds.toFixed(1)} ms)`);
    });

    next();
}

module.exports = requestLogger;
