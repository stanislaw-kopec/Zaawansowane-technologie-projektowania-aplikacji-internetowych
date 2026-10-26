class AppError extends Error {
    constructor(message, statusCode, code, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        if (details !== undefined) this.details = details;
    }
}

module.exports = AppError;
