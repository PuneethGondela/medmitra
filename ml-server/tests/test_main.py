import sys
from unittest.mock import MagicMock

# Mock ML and TTS dependencies before importing main
sys.modules["torch"] = MagicMock()
sys.modules["transformers"] = MagicMock()
sys.modules["TTS"] = MagicMock()
sys.modules["TTS.api"] = MagicMock()
sys.modules["peft"] = MagicMock()
sys.modules["datasets"] = MagicMock()
sys.modules["pyttsx3"] = MagicMock()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ml-server",
        "features": ["tts", "translation", "fine-tuning"],
    }
