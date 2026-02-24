import pandas as pd
import joblib

def train_profiling_model():
    print("Loading data...")
    df = pd.read_csv('ml/kaggle_data.csv')
    
    # We want to learn the "Ideal" conditions for each crop.
    # We will calculate the Mean and Standard Deviation for every feature, grouped by Label.
    
    print("Calculating statistical profiles...")
    profiles = df.groupby('label').agg(['mean', 'std'])
    
    # Save the profiles
    # Structure: DataFrame with MultiIndex columns (Feature, Stat)
    # Access example: profiles.loc['rice', ('temperature', 'mean')]
    
    print("Saving artifacts...")
    joblib.dump(profiles, 'ml/plant_profiles.pkl')
    
    # Save list of supported crops for Frontend dropdown
    supported_crops = sorted(df['label'].unique().tolist())
    joblib.dump(supported_crops, 'ml/supported_crops.pkl')
    
    print(f"Profiling complete. Profiles saved for {len(supported_crops)} crops.")

if __name__ == "__main__":
    train_profiling_model()
