import pyttsx3
import os

class TextToSpeech:
    def __init__(self):
        self.engine = pyttsx3.init()
        # Optimize voice settings
        self.engine.setProperty('rate', 150)  # Speed of speech
        self.engine.setProperty('volume', 1.0) # Volume level (0.0 to 1.0)

    def speak(self, text):
        """Speaks the text directly (blocking)."""
        try:
            self.engine.say(text)
            self.engine.runAndWait()
            return True
        except Exception as e:
            print(f"TTS Error: {e}")
            return False

    def save_audio(self, text, filename="output.wav"):
        """Saves functionality to a file."""
        try:
            self.engine.save_to_file(text, filename)
            self.engine.runAndWait()
            return os.path.abspath(filename)
        except Exception as e:
            print(f"TTS Save Error: {e}")
            return None
