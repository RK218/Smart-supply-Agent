"""
simulator.py — SmartSupply 90-day multi-agent simulation
Run: python simulation/simulator.py
Run with args: python simulation/simulator.py --store store_2 --item item_3
"""

import os, sys, json, warnings, argparse
import numpy as np
import pandas as pd

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
warnings.filterwarnings("ignore")

import joblib
from tensorflow.keras.models import load_model

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from agents.inventory_monitor_agent import InventoryMonitorAgent
from agents.restocking_agent import RestockingDecisionAgent
from orchestrator.orchestrator import Orchestrator, build_initial_context

BASE_DIR     = os.path.join(os.path.dirname(__file__), "..")
DATA_PATH    = os.path.join(BASE_DIR, "data/processed/processed_data.csv")
MODEL_PATH   = os.path.join(BASE_DIR, "models/lstm_model.keras")
SCALER_PATH  = os.path.join(BASE_DIR, "models/scaler.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "models/training_metrics.json")
RESULTS_DIR  = os.path.join(BASE_DIR, "simulation")

SIM_DAYS            = 90
INITIAL_STOCK       = 300.0
LEAD_TIME           = 7
ORDERING_COST       = 50.0
HOLDING_COST        = 2.0
FIXED_REORDER_POINT = 80
FIXED_ORDER_QTY     = 150


def prepare_sequences(df_grp, feature_cols, lookback):
    data = df_grp[feature_cols].values.astype(np.float32)
    return [data[i - lookback:i] for i in range(lookback, len(data))]


class LSTMForecastAgent:
    """Thin wrapper around the LSTM model for the simulator."""
    def __init__(self):
        self.name = "DemandForecastingAgent"
        self.run_count = 0
        self.forecasts = []

    def precompute_forecasts(self, sequences, model, scaler):
        X = np.array(sequences)
        preds_scaled = model.predict(X, verbose=0).flatten()
        self.forecasts = np.clip(scaler.inverse_transform(preds_scaled.reshape(-1, 1)).flatten(), 0, None)

    def run(self, context):
        self.run_count += 1
        day = context["current_day"]
        forecast = float(self.forecasts[day]) if day < len(self.forecasts) else float(self.forecasts[-1])
        last_actual = context.get("last_actual_demand", forecast)
        context["demand_forecast"] = forecast
        context["forecast_error"] = (forecast - last_actual) / max(last_actual, 1)
        context["forecast_confidence"] = 0.85
        return context

    def log(self, msg):
        print(f"[DemandForecastingAgent] {msg}")


def run_baseline(actual_demand):
    """Fixed reorder point baseline (stock <= 80 -> order 150 units)."""
    stock = INITIAL_STOCK
    pending, results = [], []
    total_ord = total_hld = 0.0
    for day in range(len(actual_demand)):
        for r in [r for r in pending if r["day"] == day]:
            stock += r["qty"]
        pending = [r for r in pending if r["day"] != day]
        reorder_placed = False
        if stock <= FIXED_REORDER_POINT:
            pending.append({"day": day + LEAD_TIME, "qty": FIXED_ORDER_QTY})
            total_ord += ORDERING_COST
            reorder_placed = True
        total_hld += stock * HOLDING_COST / 365
        actual = float(actual_demand[day])
        stock = max(0.0, stock - actual)
        results.append({
            "day": day, "stock_eod": round(stock, 1), "actual_demand": round(actual, 2),
            "stockout": stock <= 0, "reorder_placed": reorder_placed,
            "reorder_qty": FIXED_ORDER_QTY if reorder_placed else 0,
            "ordering_cost": round(total_ord, 2), "holding_cost": round(total_hld, 2),
        })
    return pd.DataFrame(results)


def evaluate(df, label):
    from sklearn.metrics import mean_squared_error, mean_absolute_error
    stockout_rate = df["stockout"].mean() * 100
    total_ord_cost = df["ordering_cost"].iloc[-1]
    total_hld_cost = df["holding_cost"].iloc[-1]
    rmse = mae = mape = None
    if "demand_forecast" in df.columns:
        mask = df["actual_demand"] > 0
        rmse = float(np.sqrt(mean_squared_error(df.loc[mask,"actual_demand"], df.loc[mask,"demand_forecast"])))
        mae  = float(mean_absolute_error(df.loc[mask,"actual_demand"], df.loc[mask,"demand_forecast"]))
        mape = float(np.mean(np.abs((df.loc[mask,"actual_demand"] - df.loc[mask,"demand_forecast"]) / df.loc[mask,"actual_demand"])) * 100)
    metrics = {
        "label": label,
        "stockout_rate":  round(stockout_rate, 2),
        "service_level":  round(100 - stockout_rate, 2),
        "total_orders":   int(df["reorder_placed"].sum()),
        "ordering_cost":  round(total_ord_cost, 2),
        "holding_cost":   round(total_hld_cost, 2),
        "total_cost":     round(total_ord_cost + total_hld_cost, 2),
        "avg_stock":      round(float(df["stock_eod"].mean()), 1),
        "forecast_mape":  round(mape, 2) if mape is not None else None,
        "forecast_rmse":  round(rmse, 3) if rmse is not None else "N/A",
        "forecast_mae":   round(mae, 3)  if mae  is not None else "N/A",
    }
    print(f"\n{'='*50}\n  Results: {label}\n{'='*50}")
    for k, v in metrics.items():
        if k != "label":
            print(f"  {k:<22}: {v}")
    return metrics


def run_simulation(store_id="store_1", item_id="item_1"):
    print("\n" + "="*55)
    print("  SmartSupply Agent - 90-Day Simulation")
    print("="*55)

    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    grp = df[(df["store_id"] == store_id) & (df["item_id"] == item_id)].sort_values("date").reset_index(drop=True)
    if len(grp) == 0:
        print(f"ERROR: No data for {store_id}/{item_id}. Re-run pipeline.")
        return None, None, None

    with open(METRICS_PATH) as f:
        meta = json.load(f)
    feature_cols = meta["feature_cols"]
    lookback     = meta["lookback"]

    missing = [c for c in feature_cols if c not in grp.columns]
    if missing:
        print(f"ERROR: Missing columns: {missing}. Re-run pipeline.")
        return None, None, None

    print("Loading LSTM model ...")
    model  = load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    sequences     = prepare_sequences(grp, feature_cols, lookback)
    test_grp      = grp.iloc[lookback:].reset_index(drop=True).tail(SIM_DAYS).reset_index(drop=True)
    actual_demand = test_grp["sales"].values.tolist()
    sim_sequences = sequences[-SIM_DAYS:]

    print(f"Window: {test_grp['date'].iloc[0].date()} to {test_grp['date'].iloc[-1].date()}")
    print(f"Store: {store_id} | Item: {item_id} | Initial stock: {INITIAL_STOCK:.0f}")

    forecast_agent = LSTMForecastAgent()
    forecast_agent.precompute_forecasts(sim_sequences, model, scaler)
    monitor_agent  = InventoryMonitorAgent(service_level=0.95)
    restock_agent  = RestockingDecisionAgent(ordering_cost=ORDERING_COST, holding_cost_rate=HOLDING_COST)

    orch = Orchestrator()
    orch.register(forecast_agent)
    orch.register(monitor_agent)
    orch.register(restock_agent)

    ctx = build_initial_context(store_id, item_id, INITIAL_STOCK, LEAD_TIME, ORDERING_COST, HOLDING_COST)
    results_raw = orch.run_simulation(ctx, actual_demand, sim_sequences, verbose=False)

    df_smart = pd.DataFrame(results_raw)
    df_smart["demand_forecast"] = list(forecast_agent.forecasts[:SIM_DAYS])

    print("\n[Baseline] Running fixed-threshold simulation ...")
    df_base = run_baseline(actual_demand)

    m_smart = evaluate(df_smart, "SmartSupply Agent (LSTM)")
    m_base  = evaluate(df_base,  "Baseline (Fixed Reorder Point)")

    os.makedirs(RESULTS_DIR, exist_ok=True)
    df_smart.to_csv(os.path.join(RESULTS_DIR, "smartsupply_results.csv"), index=False)
    df_base.to_csv(os.path.join(RESULTS_DIR, "baseline_results.csv"),    index=False)
    with open(os.path.join(RESULTS_DIR, "comparison_metrics.json"), "w") as f:
        json.dump({"smartsupply": m_smart, "baseline": m_base}, f, indent=2)

    print("\n" + "="*55)
    print(f"  Stockout rate : {m_base['stockout_rate']}% -> {m_smart['stockout_rate']}%")
    print(f"  Service level : {m_base['service_level']}% -> {m_smart['service_level']}%")
    print(f"  Total cost    : Rs.{m_base['total_cost']} -> Rs.{m_smart['total_cost']}")
    print("="*55)
    return df_smart, df_base, {"smartsupply": m_smart, "baseline": m_base}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--store", default="store_1")
    parser.add_argument("--item",  default="item_1")
    args = parser.parse_args()
    run_simulation(store_id=args.store, item_id=args.item)
