from predictor import DiseasePredictor
import pandas as pd
import os

# --- Configuration ---
DATA_FILE = "medical_data.csv"   # Your data goes here
MODEL_FILE = "disease_model.pkl" # Where the trained brain is saved

def create_sample_data():
    """Creates a sample CSV if one doesn't exist."""
    if not os.path.exists(DATA_FILE):
        print(f"Creating sample data file: {DATA_FILE}")
        data = {
            'fever': [1, 0, 1, 1, 0, 0],
            'cough': [1, 1, 0, 1, 0, 1],
            'fatigue': [1, 1, 1, 0, 0, 0],
            'headache': [0, 1, 1, 0, 0, 1],
            'prognosis': ['Flu', 'Cold', 'Malaria', 'Flu', 'Healthy', 'Cold']
        }
        df = pd.DataFrame(data)
        df.to_csv(DATA_FILE, index=False)
        print("Sample data created! open 'medical_data.csv' to add your own data.")

def main():
    print("--- Med Mitra AI Training ---")
    
    # 1. Check for data
    if not os.path.exists(DATA_FILE):
        create_sample_data()
    
    # 2. Train the model
    print(f"Training model using {DATA_FILE}...")
    predictor = DiseasePredictor(model_path=MODEL_FILE)
    accuracy = predictor.train(DATA_FILE)
    
    if accuracy is not None:
        print(f"\nTraining Complete! \N{ROCKET}")
        print(f"Model Accuracy: {accuracy * 100:.2f}%")
        print(f"New brain saved to: {MODEL_FILE}")
        print("\nYou can now restart the server to use this new intelligence.")
    else:
        print("\nTraining Failed. Check the error message above.")

if __name__ == "__main__":
    main()
