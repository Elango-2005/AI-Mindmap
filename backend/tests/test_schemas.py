from app.schemas import UserCreate

user = UserCreate(
    full_name="Elango",
    email="elango@example.com",
    password="password123"
)

print(user)