from app.db.base import Base

print("Registered Tables:")
print(Base.metadata.tables.keys())