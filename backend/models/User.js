const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local"
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  }
});

module.exports = mongoose.model("User", userSchema);
