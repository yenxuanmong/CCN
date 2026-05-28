const prisma = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/env");

async function register(data) {
  const hashed = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashed,
    },
  });

  return {
    message: "Register success",
    user: {
      id: user.id,
      username: user.username,
    },
  };
}

async function login(data) {
  const user = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) throw new Error("Wrong password");

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      coins: user.coins,
      level: user.level,
    },
  };
}

module.exports = {
  register,
  login,
};
