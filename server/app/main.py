from fastapi import FastAPI

from app.api.routes import router as api_router
from app.core.config import get_settings
from app.core.database import init_db

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.include_router(api_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"message": "server for codeeditor is running"}
