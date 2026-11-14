const AppError = require("./AppError");

class ValidationError extends AppError {
    constructor(details) {
        super("Validation failed", 400, "VALIDATION_ERROR", details);
    }
}

module.exports = ValidationError;
