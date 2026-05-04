import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add ml-server directory to path so it can find tts_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Pre-mock pyttsx3 before importing tts_engine to avoid actual audio hardware calls
mock_pyttsx3 = MagicMock()
mock_engine = MagicMock()
mock_pyttsx3.init.return_value = mock_engine

# Setup a dummy voice list to avoid exceptions in the __init__ loop
mock_voice_1 = MagicMock()
mock_voice_1.name = "Male Voice"
mock_voice_1.id = "id_1"

mock_voice_2 = MagicMock()
mock_voice_2.name = "Zira Female"
mock_voice_2.id = "id_2"

mock_engine.getProperty.return_value = [mock_voice_1, mock_voice_2]

sys.modules["pyttsx3"] = mock_pyttsx3

from tts_engine import TTSEngine

class TestTTSEngine(unittest.TestCase):
    def setUp(self):
        # Reset mocks before each test
        mock_pyttsx3.reset_mock()
        mock_engine.reset_mock()
        mock_engine.runAndWait.side_effect = None # Clear previous side_effects
        self.tts = TTSEngine()

    def test_speak_success(self):
        """Test that speak correctly calls save_to_file, runAndWait and returns the output file."""
        result = self.tts.speak("Hello world", "test_out.mp3")

        # Verify it returns the file name
        self.assertEqual(result, "test_out.mp3")

        # Verify engine calls
        self.tts.engine.save_to_file.assert_called_once_with("Hello world", "test_out.mp3")
        self.tts.engine.runAndWait.assert_called_once()

    def test_speak_exception(self):
        """Test that an exception during TTS generation is caught and None is returned."""
        # Force an exception when runAndWait is called
        self.tts.engine.runAndWait.side_effect = Exception("Mocked exception")

        # Capture stdout to prevent the error print from messing up test output
        with patch('builtins.print') as mock_print:
            result = self.tts.speak("Hello world", "test_err.mp3")

        # Verify it handled the exception and returned None
        self.assertIsNone(result)
        mock_print.assert_called_once_with("TTS Error: Mocked exception")

    def test_speak_lock(self):
        """Test that the lock is acquired and released during speak."""
        # The thread lock object cannot be patched normally with patch.object
        # So we can replace it entirely with a MagicMock for this test
        mock_lock = MagicMock()
        self.tts.lock = mock_lock

        self.tts.speak("Test lock", "lock.mp3")

        mock_lock.__enter__.assert_called_once()
        mock_lock.__exit__.assert_called_once()

if __name__ == '__main__':
    unittest.main()
