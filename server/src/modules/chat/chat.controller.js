const service = require("./chat.service");

exports.getRoomMessages = async (req, res) => {
  try {
    res.json(await service.getRoomMessages(req.params.roomId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getGlobalMessages = async (req, res) => {
  try {
    res.json(await service.getGlobalMessages());
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPrivateMessages = async (req, res) => {
  try {
    res.json(await service.getPrivateMessages(req.user.userId, req.params.friendId));
  } catch (err) { res.status(500).json({ error: err.message }); }
};
