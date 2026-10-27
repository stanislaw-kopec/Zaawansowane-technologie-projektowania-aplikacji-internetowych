const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UnauthorizedError = require("../../errors/UnauthorizedError");
const ConflictError = require("../../errors/ConflictError");
function createAuthService({ usersRepository, jwtSecret, jwtExpiresIn = "15m" }) {
    return {
        async login({ email, password }) {
            const user = await usersRepository.findByEmail(email);
            const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
            if (!user || !passwordOk) throw new UnauthorizedError("Invalid email or password");
            const accessToken = jwt.sign({ role: user.role }, jwtSecret, {
                subject: String(user.id), expiresIn: jwtExpiresIn, algorithm: "HS256"
            });
            return { accessToken, tokenType: "Bearer", expiresIn: jwtExpiresIn };
        },
        async me(id) {
            const user = await usersRepository.findById(id);
            if (!user) throw new UnauthorizedError("User no longer exists");
            return user;
        },
        async register({ email, password }) {
            const existing = await usersRepository.findByEmail(email);
            if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");
            const passwordHash = await bcrypt.hash(password, 10);
            return usersRepository.create({ email, passwordHash, role: "USER" });
        }
    };
}
module.exports = { createAuthService };
