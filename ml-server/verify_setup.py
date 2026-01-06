import sys
import os

print("Verifying imports...")
try:
    from tts_engine import TTSEngine
    print("TTSEngine imported.")
    tts = TTSEngine()
    print("TTSEngine initialized.")
    tts.speak("System check initiated.", "test_audio.mp3")
    if os.path.exists("test_audio.mp3"):
        print("TTS Generation successful.")
        os.remove("test_audio.mp3")
    else:
        print("TTS Generation failed (no file output).")
except Exception as e:
    print(f"TTS Error: {e}")

try:
    from translation import Translator
    print("Translator imported.")
    # Skip load_model() to save GPU memory during training
    trans = Translator(device="cpu") 
    print("Translator initialized (CPU mode for check).")
except Exception as e:
    print(f"Translation Error: {e}")

try:
    from main import app
    print("FastAPI App imported.")
except Exception as e:
    print(f"Main App Error: {e}")

print("Verification Complete.")
