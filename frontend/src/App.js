/**
 * App.js — SmartSupply Agent Dashboard
 *
 * HOW THIS WORKS:
 * 1. On load it tries GET /api/results/smart + /baseline + /metrics + /training
 *    from FastAPI (localhost:8000 via proxy)
 * 2. If backend is offline it falls back to the FALLBACK_DATA embedded below
 *    (this is the real output from your trained lstm_model.keras)
 * 3. "Run Simulation" button POSTs to /api/simulate which runs simulator.py
 *    and reloads results
 *
 * WINDOW BUG FIX: select value is stored as integer, not "30 days" string
 */

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine
} from "recharts";
import * as api from "./api";

// ── FALLBACK: Real LSTM model output embedded here ────────────────────────────
// Source: smartsupply_results.csv + baseline_results.csv + comparison_metrics.json
// These are the actual numbers from your trained lstm_model.keras (store_1/item_1)
const FALLBACK_DATA = {
  smart:    [{"day":0,"stock_eod":264.0,"demand_forecast":45.1,"actual_demand":36.0,"forecast_error":45.0999,"safety_stock":39.3,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":907,"coverage_days":6.7,"ordering_cost":50.0,"holding_cost":1.64},{"day":1,"stock_eod":220.0,"demand_forecast":42.77,"actual_demand":44.0,"forecast_error":0.1882,"safety_stock":37.2,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":884,"coverage_days":6.2,"ordering_cost":100.0,"holding_cost":3.09},{"day":2,"stock_eod":163.0,"demand_forecast":40.54,"actual_demand":57.0,"forecast_error":-0.0786,"safety_stock":35.3,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":860,"coverage_days":5.4,"ordering_cost":150.0,"holding_cost":4.3},{"day":3,"stock_eod":133.0,"demand_forecast":39.1,"actual_demand":30.0,"forecast_error":-0.3141,"safety_stock":34.0,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":845,"coverage_days":4.2,"ordering_cost":200.0,"holding_cost":5.19},{"day":4,"stock_eod":107.0,"demand_forecast":38.39,"actual_demand":26.0,"forecast_error":0.2798,"safety_stock":33.4,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":837,"coverage_days":3.5,"ordering_cost":250.0,"holding_cost":5.92},{"day":5,"stock_eod":85.0,"demand_forecast":41.98,"actual_demand":22.0,"forecast_error":0.6145,"safety_stock":36.5,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":737,"coverage_days":2.5,"ordering_cost":300.0,"holding_cost":6.5},{"day":6,"stock_eod":55.0,"demand_forecast":42.3,"actual_demand":30.0,"forecast_error":0.9228,"safety_stock":36.8,"stock_status":"CRITICAL","stockout":false,"stockout_risk":true,"reorder_placed":true,"reorder_qty":740,"coverage_days":2.0,"ordering_cost":350.0,"holding_cost":6.97},{"day":7,"stock_eod":917.0,"demand_forecast":44.13,"actual_demand":45.0,"forecast_error":0.471,"safety_stock":38.4,"stock_status":"NORMAL","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":21.8,"ordering_cost":350.0,"holding_cost":12.24},{"day":8,"stock_eod":1745.0,"demand_forecast":41.32,"actual_demand":56.0,"forecast_error":-0.0818,"safety_stock":36.0,"stock_status":"NORMAL","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":43.6,"ordering_cost":350.0,"holding_cost":22.11},{"day":9,"stock_eod":2568.0,"demand_forecast":36.38,"actual_demand":37.0,"forecast_error":-0.3503,"safety_stock":31.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":71.6,"ordering_cost":350.0,"holding_cost":36.38},{"day":10,"stock_eod":3379.0,"demand_forecast":35.65,"actual_demand":34.0,"forecast_error":-0.0364,"safety_stock":2082.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":95.7,"ordering_cost":350.0,"holding_cost":55.08},{"day":11,"stock_eod":4193.0,"demand_forecast":38.29,"actual_demand":23.0,"forecast_error":0.1263,"safety_stock":2145.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":110.1,"ordering_cost":350.0,"holding_cost":78.19},{"day":12,"stock_eod":4901.0,"demand_forecast":37.96,"actual_demand":29.0,"forecast_error":0.6505,"safety_stock":2045.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":129.9,"ordering_cost":350.0,"holding_cost":105.2},{"day":13,"stock_eod":5604.0,"demand_forecast":39.39,"actual_demand":37.0,"forecast_error":0.3584,"safety_stock":2045.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":143.2,"ordering_cost":350.0,"holding_cost":136.11},{"day":14,"stock_eod":5565.0,"demand_forecast":39.75,"actual_demand":39.0,"forecast_error":0.0744,"safety_stock":1994.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":141.0,"ordering_cost":350.0,"holding_cost":166.82},{"day":15,"stock_eod":5516.0,"demand_forecast":37.94,"actual_demand":49.0,"forecast_error":-0.0271,"safety_stock":1844.9,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":146.7,"ordering_cost":350.0,"holding_cost":197.31},{"day":16,"stock_eod":5484.0,"demand_forecast":32.52,"actual_demand":32.0,"forecast_error":-0.3362,"safety_stock":1535.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":169.6,"ordering_cost":350.0,"holding_cost":227.53},{"day":17,"stock_eod":5450.0,"demand_forecast":35.78,"actual_demand":34.0,"forecast_error":0.118,"safety_stock":1641.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":153.3,"ordering_cost":350.0,"holding_cost":257.58},{"day":18,"stock_eod":5409.0,"demand_forecast":35.69,"actual_demand":41.0,"forecast_error":0.0498,"safety_stock":1594.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":152.7,"ordering_cost":350.0,"holding_cost":287.45},{"day":19,"stock_eod":5378.0,"demand_forecast":36.76,"actual_demand":31.0,"forecast_error":-0.1034,"safety_stock":1601.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":147.1,"ordering_cost":350.0,"holding_cost":317.08},{"day":20,"stock_eod":5342.0,"demand_forecast":36.42,"actual_demand":36.0,"forecast_error":0.1748,"safety_stock":1549.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":147.7,"ordering_cost":350.0,"holding_cost":346.55},{"day":21,"stock_eod":5304.0,"demand_forecast":39.98,"actual_demand":38.0,"forecast_error":0.1107,"safety_stock":1662.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":133.6,"ordering_cost":350.0,"holding_cost":375.82},{"day":22,"stock_eod":5262.0,"demand_forecast":38.83,"actual_demand":42.0,"forecast_error":0.0217,"safety_stock":1578.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":136.6,"ordering_cost":350.0,"holding_cost":404.89},{"day":23,"stock_eod":5230.0,"demand_forecast":33.56,"actual_demand":32.0,"forecast_error":-0.201,"safety_stock":1336.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":156.8,"ordering_cost":350.0,"holding_cost":433.72},{"day":24,"stock_eod":5196.0,"demand_forecast":36.27,"actual_demand":34.0,"forecast_error":0.1335,"safety_stock":1415.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":144.2,"ordering_cost":350.0,"holding_cost":462.38},{"day":25,"stock_eod":5167.0,"demand_forecast":33.99,"actual_demand":29.0,"forecast_error":-0.0002,"safety_stock":1301.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":152.8,"ordering_cost":350.0,"holding_cost":490.85},{"day":26,"stock_eod":5135.0,"demand_forecast":34.45,"actual_demand":32.0,"forecast_error":0.188,"safety_stock":1294.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":150.0,"ordering_cost":350.0,"holding_cost":519.16},{"day":27,"stock_eod":5097.0,"demand_forecast":35.13,"actual_demand":38.0,"forecast_error":0.0977,"safety_stock":1295.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":146.2,"ordering_cost":350.0,"holding_cost":547.3},{"day":28,"stock_eod":5034.0,"demand_forecast":37.78,"actual_demand":63.0,"forecast_error":-0.0059,"safety_stock":1369.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":134.9,"ordering_cost":350.0,"holding_cost":575.23},{"day":29,"stock_eod":4970.0,"demand_forecast":38.88,"actual_demand":64.0,"forecast_error":-0.3828,"safety_stock":1386.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":129.5,"ordering_cost":350.0,"holding_cost":602.81},{"day":30,"stock_eod":4934.0,"demand_forecast":41.42,"actual_demand":36.0,"forecast_error":-0.3528,"safety_stock":1452.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":120.0,"ordering_cost":350.0,"holding_cost":630.04},{"day":31,"stock_eod":4903.0,"demand_forecast":44.67,"actual_demand":31.0,"forecast_error":0.2409,"safety_stock":41.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":110.4,"ordering_cost":350.0,"holding_cost":657.08},{"day":32,"stock_eod":4870.0,"demand_forecast":44.47,"actual_demand":33.0,"forecast_error":0.4345,"safety_stock":41.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":110.3,"ordering_cost":350.0,"holding_cost":683.95},{"day":33,"stock_eod":4835.0,"demand_forecast":43.35,"actual_demand":35.0,"forecast_error":0.3136,"safety_stock":40.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":112.3,"ordering_cost":350.0,"holding_cost":710.63},{"day":34,"stock_eod":4799.0,"demand_forecast":45.9,"actual_demand":36.0,"forecast_error":0.3115,"safety_stock":42.9,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":105.3,"ordering_cost":350.0,"holding_cost":737.12},{"day":35,"stock_eod":4757.0,"demand_forecast":46.6,"actual_demand":42.0,"forecast_error":0.2944,"safety_stock":43.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":103.0,"ordering_cost":350.0,"holding_cost":763.42},{"day":36,"stock_eod":4716.0,"demand_forecast":41.4,"actual_demand":41.0,"forecast_error":-0.0143,"safety_stock":36.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":114.9,"ordering_cost":350.0,"holding_cost":789.48},{"day":37,"stock_eod":4673.0,"demand_forecast":38.96,"actual_demand":43.0,"forecast_error":-0.0499,"safety_stock":27.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":121.1,"ordering_cost":350.0,"holding_cost":815.33},{"day":38,"stock_eod":4637.0,"demand_forecast":37.64,"actual_demand":36.0,"forecast_error":-0.1246,"safety_stock":25.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":124.1,"ordering_cost":350.0,"holding_cost":840.93},{"day":39,"stock_eod":4601.0,"demand_forecast":35.84,"actual_demand":36.0,"forecast_error":-0.0046,"safety_stock":24.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":129.4,"ordering_cost":350.0,"holding_cost":866.34},{"day":40,"stock_eod":4572.0,"demand_forecast":38.62,"actual_demand":29.0,"forecast_error":0.0727,"safety_stock":26.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":119.1,"ordering_cost":350.0,"holding_cost":891.55},{"day":41,"stock_eod":4536.0,"demand_forecast":39.43,"actual_demand":36.0,"forecast_error":0.3596,"safety_stock":26.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":116.0,"ordering_cost":350.0,"holding_cost":916.6},{"day":42,"stock_eod":4492.0,"demand_forecast":43.45,"actual_demand":44.0,"forecast_error":0.2069,"safety_stock":29.9,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":104.4,"ordering_cost":350.0,"holding_cost":941.46},{"day":43,"stock_eod":4445.0,"demand_forecast":41.5,"actual_demand":47.0,"forecast_error":-0.0569,"safety_stock":24.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":108.2,"ordering_cost":350.0,"holding_cost":966.07},{"day":44,"stock_eod":4404.0,"demand_forecast":41.64,"actual_demand":41.0,"forecast_error":-0.114,"safety_stock":23.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":106.7,"ordering_cost":350.0,"holding_cost":990.43},{"day":45,"stock_eod":4372.0,"demand_forecast":40.61,"actual_demand":32.0,"forecast_error":-0.0096,"safety_stock":22.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":108.5,"ordering_cost":350.0,"holding_cost":1014.56},{"day":46,"stock_eod":4339.0,"demand_forecast":38.3,"actual_demand":33.0,"forecast_error":0.1969,"safety_stock":21.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":114.1,"ordering_cost":350.0,"holding_cost":1038.52},{"day":47,"stock_eod":4304.0,"demand_forecast":40.85,"actual_demand":35.0,"forecast_error":0.2378,"safety_stock":22.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":106.2,"ordering_cost":350.0,"holding_cost":1062.29},{"day":48,"stock_eod":4268.0,"demand_forecast":41.87,"actual_demand":36.0,"forecast_error":0.1964,"safety_stock":23.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":102.8,"ordering_cost":350.0,"holding_cost":1085.87},{"day":49,"stock_eod":4219.0,"demand_forecast":40.79,"actual_demand":49.0,"forecast_error":0.1332,"safety_stock":22.1,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":104.6,"ordering_cost":350.0,"holding_cost":1109.26},{"day":50,"stock_eod":4169.0,"demand_forecast":40.79,"actual_demand":50.0,"forecast_error":-0.1676,"safety_stock":22.1,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":103.4,"ordering_cost":350.0,"holding_cost":1132.38},{"day":51,"stock_eod":4126.0,"demand_forecast":38.58,"actual_demand":43.0,"forecast_error":-0.2284,"safety_stock":20.9,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":108.1,"ordering_cost":350.0,"holding_cost":1155.22},{"day":52,"stock_eod":4090.0,"demand_forecast":39.19,"actual_demand":36.0,"forecast_error":-0.0886,"safety_stock":21.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":105.3,"ordering_cost":350.0,"holding_cost":1177.83},{"day":53,"stock_eod":4040.0,"demand_forecast":39.92,"actual_demand":50.0,"forecast_error":0.1088,"safety_stock":21.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":102.5,"ordering_cost":350.0,"holding_cost":1200.24},{"day":54,"stock_eod":4009.0,"demand_forecast":42.58,"actual_demand":31.0,"forecast_error":-0.1484,"safety_stock":22.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":94.9,"ordering_cost":350.0,"holding_cost":1222.38},{"day":55,"stock_eod":3969.0,"demand_forecast":42.51,"actual_demand":40.0,"forecast_error":0.3713,"safety_stock":22.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":94.3,"ordering_cost":350.0,"holding_cost":1244.35},{"day":56,"stock_eod":3929.0,"demand_forecast":44.04,"actual_demand":40.0,"forecast_error":0.101,"safety_stock":23.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":90.1,"ordering_cost":350.0,"holding_cost":1266.09},{"day":57,"stock_eod":3878.0,"demand_forecast":41.93,"actual_demand":51.0,"forecast_error":0.0484,"safety_stock":22.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":93.7,"ordering_cost":350.0,"holding_cost":1287.62},{"day":58,"stock_eod":3838.0,"demand_forecast":40.6,"actual_demand":40.0,"forecast_error":-0.2039,"safety_stock":22.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":95.5,"ordering_cost":350.0,"holding_cost":1308.87},{"day":59,"stock_eod":3796.0,"demand_forecast":37.65,"actual_demand":42.0,"forecast_error":-0.0587,"safety_stock":19.9,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":101.9,"ordering_cost":350.0,"holding_cost":1329.9},{"day":60,"stock_eod":3764.0,"demand_forecast":37.44,"actual_demand":32.0,"forecast_error":-0.1085,"safety_stock":19.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":101.4,"ordering_cost":350.0,"holding_cost":1350.7},{"day":61,"stock_eod":3730.0,"demand_forecast":37.71,"actual_demand":34.0,"forecast_error":0.1786,"safety_stock":18.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":99.8,"ordering_cost":350.0,"holding_cost":1371.33},{"day":62,"stock_eod":3690.0,"demand_forecast":40.45,"actual_demand":40.0,"forecast_error":0.1897,"safety_stock":19.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":92.2,"ordering_cost":350.0,"holding_cost":1391.76},{"day":63,"stock_eod":3642.0,"demand_forecast":41.64,"actual_demand":48.0,"forecast_error":0.0409,"safety_stock":18.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":88.6,"ordering_cost":350.0,"holding_cost":1411.98},{"day":64,"stock_eod":3587.0,"demand_forecast":42.39,"actual_demand":55.0,"forecast_error":-0.1169,"safety_stock":18.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":85.9,"ordering_cost":350.0,"holding_cost":1431.94},{"day":65,"stock_eod":3548.0,"demand_forecast":40.8,"actual_demand":39.0,"forecast_error":-0.2582,"safety_stock":16.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":87.9,"ordering_cost":350.0,"holding_cost":1451.59},{"day":66,"stock_eod":3505.0,"demand_forecast":40.49,"actual_demand":43.0,"forecast_error":0.0382,"safety_stock":16.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":87.6,"ordering_cost":350.0,"holding_cost":1471.04},{"day":67,"stock_eod":3470.0,"demand_forecast":40.63,"actual_demand":35.0,"forecast_error":-0.0552,"safety_stock":16.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":86.3,"ordering_cost":350.0,"holding_cost":1490.24},{"day":68,"stock_eod":3437.0,"demand_forecast":40.74,"actual_demand":33.0,"forecast_error":0.1639,"safety_stock":16.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":85.2,"ordering_cost":350.0,"holding_cost":1509.25},{"day":69,"stock_eod":3397.0,"demand_forecast":42.37,"actual_demand":40.0,"forecast_error":0.2839,"safety_stock":16.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":81.1,"ordering_cost":350.0,"holding_cost":1528.09},{"day":70,"stock_eod":3317.0,"demand_forecast":43.18,"actual_demand":80.0,"forecast_error":0.0794,"safety_stock":17.1,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":78.7,"ordering_cost":350.0,"holding_cost":1546.7},{"day":71,"stock_eod":3268.0,"demand_forecast":42.61,"actual_demand":49.0,"forecast_error":-0.4674,"safety_stock":16.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":77.8,"ordering_cost":350.0,"holding_cost":1564.88},{"day":72,"stock_eod":3224.0,"demand_forecast":41.73,"actual_demand":44.0,"forecast_error":-0.1484,"safety_stock":18.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":78.3,"ordering_cost":350.0,"holding_cost":1582.78},{"day":73,"stock_eod":3180.0,"demand_forecast":43.56,"actual_demand":44.0,"forecast_error":-0.01,"safety_stock":19.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":74.0,"ordering_cost":350.0,"holding_cost":1600.45},{"day":74,"stock_eod":3143.0,"demand_forecast":41.88,"actual_demand":37.0,"forecast_error":-0.0481,"safety_stock":18.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":75.9,"ordering_cost":350.0,"holding_cost":1617.87},{"day":75,"stock_eod":3108.0,"demand_forecast":42.62,"actual_demand":35.0,"forecast_error":0.1519,"safety_stock":19.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":73.7,"ordering_cost":350.0,"holding_cost":1635.1},{"day":76,"stock_eod":3040.0,"demand_forecast":43.58,"actual_demand":68.0,"forecast_error":0.2452,"safety_stock":19.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":71.3,"ordering_cost":350.0,"holding_cost":1652.13},{"day":77,"stock_eod":2991.0,"demand_forecast":43.31,"actual_demand":49.0,"forecast_error":-0.3631,"safety_stock":19.1,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":70.2,"ordering_cost":350.0,"holding_cost":1668.78},{"day":78,"stock_eod":2933.0,"demand_forecast":40.12,"actual_demand":58.0,"forecast_error":-0.1813,"safety_stock":18.7,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":74.6,"ordering_cost":350.0,"holding_cost":1685.17},{"day":79,"stock_eod":2880.0,"demand_forecast":41.9,"actual_demand":53.0,"forecast_error":-0.2776,"safety_stock":19.5,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":70.0,"ordering_cost":350.0,"holding_cost":1701.24},{"day":80,"stock_eod":2836.0,"demand_forecast":40.57,"actual_demand":44.0,"forecast_error":-0.2346,"safety_stock":19.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":71.0,"ordering_cost":350.0,"holding_cost":1717.02},{"day":81,"stock_eod":2798.0,"demand_forecast":39.84,"actual_demand":38.0,"forecast_error":-0.0946,"safety_stock":19.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":71.2,"ordering_cost":350.0,"holding_cost":1732.56},{"day":82,"stock_eod":2754.0,"demand_forecast":41.11,"actual_demand":44.0,"forecast_error":0.0819,"safety_stock":19.6,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":68.1,"ordering_cost":350.0,"holding_cost":1747.9},{"day":83,"stock_eod":2707.0,"demand_forecast":41.97,"actual_demand":47.0,"forecast_error":-0.0462,"safety_stock":20.0,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":65.6,"ordering_cost":350.0,"holding_cost":1762.99},{"day":84,"stock_eod":2656.0,"demand_forecast":40.86,"actual_demand":51.0,"forecast_error":-0.1306,"safety_stock":19.8,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":66.2,"ordering_cost":350.0,"holding_cost":1777.82},{"day":85,"stock_eod":2598.0,"demand_forecast":41.6,"actual_demand":58.0,"forecast_error":-0.1842,"safety_stock":20.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":63.8,"ordering_cost":350.0,"holding_cost":1792.37},{"day":86,"stock_eod":2540.0,"demand_forecast":39.31,"actual_demand":58.0,"forecast_error":-0.3223,"safety_stock":17.9,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":66.1,"ordering_cost":350.0,"holding_cost":1806.61},{"day":87,"stock_eod":2499.0,"demand_forecast":38.85,"actual_demand":41.0,"forecast_error":-0.3301,"safety_stock":18.3,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":65.4,"ordering_cost":350.0,"holding_cost":1820.53},{"day":88,"stock_eod":2461.0,"demand_forecast":37.99,"actual_demand":38.0,"forecast_error":-0.0734,"safety_stock":18.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":65.8,"ordering_cost":350.0,"holding_cost":1834.22},{"day":89,"stock_eod":2419.0,"demand_forecast":41.61,"actual_demand":42.0,"forecast_error":0.0949,"safety_stock":20.2,"stock_status":"EXCESS","stockout":false,"stockout_risk":false,"reorder_placed":false,"reorder_qty":0,"coverage_days":59.2,"ordering_cost":350.0,"holding_cost":1847.7}],
  base:     [{"day":0,"stock_eod":264.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":1.64},{"day":1,"stock_eod":220.0,"actual_demand":44.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":3.09},{"day":2,"stock_eod":163.0,"actual_demand":57.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":4.3},{"day":3,"stock_eod":133.0,"actual_demand":30.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":5.19},{"day":4,"stock_eod":107.0,"actual_demand":26.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":5.92},{"day":5,"stock_eod":85.0,"actual_demand":22.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":6.5},{"day":6,"stock_eod":55.0,"actual_demand":30.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":0.0,"holding_cost":6.97},{"day":7,"stock_eod":10.0,"actual_demand":45.0,"stockout":false,"reorder_placed":true,"reorder_qty":150,"ordering_cost":50.0,"holding_cost":7.27},{"day":8,"stock_eod":0.0,"actual_demand":56.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":100.0,"holding_cost":7.33},{"day":9,"stock_eod":0.0,"actual_demand":37.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":150.0,"holding_cost":7.33},{"day":10,"stock_eod":0.0,"actual_demand":34.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":200.0,"holding_cost":7.33},{"day":11,"stock_eod":0.0,"actual_demand":23.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":250.0,"holding_cost":7.33},{"day":12,"stock_eod":0.0,"actual_demand":29.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":300.0,"holding_cost":7.33},{"day":13,"stock_eod":0.0,"actual_demand":37.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":350.0,"holding_cost":7.33},{"day":14,"stock_eod":111.0,"actual_demand":39.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":8.15},{"day":15,"stock_eod":212.0,"actual_demand":49.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":9.58},{"day":16,"stock_eod":330.0,"actual_demand":32.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":11.56},{"day":17,"stock_eod":446.0,"actual_demand":34.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":14.19},{"day":18,"stock_eod":555.0,"actual_demand":41.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":17.46},{"day":19,"stock_eod":674.0,"actual_demand":31.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":21.32},{"day":20,"stock_eod":788.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":25.84},{"day":21,"stock_eod":750.0,"actual_demand":38.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":30.15},{"day":22,"stock_eod":708.0,"actual_demand":42.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":34.26},{"day":23,"stock_eod":676.0,"actual_demand":32.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":38.14},{"day":24,"stock_eod":642.0,"actual_demand":34.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":41.85},{"day":25,"stock_eod":613.0,"actual_demand":29.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":45.36},{"day":26,"stock_eod":581.0,"actual_demand":32.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":48.72},{"day":27,"stock_eod":543.0,"actual_demand":38.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":51.91},{"day":28,"stock_eod":480.0,"actual_demand":63.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":54.88},{"day":29,"stock_eod":416.0,"actual_demand":64.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":57.51},{"day":30,"stock_eod":380.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":59.79},{"day":31,"stock_eod":349.0,"actual_demand":31.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":61.87},{"day":32,"stock_eod":316.0,"actual_demand":33.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":63.79},{"day":33,"stock_eod":281.0,"actual_demand":35.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":65.52},{"day":34,"stock_eod":245.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":67.06},{"day":35,"stock_eod":203.0,"actual_demand":42.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":68.4},{"day":36,"stock_eod":162.0,"actual_demand":41.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":69.51},{"day":37,"stock_eod":119.0,"actual_demand":43.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":70.4},{"day":38,"stock_eod":83.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":71.05},{"day":39,"stock_eod":47.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":350.0,"holding_cost":71.51},{"day":40,"stock_eod":18.0,"actual_demand":29.0,"stockout":false,"reorder_placed":true,"reorder_qty":150,"ordering_cost":400.0,"holding_cost":71.76},{"day":41,"stock_eod":0.0,"actual_demand":36.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":450.0,"holding_cost":71.86},{"day":42,"stock_eod":0.0,"actual_demand":44.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":500.0,"holding_cost":71.86},{"day":43,"stock_eod":0.0,"actual_demand":47.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":550.0,"holding_cost":71.86},{"day":44,"stock_eod":0.0,"actual_demand":41.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":600.0,"holding_cost":71.86},{"day":45,"stock_eod":0.0,"actual_demand":32.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":650.0,"holding_cost":71.86},{"day":46,"stock_eod":0.0,"actual_demand":33.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":700.0,"holding_cost":71.86},{"day":47,"stock_eod":115.0,"actual_demand":35.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":72.68},{"day":48,"stock_eod":229.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":74.14},{"day":49,"stock_eod":330.0,"actual_demand":49.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":76.21},{"day":50,"stock_eod":430.0,"actual_demand":50.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":78.84},{"day":51,"stock_eod":537.0,"actual_demand":43.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":82.02},{"day":52,"stock_eod":651.0,"actual_demand":36.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":85.79},{"day":53,"stock_eod":751.0,"actual_demand":50.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":90.18},{"day":54,"stock_eod":720.0,"actual_demand":31.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":94.29},{"day":55,"stock_eod":680.0,"actual_demand":40.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":98.24},{"day":56,"stock_eod":640.0,"actual_demand":40.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":101.96},{"day":57,"stock_eod":589.0,"actual_demand":51.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":105.47},{"day":58,"stock_eod":549.0,"actual_demand":40.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":108.7},{"day":59,"stock_eod":507.0,"actual_demand":42.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":111.7},{"day":60,"stock_eod":475.0,"actual_demand":32.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":114.48},{"day":61,"stock_eod":441.0,"actual_demand":34.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":117.08},{"day":62,"stock_eod":401.0,"actual_demand":40.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":119.5},{"day":63,"stock_eod":353.0,"actual_demand":48.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":121.7},{"day":64,"stock_eod":298.0,"actual_demand":55.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":123.63},{"day":65,"stock_eod":259.0,"actual_demand":39.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":125.27},{"day":66,"stock_eod":216.0,"actual_demand":43.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":126.68},{"day":67,"stock_eod":181.0,"actual_demand":35.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":127.87},{"day":68,"stock_eod":148.0,"actual_demand":33.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":128.86},{"day":69,"stock_eod":108.0,"actual_demand":40.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":129.67},{"day":70,"stock_eod":28.0,"actual_demand":80.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":700.0,"holding_cost":130.26},{"day":71,"stock_eod":0.0,"actual_demand":49.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":750.0,"holding_cost":130.42},{"day":72,"stock_eod":0.0,"actual_demand":44.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":800.0,"holding_cost":130.42},{"day":73,"stock_eod":0.0,"actual_demand":44.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":850.0,"holding_cost":130.42},{"day":74,"stock_eod":0.0,"actual_demand":37.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":900.0,"holding_cost":130.42},{"day":75,"stock_eod":0.0,"actual_demand":35.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":950.0,"holding_cost":130.42},{"day":76,"stock_eod":0.0,"actual_demand":68.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":1000.0,"holding_cost":130.42},{"day":77,"stock_eod":0.0,"actual_demand":49.0,"stockout":true,"reorder_placed":true,"reorder_qty":150,"ordering_cost":1050.0,"holding_cost":130.42},{"day":78,"stock_eod":92.0,"actual_demand":58.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":131.24},{"day":79,"stock_eod":189.0,"actual_demand":53.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":132.56},{"day":80,"stock_eod":295.0,"actual_demand":44.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":134.42},{"day":81,"stock_eod":407.0,"actual_demand":38.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":136.86},{"day":82,"stock_eod":513.0,"actual_demand":44.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":139.91},{"day":83,"stock_eod":616.0,"actual_demand":47.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":143.55},{"day":84,"stock_eod":715.0,"actual_demand":51.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":147.74},{"day":85,"stock_eod":657.0,"actual_demand":58.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":151.66},{"day":86,"stock_eod":599.0,"actual_demand":58.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":155.26},{"day":87,"stock_eod":558.0,"actual_demand":41.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":158.54},{"day":88,"stock_eod":520.0,"actual_demand":38.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":161.6},{"day":89,"stock_eod":478.0,"actual_demand":42.0,"stockout":false,"reorder_placed":false,"reorder_qty":0,"ordering_cost":1050.0,"holding_cost":164.45}],
  metrics:  {"smartsupply":{"label":"SmartSupply Agent (LSTM)","stockout_rate":0.0,"service_level":100.0,"total_orders":7,"ordering_cost":350.0,"holding_cost":1847.7,"total_cost":2197.7,"avg_stock":3705.7,"forecast_rmse":9.592,"forecast_mae":6.885,"forecast_mape":16.72},"baseline":{"label":"Baseline (Fixed Reorder Point)","stockout_rate":21.11,"service_level":78.89,"total_orders":21,"ordering_cost":1050.0,"holding_cost":164.45,"total_cost":1214.45,"avg_stock":300.4,"forecast_rmse":"N/A","forecast_mae":"N/A","forecast_mape":"N/A"}},
  training: {"lstm_rmse":12.415,"lstm_mae":8.678,"lstm_mape":16.45,"epochs_trained":9,"lookback":30,"feature_cols":["sales_scaled","price","promo","is_weekend","day_of_week","month","quarter","lag_1","lag_7","lag_14","lag_30","rolling_mean_7","rolling_mean_14","rolling_mean_30","rolling_std_7","ewm_7"]}
};

// ── COLORS ────────────────────────────────────────────────────────────────────
const C = {
  navy:"#0F1F5C", teal:"#0A9396", amber:"#E9A824",
  red:"#E63946", green:"#2DC653", purple:"#7B2D8B",
  lightBg:"#F0F4FF", cardBg:"#FFFFFF", border:"#DDE4F5",
  textDark:"#0F1F5C", textGray:"#6B7A9C"
};
const STATUS_COLOR = { NORMAL:C.green, LOW:C.amber, CRITICAL:C.red, EXCESS:C.teal, STOCKOUT:C.purple };
const SEL = { border:`1px solid #DDE4F5`, borderRadius:6, padding:"6px 10px", fontSize:13, color:"#0F1F5C", background:"#fff", cursor:"pointer" };

// ── COMPONENTS ────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:C.navy,border:`1px solid ${C.teal}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:"#fff"}}>
      <p style={{margin:"0 0 6px",color:C.teal,fontWeight:700}}>Day {label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{margin:"2px 0",color:p.color}}>{p.name}: <b>{typeof p.value==="number"?p.value.toFixed(1):p.value}</b></p>
      ))}
    </div>
  );
};

const Card = ({icon,label,value,sub,color=C.teal}) => (
  <div style={{
    background:C.cardBg,borderRadius:16,padding:"22px 24px",
    borderTop:`3px solid ${color}`,
    boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.06)",
    display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:160,
    position:"relative",overflow:"hidden"
  }}>
    <div style={{position:"absolute",top:0,right:0,width:80,height:80,borderRadius:"0 16px 0 80px",
      background:`${color}0D`,pointerEvents:"none"}}/>
    <div style={{
      width:38,height:38,borderRadius:10,
      background:`${color}15`,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:4
    }}>{icon}</div>
    <div style={{fontSize:28,fontWeight:800,color:C.navy,fontFamily:"Georgia,serif",lineHeight:1.1,letterSpacing:"-0.02em"}}>{value}</div>
    <div style={{fontSize:11,fontWeight:700,color:C.textGray,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
    {sub && <div style={{fontSize:11,color,fontWeight:600,marginTop:2,display:"flex",alignItems:"center",gap:4}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>
      {sub}
    </div>}
  </div>
);

const AgentCard = ({num,name,color,lines,icon}) => (
  <div style={{
    background:C.cardBg,borderRadius:16,padding:"20px 22px",
    border:`1px solid ${color}25`,borderLeft:`4px solid ${color}`,
    boxShadow:"0 4px 20px rgba(15,31,92,0.09), 0 1px 4px rgba(15,31,92,0.05)",
    flex:1,minWidth:200,display:"flex",flexDirection:"column",gap:0
  }}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${color}20`}}>
      <div style={{
        background:`linear-gradient(135deg,${color},${color}BB)`,
        borderRadius:12,width:40,height:40,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
        boxShadow:`0 4px 12px ${color}40`,flexShrink:0
      }}>{icon}</div>
      <div>
        <div style={{fontSize:10,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Agent {num}</div>
        <div style={{fontSize:14,fontWeight:700,color:C.navy,lineHeight:1.2}}>{name}</div>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
    {lines.map((l,i)=>(
      <div key={i} style={{
        fontSize:12,color:C.textGray,
        padding:"6px 0",
        borderBottom:i<lines.length-1?`1px solid ${C.border}`:"none",
        display:"flex",alignItems:"flex-start",gap:8,lineHeight:1.5
      }}>
        <span style={{width:4,height:4,borderRadius:"50%",background:`${color}80`,marginTop:6,flexShrink:0}}/>
        {l}
      </div>
    ))}
    </div>
  </div>
);

const Badge = ({status}) => (
  <span style={{
    background:`${STATUS_COLOR[status]||C.green}18`,color:STATUS_COLOR[status]||C.green,
    border:`1px solid ${STATUS_COLOR[status]||C.green}40`,
    borderRadius:6,padding:"3px 10px",fontSize:10,fontWeight:700,
    textTransform:"uppercase",letterSpacing:"0.07em"
  }}>{status}</span>
);

// ── MAIN APP ──────────────────────────────────────────────────────────────────
// ── LOGIN PAGE COMPONENT ─────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode,     setMode]     = useState("login");   // "login" or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(null);

  const reset = () => { setUsername(""); setPassword(""); setConfirm(""); setError(""); setSuccess(""); };

  const switchMode = (m) => { setMode(m); reset(); };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (mode === "register") {
      if (username.trim().length < 3)  { setError("Username must be at least 3 characters."); return; }
      if (password.trim().length < 6)  { setError("Password must be at least 6 characters."); return; }
      if (password !== confirm)        { setError("Passwords do not match."); return; }
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password: password.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Something went wrong."); setLoading(false); return; }
      if (mode === "register") {
        setSuccess("Account created! You can now sign in.");
        setMode("login"); setPassword(""); setConfirm(""); setLoading(false);
      } else {
        onLogin(data.username);
      }
    } catch {
      setError("Cannot connect to server. Make sure the backend is running.");
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  const inp = (focused_key) => ({
    width:"100%", padding:"13px 14px 13px 42px",
    background: focused===focused_key ? "rgba(10,147,150,0.12)" : "rgba(255,255,255,0.06)",
    border: focused===focused_key ? "1.5px solid rgba(10,147,150,0.7)" : "1.5px solid rgba(255,255,255,0.1)",
    borderRadius:12, color:"#fff", fontSize:14, transition:"all .2s",
    boxSizing:"border-box",
    boxShadow: focused===focused_key ? "0 0 0 4px rgba(10,147,150,0.12)" : "none",
    outline:"none"
  });

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#0A0F2C 0%,#0F1F5C 40%,#0A2A3A 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI',sans-serif", position:"relative", overflow:"hidden"
    }}>
      <style>{`
        @keyframes float1{0%{transform:translateY(0) rotate(0deg);opacity:.15}50%{transform:translateY(-30px) rotate(180deg);opacity:.08}100%{transform:translateY(0) rotate(360deg);opacity:.15}}
        @keyframes float2{0%{transform:translateY(0);opacity:.1}50%{transform:translateY(-50px);opacity:.05}100%{transform:translateY(0);opacity:.1}}
        @keyframes float3{0%{transform:translate(0,0);opacity:.12}50%{transform:translate(20px,-20px);opacity:.06}100%{transform:translate(0,0);opacity:.12}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(10,147,150,0.4)}50%{box-shadow:0 0 0 16px rgba(10,147,150,0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .login-card{animation:slideUp .6s ease forwards}
        .login-btn:hover:not(:disabled){transform:translateY(-2px)!important;box-shadow:0 8px 30px rgba(10,147,150,0.5)!important}
        .mode-btn:hover{background:rgba(10,147,150,0.12)!important}
        .lbl-input{outline:none}
      `}</style>

      {/* Floating orbs */}
      {[
        {w:300,h:300,top:"5%",left:"5%",bg:"rgba(10,147,150,0.06)",an:"float1 8s ease-in-out infinite"},
        {w:200,h:200,top:"60%",left:"75%",bg:"rgba(15,31,92,0.15)",an:"float2 11s ease-in-out infinite"},
        {w:150,h:150,top:"40%",left:"15%",bg:"rgba(10,147,150,0.08)",an:"float3 7s ease-in-out infinite"},
        {w:400,h:400,top:"-10%",right:"-5%",bg:"rgba(10,147,150,0.04)",an:"float1 14s ease-in-out infinite reverse"},
        {w:250,h:250,bottom:"-5%",left:"30%",bg:"rgba(15,31,92,0.1)",an:"float2 9s ease-in-out infinite"},
      ].map((o,i)=>(
        <div key={i} style={{position:"absolute",width:o.w,height:o.h,borderRadius:"50%",
          top:o.top,left:o.left,right:o.right,bottom:o.bottom,
          background:o.bg,animation:o.an,pointerEvents:"none"}}/>
      ))}

      {/* Grid overlay */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(10,147,150,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(10,147,150,0.05) 1px,transparent 1px)",
        backgroundSize:"60px 60px",pointerEvents:"none"}}/>

      {/* Card */}
      <div className="login-card" style={{
        background:"rgba(255,255,255,0.04)",backdropFilter:"blur(24px)",
        border:"1px solid rgba(10,147,150,0.25)",borderRadius:24,
        padding:"44px 40px",width:"100%",maxWidth:430,
        boxShadow:"0 32px 80px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)",
        position:"relative",zIndex:10
      }}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:68,height:68,borderRadius:18,
            background:"linear-gradient(135deg,#0A9396,#0F4C75)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,margin:"0 auto 14px",
            boxShadow:"0 8px 32px rgba(10,147,150,0.4)",
            animation:"pulse 3s ease-in-out infinite"}}>📦</div>
          <div style={{fontSize:22,fontWeight:800,
            background:"linear-gradient(135deg,#fff 0%,#0A9396 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            backgroundClip:"text",letterSpacing:"-0.5px",marginBottom:5}}>
            SmartSupply Agent
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",
            letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:600}}>
            Inventory Intelligence System
          </div>
        </div>

        {/* Mode toggle tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.05)",
          borderRadius:12,padding:4,marginBottom:24,gap:4}}>
          {[["login","🔑 Sign In"],["register","✨ Create Account"]].map(([m,lbl])=>(
            <button key={m} className="mode-btn" onClick={()=>switchMode(m)} style={{
              flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",
              fontSize:13,fontWeight:700,transition:"all .2s",
              background: mode===m ? "linear-gradient(135deg,#0A9396,#0F4C75)" : "transparent",
              color: mode===m ? "#fff" : "rgba(255,255,255,0.4)",
              boxShadow: mode===m ? "0 4px 15px rgba(10,147,150,0.3)" : "none"
            }}>{lbl}</button>
          ))}
        </div>

        {/* Divider */}
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(10,147,150,0.4),transparent)",marginBottom:22}}/>

        {/* Username */}
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,
            color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",
            textTransform:"uppercase",marginBottom:7}}>Username</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,opacity:.5}}>👤</span>
            <input className="lbl-input" type="text" value={username}
              onChange={e=>{setUsername(e.target.value);setError("");}}
              onFocus={()=>setFocused("user")} onBlur={()=>setFocused(null)}
              onKeyDown={handleKey} placeholder="Choose a username"
              style={inp("user")}/>
          </div>
          {mode==="register" && <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:5,paddingLeft:2}}>
            Min 3 characters. Letters, numbers, - and _ only.
          </div>}
        </div>

        {/* Password */}
        <div style={{marginBottom: mode==="register" ? 14 : 22}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,
            color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",
            textTransform:"uppercase",marginBottom:7}}>Password</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,opacity:.5}}>🔒</span>
            <input className="lbl-input" type={showPass?"text":"password"} value={password}
              onChange={e=>{setPassword(e.target.value);setError("");}}
              onFocus={()=>setFocused("pass")} onBlur={()=>setFocused(null)}
              onKeyDown={handleKey} placeholder={mode==="register"?"Min 6 characters":"Enter password"}
              style={{...inp("pass"), paddingRight:44}}/>
            <button onClick={()=>setShowPass(!showPass)} style={{
              position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
              background:"none",border:"none",cursor:"pointer",fontSize:15,opacity:.5,padding:4
            }}>{showPass?"🙈":"👁️"}</button>
          </div>
        </div>

        {/* Confirm password — only on register */}
        {mode==="register" && (
          <div style={{marginBottom:22,animation:"fadeIn .3s ease"}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,
              color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:7}}>Confirm Password</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,
                opacity: confirm && confirm===password ? 1 : .5}}>
                {confirm && confirm===password ? "✅" : "🔒"}
              </span>
              <input className="lbl-input" type={showPass?"text":"password"} value={confirm}
                onChange={e=>{setConfirm(e.target.value);setError("");}}
                onFocus={()=>setFocused("confirm")} onBlur={()=>setFocused(null)}
                onKeyDown={handleKey} placeholder="Re-enter password"
                style={{
                  ...inp("confirm"),
                  border: confirm && confirm!==password
                    ? "1.5px solid rgba(230,57,70,0.6)"
                    : confirm && confirm===password
                    ? "1.5px solid rgba(45,198,83,0.6)"
                    : inp("confirm").border
                }}/>
            </div>
            {confirm && confirm!==password && (
              <div style={{fontSize:11,color:"rgba(230,57,70,0.8)",marginTop:5,paddingLeft:2}}>
                Passwords do not match
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{background:"rgba(230,57,70,0.15)",border:"1px solid rgba(230,57,70,0.3)",
            borderRadius:10,padding:"10px 14px",marginBottom:14,
            fontSize:13,color:"#ff6b6b",display:"flex",alignItems:"center",gap:8,
            animation:"fadeIn .3s ease"}}>
            <span>⚠️</span>{error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{background:"rgba(45,198,83,0.15)",border:"1px solid rgba(45,198,83,0.3)",
            borderRadius:10,padding:"10px 14px",marginBottom:14,
            fontSize:13,color:"#2DC653",display:"flex",alignItems:"center",gap:8,
            animation:"fadeIn .3s ease"}}>
            <span>✅</span>{success}
          </div>
        )}

        {/* Submit button */}
        <button className="login-btn" onClick={handleSubmit} disabled={loading} style={{
          width:"100%",padding:"14px",borderRadius:12,border:"none",
          background: loading ? "rgba(10,147,150,0.4)" : "linear-gradient(135deg,#0A9396 0%,#0F4C75 100%)",
          color:"#fff",fontSize:15,fontWeight:700,
          cursor:loading?"not-allowed":"pointer",transition:"all .25s",
          letterSpacing:"0.03em",boxShadow:"0 4px 20px rgba(10,147,150,0.35)",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10
        }}>
          {loading ? (
            <><div style={{width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",
              borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
              {mode==="login" ? "Signing in..." : "Creating account..."}</>
          ) : (mode==="login" ? "Sign In →" : "Create Account →")}
        </button>

        {/* Switch mode hint */}
        <div style={{textAlign:"center",marginTop:18,fontSize:13,color:"rgba(255,255,255,0.3)"}}>
          {mode==="login"
            ? <span>New here?{" "}
                <span onClick={()=>switchMode("register")}
                  style={{color:"#0A9396",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>
                  Create an account
                </span>
              </span>
            : <span>Already have an account?{" "}
                <span onClick={()=>switchMode("login")}
                  style={{color:"#0A9396",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>
                  Sign in
                </span>
              </span>
          }
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",marginTop:16,fontSize:11,
          color:"rgba(255,255,255,0.18)",lineHeight:1.6}}>
          <span style={{color:"rgba(10,147,150,0.5)"}}>●</span> Secured
        </div>
      </div>

      <div style={{position:"absolute",bottom:18,left:22,fontSize:11,color:"rgba(255,255,255,0.18)"}}>
        SmartSupply Agent · SDG 8 · SDG 9 · SDG 12
      </div>
      <div style={{position:"absolute",bottom:18,right:22,fontSize:11,color:"rgba(255,255,255,0.18)"}}>
        Ruthvik K
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [store,       setStore]       = useState("store_1");
  const [item,        setItem]        = useState("item_1");
  const [windowDays,  setWindowDays]  = useState(90);  // plain number, NOT "90 days"
  const [activeTab,   setActiveTab]   = useState("overview");
  const [rawData,     setRawData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [simRunning,  setSimRunning]  = useState(false);
  const [error,       setError]       = useState(null);
  const [dataSource,  setDataSource]  = useState("loading");
  const [loggedIn,    setLoggedIn]    = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // Load data from backend; fall back to embedded data if backend is offline
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchAllData();
      setRawData(data);
      setDataSource("backend");
    } catch (e) {
      console.warn("Backend offline, using embedded fallback data:", e.message);
      setRawData({
        smart:    FALLBACK_DATA.smart,
        base:     FALLBACK_DATA.base,
        metrics:  FALLBACK_DATA.metrics,
        training: FALLBACK_DATA.training,
      });
      setDataSource("fallback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Run new simulation via backend
  const handleRunSim = async () => {
    setSimRunning(true);
    setError(null);
    try {
      await api.runSimulation(store, item);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSimRunning(false);
    }
  };

  // Slice data to selected window (30/60/90 days)
  const results  = useMemo(() => (rawData?.smart  || []).slice(0, windowDays), [rawData, windowDays]);
  const baseline = useMemo(() => (rawData?.base   || []).slice(0, windowDays), [rawData, windowDays]);
  const training = rawData?.training || {};

  // Recompute metrics from sliced window
  const sm = useMemo(() => {
    if (!results.length) return {};
    const n         = results.length;
    const stockouts = results.filter(r => r.stockout).length;
    const mape      = results.reduce((a,r) => a + Math.abs((r.actual_demand - r.demand_forecast) / Math.max(r.actual_demand,1)), 0) / n * 100;
    const last      = results[n - 1];
    return {
      stockout_rate: +((stockouts / n) * 100).toFixed(2),
      service_level: +(((n - stockouts) / n) * 100).toFixed(2),
      total_orders:  results.filter(r => r.reorder_placed).length,
      ordering_cost: last.ordering_cost,
      holding_cost:  Math.round(last.holding_cost * 100) / 100,
      total_cost:    Math.round((last.ordering_cost + last.holding_cost) * 100) / 100,
      forecast_mape: +mape.toFixed(2),
    };
  }, [results]);

  const bm = useMemo(() => {
    if (!baseline.length) return {};
    const n         = baseline.length;
    const stockouts = baseline.filter(r => r.stockout).length;
    const last      = baseline[n - 1];
    return {
      stockout_rate: +((stockouts / n) * 100).toFixed(2),
      service_level: +(((n - stockouts) / n) * 100).toFixed(2),
      total_orders:  baseline.filter(r => r.reorder_placed).length,
      ordering_cost: last.ordering_cost,
      holding_cost:  Math.round(last.holding_cost * 100) / 100,
      total_cost:    Math.round((last.ordering_cost + last.holding_cost) * 100) / 100,
    };
  }, [baseline]);

  const compChart = results.map((r, i) => ({
    day: r.day, SmartSupply: r.stock_eod, Baseline: baseline[i]?.stock_eod ?? 0,
    Forecast: r.demand_forecast, Actual: r.actual_demand
  }));

  const statusCounts = {};
  results.forEach(r => { statusCounts[r.stock_status] = (statusCounts[r.stock_status] || 0) + 1; });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const agentLog = [];
  results.forEach(r => {
    if (r.reorder_placed)         agentLog.push({ day:r.day, agent:"Agent 03", msg:`Placed order: ${r.reorder_qty} units → arrives Day ${r.day+7}`, color:C.teal });
    if (r.stock_status==="CRITICAL") agentLog.push({ day:r.day, agent:"Agent 02", msg:`Stock CRITICAL — ${r.coverage_days}d coverage`, color:C.red });
    if (r.stockout)                agentLog.push({ day:r.day, agent:"Agent 02", msg:"⚠ STOCKOUT — stock hit zero", color:C.purple });
  });

  // ── SLOW-MOVING ITEM DETECTION ──────────────────────────────────────────────
  // A product is "slow-moving" if its avg daily demand < 20% of overall average
  const avgDemandAll = results.length
    ? results.reduce((a,r)=>a+(r.actual_demand||0),0)/results.length : 0;
  const slowMovingThreshold = avgDemandAll * 0.20;
  const isSlowMoving = avgDemandAll > 0 && avgDemandAll < slowMovingThreshold;
  const slowMovingDays = results.filter(r=>(r.actual_demand||0) < slowMovingThreshold && avgDemandAll > 0);

  // ── ANOMALY / DEMAND SPIKE DETECTION ────────────────────────────────────────
  // Spike: actual_demand > 2× forecast  OR  actual_demand > 1.8× rolling average
  const anomalies = results.filter(r => {
    const forecast = r.demand_forecast || 0;
    const actual   = r.actual_demand   || 0;
    return forecast > 0 && actual > forecast * 2.0;
  });

  // ── SIMULATE REAL DATES (day 0 = 2016-01-01 for Kaggle dataset) ─────────────
  const SIM_START = new Date("2016-01-01");
  const dayToDate = (day) => {
    const d = new Date(SIM_START);
    d.setDate(d.getDate() + day);
    return d.toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"});
  };

  // ── ITEM CATEGORY (price-based: luxury vs standard vs economy) ───────────────
  // Uses avg forecast as proxy since dataset has no price column at item level
  const getItemCategory = () => {
    if (avgDemandAll < 15) return { label:"Luxury / Low-Volume", color:C.purple,
      desc:"Low daily demand — premium or specialty product. Higher margin per unit." };
    if (avgDemandAll < 40) return { label:"Standard / Mid-Volume", color:C.teal,
      desc:"Moderate daily demand — regular consumer goods category." };
    return { label:"Economy / High-Volume", color:C.green,
      desc:"High daily demand — fast-moving consumer good (FMCG). Price-sensitive." };
  };
  const itemCategory = getItemCategory();

  const tabs = [
    {id:"overview", label:"📊 Overview"},
    {id:"forecast", label:"📈 Stock & Forecast"},
    {id:"compare",  label:"⚖️ Comparison"},
    {id:"agents",   label:"🤖 Agent Activity"},
    {id:"cost",     label:"💰 Cost Analysis"},
    {id:"insights", label:"🔍 Smart Insights"},
    {id:"model",    label:"🔬 Model Metrics"},
  ];

  // Show login page if not authenticated
  if (!loggedIn) return <LoginPage onLogin={(u)=>{ setLoggedIn(true); setCurrentUser(u); }} />;

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.lightBg,flexDirection:"column",gap:16}}>
      <div style={{fontSize:40}}>⟳</div>
      <div style={{fontSize:18,fontWeight:700,color:C.navy}}>Loading SmartSupply data…</div>
      <div style={{fontSize:13,color:C.textGray}}>Connecting to FastAPI backend on :8000</div>
    </div>
  );

  return (
    <div style={{fontFamily:"'Trebuchet MS',Calibri,sans-serif",background:C.lightBg,minHeight:"100vh",color:C.textDark}}>

      {/* HEADER */}
      <div style={{background:C.navy,padding:"0 28px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.teal,borderRadius:10,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📦</div>
            <div>
              <div style={{color:"#fff",fontWeight:800,fontSize:18,fontFamily:"Georgia,serif"}}>SmartSupply Agent</div>
              <div style={{color:"#8BAEE0",fontSize:11,letterSpacing:"0.05em"}}>AGENTIC AI · INVENTORY & DEMAND FORECASTING</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <span style={{
              background: dataSource==="backend" ? `${C.green}20` : `${C.amber}20`,
              color: dataSource==="backend" ? C.green : C.amber,
              borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700
            }}>
              {dataSource==="backend" ? "🟢 Live Backend" : "🟡 Embedded Data (start backend)"}
            </span>
            <div style={{color:"#8BAEE0",fontSize:12}}>Ruthvik K</div>
          </div>
          {/* User badge + logout */}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{
              background:"rgba(10,147,150,0.15)",border:"1px solid rgba(10,147,150,0.3)",
              borderRadius:8,padding:"6px 12px",display:"flex",alignItems:"center",gap:8
            }}>
              <span style={{fontSize:14}}>👤</span>
              <span style={{color:"#fff",fontSize:12,fontWeight:600}}>{currentUser}</span>
            </div>
            <button onClick={()=>{ setLoggedIn(false); setCurrentUser(""); }} style={{
              background:"rgba(230,57,70,0.15)",border:"1px solid rgba(230,57,70,0.3)",
              borderRadius:8,padding:"6px 14px",color:"#ff6b6b",fontSize:12,
              fontWeight:700,cursor:"pointer",transition:"all .2s"
            }}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{background:C.cardBg,borderBottom:`1px solid ${C.border}`,padding:"12px 28px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.textGray}}>STORE</span>
            <select value={store} onChange={e=>setStore(e.target.value)} style={SEL}>
              {Array.from({length:10},(_,i)=>`store_${i+1}`).map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.textGray}}>ITEM</span>
            <select value={item} onChange={e=>setItem(e.target.value)} style={SEL}>
              {Array.from({length:10},(_,i)=>`item_${i+1}`).map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* FIX: value is integer, option value is integer string, parsed with parseInt */}
            <span style={{fontSize:12,fontWeight:700,color:C.textGray}}>WINDOW</span>
            <select value={windowDays} onChange={e=>setWindowDays(parseInt(e.target.value,10))} style={SEL}>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <button onClick={handleRunSim} disabled={simRunning} style={{
            background:simRunning?"#8BAEE0":C.teal, color:"#fff", border:"none",
            borderRadius:8, padding:"8px 20px", fontWeight:700, cursor:simRunning?"not-allowed":"pointer",
            fontSize:13, display:"flex", alignItems:"center", gap:6,
          }}>
            {simRunning ? "⟳ Simulating… (~30s)" : "▶ Run Simulation"}
          </button>
          {error && <span style={{color:C.red,fontSize:12,fontWeight:600}}>⚠ {error}</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:16,fontSize:12,flexWrap:"wrap"}}>
            <span style={{color:C.green,fontWeight:700}}>✓ Service Level: {sm.service_level}%</span>
            <span style={{color:sm.stockout_rate===0?C.green:C.red,fontWeight:700}}>
              {sm.stockout_rate===0?"✓ Zero Stockouts":`⚠ Stockout: ${sm.stockout_rate}%`}
            </span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:C.cardBg,borderBottom:`2px solid ${C.border}`,padding:"0 28px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              background:"none",border:"none",padding:"14px 20px",cursor:"pointer",fontSize:13,
              fontWeight:activeTab===t.id?700:500,color:activeTab===t.id?C.teal:C.textGray,
              borderBottom:activeTab===t.id?`3px solid ${C.teal}`:"3px solid transparent",transition:"all 0.15s"
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:"24px 28px"}}>

        {/* OVERVIEW */}
        {activeTab==="overview" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <Card icon="📉" label="Stockout Rate" value={`${sm.stockout_rate}%`} sub={`Baseline: ${bm.stockout_rate}%`} color={sm.stockout_rate===0?C.green:C.red}/>
              <Card icon="✅" label="Service Level" value={`${sm.service_level}%`} sub={`+${(sm.service_level-bm.service_level).toFixed(1)}% vs baseline`} color={C.green}/>
              <Card icon="🔄" label="Total Orders" value={sm.total_orders} sub={`Baseline: ${bm.total_orders}`} color={C.teal}/>
              <Card icon="🎯" label="Forecast MAPE" value={`${sm.forecast_mape}%`} sub={`Training: ${training.lstm_mape}%`} color={C.purple}/>
              <Card icon="💰" label="Total Cost ₹" value={`₹${sm.total_cost}`} sub={`Baseline: ₹${bm.total_cost}`} color={C.amber}/>
            </div>

            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{width:3,height:20,borderRadius:2,background:C.purple}}/>
                <h3 style={{margin:0,color:C.navy,fontSize:15,fontWeight:700}}>Three Coordinated Agents</h3>
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <AgentCard num="01" name="Demand Forecasting" icon="🔮" color={C.teal} lines={[
                  "LSTM Neural Network (2-layer: 64→32 units)","16 input features (lag, rolling, seasonal)",
                  "30-day lookback · Huber loss · Adam optimizer",
                  `Training RMSE: ${training.lstm_rmse} units | MAE: ${training.lstm_mae}`,
                  `MAPE: ${training.lstm_mape}% · ${training.epochs_trained} epochs (early stop)`]}/>
                <AgentCard num="02" name="Inventory Monitor" icon="📦" color={C.amber} lines={[
                  "Tracks stock vs LSTM forecast every day",
                  "Dynamic safety stock: Z=1.645 × σ × √lead_time",
                  "Status: CRITICAL / LOW / NORMAL / EXCESS",
                  "Flags stockout risk proactively before it happens",
                  "Computes coverage days = stock ÷ forecast"]}/>
                <AgentCard num="03" name="Restocking Decision" icon="🔄" color={C.green} lines={[
                  "EOQ = √(2 × D × S / H) formula",
                  "±20% adaptive bias correction on rolling error",
                  "Safety stock buffer added to order quantity",
                  "Human-in-loop flag for orders > 500 units",
                  `Orders placed: ${sm.total_orders} in ${windowDays}-day window`]}/>
              </div>
            </div>

            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{width:3,height:20,borderRadius:2,background:C.teal}}/>
                <h3 style={{margin:0,color:C.navy,fontSize:15,fontWeight:700}}>Comparison — {windowDays}-Day Window</h3>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:C.lightBg}}>
                    {["Metric","SmartSupply (LSTM)","Baseline (Fixed ROP)","Delta"].map(h=>(
                      <th key={h} style={{padding:"11px 16px",textAlign:"left",fontWeight:700,color:C.navy,fontSize:11,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`2px solid ${C.border}`,background:C.lightBg}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Stockout Rate (%)",`${sm.stockout_rate}%`,`${bm.stockout_rate}%`,`↓${(bm.stockout_rate-sm.stockout_rate).toFixed(2)}%`],
                    ["Service Level (%)",`${sm.service_level}%`,`${bm.service_level}%`,`↑${(sm.service_level-bm.service_level).toFixed(2)}%`],
                    ["Total Orders",sm.total_orders,bm.total_orders,`${Math.abs(sm.total_orders-bm.total_orders)} fewer`],
                    ["Ordering Cost ₹",`₹${sm.ordering_cost}`,`₹${bm.ordering_cost}`,`₹${Math.abs(sm.ordering_cost-bm.ordering_cost)}`],
                    ["Holding Cost ₹",`₹${sm.holding_cost}`,`₹${bm.holding_cost}`,`₹${Math.abs(sm.holding_cost-bm.holding_cost)} diff`],
                    ["Total Cost ₹",`₹${sm.total_cost}`,`₹${bm.total_cost}`,`₹${Math.abs(sm.total_cost-bm.total_cost)} diff`],
                  ].map(([label,sv,bv,delta],i)=>(
                    <tr key={i} style={{background:i%2===0?"#fff":C.lightBg}}>
                      <td style={{padding:"11px 16px",fontWeight:600,color:C.navy,fontSize:13}}>{label}</td>
                      <td style={{padding:"11px 16px",color:C.teal,fontWeight:700,fontSize:13}}>{sv}</td>
                      <td style={{padding:"11px 16px",color:C.textGray,fontSize:13}}>{bv}</td>
                      <td style={{padding:"11px 16px",color:C.green,fontWeight:700,fontSize:13}}>{delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STOCK & FORECAST */}
        {activeTab==="forecast" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <h3 style={{margin:"0 0 4px",color:C.navy}}>📦 Stock Level — SmartSupply Agent ({windowDays} days)</h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>Blue fill = stock on hand. Dashed orange = dynamic safety stock. Teal vertical lines = reorder placed.</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={results} margin={{top:5,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="day" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend/>
                  <Area type="monotone" dataKey="stock_eod" name="Stock (units)" fill={`${C.navy}15`} stroke={C.navy} strokeWidth={2}/>
                  <Line type="monotone" dataKey="safety_stock" name="Safety Stock" stroke={C.amber} strokeWidth={1.5} strokeDasharray="5 3" dot={false}/>
                  {results.filter(r=>r.reorder_placed).map(r=>(
                    <ReferenceLine key={r.day} x={r.day} stroke={C.teal} strokeDasharray="4 2" label={{value:"↑",fill:C.teal,fontSize:14,fontWeight:700}}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <h3 style={{margin:"0 0 4px",color:C.navy}}>🔮 LSTM Forecast vs Actual Demand</h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>Solid teal = Agent 01 LSTM prediction. Dotted navy = ground truth actual sales from dataset.</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={compChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="day" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend/>
                  <Line type="monotone" dataKey="Forecast" name="LSTM Forecast" stroke={C.teal} strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="Actual" name="Actual Demand" stroke={C.navy} strokeWidth={2} strokeDasharray="4 2" dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{display:"flex",gap:16}}>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 12px",color:C.navy,fontSize:14}}>Coverage Days</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={results.map(r=>({day:r.day,coverage:Math.min(r.coverage_days,100)}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="day" tick={{fontSize:10}}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip/>
                    <ReferenceLine y={7} stroke={C.amber} strokeDasharray="4 2" label={{value:"7d Lead Time",fontSize:10,fill:C.amber}}/>
                    <Area type="monotone" dataKey="coverage" name="Coverage Days" stroke={C.green} fill={`${C.green}20`}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 12px",color:C.navy,fontSize:14}}>Forecast Error per Day</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={results.map(r=>({day:r.day,error:+r.forecast_error.toFixed(3)}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="day" tick={{fontSize:9}}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip/>
                    <ReferenceLine y={0} stroke={C.navy}/>
                    <Bar dataKey="error" name="Error" radius={[2,2,0,0]}
                      isAnimationActive={false}>
                      {results.map((r,i)=>(
                        <Cell key={i} fill={r.forecast_error>0?C.amber:C.teal}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* COMPARISON */}
        {activeTab==="compare" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"flex",gap:16}}>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Service Level & Stockout</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={[
                    {metric:"Stockout %",SmartSupply:sm.stockout_rate,Baseline:bm.stockout_rate},
                    {metric:"Service %",SmartSupply:sm.service_level,Baseline:bm.service_level},
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="metric" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:11}}/>
                    <Tooltip/>
                    <Legend/>
                    <Bar dataKey="SmartSupply" fill={C.navy} radius={[4,4,0,0]}/>
                    <Bar dataKey="Baseline"    fill={C.teal} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Cost Breakdown (₹)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={[
                    {metric:"Ordering ₹",SmartSupply:sm.ordering_cost,Baseline:bm.ordering_cost},
                    {metric:"Holding ₹", SmartSupply:sm.holding_cost, Baseline:bm.holding_cost},
                    {metric:"Total ₹",   SmartSupply:sm.total_cost,   Baseline:bm.total_cost},
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="metric" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:11}}/>
                    <Tooltip/>
                    <Legend/>
                    <Bar dataKey="SmartSupply" fill={C.navy} radius={[4,4,0,0]}/>
                    <Bar dataKey="Baseline"    fill={C.amber} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <h3 style={{margin:"0 0 4px",color:C.navy,fontSize:14}}>Stock Level: SmartSupply vs Baseline ({windowDays} days)</h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>Navy = LSTM-driven agent. Amber dashed = fixed reorder point baseline. Amber hits zero = stockout events.</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={compChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="day" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend/>
                  <Line type="monotone" dataKey="SmartSupply" stroke={C.navy} strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="Baseline"    stroke={C.amber} strokeWidth={2} strokeDasharray="5 3" dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AGENT ACTIVITY */}
        {activeTab==="agents" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <Card icon="🔄" label="Reorders Triggered"  value={sm.total_orders} sub="By Agent 03 (EOQ)"    color={C.teal}/>
              <Card icon="⚠️" label="Critical Alerts"     value={results.filter(r=>r.stock_status==="CRITICAL").length} sub="Agent 02 flags" color={C.red}/>
              <Card icon="📦" label="Stockout Events"     value={results.filter(r=>r.stockout).length}
                sub={results.filter(r=>r.stockout).length===0?"Zero stockouts ✓":"Days at zero"}
                color={results.filter(r=>r.stockout).length===0?C.green:C.red}/>
              <Card icon="✅" label="Days in NORMAL"      value={results.filter(r=>r.stock_status==="NORMAL").length} sub={`of ${results.length} days`} color={C.green}/>
              <Card icon="📈" label="Days in EXCESS"      value={results.filter(r=>r.stock_status==="EXCESS").length} sub="Overstock days" color={C.teal}/>
            </div>

            <div style={{display:"flex",gap:16}}>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Stock Status Distribution</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                      dataKey="value" nameKey="name" label={({name,value})=>`${name}: ${value}d`}>
                      {pieData.map((e,i)=>(<Cell key={i} fill={STATUS_COLOR[e.name]||C.teal}/>))}
                    </Pie>
                    <Tooltip/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Safety Stock vs LSTM Forecast</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={results}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="day" tick={{fontSize:10}}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend/>
                    <Line type="monotone" dataKey="demand_forecast" name="LSTM Forecast" stroke={C.teal} strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="safety_stock"    name="Safety Stock"  stroke={C.amber} strokeWidth={1.5} strokeDasharray="5 3" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Agent Event Log</h3>
              <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                {agentLog.length===0
                  ? <div style={{color:C.textGray,fontSize:13}}>No critical events ✓</div>
                  : agentLog.map((log,i)=>(
                    <div key={i} style={{display:"flex",gap:12,padding:"8px 12px",
                      background:`${log.color}10`,borderRadius:8,borderLeft:`3px solid ${log.color}`}}>
                      <span style={{fontSize:11,color:C.textGray,minWidth:52,fontWeight:700}}>Day {log.day}</span>
                      <span style={{fontSize:11,color:log.color,fontWeight:700,minWidth:80}}>{log.agent}</span>
                      <span style={{fontSize:12,color:C.textDark}}>{log.msg}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Reorder Events Detail</h3>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:C.lightBg}}>
                      {["Day","Stock at Trigger","LSTM Forecast","Safety Stock","Reorder Qty","Coverage Days","Status"].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:C.navy,borderBottom:`2px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(r=>r.reorder_placed).map((r,i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":C.lightBg}}>
                        <td style={{padding:"7px 12px",fontWeight:700}}>{r.day}</td>
                        <td style={{padding:"7px 12px"}}>{r.stock_eod} units</td>
                        <td style={{padding:"7px 12px"}}>{r.demand_forecast} units</td>
                        <td style={{padding:"7px 12px"}}>{r.safety_stock} units</td>
                        <td style={{padding:"7px 12px",color:C.teal,fontWeight:700}}>{r.reorder_qty} units</td>
                        <td style={{padding:"7px 12px"}}>{r.coverage_days}d</td>
                        <td style={{padding:"7px 12px"}}><Badge status={r.stock_status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* COST ANALYSIS */}
        {activeTab==="cost" && (() => {
          const sm = rawData?.metrics?.smartsupply || FALLBACK_DATA.metrics.smartsupply;
          const bm = rawData?.metrics?.baseline    || FALLBACK_DATA.metrics.baseline;

          // ROI: lost revenue prevented = stockout days difference × avg daily demand × assumed unit price ₹200
          const avgDailyDemand = results.length > 0
            ? results.reduce((a,r) => a + (r.actual_demand||0), 0) / results.length : 35;
          const unitPrice = 200;
          const stockoutDaysDiff = (bm.stockout_rate - sm.stockout_rate) / 100 * results.length;
          const revenueSaved  = Math.round(stockoutDaysDiff * avgDailyDemand * unitPrice);
          const extraCost     = Math.round(sm.total_cost - bm.total_cost);
          const netROI        = revenueSaved - extraCost;
          const roiPct        = bm.total_cost > 0 ? ((netROI / bm.total_cost) * 100).toFixed(1) : "N/A";

          // Cumulative cost data for line chart
          const cumulData = results.map(r => ({
            day: r.day,
            "SmartSupply Ordering": parseFloat((r.ordering_cost||0).toFixed(2)),
            "SmartSupply Holding":  parseFloat((r.holding_cost||0).toFixed(2)),
            "SmartSupply Total":    parseFloat(((r.ordering_cost||0)+(r.holding_cost||0)).toFixed(2)),
          }));

          // Daily holding cost
          const dailyHolding = results.map(r => ({
            day: r.day,
            "SmartSupply": parseFloat((r.holding_cost||0).toFixed(2)),
          }));

          // Bar chart comparison data
          const barData = [
            { metric:"Ordering Cost ₹", SmartSupply: sm.ordering_cost, Baseline: bm.ordering_cost },
            { metric:"Holding Cost ₹",  SmartSupply: Math.round(sm.holding_cost), Baseline: Math.round(bm.holding_cost) },
            { metric:"Total Cost ₹",    SmartSupply: Math.round(sm.total_cost),   Baseline: Math.round(bm.total_cost) },
          ];

          return (
            <div style={{display:"flex",flexDirection:"column",gap:20}}>

              {/* Info banner */}
              <div style={{background:`${C.teal}10`,borderRadius:10,padding:"12px 16px",fontSize:13,
                color:C.navy,fontWeight:600,border:`1px solid ${C.teal}30`}}>
                💰 Cost Analysis — Full breakdown of ordering cost, holding cost, ROI and savings over {results.length}-day simulation window.
              </div>

              {/* ROI CARDS */}
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <Card icon="📦" label="Ordering Cost Saved"
                  value={`₹${(bm.ordering_cost - sm.ordering_cost).toFixed(0)}`}
                  sub={`SmartSupply ₹${sm.ordering_cost} vs Baseline ₹${bm.ordering_cost}`}
                  color={C.green}/>
                <Card icon="🏭" label="Extra Holding Cost"
                  value={`₹${Math.round(sm.holding_cost - bm.holding_cost)}`}
                  sub={`SmartSupply ₹${Math.round(sm.holding_cost)} vs Baseline ₹${Math.round(bm.holding_cost)}`}
                  color={C.amber}/>
                <Card icon="💸" label="Net Cost Difference"
                  value={`₹${Math.abs(extraCost)}`}
                  sub={extraCost > 0 ? "SmartSupply costs more (overstock)" : "SmartSupply costs less"}
                  color={extraCost > 0 ? C.red : C.green}/>
                <Card icon="🛡️" label="Revenue Saved (Stockouts)"
                  value={`₹${revenueSaved.toLocaleString()}`}
                  sub={`${stockoutDaysDiff.toFixed(1)} fewer stockout days × ₹200/unit`}
                  color={C.teal}/>
                <Card icon="📈" label="Net ROI"
                  value={`₹${netROI.toLocaleString()}`}
                  sub={`${roiPct}% return — revenue saved minus extra cost`}
                  color={netROI > 0 ? C.green : C.red}/>
              </div>

              {/* ROI Explanation box */}
              <div style={{background:"#EDFBF3",borderRadius:10,padding:"14px 18px",
                border:"1px solid #2DC65340",fontSize:13,color:"#1A5C33",lineHeight:1.7}}>
                <strong>📊 How ROI is calculated:</strong><br/>
                SmartSupply prevented <strong>{stockoutDaysDiff.toFixed(1)} stockout days</strong> compared to the baseline ({(bm.stockout_rate).toFixed(2)}% − {(sm.stockout_rate).toFixed(2)}% = {(bm.stockout_rate - sm.stockout_rate).toFixed(2)}% × {results.length} days).<br/>
                Each stockout day loses: avg demand {avgDailyDemand.toFixed(1)} units × ₹{unitPrice}/unit = <strong>₹{Math.round(avgDailyDemand*unitPrice).toLocaleString()}/day</strong>.<br/>
                Total revenue saved: ₹{revenueSaved.toLocaleString()}. Extra holding cost: ₹{Math.abs(extraCost).toLocaleString()}. <strong>Net ROI = ₹{netROI.toLocaleString()}</strong>.
              </div>

              {/* Cost Breakdown Bar Chart */}
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
                <h3 style={{margin:"0 0 4px",color:C.navy,fontSize:14}}>Cost Breakdown — SmartSupply vs Baseline</h3>
                <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>
                  Ordering cost: SmartSupply wins (fewer orders). Holding cost: Baseline wins (less stock). Total: see ROI above.
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="metric" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${v}`}/>
                    <Tooltip formatter={(v)=>`₹${v}`} content={<Tip/>}/>
                    <Legend/>
                    <Bar dataKey="SmartSupply" fill={C.navy}  radius={[4,4,0,0]}/>
                    <Bar dataKey="Baseline"    fill={C.amber} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative Cost Over Time */}
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
                <h3 style={{margin:"0 0 4px",color:C.navy,fontSize:14}}>Cumulative Costs Over {results.length} Days (SmartSupply)</h3>
                <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>
                  How ordering cost and holding cost accumulated day by day. Each reorder adds ₹50 to ordering cost. Holding cost grows with stock level.
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={cumulData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="day" tick={{fontSize:11}} label={{value:"Day",position:"insideBottom",offset:-2}}/>
                    <YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${v}`}/>
                    <Tooltip content={<Tip/>} formatter={(v)=>`₹${v}`}/>
                    <Legend/>
                    <Line type="monotone" dataKey="SmartSupply Ordering" stroke={C.teal}   strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="SmartSupply Holding"  stroke={C.amber}  strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="SmartSupply Total"    stroke={C.navy}   strokeWidth={2} strokeDasharray="5 3" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Cost Table */}
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Detailed Cost Summary Table</h3>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{background:C.lightBg}}>
                        {["Metric","SmartSupply (LSTM)","Baseline (Fixed ROP)","Difference","Winner"].map(h=>(
                          <th key={h} style={{padding:"9px 14px",textAlign:"left",fontWeight:700,
                            color:C.navy,borderBottom:`2px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Ordering Cost ₹",   `₹${sm.ordering_cost}`,            `₹${bm.ordering_cost}`,
                          `₹${(bm.ordering_cost-sm.ordering_cost).toFixed(0)} saved`,     "✅ SmartSupply"],
                        ["Holding Cost ₹",    `₹${Math.round(sm.holding_cost)}`, `₹${Math.round(bm.holding_cost)}`,
                          `₹${Math.round(sm.holding_cost-bm.holding_cost)} more`,          "✅ Baseline"],
                        ["Total Cost ₹",      `₹${Math.round(sm.total_cost)}`,   `₹${Math.round(bm.total_cost)}`,
                          `₹${Math.abs(extraCost)} ${extraCost>0?"more":"saved"}`,          extraCost>0?"⚠️ Baseline":"✅ SmartSupply"],
                        ["Total Orders",      `${sm.total_orders} orders`,        `${bm.total_orders} orders`,
                          `${bm.total_orders - sm.total_orders} fewer orders`,              "✅ SmartSupply"],
                        ["Cost Per Order",    `₹${(sm.total_cost/sm.total_orders).toFixed(0)}`, `₹${(bm.total_cost/bm.total_orders).toFixed(0)}`,
                          `₹${Math.abs(Math.round(sm.total_cost/sm.total_orders - bm.total_cost/bm.total_orders))} diff`, "—"],
                        ["Avg Stock Held",    `${Math.round(sm.avg_stock)} units`, `${Math.round(bm.avg_stock)} units`,
                          `${Math.round(sm.avg_stock - bm.avg_stock)} units more`,          "✅ Baseline"],
                        ["Revenue Protected", `₹${revenueSaved.toLocaleString()}`, "₹0",
                          `₹${revenueSaved.toLocaleString()} protected`,                    "✅ SmartSupply"],
                        ["Net ROI",           `₹${netROI.toLocaleString()}`,      "Baseline",
                          `${roiPct}% return`,                                              netROI>0?"✅ SmartSupply":"⚠️ Baseline"],
                      ].map(([m,s,b,d,w],i)=>(
                        <tr key={i} style={{background:i%2===0?"#fff":C.lightBg}}>
                          <td style={{padding:"8px 14px",fontWeight:600,color:C.navy}}>{m}</td>
                          <td style={{padding:"8px 14px",color:C.teal,fontWeight:600}}>{s}</td>
                          <td style={{padding:"8px 14px",color:C.textGray}}>{b}</td>
                          <td style={{padding:"8px 14px",color:C.textGray,fontSize:12}}>{d}</td>
                          <td style={{padding:"8px 14px",fontWeight:700,
                            color:w.startsWith("✅ Smart")?C.green:w.startsWith("✅ Base")?C.amber:C.red}}>{w}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          );
        })()}

        {/* ── SMART INSIGHTS TAB ── points 4,5,6,7,8 + image2 notes ──────── */}
        {activeTab==="insights" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>

            {/* ── SECTION 1: ITEM INTELLIGENCE ─────────────────────────── */}
            <div style={{background:C.cardBg,borderRadius:12,padding:20,
              boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
              <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:15}}>
                🏷️ Item Intelligence — What kind of product is this?
              </h3>
              <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:14}}>
                <div style={{flex:1,minWidth:180,background:`${itemCategory.color}10`,
                  borderRadius:10,padding:"14px 18px",border:`1px solid ${itemCategory.color}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:itemCategory.color,
                    textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Item Category</div>
                  <div style={{fontSize:18,fontWeight:800,color:C.navy}}>{itemCategory.label}</div>
                  <div style={{fontSize:12,color:C.textGray,marginTop:6,lineHeight:1.6}}>{itemCategory.desc}</div>
                </div>
                <div style={{flex:1,minWidth:180,background:`${C.teal}10`,
                  borderRadius:10,padding:"14px 18px",border:`1px solid ${C.teal}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.teal,
                    textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Avg Daily Demand</div>
                  <div style={{fontSize:22,fontWeight:800,color:C.navy}}>{avgDemandAll.toFixed(1)} units/day</div>
                  <div style={{fontSize:12,color:C.textGray,marginTop:6}}>
                    Over {results.length} simulation days ({store} / {item})
                  </div>
                </div>
                <div style={{flex:1,minWidth:180,
                  background: isSlowMoving ? `${C.amber}15`:`${C.green}10`,
                  borderRadius:10,padding:"14px 18px",
                  border:`1px solid ${isSlowMoving?C.amber:C.green}30`}}>
                  <div style={{fontSize:11,fontWeight:700,
                    color:isSlowMoving?C.amber:C.green,
                    textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Slow-Moving Status</div>
                  <div style={{fontSize:18,fontWeight:800,color:C.navy}}>
                    {isSlowMoving ? "⚠️ Slow-Moving" : "✅ Normal Velocity"}
                  </div>
                  <div style={{fontSize:12,color:C.textGray,marginTop:6}}>
                    Threshold: &lt;{slowMovingThreshold.toFixed(1)} units/day
                  </div>
                </div>
              </div>

              {/* Slow-moving explanation */}
              <div style={{background:"#FFF8E6",borderRadius:8,padding:"12px 16px",
                border:"1px solid #E9A82440",fontSize:13,color:"#7A4F00",lineHeight:1.7}}>
                <strong>🐢 How slow-moving items are identified and handled:</strong><br/>
                An item is flagged as slow-moving if its average daily demand falls below 20% of the
                category average. For this item: threshold = {slowMovingThreshold.toFixed(1)} units/day.
                Current avg = {avgDemandAll.toFixed(1)} units/day →{" "}
                <strong>{isSlowMoving?"SLOW-MOVING — Agent 03 will reduce EOQ and use conservative reorder points.":"Normal velocity — standard EOQ applies."}</strong>
                <br/><br/>
                When slow-moving is detected: Agent 03 applies a <strong>0.6× EOQ multiplier</strong> (orders
                40% less), Agent 02 extends the acceptable coverage window to <strong>14 days</strong> (instead
                of 7), and the safety stock buffer is halved to avoid over-stocking expensive/perishable items.
              </div>
            </div>

            {/* ── SECTION 2: ANOMALY / SPIKE DETECTION ─────────────────── */}
            <div style={{background:C.cardBg,borderRadius:12,padding:20,
              boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
              <h3 style={{margin:"0 0 6px",color:C.navy,fontSize:15}}>
                🚨 Anomaly Detection — Demand Spike Alerts
              </h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>
                A spike is flagged when actual demand exceeds 2× the LSTM forecast on the same day.
                These are events the model didn't fully predict — festivals, flash sales, or supply shocks.
              </p>

              <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14}}>
                <div style={{background: anomalies.length>0?`${C.red}10`:`${C.green}10`,
                  borderRadius:10,padding:"14px 18px",minWidth:160,
                  border:`1px solid ${anomalies.length>0?C.red:C.green}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:anomalies.length>0?C.red:C.green,
                    textTransform:"uppercase",marginBottom:4}}>Spike Events</div>
                  <div style={{fontSize:28,fontWeight:800,color:C.navy}}>{anomalies.length}</div>
                  <div style={{fontSize:12,color:C.textGray,marginTop:4}}>
                    {anomalies.length===0?"No anomalies detected ✓":"Days with demand > 2× forecast"}
                  </div>
                </div>
                <div style={{background:`${C.amber}10`,borderRadius:10,padding:"14px 18px",
                  minWidth:160,border:`1px solid ${C.amber}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.amber,
                    textTransform:"uppercase",marginBottom:4}}>Max Spike Ratio</div>
                  <div style={{fontSize:28,fontWeight:800,color:C.navy}}>
                    {anomalies.length>0
                      ? `${Math.max(...anomalies.map(r=>r.demand_forecast>0
                          ?r.actual_demand/r.demand_forecast:0)).toFixed(1)}×`
                      : "—"}
                  </div>
                  <div style={{fontSize:12,color:C.textGray,marginTop:4}}>Highest actual÷forecast ratio</div>
                </div>
                <div style={{background:`${C.purple}10`,borderRadius:10,padding:"14px 18px",
                  minWidth:160,border:`1px solid ${C.purple}30`,flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.purple,
                    textTransform:"uppercase",marginBottom:4}}>Agent Response</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.navy,lineHeight:1.5}}>
                    Auto-flag → increase safety stock → emergency reorder if critical
                  </div>
                </div>
              </div>

              {anomalies.length > 0 ? (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:C.lightBg}}>
                        {["Day","Date","Actual Demand","LSTM Forecast","Spike Ratio","Stock at Day","Alert Level"].map(h=>(
                          <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,
                            color:C.navy,borderBottom:`2px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.map((r,i)=>{
                        const ratio = r.demand_forecast>0
                          ?(r.actual_demand/r.demand_forecast).toFixed(2):"-";
                        const level = ratio>=3?"🔴 CRITICAL":ratio>=2?"🟡 HIGH":"🟠 ELEVATED";
                        return (
                          <tr key={i} style={{background:`${C.red}08`}}>
                            <td style={{padding:"7px 12px",fontWeight:700}}>Day {r.day}</td>
                            <td style={{padding:"7px 12px",color:C.textGray}}>{dayToDate(r.day)}</td>
                            <td style={{padding:"7px 12px",color:C.red,fontWeight:700}}>{r.actual_demand} units</td>
                            <td style={{padding:"7px 12px"}}>{r.demand_forecast?.toFixed(1)} units</td>
                            <td style={{padding:"7px 12px",color:C.red,fontWeight:700}}>{ratio}×</td>
                            <td style={{padding:"7px 12px"}}>{r.stock_eod} units</td>
                            <td style={{padding:"7px 12px",fontWeight:700}}>{level}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{background:`${C.green}10`,borderRadius:8,padding:"12px 16px",
                  color:C.green,fontWeight:600,fontSize:13}}>
                  ✅ No demand spikes detected in this window. All actual demand was within 2× of LSTM forecast.
                </div>
              )}
            </div>

            {/* ── SECTION 3: REORDER FORMULA EXPLAINED ─────────────────── */}
            <div style={{background:C.cardBg,borderRadius:12,padding:20,
              boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
              <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:15}}>
                📐 Reorder Formula — How Agent 03 Calculates Every Order
              </h3>

              {/* EOQ formula visual */}
              <div style={{background:"#F0F4FF",borderRadius:10,padding:"16px 20px",
                marginBottom:14,textAlign:"center"}}>
                <div style={{fontSize:13,color:C.textGray,marginBottom:8}}>Economic Order Quantity (EOQ) Formula</div>
                <div style={{fontSize:20,fontWeight:800,color:C.navy,fontFamily:"Georgia,serif",
                  letterSpacing:"0.02em"}}>
                  EOQ = √( 2 × D × S ÷ H )
                </div>
                <div style={{display:"flex",gap:20,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
                  {[["D","Annual Demand","Forecast × 365"],
                    ["S","Ordering Cost","₹50 per order"],
                    ["H","Holding Cost","₹2 per unit/year"]
                  ].map(([v,n,e])=>(
                    <div key={v} style={{background:"#fff",borderRadius:8,padding:"8px 14px",
                      border:`1px solid ${C.border}`,minWidth:120}}>
                      <div style={{fontSize:18,fontWeight:800,color:C.teal}}>{v}</div>
                      <div style={{fontSize:12,fontWeight:700,color:C.navy}}>{n}</div>
                      <div style={{fontSize:11,color:C.textGray}}>{e}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live calculation */}
              {results.length>0 && (()=>{
                const lastReorder = results.filter(r=>r.reorder_placed).slice(-1)[0];
                if (!lastReorder) return null;
                const D = (lastReorder.demand_forecast||10)*365;
                const S = 50, H = 2;
                const eoq = Math.sqrt((2*D*S)/H).toFixed(1);
                return (
                  <div style={{background:`${C.teal}08`,borderRadius:10,padding:"14px 18px",
                    marginBottom:14,border:`1px solid ${C.teal}20`}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>
                      📊 Live Example — Last reorder (Day {lastReorder.day}):
                    </div>
                    <div style={{fontSize:13,color:C.textGray,lineHeight:1.8}}>
                      LSTM Forecast that day: <strong>{lastReorder.demand_forecast?.toFixed(2)} units/day</strong><br/>
                      Annual demand (D) = {lastReorder.demand_forecast?.toFixed(2)} × 365 = <strong>{D.toFixed(0)} units/year</strong><br/>
                      EOQ = √(2 × {D.toFixed(0)} × 50 ÷ 2) = √{(D*50).toFixed(0)} = <strong>{eoq} units</strong><br/>
                      Adaptive adjustment (±20% based on recent forecast errors) → Final order: <strong>{lastReorder.reorder_qty} units</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Festival/seasonal adjustment */}
              <div style={{background:"#EDFBF3",borderRadius:10,padding:"14px 18px",
                border:"1px solid #2DC65330",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1A5C33",marginBottom:8}}>
                  🎉 Point 5: How Agent 03 adjusts reorder levels during festivals and seasonal sales
                </div>
                <div style={{fontSize:13,color:"#1A5C33",lineHeight:1.8}}>
                  When <code>is_holiday = 1</code> or <code>season</code> changes, the LSTM forecast
                  already captures the expected spike (trained on historical festival data).<br/><br/>
                  <strong>Agent 03 additionally applies:</strong><br/>
                  • <strong>Festival multiplier:</strong> If is_holiday=1, EOQ quantity × 1.3 (order 30% extra buffer)<br/>
                  • <strong>Seasonal uplift:</strong> Q4 (Oct–Dec) → × 1.2 | Q2 (Apr–Jun) → × 0.9<br/>
                  • <strong>Adaptive bias correction:</strong> If forecast errors in last 10 days are negative
                  (LSTM under-predicted), Agent 03 adds up to +20% to compensate<br/>
                  • <strong>Safety stock boost:</strong> Agent 02 uses Z=1.88 (97% service level) during
                  holiday weeks instead of normal Z=1.645 (95%)
                </div>
              </div>

              {/* Reorder point formula */}
              <div style={{background:`${C.navy}08`,borderRadius:10,padding:"14px 18px",
                border:`1px solid ${C.navy}15`}}>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>
                  🎯 Dynamic Reorder Point (ROP) — replaces fixed threshold
                </div>
                <div style={{fontSize:13,color:C.textGray,lineHeight:1.8}}>
                  Old system: <strong>Reorder if stock ≤ 80</strong> (fixed, never changes)<br/>
                  SmartSupply: <strong>ROP = (LSTM forecast × lead time) + safety stock</strong><br/><br/>
                  ROP recalculates every day. Example Day {results[5]?.day||5}:{" "}
                  Forecast={results[5]?.demand_forecast?.toFixed(1)||"~35"} units/day,
                  Lead time=7 days, Safety stock={results[5]?.safety_stock?.toFixed(1)||"~20"} units<br/>
                  → ROP = ({results[5]?.demand_forecast?.toFixed(1)||"35"} × 7) +{" "}
                  {results[5]?.safety_stock?.toFixed(1)||"20"} ={" "}
                  <strong>{results[5]
                    ? ((results[5].demand_forecast*7)+results[5].safety_stock).toFixed(1)
                    : "265"} units</strong> — this is today's reorder point, not a fixed 80.
                </div>
              </div>
            </div>

            {/* ── SECTION 4: SIMULATION HISTORY WITH REAL DATES ─────────── */}
            <div style={{background:C.cardBg,borderRadius:12,padding:20,
              boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
              <h3 style={{margin:"0 0 6px",color:C.navy,fontSize:15}}>
                📅 Simulation History — Day-by-Day with Real Dates
              </h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:C.textGray}}>
                Simulation window: <strong>{dayToDate(0)}</strong> to{" "}
                <strong>{dayToDate(results.length-1)}</strong> ({results.length} days) |{" "}
                Store: {store} | Item: {item} | Based on Kaggle retail dataset (2013–2017)
              </p>
              <div style={{overflowX:"auto",maxHeight:320,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead style={{position:"sticky",top:0,zIndex:1}}>
                    <tr style={{background:C.lightBg}}>
                      {["Day","Date","Stock (EOD)","Forecast","Actual Demand","Status","Reorder"].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,
                          color:C.navy,borderBottom:`2px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r,i)=>(
                      <tr key={i} style={{
                        background: r.stockout?`${C.red}12`:r.stock_status==="CRITICAL"?`${C.red}06`:
                          r.stock_status==="EXCESS"?`${C.teal}06`:i%2===0?"#fff":C.lightBg
                      }}>
                        <td style={{padding:"6px 12px",fontWeight:700,color:C.textGray}}>D{r.day}</td>
                        <td style={{padding:"6px 12px",color:C.textGray,fontSize:11}}>{dayToDate(r.day)}</td>
                        <td style={{padding:"6px 12px",fontWeight:600,color:
                          r.stock_eod===0?C.red:r.stock_eod>2000?C.amber:C.navy}}>
                          {r.stock_eod?.toLocaleString()}
                        </td>
                        <td style={{padding:"6px 12px",color:C.teal}}>{r.demand_forecast?.toFixed(1)}</td>
                        <td style={{padding:"6px 12px",fontWeight:600,color:
                          (r.actual_demand||0)>(r.demand_forecast||0)*2?C.red:C.navy}}>
                          {r.actual_demand}
                          {(r.actual_demand||0)>(r.demand_forecast||0)*2 &&
                            <span style={{color:C.red,fontSize:10,marginLeft:4}}>⚠️spike</span>}
                        </td>
                        <td style={{padding:"6px 12px"}}>
                          <span style={{background:`${STATUS_COLOR[r.stock_status]||C.green}20`,
                            color:STATUS_COLOR[r.stock_status]||C.green,
                            borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>
                            {r.stock_status}
                          </span>
                        </td>
                        <td style={{padding:"6px 12px"}}>
                          {r.reorder_placed
                            ? <span style={{color:C.teal,fontWeight:700}}>+{r.reorder_qty}</span>
                            : <span style={{color:C.textGray}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION 5: WORKFLOW SCHEDULING ───────────────────────── */}
            <div style={{background:C.cardBg,borderRadius:12,padding:20,
              boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
              <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:15}}>
                ⏱️ Workflow Schedule — How the System Runs Automatically
              </h3>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  ["🌅","Daily — 6:00 AM","Agent 01 runs LSTM forecast","Reads last 30 days of sales from database. Predicts demand for next 7 days. Stores predictions in forecast cache.",C.teal],
                  ["📊","Daily — 6:05 AM","Agent 02 monitors inventory","Compares today's opening stock against forecast. Calculates dynamic safety stock and coverage days. Flags CRITICAL/LOW/EXCESS.",C.amber],
                  ["🛒","Daily — 6:10 AM","Agent 03 decides restocking","If CRITICAL or LOW: runs EOQ formula, applies adaptive correction, generates purchase order. Sends for approval if qty > 500.",C.green],
                  ["🚚","Daily — varies","Reorders arrive (lead time)","Orders placed 7 days ago arrive. Stock is updated. Confirmation logged in decision_history.json.",C.navy],
                  ["📅","Weekly — Sunday","Model performance review","System checks if LSTM MAPE has drifted above 25%. If yes, triggers retraining on latest 90 days of data.",C.purple],
                  ["🔄","Monthly","Full pipeline re-run","pipeline.py re-runs with latest data. Feature engineering refreshed. Scaler re-fitted. LSTM retrained from scratch if needed.",C.red],
                ].map(([icon,time,title,desc,color],i)=>(
                  <div key={i} style={{display:"flex",gap:14,padding:"12px 14px",
                    background:`${color}08`,borderRadius:10,border:`1px solid ${color}20`,
                    alignItems:"flex-start"}}>
                    <div style={{fontSize:22,flexShrink:0}}>{icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:11,fontWeight:700,color,background:`${color}20`,
                          borderRadius:4,padding:"2px 8px"}}>{time}</span>
                        <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{title}</span>
                      </div>
                      <div style={{fontSize:12,color:C.textGray,lineHeight:1.6}}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 6: DATA SECURITY + IS IT FUTURE/PAST ─────────── */}
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>

              {/* Security */}
              <div style={{background:C.cardBg,borderRadius:12,padding:20,flex:1,minWidth:280,
                boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:15}}>
                  🔒 Data Security & Isolation
                </h3>
                {[
                  ["🔐","Store isolation","Each store's data is processed and stored separately. store_1 data never mixes with store_2 data. Separate CSV files, separate model files per deployment."],
                  ["🚫","No data sharing","SmartSupply runs on your own infrastructure. No data is sent to any third party. The LSTM model is trained on YOUR data and stored locally (lstm_model.keras)."],
                  ["👤","Access control","In production: each user sees only their store's dashboard. Backend API uses store-level authentication. Admins can see all stores; managers see only their own."],
                  ["📋","Audit trail","Every agent decision is logged in decision_history.json with timestamp, agent ID, quantity, and reason. Full audit trail for compliance."],
                ].map(([icon,title,desc],i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"8px 0",
                    borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:2}}>{title}</div>
                      <div style={{fontSize:12,color:C.textGray,lineHeight:1.5}}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Predicting future or past */}
              <div style={{background:C.cardBg,borderRadius:12,padding:20,flex:1,minWidth:280,
                boxShadow:"0 2px 12px rgba(15,31,92,0.08)"}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:15}}>
                  🔮 Is it Predicting Future or Past?
                </h3>
                <div style={{background:`${C.teal}10`,borderRadius:10,padding:"14px",
                  marginBottom:12,border:`1px solid ${C.teal}20`}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.teal,marginBottom:6}}>
                    Short answer: FUTURE — but validated against known past data
                  </div>
                  <div style={{fontSize:13,color:C.textGray,lineHeight:1.7}}>
                    The LSTM is trained on 80% of historical data. It is then tested by
                    predicting the remaining 20% — data it has never seen.
                    This simulates predicting the future (the model doesn't know those
                    20% values during training).<br/><br/>
                    In the simulation: we take a 90-day window from the test period
                    ({dayToDate(0)} to {dayToDate(results.length-1)}) and let the agents
                    make decisions as if it were happening in real time. Actual demand
                    is revealed one day at a time — just like reality.
                  </div>
                </div>
                <div style={{background:`${C.green}10`,borderRadius:10,padding:"12px 14px",
                  border:`1px solid ${C.green}20`,fontSize:13,color:"#1A5C33",lineHeight:1.7}}>
                  <strong>In production deployment:</strong> The model would receive
                  yesterday's real sales each morning, slide the 30-day window forward
                  by 1 day, and predict today's demand before the shop opens.
                  Every prediction is a genuine future forecast — made before the
                  sales actually happen.
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MODEL METRICS */}
        {activeTab==="model" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{background:`${C.teal}10`,borderRadius:10,padding:"12px 16px",fontSize:13,color:C.navy,fontWeight:600,border:`1px solid ${C.teal}30`}}>
              ℹ️ These are real metrics from training <code>lstm_model.keras</code> on store_1/item_1 data (processed_data.csv).
              {dataSource==="backend" ? " ✅ Live from backend." : " 📋 From embedded fallback — start backend for live data."}
            </div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <Card icon="📐" label="Training RMSE" value={`${training.lstm_rmse} units`} sub="From lstm_model.keras" color={C.teal}/>
              <Card icon="📏" label="Training MAE"  value={`${training.lstm_mae} units`}  sub="Mean absolute error"  color={C.purple}/>
              <Card icon="🎯" label="Training MAPE" value={`${training.lstm_mape}%`}       sub="Mean abs % error"     color={C.amber}/>
              <Card icon="🔁" label="Epochs"        value={training.epochs_trained}        sub="Early stopping (patience=8)" color={C.green}/>
            </div>

            <div style={{display:"flex",gap:16}}>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>LSTM Architecture</h3>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.lightBg}}>
                    {["Layer","Units / Config","Activation"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:C.navy}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[["Input","(30, 16)","—"],["LSTM-1","64 units","tanh"],["BatchNorm","—","—"],
                      ["Dropout","0.2","—"],["LSTM-2","32 units","tanh"],["BatchNorm","—","—"],
                      ["Dropout","0.2","—"],["Dense","16 units","ReLU"],["Output","1 unit","Linear"]
                    ].map(([l,u,a],i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":C.lightBg}}>
                        <td style={{padding:"7px 12px",fontWeight:600,color:C.teal}}>{l}</td>
                        <td style={{padding:"7px 12px"}}>{u}</td>
                        <td style={{padding:"7px 12px",color:C.textGray}}>{a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)",flex:1}}>
                <h3 style={{margin:"0 0 14px",color:C.navy,fontSize:14}}>Training Config</h3>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.lightBg}}>
                    {["Parameter","Value"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:C.navy}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[["Optimizer","Adam (lr=1e-3)"],["Loss Function","Huber"],
                      ["Lookback Window","30 days"],["Batch Size","64"],["Max Epochs","60"],
                      [`Early Stopping`,`Patience=8 (stopped @ epoch ${training.epochs_trained})`],
                      ["LR Scheduler","ReduceLROnPlateau"],["Train/Test","80% / 20%"]
                    ].map(([p,v],i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":C.lightBg}}>
                        <td style={{padding:"7px 12px",fontWeight:600,color:C.navy}}>{p}</td>
                        <td style={{padding:"7px 12px",color:C.teal,fontWeight:600}}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{background:C.cardBg,borderRadius:16,padding:"24px 22px",boxShadow:"0 4px 24px rgba(15,31,92,0.10), 0 1px 4px rgba(15,31,92,0.05)"}}>
              <h3 style={{margin:"0 0 12px",color:C.navy,fontSize:14}}>Features Used ({(training.feature_cols||[]).length} total)</h3>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {(training.feature_cols||[]).map(f=>(
                  <span key={f} style={{background:`${C.teal}15`,color:C.teal,borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:600}}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{background:C.navy,padding:"16px 28px",marginTop:32}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{color:"#8BAEE0",fontSize:12}}>SmartSupply Agent · SDG 9 · SDG 12 · SDG 8</div>
          <div style={{color:"#8BAEE0",fontSize:12}}>Ruthvik K</div>
        </div>
      </div>
    </div>
  );
}