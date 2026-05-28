require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3001,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5000",

  JWT_SECRET: process.env.JWT_SECRET || "secret",

  REDIS_URL: process.env.REDIS_URL,

  DATABASE_URL: process.env.DATABASE_URL,
};
