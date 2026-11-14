const ValidationError = require("../errors/ValidationError");

function validate(schemas) {
    return (req, res, next) => {
        const validated = {};
        const details = [];

        for (const location of ["params", "query", "body"]) {
            const schema = schemas[location];
            if (!schema) continue;

            const result = schema.safeParse(req[location]);
            if (result.success) {
                validated[location] = result.data;
            } else {
                for (const issue of result.error.issues) {
                    details.push({
                        location,
                        field: issue.path.join("."),
                        message: issue.message
                    });
                }
            }
        }

        if (details.length > 0) return next(new ValidationError(details));
        req.validated = validated;
        next();
    };
}

module.exports = validate;
