const { Router } = require("express");
const validate = require("../../middleware/validate");
const { registerBody, loginBody } = require("./auth.schemas");
const { toUserResponse } = require("./auth.mapper");
function createAuthRouter(service, requireAuth) {
    const router = Router();
    router.post("/register", validate({ body: registerBody }), async (req, res) => {
        const user = await service.register(req.validated.body);
        res.status(201).json(toUserResponse(user));
    });
    router.post("/login", validate({ body: loginBody }), async (req, res) => {
        res.json(await service.login(req.validated.body));
    });
    router.get("/me", requireAuth, async (req, res) => {
        res.json(toUserResponse(await service.me(req.user.id)));
    });
    return router;
}
module.exports = { createAuthRouter };
