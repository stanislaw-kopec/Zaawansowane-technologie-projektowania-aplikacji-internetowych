const AppError = require("../errors/AppError");

function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON" });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
}

module.exports = errorHandler;
