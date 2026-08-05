from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate

db = SessionLocal()

repo = UserRepository(db)

user = UserCreate(
    full_name="Elango",
    email="elango@example.com",
    password="password123"
)

existing = repo.get_by_email(user.email)

if existing:
    print("User already exists.")
else:
    created = repo.create(user)
    print("User created successfully!")
    print(created.id)
    print(created.email)

db.close()