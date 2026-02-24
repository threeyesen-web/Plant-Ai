import joblib
import pandas as pd

def test_model():
    print("Loading Model...")
    model = joblib.load('ml/indoor_health_model.pkl')
    
    # Sample Input: A plant with good conditions but some pests
    sample_input = pd.DataFrame([{
        'Height_cm': 45.0,
        'Leaf_Count': 12,
        'New_Growth_Count': 2,
        'Watering_Amount_ml': 150,
        'Watering_Frequency_days': 7,
        'Sunlight_Exposure': 'Medium',
        'Room_Temperature_C': 22.0,
        'Humidity_%': 50.0,
        'Fertilizer_Type': 'Liquid',
        'Fertilizer_Amount_ml': 10.0,
        'Soil_Moisture_%': 40.0,
        'Soil_Type': 'Loamy',
        'Pest_Severity': 'Low'  # Input feature
    }])
    
    print("\nSample Input:")
    print(sample_input.T)
    
    prediction = model.predict(sample_input)[0]
    print(f"\nPredicted Health Score: {prediction:.2f} / 5.0")
    
    # Another sample: Bad conditions
    bad_input = sample_input.copy()
    bad_input['Pest_Severity'] = 'High'
    bad_input['Watering_Frequency_days'] = 30 # Underwatered
    
    pred_bad = model.predict(bad_input)[0]
    print(f"Predicted Health Score (Bad Condition): {pred_bad:.2f} / 5.0")

if __name__ == "__main__":
    test_model()
