import requests
import json

try:
    response = requests.post(
        "http://127.0.0.1:8000/chat",
        json={"message": "test", "history": []}
    )
    print("Status Code:", response.status_code)
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print("Raw text:", response.text)
except Exception as e:
    print(e)
