import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, accuracy_score

def train_indoor_models():
    print("Loading Indoor Plant Data...")
    df = pd.read_csv('ml/indoor_plant_data.csv')
    
    # --- Target 1: Health Score (Regression) ---
    print("Training Health Score Regressor...")
    X_health = df.drop(columns=['Health_Score', 'Plant_ID', 'Health_Notes', 'Pest_Presence', 'Pest_Severity']) 
    # Note: We exclude Pest info from Input for Health Prediction if we want to predict health based on environment ONLY.
    # However, usually pests CAUSE bad health. 
    # Let's include Pest Severity as an input feature if the user provides it, OR we train a model to predict health GIVEN environment + pests.
    # For now, let's include everything describing the STATE of the plant system excluding the result (Health Score).
    
    X_health = df[[
        'Height_cm', 'Leaf_Count', 'New_Growth_Count',
        'Watering_Amount_ml', 'Watering_Frequency_days', 
        'Sunlight_Exposure', 'Room_Temperature_C', 'Humidity_%', 
        'Fertilizer_Type', 'Fertilizer_Amount_ml',
        'Soil_Moisture_%', 'Soil_Type',
        'Pest_Severity' # Include this as it strongly impacts health
    ]]
    
    y_health = df['Health_Score']
    
    # Preprocessing
    numeric_features = ['Height_cm', 'Leaf_Count', 'New_Growth_Count', 'Watering_Amount_ml', 
                        'Watering_Frequency_days', 'Room_Temperature_C', 'Humidity_%', 
                        'Fertilizer_Amount_ml', 'Soil_Moisture_%']
    categorical_features = ['Sunlight_Exposure', 'Fertilizer_Type', 'Soil_Type', 'Pest_Severity']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    # Health Model Pipeline
    health_model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X_health, y_health, test_size=0.2, random_state=42)
    health_model.fit(X_train, y_train)
    
    score = health_model.score(X_test, y_test)
    print(f"Health Model R2 Score: {score:.4f}")
    
    joblib.dump(health_model, 'ml/indoor_health_model.pkl')
    
    # --- Target 2: Pest Severity Classifier (Optional/Bonus) ---
    # Predict likelihood of pests based on environment?
    # Or maybe just create the artifacts needed for the frontend.
    
    # Let's save the encoders/structure or just rely on the pipeline. 
    # The pipeline is self-contained!
    
    print("Models saved successfully.")

if __name__ == "__main__":
    train_indoor_models()
