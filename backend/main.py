from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import httpx
from dotenv import load_dotenv

app = FastAPI(title="Plant Growth Assessment AI")
load_dotenv(dotenv_path=os.path.join("backend", ".env"))
AUTH_API_BASE = os.getenv("AUTH_API_BASE", "http://127.0.0.1:5000")

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
    indoor_df["plant_key"] = indoor_df["Plant_ID"].astype(str).str.strip().str.lower()
    indoor_plants = {
        x for x in indoor_df.get("plant_key", pd.Series([], dtype=str)).dropna().unique().tolist()
    }
    indoor_health_model = joblib.load(os.path.join(MODEL_DIR, "indoor_health_model.pkl"))

    indoor_profiles = {}
    for plant_key, group in indoor_df.groupby("plant_key"):
        if group.empty:
            continue

        def _safe_mean(col: str, default: float) -> float:
            value = pd.to_numeric(group[col], errors="coerce").mean()
            return float(default if pd.isna(value) else value)

        def _safe_std(col: str, default: float = 1.0) -> float:
            value = pd.to_numeric(group[col], errors="coerce").std()
            if pd.isna(value) or value == 0:
                return float(default)
            return float(value)

        def _safe_mode(col: str, default: str) -> str:
            modes = group[col].dropna().astype(str).str.strip()
            return str(modes.mode().iloc[0]) if not modes.empty else default

        indoor_profiles[plant_key] = {
            "height_mean": _safe_mean("Height_cm", 30.0),
            "leaf_mean": _safe_mean("Leaf_Count", 8.0),
            "growth_mean": _safe_mean("New_Growth_Count", 1.0),
            "water_amount_mean": _safe_mean("Watering_Amount_ml", 180.0),
            "water_freq_mean": _safe_mean("Watering_Frequency_days", 4.0),
            "temp_mean": _safe_mean("Room_Temperature_C", 24.0),
            "temp_std": _safe_std("Room_Temperature_C", 2.0),
            "humidity_mean": _safe_mean("Humidity_%", 60.0),
            "humidity_std": _safe_std("Humidity_%", 8.0),
            "soil_moisture_mean": _safe_mean("Soil_Moisture_%", 45.0),
            "fertilizer_amount_mean": _safe_mean("Fertilizer_Amount_ml", 8.0),
            "health_mean": _safe_mean("Health_Score", 3.0),
            "sunlight_mode": _safe_mode("Sunlight_Exposure", "Indirect light all day"),
            "fertilizer_mode": _safe_mode("Fertilizer_Type", "Liquid"),
            "soil_mode": _safe_mode("Soil_Type", "Loamy"),
            "pest_mode": _safe_mode("Pest_Severity", "Low")
        }

    print(f"Indoor plant names loaded: {len(indoor_plants)}")
except Exception as e:
    print(f"Error loading indoor plant dataset: {e}")
    indoor_plants = set()
    indoor_health_model = None
    indoor_profiles = {}

class PlantData(BaseModel):
    region: str
    plant_type: str
    temperature: float
    humidity: float
    # These are now estimated/calculated types
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    rainfall: float

# Regional Baselines (The "Kerala Context")
KERALA_BASELINE = {
    'temperature': {'min': 23.0, 'max': 32.0},
    'humidity': {'min': 40.0, 'max': 100.0},
    'rainfall': {'min': 150.0, 'max': 3000.0},
    'ph': {'min': 5.0, 'max': 7.5}
}

FEATURE_LABELS = {
    "N": "Nitrogen",
    "P": "Phosphorus",
    "K": "Potassium",
    "temperature": "Temperature",
    "humidity": "Humidity",
    "ph": "Soil pH",
    "rainfall": "Water Availability"
}


def compute_suitability(avg_z_score: float):
    # Exponential decay gives smoother degradation than a hard linear cliff.
    raw = 100 * np.exp(-0.45 * avg_z_score)
    return float(round(max(5, min(100, raw)), 1))


def get_region_key(region: str):
    region_l = str(region).strip().lower()
    if region_l == "kerala":
        return "kerala"
    if region_l == "rest of india":
        return "rest_of_india"
    return "other"


def build_region_dosage(region: str, feature_insights: dict):
    region_key = get_region_key(region)
    rain = feature_insights.get("rainfall", {})
    n = feature_insights.get("N", {})
    p = feature_insights.get("P", {})
    k = feature_insights.get("K", {})

    water_base = {
        "kerala": "0.8-1.2 L/plant/day",
        "rest_of_india": "1.0-1.5 L/plant/day",
        "other": "0.8-1.3 L/plant/day"
    }[region_key]

    if rain.get("direction") == "high" and rain.get("z_score", 0) >= 1.0:
        water_adj = "Reduce irrigation by ~25% and improve drainage."
    elif rain.get("direction") == "low" and rain.get("z_score", 0) >= 1.0:
        water_adj = "Increase irrigation by ~20% and split into morning/evening."
    else:
        water_adj = "Keep current irrigation frequency; avoid sudden changes."

    if n.get("direction") == "low" and n.get("z_score", 0) >= 1.0:
        n_dose = "Urea: 3-5 g/plant/week (split in 2 doses)."
    elif n.get("direction") == "high" and n.get("z_score", 0) >= 1.0:
        n_dose = "Pause nitrogen-heavy fertilizer for 7-10 days."
    else:
        n_dose = "Nitrogen: maintain current dose."

    if p.get("direction") == "low" and p.get("z_score", 0) >= 1.0:
        p_dose = "Phosphorus source (SSP/DAP): 6-10 g/plant every 2-3 weeks."
    elif p.get("direction") == "high" and p.get("z_score", 0) >= 1.0:
        p_dose = "Avoid additional phosphorus for this cycle."
    else:
        p_dose = "Phosphorus: maintain current dose."

    if k.get("direction") == "low" and k.get("z_score", 0) >= 1.0:
        k_dose = "Potassium source (MOP/SOP): 3-6 g/plant/week."
    elif k.get("direction") == "high" and k.get("z_score", 0) >= 1.0:
        k_dose = "Skip potassium top-up for 1 week."
    else:
        k_dose = "Potassium: maintain current dose."

    region_note = {
        "kerala": "Kerala note: prefer smaller split doses due to heavy rain/leaching risk.",
        "rest_of_india": "Regional note: use standard split dosing and re-check after 7 days.",
        "other": "Regional note: start from lower dose band and calibrate using local response."
    }[region_key]

    dosage_lines = [
        f"Watering baseline ({region.replace('_', ' ')}): {water_base}. {water_adj}",
        f"N dosage: {n_dose}",
        f"P dosage: {p_dose}",
        f"K dosage: {k_dose}",
        region_note
    ]
    return dosage_lines


def build_time_bound_actions(stress_level: str, feature_insights: dict):
    ranked = sorted(feature_insights.items(), key=lambda x: x[1]["z_score"], reverse=True)
    top_labels = [FEATURE_LABELS.get(k, k) for k, _ in ranked[:2]]
    top_text = ", ".join(top_labels) if top_labels else "key growth factors"

    if stress_level == "High":
        today = [
            f"Stabilize {top_text} immediately; avoid any additional stress.",
            "Do one corrective watering/fertilizer adjustment only (do not stack multiple changes today)."
        ]
        week = [
            "Re-check plant response after 72 hours and repeat small correction if required.",
            "Maintain split irrigation and monitor leaf wilting/chlorosis daily."
        ]
    elif stress_level == "Medium":
        today = [
            f"Prioritize correction of {top_text}.",
            "Apply one targeted input correction and keep all other practices stable."
        ]
        week = [
            "Track recovery markers (leaf color, new growth, turgidity) every 2 days.",
            "Tune irrigation/fertilizer by small increments (10-20%) based on response."
        ]
    else:
        today = [
            "No major corrective action needed today.",
            "Continue regular irrigation and nutrient schedule."
        ]
        week = [
            "Do preventive monitoring twice this week.",
            "Keep environment stable and avoid over-fertilization."
        ]

    month = [
        "Review trend of suitability and top risk factors weekly.",
        "If the same factor remains high-risk for 3+ checks, adjust baseline schedule permanently."
    ]

    return {
        "today": today,
        "this_week": week,
        "this_month": month
    }


def build_recommendations(stress_level: str, feature_insights: dict, predicted_crop: str, selected_crop: str):
    recommendations = []

    sorted_risks = sorted(
        feature_insights.items(),
        key=lambda x: x[1]["z_score"],
        reverse=True
    )

    for feature, detail in sorted_risks[:3]:
        if detail["z_score"] < 0.8:
            continue

        direction = detail["direction"]
        label = FEATURE_LABELS.get(feature, feature)

        if feature == "temperature":
            action = "Use shade nets / airflow" if direction == "high" else "Use mulching or warmer positioning"
        elif feature == "humidity":
            action = "Improve ventilation and spacing" if direction == "high" else "Increase misting or local humidity"
        elif feature == "rainfall":
            action = "Reduce irrigation frequency and improve drainage" if direction == "high" else "Increase irrigation consistency"
        elif feature == "ph":
            action = "Apply soil acidifier/organic matter" if direction == "high" else "Use liming to raise pH gradually"
        elif feature == "N":
            action = "Reduce nitrogen-heavy fertilization" if direction == "high" else "Apply nitrogen-rich fertilizer in split doses"
        elif feature == "P":
            action = "Avoid excess phosphorus amendments" if direction == "high" else "Add phosphorus source (e.g., SSP/DAP as suitable)"
        elif feature == "K":
            action = "Pause potassium-heavy fertilizer temporarily" if direction == "high" else "Add potassium source (e.g., MOP/SOP as suitable)"
        else:
            action = "Adjust this factor toward plant baseline"

        recommendations.append(
            f"{label} is {direction} (current {detail['value']}, target {detail['target']}). {action}."
        )

    if predicted_crop != selected_crop:
        recommendations.append(
            f"Environment currently resembles {predicted_crop.capitalize()} conditions more than {selected_crop.capitalize()}; monitor closely."
        )

    if not recommendations:
        recommendations.append("Conditions are near optimal. Maintain the same care schedule and monitor weekly.")

    if stress_level == "High":
        advisory = "Urgent intervention recommended within 24-48 hours to prevent growth setback."
    elif stress_level == "Medium":
        advisory = "Moderate stress detected. Correct top risk factors this week for better recovery."
    else:
        advisory = "Plant conditions are stable. Focus on preventive care and consistency."

    return advisory, recommendations


def _compute_indoor_score(plant: str, data: PlantData):
    profile = indoor_profiles.get(plant, {})
    if not profile:
        raise HTTPException(status_code=400, detail="plant is not identified")

    watering_amount = float(max(30.0, min(600.0, data.rainfall)))
    if data.rainfall >= 250:
        watering_frequency_days = 1.0
    elif data.rainfall >= 100:
        watering_frequency_days = 2.0
    else:
        watering_frequency_days = 4.0

    if indoor_health_model is not None:
        model_input = pd.DataFrame([{
            "Height_cm": profile["height_mean"],
            "Leaf_Count": profile["leaf_mean"],
            "New_Growth_Count": profile["growth_mean"],
            "Watering_Amount_ml": watering_amount,
            "Watering_Frequency_days": watering_frequency_days,
            "Sunlight_Exposure": profile["sunlight_mode"],
            "Room_Temperature_C": data.temperature,
            "Humidity_%": data.humidity,
            "Fertilizer_Type": profile["fertilizer_mode"],
            "Fertilizer_Amount_ml": profile["fertilizer_amount_mean"],
            "Soil_Moisture_%": profile["soil_moisture_mean"],
            "Soil_Type": profile["soil_mode"],
            "Pest_Severity": profile["pest_mode"]
        }])
        health_score = float(indoor_health_model.predict(model_input)[0])
    else:
        health_score = float(profile["health_mean"])

    health_score = float(max(1.0, min(5.0, health_score)))
    suitability = float(round(max(5, min(100, (health_score / 5.0) * 100)), 1))

    z_temp = abs((data.temperature - profile["temp_mean"]) / max(profile["temp_std"], 0.5))
    z_humidity = abs((data.humidity - profile["humidity_mean"]) / max(profile["humidity_std"], 0.5))
    avg_z_score = (z_temp + z_humidity) / 2.0

    if avg_z_score < 1.0:
        stress_level, care_priority = "Low", "Low"
    elif avg_z_score < 2.0:
        stress_level, care_priority = "Medium", "Moderate"
    else:
        stress_level, care_priority = "High", "Urgent"

    recommendations = []
    if z_temp >= 1.0:
        direction = "high" if data.temperature > profile["temp_mean"] else "low"
        recommendations.append(
            f"Indoor temperature is {direction} (current {round(data.temperature,1)} C, target {round(profile['temp_mean'],1)} C)."
        )
    if z_humidity >= 1.0:
        direction = "high" if data.humidity > profile["humidity_mean"] else "low"
        recommendations.append(
            f"Indoor humidity is {direction} (current {round(data.humidity,1)}%, target {round(profile['humidity_mean'],1)}%)."
        )

    if not recommendations:
        recommendations.append("Indoor conditions are close to this plant's healthy profile. Maintain consistency.")

    smart_advisory = (
        "Indoor plant health risk is elevated; stabilize temperature and humidity this week."
        if stress_level in {"High", "Medium"}
        else "Indoor conditions look stable. Keep watering and light schedule consistent."
    )

    time_bound_actions = {
        "today": ["Check soil moisture before next watering and avoid overcorrection."],
        "this_week": ["Track new leaf growth and leaf firmness every 2-3 days."],
        "this_month": ["Keep a fixed care schedule and review trend weekly."]
    }
    dosage_guidance = [
        f"Watering baseline: {round(profile['water_amount_mean'])} ml every {round(profile['water_freq_mean'], 1)} day(s).",
        "Fertilizer baseline: half-strength balanced liquid feed every 2-4 weeks."
    ]

    recommendations_extended = recommendations + [
        f"[Today] {step}" for step in time_bound_actions["today"]
    ] + [
        f"[This Week] {step}" for step in time_bound_actions["this_week"]
    ] + [
        f"[This Month] {step}" for step in time_bound_actions["this_month"]
    ] + [
        f"[Dosage] {line}" for line in dosage_guidance
    ]

    return {
        "suitability_percentage": suitability,
        "stress_level": stress_level,
        "care_priority": care_priority,
        "region_context": f"Indoor profile analysis for {data.region}",
        "smart_advisory": smart_advisory,
        "recommendations": recommendations_extended,
        "time_bound_actions": time_bound_actions,
        "dosage_guidance": dosage_guidance,
        "avg_z_score": float(round(avg_z_score, 2)),
        "top_risk_factors": [
            {
                "feature": "Temperature",
                "direction": "high" if data.temperature > profile["temp_mean"] else "low",
                "z_score": float(round(z_temp, 2)),
                "current": float(round(data.temperature, 2)),
                "target": float(round(profile["temp_mean"], 2))
            },
            {
                "feature": "Humidity",
                "direction": "high" if data.humidity > profile["humidity_mean"] else "low",
                "z_score": float(round(z_humidity, 2)),
                "current": float(round(data.humidity, 2)),
                "target": float(round(profile["humidity_mean"], 2))
            }
        ]
    }

# Mount static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")


async def _proxy_get(path: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{AUTH_API_BASE}{path}")
        return JSONResponse(status_code=resp.status_code, content=resp.json())
    except Exception:
        return JSONResponse(status_code=502, content={"message": "Auth service unavailable"})


async def _proxy_post(path: str, request: Request):
    try:
        payload = await request.json()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{AUTH_API_BASE}{path}", json=payload)
        return JSONResponse(status_code=resp.status_code, content=resp.json())
    except Exception:
        return JSONResponse(status_code=502, content={"message": "Auth service unavailable"})


@app.get("/api/google-config")
async def api_google_config():
    return await _proxy_get("/api/google-config")


@app.post("/api/google-auth")
async def api_google_auth(request: Request):
    return await _proxy_post("/api/google-auth", request)


@app.post("/api/register")
async def api_register(request: Request):
    return await _proxy_post("/api/register", request)


@app.post("/api/login")
async def api_login(request: Request):
    return await _proxy_post("/api/login", request)

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

    # Validate against training labels (case-insensitive)
    known = {str(p).strip().lower() for p in supported_crops}
    is_crop = (plant in known) and (plant in plant_profiles.index)
    is_indoor = plant in indoor_plants

    # Accept anything present in either dataset
    if not is_crop and not is_indoor:
        raise HTTPException(status_code=400, detail="plant is not identified")

    # If it's an indoor plant name (not a crop label), score using indoor profile/model flow.
    if is_indoor and not is_crop:
        return _compute_indoor_score(plant, data)
            
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
        
        # NOTE: For Stage 2, we soften Gate 1. If Regional Context is strong, we allow some mismatch.
        # But valid "Desert vs Wetland" mismatches should still warn.
        
        # --- Gate 2: Contextual Stress Analysis ---
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
        feature_insights = {}
        total_deviation_score = 0
        feature_count = len(features)
        
        for feature, value in features.items():
            mean = profile[(feature, 'mean')]
            std = profile[(feature, 'std')]
            
            if std == 0: std = 0.01 
            
            # --- CONTEXTUAL LOGIC START ---
            z_score = abs((value - mean) / std)
            
            if data.region.lower() == "kerala":
                # Apply "Contextual Forgiveness"
                # If the value is within Kerala's "Normal Range", force Z-score to 0 (No Stress)
                # This prevents "High Humidity" warnings in a place where 90% is normal.
                
                if feature in KERALA_BASELINE:
                    baseline = KERALA_BASELINE[feature]
                    if baseline['min'] <= value <= baseline['max']:
                        # Strong Override: If within regional baseline, ignore generic stats.
                        # This assumes "If it's normal for Kerala, it's safe for the plant".
                        z_score = 0.0
            
            # --- CONTEXTUAL LOGIC END ---
            
            deviations[feature] = z_score
            direction = "high" if value > mean else "low"
            if abs(value - mean) < 1e-9:
                direction = "balanced"
            feature_insights[feature] = {
                "z_score": float(round(z_score, 2)),
                "value": float(round(value, 2)),
                "target": float(round(mean, 2)),
                "direction": direction
            }
            total_deviation_score += z_score
            
        avg_z_score = total_deviation_score / feature_count
        
        suitability = compute_suitability(avg_z_score)

        if avg_z_score < 1.0:
            stress_level = "Low"
            care_priority = "Low"
        elif avg_z_score < 2.0:
            stress_level = "Medium"
            care_priority = "Moderate"
        else:
            stress_level = "High"
            care_priority = "Urgent"

        smart_advisory, recommendations = build_recommendations(
            stress_level=stress_level,
            feature_insights=feature_insights,
            predicted_crop=str(predicted_crop).strip().lower(),
            selected_crop=plant
        )
        time_bound_actions = build_time_bound_actions(stress_level, feature_insights)
        dosage_guidance = build_region_dosage(data.region, feature_insights)
        recommendations_extended = recommendations + [
            f"[Today] {step}" for step in time_bound_actions["today"]
        ] + [
            f"[This Week] {step}" for step in time_bound_actions["this_week"]
        ] + [
            f"[This Month] {step}" for step in time_bound_actions["this_month"]
        ] + [
            f"[Dosage] {line}" for line in dosage_guidance
        ]
        top_risks = sorted(
            feature_insights.items(),
            key=lambda x: x[1]["z_score"],
            reverse=True
        )[:3]

        return {
            "suitability_percentage": suitability,
            "stress_level": stress_level,
            "care_priority": care_priority,
            "region_context": f"Analyzed/Adjusted for {data.region}",
            "smart_advisory": smart_advisory,
            "recommendations": recommendations_extended,
            "time_bound_actions": time_bound_actions,
            "dosage_guidance": dosage_guidance,
            "avg_z_score": float(round(avg_z_score, 2)),
            "top_risk_factors": [
                {
                    "feature": FEATURE_LABELS.get(feature, feature),
                    "direction": detail["direction"],
                    "z_score": detail["z_score"],
                    "current": detail["value"],
                    "target": detail["target"]
                }
                for feature, detail in top_risks
            ]
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
