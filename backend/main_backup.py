from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import httpx

app = FastAPI(title="Plant Growth Assessment AI")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
MODEL_DIR = "ml"
try:
    plant_profiles = joblib.load(os.path.join(MODEL_DIR, "plant_profiles.pkl"))
    supported_crops = joblib.load(os.path.join(MODEL_DIR, "supported_crops.pkl"))
    print("Models loaded successfully.")
    print(f"Supported crops: {supported_crops}")
except Exception as e:
    print(f"Error loading models: {e}")
    plant_profiles = None
    supported_crops = []

class PlantData(BaseModel):
    plant_type: str
    temperature: float
    humidity: float
    ph: float
    nitrogen: float
    phosphorus: float
    potassium: float
    rainfall: float

# Mount static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/weather")
async def get_weather(city: str):
    api_key = "38471da0005b58938d0b54bbb311204a" 
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch weather data")
        
        data = resp.json()
        return {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"]
        }

@app.get("/crops")
def get_supported_crops():
    return {"crops": supported_crops}

@app.get("/")
def read_root():
    return FileResponse('frontend/index.html')

@app.post("/predict")
def predict_growth(data: PlantData):
    if plant_profiles is None:
        raise HTTPException(status_code=500, detail="Models not loaded")
    
    plant = data.plant_type.lower()
    
    if plant not in plant_profiles.index:
         raise HTTPException(status_code=400, detail=f"Unknown plant type: {data.plant_type}. Supported: {supported_crops}")
            
    try:
        # Get profiles for this plant
        profile = plant_profiles.loc[plant]
        
        # Features to check
        features = {
            'N': data.nitrogen,
            'P': data.phosphorus,
            'K': data.potassium,
            'temperature': data.temperature,
            'humidity': data.humidity,
            'ph': data.ph,
            'rainfall': data.rainfall
        }
        
        # Calculate Deviations (Z-Scores)
        deviations = {}
        total_deviation_score = 0
        feature_count = len(features)
        
        for feature, value in features.items():
            mean = profile[(feature, 'mean')]
            std = profile[(feature, 'std')]
            
            # Avoid division by zero
            if std == 0: std = 0.01 
            
            # Z-Score: How many standard deviations away is the value?
            z_score = abs((value - mean) / std)
            deviations[feature] = z_score
            
            # Accumulate deviation
            # We cap deviation impact per feature to avoid one feature ruining everything if it's an outlier? 
            # Or we want outliers to flag high stress. Let's use raw Z-score average.
            total_deviation_score += z_score
            
        avg_z_score = total_deviation_score / feature_count
        
        # Interpret Average Z-Score
        # Z < 1: Excellent (Close to mean)
        # 1 < Z < 2: Good/Moderate
        # 2 < Z < 3: Stressed
        # Z > 3: Critical
        
        # Map to Suitability (0-100)
        # If Z=0 -> 100%. If Z=3 -> 0%.
        suitability = max(0, min(100, 100 - (avg_z_score * 33.3)))
        suitability = float(round(suitability, 1))

        # Determine Stress Level
        if avg_z_score < 1.0:
            stress_level = "Low"
            care_priority = "Low"
        elif avg_z_score < 2.0:
            stress_level = "Medium"
            care_priority = "Moderate"
        else:
            stress_level = "High"
            care_priority = "Urgent"

        return {
            "suitability_percentage": suitability,
            "stress_level": stress_level,
            "care_priority": care_priority,
            "deviations": deviations # Optional: could show which factor is the problem
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
