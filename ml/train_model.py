import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier

def train_hybrid_model():
    print("Loading data...")
    df = pd.read_csv('ml/kaggle_data.csv')
    
    # --- Part 1: Gate 1 (Feasibility Classifier) ---
    print("Training Random Forest Classifier (Gate 1)...")
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']
    
    # Train on full dataset to create a comprehensive "Knowledge Base"
    classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    classifier.fit(X, y)
    
    print("Saving Classifier...")
    joblib.dump(classifier, 'ml/classifier_model.pkl')
    
    # --- Part 2: Gate 2 (Health Profiler) ---
    print("Calculating statistical profiles (Gate 2)...")
    # We want to learn the "Ideal" conditions for each crop (Mean/Std Dev)
    profiles = df.groupby('label').agg(['mean', 'std'])
    
    print("Saving Profiles...")
    joblib.dump(profiles, 'ml/plant_profiles.pkl')
    
    # Save list of supported crops for Frontend dropdown
    supported_crops = sorted(df['label'].unique().tolist())
    joblib.dump(supported_crops, 'ml/supported_crops.pkl')
    
    print(f"Hybrid Training Complete. Models saved for {len(supported_crops)} crops.")

if __name__ == "__main__":
    train_hybrid_model()
