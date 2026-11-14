const bcrypt = require("bcryptjs");
exports.seed = async function (knex) {
    // Public demo credentials for the local laboratory only.
    const passwordHash = await bcrypt.hash("admin-password-123", 10);
    await knex("users").insert({
        email: "admin@example.com", password_hash: passwordHash, role: "ADMIN"
    }).onConflict("email").ignore();
};
