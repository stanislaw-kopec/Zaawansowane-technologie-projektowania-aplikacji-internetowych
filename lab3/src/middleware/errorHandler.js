const AppError = require("../errors/AppError");

function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    let statusCode = 500;
    const response = {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        requestId: req.id
    };

    if (error instanceof AppError) {
        statusCode = error.statusCode;
        response.code = error.code;
        response.message = error.message;
        if (error.details !== undefined) response.details = error.details;
    } else if (error.code === "23505") {
        statusCode = 409;
        response.code = "CONFLICT";
        response.message = "Resource already exists";
    } else if (error.type === "entity.parse.failed") {
        statusCode = 400;
        response.code = "INVALID_JSON";
        response.message = "Invalid JSON";
    } else if (error.type === "entity.too.large") {
        statusCode = 413;
        response.code = "PAYLOAD_TOO_LARGE";
        response.message = "Request body too large";
    } else if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
        statusCode = 415;
        response.code = "UNSUPPORTED_MEDIA_TYPE";
        response.message = "Unsupported request encoding";
    } else {
        console.error(`[${req.id}] ${req.method} ${req.originalUrl}`, error);
    }

    res.status(statusCode).json({ error: response });
}

module.exports = errorHandler;
