import requests
resp = requests.post('http://localhost:8000/api/v1/auth/login', json={'email':'frontend-test2@test.com', 'password':'password123'})
print("Login status:", resp.status_code)
if resp.status_code == 200:
    token = resp.json()['access_token']
    res = requests.post('http://localhost:8000/api/v1/templates/machine_learning_roadmap/instantiate', headers={'Authorization': 'Bearer ' + token})
    print("Instantiate status:", res.status_code)
    print("Response text:", res.text)


