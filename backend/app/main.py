
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.middleware.logger
from app.middleware.capture_middleware import CaptureMiddleware
from app.routers import accounts, consents, banking, auth
from app.database.connection import init_db, check_db

app = FastAPI(
    title="FinConnect API",
    description="Open Banking PSD2 Aggregator API",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CaptureMiddleware)

app.include_router(accounts.router)
app.include_router(consents.router)
app.include_router(banking.router)
app.include_router(auth.router)

@app.on_event("startup")
def startup():
    check_db()
    init_db()

@app.get("/")
async def root():
    return {
        "api":     "FinConnect Open Banking",
        "version": "2.1.0",
        "spec":    "Berlin Group PSD2",
        "docs":    "/docs",
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
