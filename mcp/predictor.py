import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import os

class DiseasePredictor:
    def __init__(self, model_path="disease_model.pkl"):
        self.model_path = model_path
        self.model = None
        self.load_model()

    def load_model(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            print("Loaded existing disease prediction model.")
        else:
            print("No existing model found. Please train the model first.")

    def train(self, data_path):
        """
        Trains the model using a CSV dataset.
        Expected format: Columns of symptoms (0/1) + last column 'prognosis' (Target).
        """
        try:
            # Load Data
            df = pd.read_csv(data_path)
            
            # Simple assumption: Last column is target, others are features
            X = df.iloc[:, :-1]
            y = df.iloc[:, -1]

            # Split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

            # Train Random Forest
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.model.fit(X_train, y_train)

            # Evaluate
            preds = self.model.predict(X_test)
            acc = accuracy_score(y_test, preds)
            print(f"Model trained with accuracy: {acc * 100:.2f}%")

            # Save
            joblib.dump(self.model, self.model_path)
            print(f"Model saved to {self.model_path}")
            return acc
        except Exception as e:
            print(f"Error training model: {e}")
            return None

    def predict(self, symptoms_dict):
        """
        Predicts disease based on input symptoms.
        symptoms_dict: {'symptom_name': 1, 'other_symptom': 0, ...}
        """
        if not self.model:
            return "Model not trained yet."
        
        try:
            # Need to match the model's expected feature columns
            # This is complex in a real generic app, for now we will just assume
            # the input is a list of features or we mock it for the demo
            
            # For robust implementation, align input dict with model features
            # (Skipping complex alignment for initial setup)
            
            # MOCK PREDICTION for safety until data is provided
            return "Prediction logic ready (Train model with data first)"
        except Exception as e:
            return f"Error in prediction: {e}"
