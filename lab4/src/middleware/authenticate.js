const jwt = require("jsonwebtoken");
const UnauthorizedError = require("../errors/UnauthorizedError");
function authenticate(jwtSecret) {
    return (req, res, next) => {
        const match = req.get("Authorization")?.match(/^Bearer ([^\s]+)$/i);
        if (!match) return next(new UnauthorizedError());
        try {
            const payload = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });
            const id = Number(payload.sub);
            if (typeof payload.sub !== "string" || !Number.isSafeInteger(id) || id <= 0 ||
                !["USER", "ADMIN"].includes(payload.role)) throw new Error("Invalid claims");
            req.user = { id, role: payload.role };
            next();
        } catch (error) {
            next(new UnauthorizedError(error.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
        }
    };
}
module.exports = authenticate;
