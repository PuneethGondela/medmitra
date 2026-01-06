import pyttsx3
import threading

class TTSEngine:
    def __init__(self):
        self.engine = pyttsx3.init()
        self.lock = threading.Lock()
        
        # Configure voice
        voices = self.engine.getProperty('voices')
        # Try to find a good female voice or default
        for voice in voices:
            if "female" in voice.name.lower() or "zira" in voice.name.lower():
                self.engine.setProperty('voice', voice.id)
                break
                
        self.engine.setProperty('rate', 150)

    def speak(self, text: str, output_file: str = "output.mp3"):
        with self.lock:
            try:
                # pyttsx3 save_to_file is more stable for server use
                self.engine.save_to_file(text, output_file)
                self.engine.runAndWait()
                return output_file
            except Exception as e:
                print(f"TTS Error: {e}")
                return None
