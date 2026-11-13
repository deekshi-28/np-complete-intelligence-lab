
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
BACKEND_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BACKEND_DIR / ".env")


class Settings:
    APP_NAME = os.getenv(
        "APP_NAME",
        "NP-Complete Intelligence Lab"
    )

    APP_VERSION = os.getenv(
        "APP_VERSION",
        "1.0.0"
    )

    DATABASE_URL = os.getenv("DATABASE_URL")

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is missing. Configure backend/.env"
        )


settings = Settings()
