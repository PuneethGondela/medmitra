# MCP - Medical Chat Predictor

A medical conversation and prediction system with voice capabilities and AI-powered disease prediction.

## Features

- Medical chat interface
- Disease prediction model
- Text-to-speech engine
- Multi-language support (NLLB translation)
- Interactive conversation system
- Voice environment integration

## Setup

### Prerequisites

- Python 3.8+
- pip

### Installation

```bash
pip install -r requirements.txt
```

### Usage

Run the main application:
```bash
python main.py
```

Or use the PowerShell script:
```powershell
.\start.ps1
```

## Project Structure

- `main.py` - Main application entry point
- `predictor.py` - Disease prediction model
- `tts_engine.py` - Text-to-speech engine
- `database.py` - Database operations
- `interactive_chat.py` - Interactive chat interface
- `medical_data.csv` - Medical training data
- `schema.sql` - Database schema

## Development

- `train_model.py` - Train the disease prediction model
- `test_phi3.py` - Test Phi-3 model
- `test_nllb.py` - Test NLLB translation
- `debug_chat.py` - Debug chat functionality

## License

Proprietary - All rights reserved
