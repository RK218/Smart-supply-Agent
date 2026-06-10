"""
orchestrator.py — SmartSupply central coordination layer.
Runs Agent 01 → 02 → 03 in sequence each simulation day.
"""

import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from agents.base_agent import BaseAgent

HISTORY_PATH = os.path.join(os.path.dirname(__file__), "../models/decision_history.json")


def build_initial_context(store_id, item_id, initial_stock,
                          supplier_lead_time=7, ordering_cost=50.0, holding_cost_rate=2.0):
    return {
        "store_id": store_id, "item_id": item_id,
        "current_day": 0, "current_stock": float(initial_stock),
        "pending_reorders": [],
        "demand_forecast": 0.0, "forecast_confidence": 1.0,
        "forecast_error": 0.0, "forecast_error_history": [],
        "last_actual_demand": 0.0,
        "stockout_risk": False, "overstock_flag": False,
        "stock_status": "NORMAL", "safety_stock": 20.0,
        "days_until_stockout": 999, "coverage_days": 999.0,
        "reorder_action": None, "reorder_history": [],
        "total_ordering_cost": 0.0, "total_holding_cost": 0.0,
        "supplier_lead_time": supplier_lead_time,
        "ordering_cost": ordering_cost,
        "holding_cost_rate": holding_cost_rate,
        "recent_sequence": None,
    }


class Orchestrator:
    def __init__(self):
        self.agents: list = []
        self.decision_log: list = []

    def register(self, agent):
        self.agents.append(agent)
        print(f"[Orchestrator] Registered: {agent.name}")

    def _apply_reorders(self, context):
        today = context["current_day"]
        for r in context["pending_reorders"]:
            if r["arrive_day"] == today:
                context["current_stock"] += r["quantity"]
                print(f"[Orchestrator] Day {today} | Reorder arrived: +{r['quantity']} | Stock: {context['current_stock']:.0f}")
        context["pending_reorders"] = [r for r in context["pending_reorders"] if r["arrive_day"] != today]

    def _log_day(self, context, actual_demand):
        return {
            "day": context["current_day"],
            "store_id": context["store_id"],
            "item_id": context["item_id"],
            "stock_eod": round(context["current_stock"], 1),
            "demand_forecast": round(context["demand_forecast"], 2),
            "actual_demand": round(actual_demand, 2),
            "forecast_error": round(context["forecast_error"], 4),
            "safety_stock": round(context["safety_stock"], 1),
            "stock_status": context["stock_status"],
            "stockout_risk": context["stockout_risk"],
            "stockout": context["current_stock"] <= 0,
            "overstock": context["overstock_flag"],
            "reorder_placed": context["reorder_action"] is not None,
            "reorder_qty": context["reorder_action"]["quantity"] if context["reorder_action"] else 0,
            "coverage_days": context["coverage_days"],
            "ordering_cost": round(context["total_ordering_cost"], 2),
            "holding_cost": round(context["total_holding_cost"], 2),
        }

    def run_simulation(self, context, actual_demand_series, sequences_series=None, verbose=False):
        results = []
        n_days = len(actual_demand_series)
        print(f"\n[Orchestrator] Starting {n_days}-day simulation | {context['store_id']} / {context['item_id']}")

        for day in range(n_days):
            context["current_day"] = day
            self._apply_reorders(context)

            if sequences_series is not None and day < len(sequences_series):
                context["recent_sequence"] = sequences_series[day]

            for agent in self.agents:
                context = agent.run(context)

            actual = float(actual_demand_series[day])
            context["current_stock"] = max(0.0, context["current_stock"] - actual)
            context["last_actual_demand"] = actual
            context["forecast_error_history"].append(context.get("forecast_error", 0.0))
            context["forecast_error_history"] = context["forecast_error_history"][-60:]

            if context["reorder_action"] is not None:
                reorder = context["reorder_action"]
                context["pending_reorders"].append({"arrive_day": reorder["arrive_day"], "quantity": reorder["quantity"]})
                context["reorder_history"].append(reorder)

            daily_snapshot = self._log_day(context, actual)
            results.append(daily_snapshot)
            self.decision_log.append(daily_snapshot)
            context["reorder_action"] = None

        print(f"[Orchestrator] Simulation complete | {n_days} days")
        self._save_decision_log()
        return results

    def _save_decision_log(self):
        os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
        with open(HISTORY_PATH, "w") as f:
            json.dump(self.decision_log[-200:], f, indent=2, default=str)
