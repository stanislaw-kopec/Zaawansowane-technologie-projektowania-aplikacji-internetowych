const { z } = require("zod");
const registerBody = z.object({
    email: z.email().max(254).toLowerCase(),
    password: z.string().min(10).max(72)
        .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must not exceed 72 UTF-8 bytes")
}).strict();
const loginBody = z.object({
    email: z.email().max(254).toLowerCase(),
    password: z.string().min(1)
}).strict();
module.exports = { registerBody, loginBody };
