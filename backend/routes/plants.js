const express = require("express");
const mongoose = require("mongoose");
const Plant = require("../models/Plant");
const PlantMonitoring = require("../models/PlantMonitoring");

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function toPlantSummary(plant, latestMonitoring) {
  return {
    id: plant._id,
    userId: plant.userId,
    plantName: plant.plantName,
    region: plant.region,
    city: plant.city,
    soilType: plant.soilType,
    waterAvailability: plant.waterAvailability,
    plantLocation: plant.plantLocation,
    dateAdded: plant.dateAdded,
    latestMonitoring: latestMonitoring
      ? {
          id: latestMonitoring._id,
          dateChecked: latestMonitoring.dateChecked,
          suitabilityScore: latestMonitoring.suitabilityScore,
          stressLevel: latestMonitoring.stressLevel,
          carePriority: latestMonitoring.carePriority,
          riskScore: latestMonitoring.riskScore,
          advisoryText: latestMonitoring.advisoryText,
          nutrientValues: latestMonitoring.nutrientValues || {},
          inputParameters: latestMonitoring.inputParameters || {},
          fertilizerPlan: latestMonitoring.fertilizerPlan || {}
        }
      : null
  };
}

router.post("/plants", async (req, res) => {
  try {
    const {
      userId,
      plantName,
      region,
      city,
      soilType,
      waterAvailability,
      plantLocation,
      initialAnalysis
    } = req.body;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }
    if (!plantName || !region || !city || !soilType || !waterAvailability || !plantLocation) {
      return res.status(400).json({ message: "Missing required plant fields" });
    }
    if (!initialAnalysis) {
      return res.status(400).json({ message: "initialAnalysis is required" });
    }

    const plant = await Plant.create({
      userId,
      plantName,
      region,
      city,
      soilType,
      waterAvailability,
      plantLocation: String(plantLocation).toLowerCase()
    });

    const monitoringRecord = await PlantMonitoring.create({
      plantId: plant._id,
      dateChecked: initialAnalysis.dateChecked || new Date(),
      suitabilityScore: initialAnalysis.suitabilityScore,
      stressLevel: initialAnalysis.stressLevel,
      carePriority: initialAnalysis.carePriority,
      riskScore: initialAnalysis.riskScore,
      advisoryText: initialAnalysis.advisoryText,
      nutrientValues: initialAnalysis.nutrientValues || {},
      inputParameters: initialAnalysis.inputParameters || {},
      fertilizerPlan: initialAnalysis.fertilizerPlan || {}
    });

    return res.status(201).json({
      message: "Plant added to monitoring",
      plant: toPlantSummary(plant, monitoringRecord)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add plant" });
  }
});

router.get("/plants", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    const plants = await Plant.find({ userId }).sort({ dateAdded: -1 }).lean();
    const mapped = await Promise.all(
      plants.map(async (plant) => {
        const latestMonitoring = await PlantMonitoring.findOne({ plantId: plant._id })
          .sort({ dateChecked: -1 })
          .lean();
        return toPlantSummary(plant, latestMonitoring);
      })
    );

    return res.json({ plants: mapped });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch plants" });
  }
});

router.post("/plants/:plantId/monitoring", async (req, res) => {
  try {
    const { plantId } = req.params;
    const {
      userId,
      suitabilityScore,
      stressLevel,
      carePriority,
      riskScore,
      advisoryText,
      nutrientValues,
      inputParameters,
      fertilizerPlan,
      dateChecked
    } = req.body;

    if (!isValidObjectId(plantId)) {
      return res.status(400).json({ message: "Invalid plantId" });
    }
    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }
    if (
      suitabilityScore === undefined ||
      stressLevel === undefined ||
      carePriority === undefined ||
      riskScore === undefined ||
      advisoryText === undefined
    ) {
      return res.status(400).json({ message: "Missing required monitoring fields" });
    }

    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    if (String(plant.userId) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized for this plant" });
    }

    const record = await PlantMonitoring.create({
      plantId,
      dateChecked: dateChecked || new Date(),
      suitabilityScore,
      stressLevel,
      carePriority,
      riskScore,
      advisoryText,
      nutrientValues: nutrientValues || {},
      inputParameters: inputParameters || {},
      fertilizerPlan: fertilizerPlan || {}
    });

    return res.status(201).json({ message: "Monitoring record added", record });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save monitoring record" });
  }
});

router.get("/plants/:plantId/monitoring", async (req, res) => {
  try {
    const { plantId } = req.params;
    const { userId } = req.query;

    if (!isValidObjectId(plantId)) {
      return res.status(400).json({ message: "Invalid plantId" });
    }
    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    const plant = await Plant.findById(plantId).lean();
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    if (String(plant.userId) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized for this plant" });
    }

    const records = await PlantMonitoring.find({ plantId }).sort({ dateChecked: -1 }).lean();
    return res.json({ plant, records });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch monitoring history" });
  }
});

router.delete("/plants/:plantId", async (req, res) => {
  try {
    const { plantId } = req.params;
    const userId = req.query.userId || req.body?.userId;

    if (!isValidObjectId(plantId)) {
      return res.status(400).json({ message: "Invalid plantId" });
    }
    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found" });
    }
    if (String(plant.userId) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized for this plant" });
    }

    await PlantMonitoring.deleteMany({ plantId });
    await Plant.deleteOne({ _id: plantId });

    return res.json({ message: "Plant deleted from monitoring" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete plant" });
  }
});

module.exports = router;
