const router = require("express").Router();
const controller = require("./room.controller");
const auth = require("../auth/auth.middleware");

router.get("/",    controller.getRooms);
router.post("/",   auth, controller.createRoom);
router.get("/:id", controller.getRoom);

module.exports = router;
