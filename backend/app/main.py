from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from .routes.auth import router as auth_router
from . import models  # Import models to register them with Base
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Registration API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.herokuapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (React build) FIRST
# Look for build files in multiple possible locations
possible_paths = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "build"),
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "build"),
    "build"
]

static_dir = None
for path in possible_paths:
    if os.path.exists(path):
        static_dir = path
        break

if static_dir and os.path.exists(os.path.join(static_dir, "index.html")):
    # Mount static files
    static_files_dir = os.path.join(static_dir, "static")
    if os.path.exists(static_files_dir):
        app.mount("/static", StaticFiles(directory=static_files_dir), name="static")

# Include API routes AFTER mounting static files
app.include_router(auth_router, prefix="/api")

if static_dir and os.path.exists(os.path.join(static_dir, "index.html")):
    @app.get("/")
    def read_index():
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    # Catch-all route for React Router (SPA) - more specific pattern to avoid API conflicts
    @app.get("/{full_path:path}", include_in_schema=False)
    def catch_all(full_path: str):
        # Only serve React app for non-API routes
        if not full_path.startswith("api"):
            return FileResponse(os.path.join(static_dir, "index.html"))
        # For API routes that don't exist, let FastAPI handle the 404
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="API endpoint not found")
else:
    @app.get("/")
    def read_root():
        return {"message": "User Registration API is running"}