const router = require("express").Router();
const controller = require("./user.controller");
const auth = require("../auth/auth.middleware");

router.get("/me", auth, controller.getProfile);
router.put("/me", auth, controller.updateProfile);

module.exports = router;
