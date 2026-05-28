const { findMatch } = require("../services/matchmaking.service");

module.exports = (io, socket) => {
  socket.on("find_match", async ({ userId }) => {
    const room = await findMatch(userId);

    socket.emit("match_found", room);
  });
};
