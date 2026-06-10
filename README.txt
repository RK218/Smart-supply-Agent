╔══════════════════════════════════════════════════════╗
║         SmartSupply Agent — Setup Guide              ║
║         Unisys Innovation Program 2026               ║
╚══════════════════════════════════════════════════════╝

Team: Aasim Pasha · Monish K · Muzammil Rahman D · Ruthvik K

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - Python 3.10 or 3.11 or 3.12
  - Node.js 18+ and npm
  - Internet connection (for pip install)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST TIME SETUP (run once)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 — Open terminal and go to backend folder:
  cd SA/backend

Step 2 — Create virtual environment:
  python -m venv .venv

Step 3 — Activate it:
  Windows:  .venv\Scripts\activate
  Mac/Linux: source .venv/bin/activate

Step 4 — Install Python packages:
  pip install -r requirements.txt

Step 5 — Install frontend packages (new terminal):
  cd SA/frontend
  npm install

Step 6 — Run data pipeline:
  cd SA/backend
  python data/processed/pipeline.py

Step 7 — Train LSTM model (takes 5-15 mins):
  python agents/demand_forecasting_agent.py --train

Step 8 — Run simulation:
  python simulation/simulator.py

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY USE (after first time setup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Terminal 1 — Start backend:
  cd SA/backend
  .venv\Scripts\activate
  uvicorn api:app --reload --port 8000

Terminal 2 — Start frontend:
  cd SA/frontend
  npm start

Then open: http://localhost:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  First time: Click "Create Account" and register your own
  username and password. Accounts saved in backend/users.json.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SA/
  ├── backend/
  │   ├── agents/          ← 3 AI agents
  │   ├── data/
  │   │   ├── raw/         ← retail_sales.csv (Kaggle dataset)
  │   │   └── processed/   ← pipeline.py + processed_data.csv
  │   ├── models/          ← trained LSTM model files
  │   ├── orchestrator/    ← agent coordination
  │   ├── simulation/      ← simulator + result CSVs
  │   ├── api.py           ← FastAPI server
  │   ├── users.json       ← registered user accounts
  │   └── requirements.txt
  └── frontend/
      ├── src/
      │   ├── App.js       ← entire dashboard UI
      │   ├── api.js       ← backend HTTP calls
      │   └── index.js
      ├── public/
      │   └── index.html
      └── package.json
