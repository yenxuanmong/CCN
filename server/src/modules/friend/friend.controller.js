const service = require("./friend.service");
const { getIO } = require("../../services/socket.instance");

exports.getFriends = async (req, res) => {
  try {
    res.json(await service.getFriends(req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getRequests = async (req, res) => {
  try {
    res.json(await service.getRequests(req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    res.json(await service.addFriend(req.user.userId, friendId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.sendRequest = async (req, res) => {
  try {
    const { toId, username } = req.body;
    const result = await service.sendFriendRequest(req.user.userId, toId, username);

    // Notify người nhận qua socket (họ join room theo userId của mình)
    try {
      const io = getIO();
      const prisma = require("../../config/db");
      const sender = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, username: true, avatar: true },
      });
      io.to(result.target.id).emit("new_friend_request", {
        from:     req.user.userId,
        username: sender?.username || "Unknown",
        avatar:   sender?.avatar   || null,
      });
    } catch (socketErr) {
      // Socket emit thất bại không ảnh hưởng response
      console.warn("Socket emit new_friend_request failed:", socketErr.message);
    }

    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { fromId } = req.body;
    res.json(await service.acceptFriendRequest(req.user.userId, fromId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { fromId } = req.body;
    res.json(await service.rejectFriendRequest(req.user.userId, fromId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.searchUser = async (req, res) => {
  try {
    const { q } = req.query;
    res.json(await service.searchUser(q, req.user.userId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};
