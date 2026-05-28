const router = require("express").Router();
const controller = require("./chat.controller");
const auth = require("../auth/auth.middleware");

router.get("/room/:roomId",       controller.getRoomMessages);
router.get("/global",             controller.getGlobalMessages);
router.get("/private/:friendId",  auth, controller.getPrivateMessages);

module.exports = router;
