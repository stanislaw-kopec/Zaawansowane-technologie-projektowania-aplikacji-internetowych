const bcrypt = require("bcryptjs");
const ConflictError = require("../../errors/ConflictError");
function createAuthService({ usersRepository }) {
    return {
        async register({ email, password }) {
            const existing = await usersRepository.findByEmail(email);
            if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");
            const passwordHash = await bcrypt.hash(password, 10);
            return usersRepository.create({ email, passwordHash, role: "USER" });
        }
    };
}
module.exports = { createAuthService };
