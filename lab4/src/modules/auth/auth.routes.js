const { Router } = require("express");
const validate = require("../../middleware/validate");
const { registerBody } = require("./auth.schemas");
function createAuthRouter(service) {
    const router = Router();
    router.post("/register", validate({ body: registerBody }), async (req, res) => {
        const user = await service.register(req.validated.body);
        res.status(201).json({ id: user.id, email: user.email, role: user.role,
            createdAt: new Date(user.createdAt).toISOString() });
    });
    return router;
}
module.exports = { createAuthRouter };
