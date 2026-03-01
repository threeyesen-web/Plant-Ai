const mongoose = require("mongoose");

const plantMonitoringSchema = new mongoose.Schema({
  plantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plant",
    required: true,
    index: true
  },
  dateChecked: {
    type: Date,
    default: Date.now
  },
  suitabilityScore: {
    type: Number,
    required: true
  },
  stressLevel: {
    type: String,
    required: true,
    trim: true
  },
  carePriority: {
    type: String,
    required: true,
    trim: true
  },
  riskScore: {
    type: Number,
    required: true
  },
  advisoryText: {
    type: String,
    required: true
  },
  nutrientValues: {
    nitrogen: Number,
    phosphorus: Number,
    potassium: Number,
    ph: Number,
    rainfall: Number
  },
  inputParameters: {
    region: String,
    city: String,
    soilType: String,
    waterAvailability: String,
    plantLocation: String,
    temperature: Number,
    humidity: Number
  },
  fertilizerPlan: {
    recommendation: String,
    fertilizerType: String,
    fertilizerName: String,
    searchTerm: String,
    summary: String,
    applicationPlan: String,
    reason: String,
    buyLink: String
  }
});

module.exports = mongoose.model("PlantMonitoring", plantMonitoringSchema);
