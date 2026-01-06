import requests
import json
import sys

API_URL = "http://localhost:8000/api/chat"

def chat():
    print("--- Med Mitra ML Chat Client ---")
    print(f"Connecting to {API_URL}")
    
    conversation = []
    
    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ['exit', 'quit']:
                break
                
            conversation.append({"role": "user", "content": user_input})
            
            payload = {
                "messages": conversation,
                "max_tokens": 512,
                "temperature": 0.7
            }
            
            print("Med Mitra: (Thinking...)", end="\r")
            try:
                response = requests.post(API_URL, json=payload)
                response.raise_for_status()
                data = response.json()
                bot_reply = data.get("response", "Error: No response field")
                
                print(f"Med Mitra: {bot_reply}")
                conversation.append({"role": "assistant", "content": bot_reply})
                
            except requests.exceptions.ConnectionError:
                print("\nError: Could not connect to ML Server. Is it running on port 8000?")
            except Exception as e:
                print(f"\nError: {e}")
                
        except KeyboardInterrupt:
            break
            
if __name__ == "__main__":
    chat()
