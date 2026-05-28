const service = require("./game.service");

exports.createGame = async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });
    const game = await service.createGame(roomId);
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGame = async (req, res) => {
  try {
    const game = await service.getGame(req.params.id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
