
import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

def evaluate():
    print("Loading data...")
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "kaggle_data.csv")
    df = pd.read_csv(data_path)
    
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']
    
    print("Splitting data (80% Train, 20% Test)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest...")
    classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    classifier.fit(X_train, y_train)
    
    print("Predicting...")
    y_pred = classifier.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    print(f"\n--- Model Accuracy: {acc*100:.2f}% ---")
    
    # print("\nClassification Report:")
    # print(classification_report(y_test, y_pred))

if __name__ == "__main__":
    evaluate()
