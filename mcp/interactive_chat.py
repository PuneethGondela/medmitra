import requests
import json
import sys
import io
import os

# Force UTF-8 for Windows Console
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/chat"
IMAGE_ANALYZE_URL = "http://127.0.0.1:8000/analyze_image"

def main():
    print("--- Med Mitra Local AI (Interactive Mode) ---")
    print("Type 'exit' or 'quit' to stop.")
    print("Model: Qwen2-1.5B-Instruct (Running on your RTX 4050)")
    print("------------------------------------------------")

    worker_name = input("Enter Worker Name: ") or "Anonymous"
    occupation = input("Enter Occupation (e.g., Miner, Factory Worker): ")
    age = input("Enter Age: ")
    if age: age = int(age)

    gender_input = input("Enter Gender (Male/Female/Other): ").strip().lower()
    gender = gender_input.capitalize()

    is_pregnant = False
    due_date = None

    # Only ask pregnancy for Females
    if gender_input.startswith('f'):
        is_pregnant_input = input("Is the worker pregnant? (yes/no): ").lower()
        is_pregnant = is_pregnant_input in ["yes", "y", "true"]
        
        if is_pregnant:
            due_date = input("Enter Due Date (YYYY-MM-DD) or 'Unknown': ")

    mother_tongue = input("Enter Mother Tongue (Telugu, Tamil, Hindi, Kannada, etc.): ") or "English"

    # Voice Input Setup
    recognizer = None
    mic = None
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        mic = sr.Microphone()
        print("\n🎤 Voice Input Available! Type 'v' to speak.")
    except ImportError as e:
        print(f"\n⚠️ Voice libraries missing: {e}")
        print("Run: pip install SpeechRecognition pyaudio")
    except Exception as e:
        print(f"\n⚠️ Voice Init Error: {e}") # Kept original error message for clarity
        print("------------------------------------------------") # Added from instruction

    history = []
    
    while True:
        prompt_text = "\nYou (Type or 'v' for Voice): " 
        user_input = input(prompt_text)
        
        if user_input.lower() in ["exit", "quit"]:
            print("Exiting...")
            break
        
        # --- Image Analysis Mode (DISABLED temporarily) ---
        # if user_input.lower() == 'i':
        #     image_path = input("🖼️ Enter Scan/Image Path: ").strip().strip('"')
        #     if os.path.exists(image_path):
        #         print("Scanning image...")
        #         try:
        #             with open(image_path, "rb") as f:
        #                 files = {"file": f}
        #                 response = requests.post(IMAGE_ANALYZE_URL, files=files)
        #             
        #             if response.status_code == 200:
        #                 analysis = response.json().get("analysis", "No analysis found.")
        #                 print(f"\n🔬 Vision Analysis:\n{analysis}")
        #                 continue 
        #             else:
        #                 print(f"❌ Server Error: {response.text}")
        #         except Exception as e:
        #             print(f"❌ Error sending image: {e}")
        #     else:
        #         print("❌ File not found.")
        #     continue
        # ---------------------------

        # --- Voice Input Handler ---
        if user_input.lower() == 'v' and recognizer and mic: # Corrected 'v': and to 'v' and
            print("🎤 Listening... (Speak now)")
            
            # Map Mother Tongue to Google Speech Code
            lang_code = "en-US" # Default
            mt = mother_tongue.lower()
            if "telugu" in mt: lang_code = "te-IN"
            elif "tamil" in mt: lang_code = "ta-IN"
            elif "hindi" in mt: lang_code = "hi-IN"
            elif "kannada" in mt: lang_code = "kn-IN"
            elif "spanish" in mt: lang_code = "es-ES"
            
            try:
                with mic as source:
                    recognizer.adjust_for_ambient_noise(source)
                    # Increased timeout for better listening
                    audio = recognizer.listen(source, timeout=8, phrase_time_limit=10)
                
                print(f"Processing voice (Language: {lang_code})...")
                
                user_input = recognizer.recognize_google(audio, language=lang_code) 
                print(f"\n📢 Captured Voice: \"{user_input}\"")
                print("-" * 30)
                
                # Correction Step
                correction = input("✅ Press Enter to send, or type correction: ")
                if correction.strip():
                    user_input = correction.strip()
                    print(f"✏️ Updated: \"{user_input}\"")
                
            except sr.WaitTimeoutError:
                print("❌ Timeout: No speech detected.")
                continue
            except sr.UnknownValueError:
                print("❌ Could not understand audio.")
                continue
            except sr.RequestError:
                print("❌ Network Error (Speech API).")
                continue
            except Exception as e:
                print(f"Voice Error: {e}")
                continue
        # ---------------------------

        print("AI is thinking...", end="", flush=True)
        
        try:
            # Send context to server with Worker Profile
            payload = {
                "message": user_input, 
                "history": history,
                "worker_name": worker_name,
                "occupation": occupation,
                "age": age,
                "gender": gender,
                "is_pregnant": is_pregnant,
                "due_date": due_date,
                "mother_tongue": mother_tongue
            }
            
            response = requests.post(BASE_URL, json=payload)
            
            if response.status_code != 200:
                print(f"\n❌ Server Error ({response.status_code}): {response.text}")
                continue
                
            data = response.json()
            
            ai_response = data.get('response', 'Error')
            model_used = data.get('model', 'Unknown')
            
            # Print clearly (Avoid \r to prevent collision with multi-byte chars)
            print("\n" + "="*50)
            print(f"Med Mitra ({model_used}):\n{ai_response}")
            print("="*50 + "\n")
            
            # Update history
            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": ai_response})
            
        except Exception as e:
            print(f"\nConnection Error: {e}")
            print("Make sure the server is running (python -m uvicorn main:app --reload)")

if __name__ == "__main__":
    main()
