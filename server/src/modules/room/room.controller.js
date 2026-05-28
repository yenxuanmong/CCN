const service = require("./room.service");

exports.createRoom = async (req, res) => {
  try {
    const room = await service.createRoom(req.user.userId);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const rooms = await service.getRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const room = await service.getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
