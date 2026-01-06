# Med Mitra Local AI Suite Implementation Plan

## Goal
Transform the current generic ML server into a full-featured **Med Mitra AI** that runs **locally**.
This will enable:
1.  **Translation**: (Switching to Local/Hybrid)
2.  **Speech**: Reading prescriptions aloud (Text-to-Speech).
3.  **Prediction**: Disease/Symptom prediction (Machine Learning).
4.  **Chat**: Conversational health assistant.

## User Review Required
> [!IMPORTANT]
> **Hardware Requirements**: Running local translation/chat models (like HuggingFace) works best with a GPU. If you have only a CPU, we will use lightweight models to ensure it doesn't crash your computer.

> [!NOTE]
> **Prediction Data**: To "make a model" for prediction, we usually need a **Dataset** (CSV file). I will set up the *training script structure*, but you will need to provide data later to actually train it.

## Proposed Changes

### 1. Dependencies
#### [MODIFY] [requirements.txt](file:///c:/mcp/requirements.txt)
- `pyttsx3` (Offline Text-to-Speech)
- `transformers` (Local AI Models)
- `torch` (PyTorch for running models)
- `scikit-learn` (For the Prediction model)
- `pandas` (Data handling)
- `sentencepiece` (Required for some translation models)

### 2. Speech Engine (TTS)
#### [NEW] [tts_engine.py](file:///c:/mcp/tts_engine.py)
- A dedicated module to handle converting text (prescriptions) to audio.
- Will save .wav files or stream audio.

### 3. Prediction Engine
#### [NEW] [predictor.py](file:///c:/mcp/predictor.py)
- A `DiseasePredictor` class.
- Includes a `train()` method (to learn from your data) and `predict()` method.
- **Initial State**: A dummy/mock model structure ready for your data.

### 4. Local Translation & Chat
#### [MODIFY] [main.py](file:///c:/mcp/main.py)
- Add `/speak` endpoint (Input: Text -> Output: Audio).
- Add `/predict` endpoint (Input: Symptoms -> Output: Disease).
- Update `/translate` to support local transformers (optional, can keep Gemini as backup).
- Update `/chat` to use local history management.

## Verification Plan
1.  **Speach**: Send text to `/speak` and verify an audio file is generated/played.
2.  **Prediction**: Train the dummy model and run a prediction.
3.  **Translation/Chat**: Verify endpoints still respond correctly.
