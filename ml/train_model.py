import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split

def train_hybrid_model():
    print("Loading data...")
    df = pd.read_csv('ml/kaggle_data.csv')
    
    # --- Part 1: Gate 1 (Feasibility Classifier) ---
    print("Training Random Forest Classifier (Gate 1)...")
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']

    # Evaluate classifier quality on a held-out split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    eval_classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    eval_classifier.fit(X_train, y_train)
    y_pred = eval_classifier.predict(X_test)

    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=eval_classifier.classes_)
    cm_df = pd.DataFrame(cm, index=eval_classifier.classes_, columns=eval_classifier.classes_)

    print(f"Precision (weighted): {precision:.4f}")
    print(f"Recall (weighted): {recall:.4f}")
    print("Confusion Matrix (rows=true, cols=predicted):")
    print(cm_df)
    
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
