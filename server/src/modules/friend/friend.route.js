const router = require("express").Router();
const controller = require("./friend.controller");
const auth = require("../auth/auth.middleware");

router.get("/",           auth, controller.getFriends);
router.get("/requests",   auth, controller.getRequests);
router.post("/add",       auth, controller.addFriend);
router.post("/request",   auth, controller.sendRequest);
router.post("/accept",    auth, controller.acceptRequest);
router.post("/reject",    auth, controller.rejectRequest);
router.get("/search",     auth, controller.searchUser);

module.exports = router;
