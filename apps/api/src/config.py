from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/chatbot"

    # App
    FRONTEND_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Auth (Step 3)
    BETTER_AUTH_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # LLM (Step 6)
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""

    # Embeddings (Step 5)
    EMBEDDING_DIMENSIONS: int = 768

    # R2 Storage (Step 5)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "chatbot-files"
    R2_PUBLIC_URL: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
