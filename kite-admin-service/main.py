from contextlib import asynccontextmanager
from os import makedirs

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Controllers.apps import router as apps_router
from Controllers.auth import router as auth_router
from Controllers.billing import router as billing_router
from Controllers.dashboard import router as dashboard_router
from Controllers.logs import router as logs_router
from Controllers.revenue import router as revenue_router
from Controllers.users import router as users_router
from utils.auth import load_users
from utils.log import LOGGING_CONFIG, setup_logger
from utils.session_store import init_db as init_session_db
from utils.token_blacklist import close_blacklist, init_blacklist


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    makedirs(".data", exist_ok=True)
    load_users()
    await init_session_db()
    await init_blacklist()
    yield
    # Shutdown
    await close_blacklist()


class Application(FastAPI):
    def __init__(self, *args, **kwargs):
        super().__init__(lifespan=lifespan, *args, **kwargs)
        self.add_middleware(CORSMiddleware, allow_origins="*", allow_methods="*")
        self.add_api_route("/health", self.health_check, methods=["GET"])
        self.include_router(auth_router)
        self.include_router(revenue_router)
        self.include_router(users_router)
        self.include_router(apps_router)
        self.include_router(billing_router)
        self.include_router(logs_router)
        self.include_router(dashboard_router)
        self.log = setup_logger()

    async def health_check(self):
        self.log.info("Health check requested")
        return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    app = Application()

    uvicorn.run(
        app, log_config=LOGGING_CONFIG, log_level="info", host="0.0.0.0", port=8000
    )
