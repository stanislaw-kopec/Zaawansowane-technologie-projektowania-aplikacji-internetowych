const UnauthorizedError = require("../errors/UnauthorizedError");
const ForbiddenError = require("../errors/ForbiddenError");
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) return next(new UnauthorizedError());
        if (!roles.includes(req.user.role)) return next(new ForbiddenError());
        next();
    };
}
module.exports = authorize;
