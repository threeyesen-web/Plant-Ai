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
    classifier_model = joblib.load(os.path.join(MODEL_DIR, "classifier_model.pkl"))
    plant_profiles = joblib.load(os.path.join(MODEL_DIR, "plant_profiles.pkl"))
    supported_crops = joblib.load(os.path.join(MODEL_DIR, "supported_crops.pkl"))
    print("Hybrid Models loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}")
    classifier_model = None
    plant_profiles = None
    supported_crops = []

# Load Indoor Plant Names (for identification)
try:
    indoor_df = pd.read_csv(os.path.join(MODEL_DIR, "indoor_plant_data.csv"))
    indoor_plants = {
        str(x).strip().lower()
        for x in indoor_df.get("Plant_ID", pd.Series([], dtype=str)).dropna().unique().tolist()
    }
    print(f"Indoor plant names loaded: {len(indoor_plants)}")
except Exception as e:
    print(f"Error loading indoor plant dataset: {e}")
    indoor_plants = set()

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
    if classifier_model is None or plant_profiles is None:
        raise HTTPException(status_code=500, detail="Models not loaded")
    
    plant = data.plant_type.strip().lower()
    if not plant:
        raise HTTPException(status_code=400, detail="plant is not identified")

    known = {str(p).strip().lower() for p in supported_crops}
    is_crop = (plant in known) and (plant in plant_profiles.index)
    is_indoor = plant in indoor_plants

    if not is_crop and not is_indoor:
        raise HTTPException(status_code=400, detail="plant is not identified")

    if is_indoor and not is_crop:
        return {
            "suitability_percentage": 0,
            "stress_level": "IDENTIFIED",
            "care_priority": "-",
            "message": "Plant identified (indoor dataset). This analysis currently supports crop-environment inputs only."
        }
            
    try:
        # --- Gate 1: Feasibility Check (Random Forest) ---
        features_df = pd.DataFrame([{
            'N': data.nitrogen,
            'P': data.phosphorus,
            'K': data.potassium,
            'temperature': data.temperature,
            'humidity': data.humidity,
            'ph': data.ph,
            'rainfall': data.rainfall
        }])
        
        predicted_crop = classifier_model.predict(features_df)[0]
        
        # If the environment is completely wrong for the selected plant
        # (e.g., User selects 'Rice' but inputs 'Desert' data -> Model predicts 'Chickpea' or 'Mothbeans')
        if predicted_crop != plant:
            # Check if it's a "Critical Mismatch"
            # We strictly warn the user.
             return {
                "suitability_percentage": 0,
                "stress_level": "MISMATCH",
                "care_priority": f"Better for {predicted_crop.capitalize()}",
                "message": f"Critical Mismatch: This environment is suitable for {predicted_crop.capitalize()}, not {plant.capitalize()}."
            }

        # --- Gate 2: Health Check (Statistical Profiling) ---
        profile = plant_profiles.loc[plant]
        
        features = {
            'N': data.nitrogen,
            'P': data.phosphorus,
            'K': data.potassium,
            'temperature': data.temperature,
            'humidity': data.humidity,
            'ph': data.ph,
            'rainfall': data.rainfall
        }
        
        deviations = {}
        total_deviation_score = 0
        feature_count = len(features)
        
        for feature, value in features.items():
            mean = profile[(feature, 'mean')]
            std = profile[(feature, 'std')]
            
            if std == 0: std = 0.01 
            
            z_score = abs((value - mean) / std)
            deviations[feature] = z_score
            total_deviation_score += z_score
            
        avg_z_score = total_deviation_score / feature_count
        
        suitability = max(0, min(100, 100 - (avg_z_score * 33.3)))
        suitability = float(round(suitability, 1))

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
            "care_priority": care_priority
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
