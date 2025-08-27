from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes.auth import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Registration API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "User Registration API is running"}