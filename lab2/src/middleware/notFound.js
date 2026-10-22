const NotFoundError = require("../errors/NotFoundError");

function notFound(req, res, next) {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
