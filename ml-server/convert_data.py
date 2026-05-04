import pandas as pd
import json
import os
from sklearn.model_selection import train_test_split

# Paths
DATASET_SYMPTOMS = r"C:\Users\nidra\Downloads\archive\dataset.csv"
DATASET_CHATBOT = r"C:\Users\nidra\Downloads\archive (1)\ai-medical-chatbot.csv"
OUTPUT_DIR = "data"
OUTPUT_TRAIN = os.path.join(OUTPUT_DIR, "train.jsonl")
OUTPUT_VAL = os.path.join(OUTPUT_DIR, "val.jsonl")

def format_symptom_row(row):
    """
    Converts a row from dataset.csv (Symptom Prediction) into a Q&A format.
    Row keys: Disease, Symptom_1, Symptom_2, ...
    """
    disease = row['Disease']
    # Collect all symptoms that are strings and not empty/NaN
    symptoms = [str(row[col]).strip() for col in row.keys() if col.startswith('Symptom_') and pd.notna(row[col]) and str(row[col]).strip() != '']
    
    if not symptoms:
        return None
    
    # Randomize phrasing slightly to prevent overfitting (optional, keeping simple for now)
    user_content = f"I am experiencing the following symptoms: {', '.join(symptoms)}."
    assistant_content = f"Based on your symptoms, you may be suffering from {disease}. Please consult a healthcare professional for an accurate diagnosis and treatment plan."
    
    return {
        "messages": [
            {"role": "user", "content": user_content},
            {"role": "assistant", "content": assistant_content}
        ]
    }

def format_chatbot_row(row):
    """
    Converts a row from ai-medical-chatbot.csv into Q&A format.
    Row keys: Patient, Doctor (Description is ignored)
    """
    patient = row.get('Patient', '')
    doctor = row.get('Doctor', '')
    
    if pd.isna(patient) or pd.isna(doctor) or str(patient).strip() == '' or str(doctor).strip() == '':
        return None
        
    return {
        "messages": [
            {"role": "user", "content": str(patient).strip()},
            {"role": "assistant", "content": str(doctor).strip()}
        ]
    }

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    all_data = []
    
    # 1. Process Symptom Dataset
    print(f"Loading {DATASET_SYMPTOMS}...")
    try:
        df_sym = pd.read_csv(DATASET_SYMPTOMS)
        print(f"Found {len(df_sym)} symptom records.")
        for row in df_sym.itertuples(index=False):
            item = format_symptom_row(row._asdict())
            if item:
                all_data.append(item)
    except Exception as e:
        print(f"Error processing symptom dataset: {e}")

    # 2. Process Chatbot Dataset
    print(f"Loading {DATASET_CHATBOT}...")
    try:
        # Read in chunks to show progress
        chunk_size = 1000
        total_rows = 0
        for chunk in pd.read_csv(DATASET_CHATBOT, chunksize=chunk_size):
            for row in chunk.itertuples(index=False):
                item = format_chatbot_row(row._asdict())
                if item:
                    all_data.append(item)
            total_rows += len(chunk)
            print(f"Processed {total_rows} rows...", end='\r')
        print(f"\nFinished processing chatbot dataset. Total rows: {total_rows}")
    except Exception as e:
        print(f"Error processing chatbot dataset: {e}")

    print(f"Total Combined Records: {len(all_data)}")
    
    # 3. Split Train/Val
    train_data, val_data = train_test_split(all_data, test_size=0.1, random_state=42)
    
    # 4. Save to JSONL
    print(f"Saving {len(train_data)} training records to {OUTPUT_TRAIN}...")
    with open(OUTPUT_TRAIN, 'w', encoding='utf-8') as f:
        for item in train_data:
            f.write(json.dumps(item) + '\n')
            
    print(f"Saving {len(val_data)} validation records to {OUTPUT_VAL}...")
    with open(OUTPUT_VAL, 'w', encoding='utf-8') as f:
        for item in val_data:
            f.write(json.dumps(item) + '\n')
            
    print("Conversion Complete.")

if __name__ == "__main__":
    main()
