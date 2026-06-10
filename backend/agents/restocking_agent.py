"""
restocking_agent.py  —  Agent 03
EOQ-based restocking decisions with adaptive bias correction.
"""

import sys, os, math
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from agents.base_agent import BaseAgent


class RestockingDecisionAgent(BaseAgent):
    """Agent 03: Makes optimal reorder decisions using EOQ + adaptive policy."""

    def __init__(self, ordering_cost: float = 50.0, holding_cost_rate: float = 2.0):
        super().__init__("RestockingDecisionAgent")
        self.ordering_cost     = ordering_cost
        self.holding_cost_rate = holding_cost_rate

    def _compute_eoq(self, annual_demand: float) -> float:
        if annual_demand <= 0:
            return 50.0
        return max(math.sqrt((2 * annual_demand * self.ordering_cost) / self.holding_cost_rate), 10.0)

    def _adaptive_quantity(self, eoq: float, context: dict) -> int:
        errors = context.get("forecast_error_history", [])
        if len(errors) < 5:
            return int(round(eoq))
        recent_bias = float(np.mean(errors[-10:]))
        adjustment_factor = 1.0 - max(-0.20, min(0.20, recent_bias * 0.5))
        adapted_qty = eoq * adjustment_factor + context.get("safety_stock", 0)
        return max(10, int(round(adapted_qty)))

    def run(self, context: dict) -> dict:
        self.run_count += 1

        if "total_ordering_cost" not in context:
            context["total_ordering_cost"] = 0.0
        if "total_holding_cost" not in context:
            context["total_holding_cost"]  = 0.0

        context["total_holding_cost"] += context.get("current_stock", 0) * self.holding_cost_rate / 365

        stockout_risk  = context.get("stockout_risk", False)
        overstock_flag = context.get("overstock_flag", False)
        stock_status   = context.get("stock_status", "NORMAL")
        forecast       = context.get("demand_forecast", 10.0)
        day            = context.get("current_day", 0)

        if overstock_flag or not stockout_risk:
            context["reorder_action"] = None
            self.log(f"Day {day} | No reorder. Status: {stock_status}")
            return context

        eoq = self._compute_eoq(forecast * 365)
        qty = self._adaptive_quantity(eoq, context)

        reason_parts = [f"Status={stock_status}"]
        if abs(context.get("forecast_error", 0)) > 0.1:
            reason_parts.append("adaptive-adj")
        if context.get("safety_stock", 0) > 0:
            reason_parts.append(f"safety={context['safety_stock']:.0f}")

        reorder = {
            "quantity":      qty,
            "eoq":           round(eoq, 1),
            "reason":        " | ".join(reason_parts),
            "trigger_day":   day,
            "arrive_day":    day + context.get("supplier_lead_time", 7),
            "ordering_cost": self.ordering_cost,
            "requires_approval": qty > 500  # Human-in-loop for very large orders
        }
        context["reorder_action"]       = reorder
        context["total_ordering_cost"] += self.ordering_cost

        self.log(f"Day {day} | REORDER | EOQ={eoq:.1f} -> Qty={qty} | Arrive day={reorder['arrive_day']}")
        return context
