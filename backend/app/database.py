import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# En producción (Docker), DATABASE_URL apunta a PostgreSQL:
#   postgresql://reservas_user:reservas_pass@db:5432/reservas_db
# Para pruebas locales sin Docker, se puede usar SQLite como fallback.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./reservas_local.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
