"""
Tests for the TTS (Text-to-Speech) endpoint in ml-server.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys

# Mock modules before importing from main
sys.modules['tts_engine'] = MagicMock()
sys.modules['translation'] = MagicMock()

from main import app, tts_engine

client = TestClient(app)

def test_tts_success(tmp_path):
    """Test happy path where TTS generates a file successfully."""
    # Create a temporary dummy file to act as the generated audio
    dummy_file = tmp_path / "dummy.mp3"
    dummy_file.write_text("dummy audio data")

    # Mock speak() to return the dummy file path
    tts_engine.speak = MagicMock(return_value=str(dummy_file))

    response = client.post("/api/tts", json={"text": "Hello world", "language": "en"})

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.text == "dummy audio data"
    tts_engine.speak.assert_called_once()
    assert tts_engine.speak.call_args[0][0] == "Hello world"

def test_tts_failure_no_path():
    """Test when tts_engine returns None, simulating failure."""
    tts_engine.speak = MagicMock(return_value=None)

    response = client.post("/api/tts", json={"text": "Test no path", "language": "en"})

    assert response.status_code == 500
    # Expected because main.py does except Exception as e: raise HTTPException(..., detail=str(e))
    assert "TTS Generation failed" in response.json()["detail"]

def test_tts_failure_file_not_exists():
    """Test when tts_engine returns a path but file doesn't exist."""
    tts_engine.speak = MagicMock(return_value="/nonexistent/path/audio.mp3")

    response = client.post("/api/tts", json={"text": "Test no file", "language": "en"})

    assert response.status_code == 500
    assert "TTS Generation failed" in response.json()["detail"]

def test_tts_exception():
    """Test when tts_engine raises an unexpected exception."""
    tts_engine.speak = MagicMock(side_effect=Exception("Engine crashed"))

    response = client.post("/api/tts", json={"text": "Test exception", "language": "en"})

    assert response.status_code == 500
    assert "Engine crashed" in response.json()["detail"]
