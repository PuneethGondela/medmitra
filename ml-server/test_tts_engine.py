import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add ml-server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Mock pyttsx3 before importing tts_engine
sys.modules['pyttsx3'] = MagicMock()

from tts_engine import TTSEngine

class TestTTSEngine(unittest.TestCase):

    @patch('tts_engine.pyttsx3')
    def test_init_with_female_voice(self, mock_pyttsx3):
        # Setup mock voices
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine

        voice1 = MagicMock()
        voice1.name = "Male Voice"
        voice1.id = "male_id"

        voice2 = MagicMock()
        voice2.name = "Zira Female Voice"
        voice2.id = "zira_id"

        mock_engine.getProperty.return_value = [voice1, voice2]

        # Initialize engine
        engine = TTSEngine()

        # Verify voice selection
        mock_engine.getProperty.assert_called_with('voices')
        mock_engine.setProperty.assert_any_call('voice', 'zira_id')
        mock_engine.setProperty.assert_any_call('rate', 150)

    @patch('tts_engine.pyttsx3')
    def test_init_without_target_voice(self, mock_pyttsx3):
        # Setup mock voices without female/zira
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine

        voice1 = MagicMock()
        voice1.name = "Male Voice"
        voice1.id = "male_id"

        mock_engine.getProperty.return_value = [voice1]

        # Initialize engine
        engine = TTSEngine()

        # Verify rate is set, but voice is not set to any specific id since no match was found
        mock_engine.getProperty.assert_called_with('voices')
        # Check that setProperty('voice', ...) was NOT called
        calls = mock_engine.setProperty.call_args_list
        voice_calls = [call for call in calls if call[0][0] == 'voice']
        self.assertEqual(len(voice_calls), 0)

        mock_engine.setProperty.assert_any_call('rate', 150)

    @patch('tts_engine.pyttsx3')
    def test_speak_success(self, mock_pyttsx3):
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine

        engine = TTSEngine()

        result = engine.speak("Hello world", "test.mp3")

        self.assertEqual(result, "test.mp3")
        mock_engine.save_to_file.assert_called_with("Hello world", "test.mp3")
        mock_engine.runAndWait.assert_called_once()

    @patch('tts_engine.pyttsx3')
    def test_speak_error(self, mock_pyttsx3):
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine
        mock_engine.save_to_file.side_effect = Exception("TTS synthesis failed")

        engine = TTSEngine()

        result = engine.speak("Hello world", "test.mp3")

        self.assertIsNone(result)
        mock_engine.save_to_file.assert_called_with("Hello world", "test.mp3")

if __name__ == '__main__':
    unittest.main()
