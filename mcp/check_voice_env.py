import sys
print(f"Python Executable: {sys.executable}")
try:
    import speech_recognition as sr
    print("YES speech_recognition is installed.")
except ImportError as e:
    print(f"NO speech_recognition MISSING: {e}")

try:
    import pyaudio
    print("YES pyaudio is installed.")
except ImportError as e:
    print(f"NO pyaudio MISSING: {e}")
