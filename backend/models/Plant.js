const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  plantName: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  soilType: {
    type: String,
    required: true,
    trim: true
  },
  waterAvailability: {
    type: String,
    required: true,
    trim: true
  },
  plantLocation: {
    type: String,
    enum: ["indoor", "outdoor"],
    required: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Plant", plantSchema);
