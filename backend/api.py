"""
api.py — SmartSupply FastAPI Backend
Serves all simulation results as JSON and triggers new simulations.

Run from the backend/ folder:
    uvicorn api:app --reload --port 8000

Endpoints:
    GET  /api/results/smart       → 90-day SmartSupply results (JSON)
    GET  /api/results/baseline    → 90-day baseline results (JSON)
    GET  /api/results/metrics     → comparison metrics (JSON)
    GET  /api/results/training    → LSTM training metrics (JSON)
    POST /api/simulate?store=store_1&item=item_1  → run new simulation
    GET  /health                  → check all files exist
"""

import os, sys, json, subprocess, hashlib, secrets
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(title="SmartSupply Agent API", version="1.0.0")

# Allow React dev server (port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths relative to this file (backend/)
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
SIM_DIR    = os.path.join(BASE_DIR, "simulation")
MDL_DIR    = os.path.join(BASE_DIR, "models")
USERS_FILE = os.path.join(BASE_DIR, "users.json")


# ── AUTH HELPERS ──────────────────────────────────────────────────────────────
def _hash_password(password: str) -> str:
    """SHA-256 hash the password with a salt."""
    salt = "smartsupply_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def _load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def _save_users(users: dict):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str


def _require(path: str):
    """Return 404 if a result file doesn't exist yet."""
    if not os.path.exists(path):
        fname = os.path.basename(path)
        raise HTTPException(status_code=404,
            detail=f"'{fname}' not found. POST /api/simulate to generate it.")


# ─── AUTH ENDPOINTS ──────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    username = req.username.strip().lower()
    password = req.password.strip()

    # Validation
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if not username.replace("_","").replace("-","").isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, - and _.")

    users = _load_users()
    if username in users:
        raise HTTPException(status_code=409, detail="Username already exists. Please choose another.")

    users[username] = {
        "password_hash": _hash_password(password),
        "created_at": str(__import__('datetime').datetime.now().isoformat())
    }
    _save_users(users)
    return {"success": True, "message": f"Account created for '{username}'. You can now log in."}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    username = req.username.strip().lower()
    password = req.password.strip()

    users = _load_users()
    if username not in users:
        raise HTTPException(status_code=401, detail="Username not found. Please register first.")

    if users[username]["password_hash"] != _hash_password(password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    return {"success": True, "username": username, "message": "Login successful."}


@app.get("/api/auth/users/count")
def user_count():
    """Returns how many users are registered. Used by frontend to show register prompt."""
    users = _load_users()
    return {"count": len(users)}


# ─── READ ENDPOINTS ───────────────────────────────────────────────────────────

@app.get("/api/results/smart")
def get_smart():
    path = os.path.join(SIM_DIR, "smartsupply_results.csv")
    _require(path)
    df = pd.read_csv(path)
    # Replace NaN and inf/-inf with None so JSON serializes cleanly
    df = df.replace([float("inf"), float("-inf")], None)
    return df.where(pd.notna(df), None).to_dict(orient="records")


@app.get("/api/results/baseline")
def get_baseline():
    path = os.path.join(SIM_DIR, "baseline_results.csv")
    _require(path)
    df = pd.read_csv(path)
    df = df.replace([float("inf"), float("-inf")], None)
    return df.where(pd.notna(df), None).to_dict(orient="records")


@app.get("/api/results/metrics")
def get_metrics():
    path = os.path.join(SIM_DIR, "comparison_metrics.json")
    _require(path)
    with open(path) as f:
        return json.load(f)


@app.get("/api/results/training")
def get_training():
    path = os.path.join(MDL_DIR, "training_metrics.json")
    _require(path)
    with open(path) as f:
        return json.load(f)


# ─── SIMULATION TRIGGER ───────────────────────────────────────────────────────

@app.post("/api/simulate")
def run_simulation(store: str = "store_1", item: str = "item_1"):
    """
    Trigger a 90-day simulation for the given store/item.
    Runs simulator.py as a subprocess; takes ~30–60 seconds.
    """
    valid_stores = [f"store_{i}" for i in range(1, 51)]
    valid_items  = [f"item_{i}"  for i in range(1, 51)]
    if store not in valid_stores:
        raise HTTPException(status_code=400, detail=f"Invalid store: {store}")
    if item not in valid_items:
        raise HTTPException(status_code=400, detail=f"Invalid item: {item}")

    sim_script = os.path.join(BASE_DIR, "simulation", "simulator.py")
    result = subprocess.run(
        [sys.executable, sim_script, "--store", store, "--item", item],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=300,
        cwd=BASE_DIR,
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500,
            detail=f"Simulation failed:\n{result.stderr[-800:]}")

    return {
        "success": True,
        "store":   store,
        "item":    item,
        "message": "Simulation complete. Fetch /api/results/* for results.",
    }


# ─── EXPORT ENDPOINTS ─────────────────────────────────────────────────────────

@app.get("/api/export/smart_csv")
def export_smart():
    path = os.path.join(SIM_DIR, "smartsupply_results.csv")
    _require(path)
    return FileResponse(path, media_type="text/csv", filename="smartsupply_results.csv")


@app.get("/api/export/baseline_csv")
def export_baseline():
    path = os.path.join(SIM_DIR, "baseline_results.csv")
    _require(path)
    return FileResponse(path, media_type="text/csv", filename="baseline_results.csv")


@app.get("/api/export/metrics_json")
def export_metrics():
    path = os.path.join(SIM_DIR, "comparison_metrics.json")
    _require(path)
    return FileResponse(path, media_type="application/json", filename="comparison_metrics.json")


# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    files = {
        "processed_data":     os.path.exists(os.path.join(BASE_DIR, "data/processed/processed_data.csv")),
        "lstm_model":         os.path.exists(os.path.join(MDL_DIR, "lstm_model.keras")),
        "scaler":             os.path.exists(os.path.join(MDL_DIR, "scaler.pkl")),
        "training_metrics":   os.path.exists(os.path.join(MDL_DIR, "training_metrics.json")),
        "smart_results":      os.path.exists(os.path.join(SIM_DIR, "smartsupply_results.csv")),
        "baseline_results":   os.path.exists(os.path.join(SIM_DIR, "baseline_results.csv")),
        "comparison_metrics": os.path.exists(os.path.join(SIM_DIR, "comparison_metrics.json")),
    }
    ready = all(files.values())
    return {
        "status": "ready" if ready else "partial",
        "files":  files,
        "hint":   "POST /api/simulate to generate missing result files." if not ready else "All files present"
    }


# ─── ENTRY POINT ──────────────────────────────────────────────────────────────
# uvicorn api:app --reload --port 8000