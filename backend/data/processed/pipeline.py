"""
pipeline.py — SmartSupply Data Pipeline
Reads raw retail_sales.csv, engineers 16 LSTM features, saves processed_data.csv.

Run:
    python data/processed/pipeline.py

Expected raw data format (Kaggle - Store Item Demand Forecasting):
    date, store_id, item_id, sales
    (optionally: price, promo)
"""

import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib

BASE_DIR    = os.path.join(os.path.dirname(__file__), "../..")
RAW_PATH    = os.path.join(BASE_DIR, "data/raw/retail_sales.csv")
OUT_PATH    = os.path.join(BASE_DIR, "data/processed/processed_data.csv")
SCALER_PATH = os.path.join(BASE_DIR, "models/scaler.pkl")

# Demo subset — 3 stores x 5 items (fast training)
DEMO_STORES = [f"store_{i}" for i in range(1, 11)]   # 10 stores (was 3)
DEMO_ITEMS  = [f"item_{i}"  for i in range(1, 11)]   # 10 items  (was 5)


def load_raw(path: str) -> pd.DataFrame:
    print("Loading raw data …")
    df = pd.read_csv(path, parse_dates=["date"])
    # Standardise column names from Kaggle format
    df.columns = [c.lower().strip() for c in df.columns]
    if "store" in df.columns and "store_id" not in df.columns:
        df["store_id"] = "store_" + df["store"].astype(str)
    if "item" in df.columns and "item_id" not in df.columns:
        df["item_id"] = "item_" + df["item"].astype(str)
    print(f"  Raw shape: {df.shape}")
    return df


def filter_demo_subset(df: pd.DataFrame) -> pd.DataFrame:
    df = df[df["store_id"].isin(DEMO_STORES) & df["item_id"].isin(DEMO_ITEMS)].copy()
    print(f"  After filter (3 stores × 5 items): {df.shape}")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["store_id", "item_id", "date"]).reset_index(drop=True)
    df["sales"] = df["sales"].fillna(0).clip(lower=0)
    # Add price and promo if not present (synthetic for demo)
    if "price" not in df.columns:
        np.random.seed(42)
        df["price"] = np.random.uniform(5, 50, size=len(df)).round(2)
    if "promo" not in df.columns:
        df["promo"] = (df["date"].dt.dayofweek >= 5).astype(int)
    # Add calendar columns
    df["month"]  = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter

    # ── HOLIDAY / FESTIVAL / SEASONAL FEATURES ──────────────────────────────
    # is_holiday: major Indian festivals + US holidays (Kaggle dataset is US)
    # Covers: Diwali (Oct/Nov), Christmas, New Year, Thanksgiving, Black Friday,
    #         Independence Day, Eid (approx), Holi (March)
    def _is_holiday(row):
        m, d = row["date"].month, row["date"].day
        # Christmas season (Dec 20-31)
        if m == 12 and d >= 20: return 1
        # New Year (Jan 1-3)
        if m == 1 and d <= 3: return 1
        # Thanksgiving week (4th Thursday Nov → approximate Nov 22-30)
        if m == 11 and d >= 22: return 1
        # Black Friday week (Nov 22-30 overlaps Thanksgiving)
        # Diwali season (Oct 20 – Nov 10, varies yearly)
        if m == 10 and d >= 20: return 1
        if m == 11 and d <= 10: return 1
        # Holi season (March 10-20)
        if m == 3 and d >= 10 and d <= 20: return 1
        # Eid approx (May / June, rotates — use both)
        if m in [5, 6] and d >= 1 and d <= 5: return 1
        # US Independence Day (Jul 4 ±2 days)
        if m == 7 and 2 <= d <= 6: return 1
        return 0

    df["is_holiday"]  = df.apply(_is_holiday, axis=1)

    # is_month_start / is_month_end  (salary paydays — demand spikes)
    df["is_month_start"] = df["date"].dt.is_month_start.astype(int)
    df["is_month_end"]   = df["date"].dt.is_month_end.astype(int)

    # season: 0=winter(Dec-Feb) 1=spring(Mar-May) 2=summer(Jun-Aug) 3=autumn(Sep-Nov)
    def _season(m):
        if m in [12, 1, 2]:  return 0
        if m in [3, 4, 5]:   return 1
        if m in [6, 7, 8]:   return 2
        return 3
    df["season"] = df["date"].dt.month.apply(_season)

    return df


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    print("  Engineering features …")
    groups = []
    for (store, item), grp in df.groupby(["store_id", "item_id"]):
        grp = grp.copy().sort_values("date").reset_index(drop=True)

        grp["day_of_week"]   = grp["date"].dt.dayofweek
        grp["is_weekend"]    = (grp["day_of_week"] >= 5).astype(int)
        grp["is_month_start"] = grp["date"].dt.is_month_start.astype(int)
        grp["is_month_end"]   = grp["date"].dt.is_month_end.astype(int)

        for lag in [1, 2, 3, 7, 14, 21, 30]:
            grp[f"lag_{lag}"] = grp["sales"].shift(lag)

        for window in [7, 14, 30]:
            grp[f"rolling_mean_{window}"] = grp["sales"].shift(1).rolling(window).mean()
            grp[f"rolling_std_{window}"]  = grp["sales"].shift(1).rolling(window).std()
            grp[f"rolling_max_{window}"]  = grp["sales"].shift(1).rolling(window).max()
            grp[f"rolling_min_{window}"]  = grp["sales"].shift(1).rolling(window).min()

        grp["ewm_7"] = grp["sales"].shift(1).ewm(span=7).mean()
        groups.append(grp)

    out = pd.concat(groups, ignore_index=True).dropna().reset_index(drop=True)
    print(f"  After feature engineering: {out.shape}")
    return out


def scale_sales(df: pd.DataFrame):
    scaler = MinMaxScaler()
    df["sales_scaled"] = scaler.fit_transform(df[["sales"]])
    os.makedirs(os.path.dirname(SCALER_PATH), exist_ok=True)
    joblib.dump(scaler, SCALER_PATH)
    print(f"  Scaler saved → {SCALER_PATH}")
    return df, scaler


def run_pipeline():
    print("=" * 55)
    print("  SmartSupply Agent — Data Pipeline")
    print("=" * 55)
    if not os.path.exists(RAW_PATH):
        print(f"ERROR: Raw data not found at {RAW_PATH}")
        print("Download from Kaggle:")
        print("  https://www.kaggle.com/c/demand-forecasting-kernels-only")
        print("  Place train.csv as data/raw/retail_sales.csv")
        return None
    df = load_raw(RAW_PATH)
    df = filter_demo_subset(df)
    df = clean(df)
    df = add_features(df)
    df, _ = scale_sales(df)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"  Processed data saved → {OUT_PATH}  ({df.shape})")
    print("\nPipeline complete ✓")
    return df


if __name__ == "__main__":
    run_pipeline()