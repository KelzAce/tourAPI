require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = 5000 || process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const PASSWORD_SECRET = process.env.PASSWORD_SECRET;

module.exports = {
  MONGODB_URI,
  PORT,
  JWT_SECRET,
};
