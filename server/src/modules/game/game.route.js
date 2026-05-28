const router = require("express").Router();
const controller = require("./game.controller");

router.post("/",    controller.createGame);
router.get("/:id",  controller.getGame);

module.exports = router;
