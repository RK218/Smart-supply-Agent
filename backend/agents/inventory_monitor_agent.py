"""
inventory_monitor_agent.py  —  Agent 02
Evaluates stock vs forecast, computes dynamic safety stock, flags risk.
"""

import sys, os, math
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from agents.base_agent import BaseAgent


class InventoryMonitorAgent(BaseAgent):
    """Agent 02: Monitors stock levels and raises risk flags."""

    def __init__(self, service_level: float = 0.95):
        super().__init__("InventoryMonitorAgent")
        self.z_score = self._z_from_service_level(service_level)
        self.service_level = service_level

    @staticmethod
    def _z_from_service_level(sl: float) -> float:
        table = {0.90: 1.28, 0.95: 1.645, 0.97: 1.88, 0.99: 2.33}
        return table.get(sl, 1.645)

    def _compute_dynamic_safety_stock(self, context: dict) -> float:
        lead_time = context.get("supplier_lead_time", 7)
        errors    = context.get("forecast_error_history", [])
        forecast  = context.get("demand_forecast", 10.0)

        if len(errors) >= 10:
            sigma = float(np.std(np.abs(errors[-30:])) * forecast)
        else:
            sigma = 0.20 * forecast

        return max(self.z_score * sigma * math.sqrt(lead_time), 5.0)

    def run(self, context: dict) -> dict:
        self.run_count += 1
        stock     = float(context.get("current_stock", 0))
        forecast  = float(context.get("demand_forecast", 10.0))
        lead_time = int(context.get("supplier_lead_time", 7))

        safety_stock = self._compute_dynamic_safety_stock(context)
        context["safety_stock"] = round(safety_stock, 2)

        buffer_needed = max(forecast * lead_time + safety_stock, 80.0)
        coverage_days = (stock / forecast) if forecast > 0 else float("inf")
        context["coverage_days"] = round(coverage_days, 1) if np.isfinite(coverage_days) else float("inf")

        if stock == 0:
            context["stockout_risk"] = True
            context["days_until_stockout"] = 0
        elif stock < buffer_needed:
            context["stockout_risk"] = True
            context["days_until_stockout"] = 0 if not np.isfinite(coverage_days) else max(0, int(coverage_days))
        else:
            context["stockout_risk"] = False
            context["days_until_stockout"] = 999 if not np.isfinite(coverage_days) else int(coverage_days)

        context["overstock_flag"] = stock > forecast * 45

        if stock == 0:
            status = "STOCKOUT"
        elif context["stockout_risk"]:
            status = "CRITICAL" if coverage_days < lead_time else "LOW"
        elif context["overstock_flag"]:
            status = "EXCESS"
        else:
            status = "NORMAL"
        context["stock_status"] = status

        self.log(f"Day {context.get('current_day','?')} | Stock:{stock:.0f} | Forecast:{forecast:.1f} | Status:{status}")
        return context
