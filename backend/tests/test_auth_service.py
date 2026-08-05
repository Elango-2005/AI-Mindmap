from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.schemas.auth import LoginRequest

db = SessionLocal()

repo = UserRepository(db)
service = AuthService(repo)

login = LoginRequest(
    email="elango@example.com",
    password="password123",
)

token = service.login(login)

print("Login Successful!")
print(token)

db.close()