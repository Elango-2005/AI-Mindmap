import requests
import sys

# Try login endpoint
url = "http://localhost:8000/api/v1/auth/login"
payload = {
    "email": "frontend-test2@test.com",
    "password": "password123"
}

try:
    response = requests.post(url, json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())
except Exception as e:
    print("Request failed:", e)
