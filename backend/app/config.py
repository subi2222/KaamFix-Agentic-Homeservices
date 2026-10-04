from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KaamFix API"
    environment: str = "development"
    firebase_project_id: str = "kaamfix-60f30"
    firebase_service_account_json: str | None = None
    google_application_credentials: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    kaamfix_data_dir: str | None = None

    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def data_dir(self) -> Path:
        if self.kaamfix_data_dir:
            return Path(self.kaamfix_data_dir).expanduser().resolve()
        return Path(__file__).resolve().parents[2] / "data"


@lru_cache
def get_settings() -> Settings:
    return Settings()
