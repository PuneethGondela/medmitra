import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/chat"

def chat(message, history=[]):
    print(f"\nUser: {message}")
    print("AI is thinking...", end="", flush=True)
    
    start = time.time()
    try:
        response = requests.post(BASE_URL, json={"message": message, "history": history})
        data = response.json()
        duration = time.time() - start
        
        print(f"\rAI ({data.get('model', 'Unknown')}): {data.get('response', 'Error')} ({duration:.2f}s)")
        return data.get('response')
    except Exception as e:
        print(f"\nError: {e}")
        return None

def main():
    print("--- Starting Conversation with Med Mitra AI ---")
    
    # Turn 1: Symptom check
    history = []
    response = chat("Hi, I've been feeling very tired lately and have a mild fever.", history)
    if response: history.extend([{"role": "user", "content": "Hi, I've been feeling very tired lately and have a mild fever."}, {"role": "assistant", "content": response}])
    
    # Turn 2: Follow up
    response = chat("Could it be the flu? I also have a headache.", history)
    if response: history.extend([{"role": "user", "content": "Could it be the flu? I also have a headache."}, {"role": "assistant", "content": response}])
    
    # Turn 3: Advice
    response = chat("What home remedies do you suggest?", history)

if __name__ == "__main__":
    main()
