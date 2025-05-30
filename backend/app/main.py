from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import router as api_router # .routes assumes routes.py is in the same directory 'app'
from .etl import load_budget_data, load_cpi_data, DEFAULT_BUDGET_CSV, DEFAULT_CPI_JSON # To trigger dummy data creation on startup

# Define the base directory of the backend
BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Namibia Budget Visualiser API",
    description="API for accessing and analysing Namibian national budget data.",
    version="0.1.0"
)

# CORS (Cross-Origin Resource Sharing)
# Allows frontend (running on a different port/domain) to communicate with the backend.
origins = [
    "http://localhost:3000",  # Default React development server
    "http://localhost:5173",  # Default Vite development server
    # Add other origins if needed (e.g., deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# Include API routes
app.include_router(api_router)

# --- Static files for Frontend ---
# This assumes your React frontend will be built into a 'build' or 'dist' directory,
# and its contents will be served by FastAPI.
# The path to static files needs to be relative to where main.py is,
# or an absolute path.

# Path to the frontend build directory.
# This needs to be adjusted based on your final frontend build output location.
# For development, this might not be used if you run React dev server separately.
# For production, frontend is built and its static assets are served by FastAPI.
FRONTEND_BUILD_DIR = BASE_DIR.parent.parent / "frontend" / "dist" # Assuming 'dist' for Vite, or 'build' for CRA

# Mount static files for the frontend
# This will serve index.html for any path not caught by other routes,
# which is typical for SPAs (Single Page Applications).
# Ensure this is AFTER your API routes.
if FRONTEND_BUILD_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_BUILD_DIR, html=True),
        name="static-frontend",
    )
    print(f"Serving frontend from: {FRONTEND_BUILD_DIR}")
else:
    print(f"WARNING: Frontend build directory not found at {FRONTEND_BUILD_DIR}. Frontend will not be served by FastAPI.")
    print("This is normal during development if you are running the frontend dev server separately.")
    print("Ensure the frontend is built to this location for production deployment.")


@app.on_event("startup")
async def startup_event():
    """
    Actions to perform on application startup.
    For example, loading data, initializing resources.
    The ETL functions are called here to ensure dummy data is created if files are missing.
    """
    print("Application startup: Initializing data...")
    try:
        load_budget_data(DEFAULT_BUDGET_CSV) # Ensures dummy CSV is created if not present
        print("Budget data loaded/checked.")
    except Exception as e:
        print(f"Error loading budget data during startup: {e}")

    try:
        load_cpi_data(DEFAULT_CPI_JSON) # Ensures dummy CPI JSON is created if not present
        print("CPI data loaded/checked.")
    except Exception as e:
        print(f"Error loading CPI data during startup: {e}")
    print("Application startup complete.")

if __name__ == "__main__":
    import uvicorn
    # This is for running the backend directly for development.
    # For production, you'd use a process manager like Gunicorn with Uvicorn workers.
    # The Dockerfile will handle this.
    print("Running FastAPI app with Uvicorn (development mode)...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(BASE_DIR))
