"""
demand_forecasting_agent.py  —  Agent 01
Uses a trained LSTM neural network to predict next-day sales per store-item pair.

Train:
    python agents/demand_forecasting_agent.py --train

Used by orchestrator:
    agent = DemandForecastingAgent()
    agent.load_model()
    context = agent.run(context)
"""

import os, sys, warnings, argparse
import numpy as np
import pandas as pd
import joblib, json

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
warnings.filterwarnings("ignore")

import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from agents.base_agent import BaseAgent

BASE_DIR     = os.path.join(os.path.dirname(__file__), "..")
DATA_PATH    = os.path.join(BASE_DIR, "data/processed/processed_data.csv")
MODEL_PATH   = os.path.join(BASE_DIR, "models/lstm_model.keras")
SCALER_PATH  = os.path.join(BASE_DIR, "models/scaler.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "models/training_metrics.json")

LOOKBACK    = 30
BATCH_SIZE  = 64
EPOCHS      = 60
LSTM_UNITS  = [64, 32]
DROPOUT     = 0.2
TRAIN_SPLIT = 0.80


def build_sequences(data: np.ndarray, lookback: int):
    X, y = [], []
    for i in range(lookback, len(data)):
        X.append(data[i - lookback: i])
        y.append(data[i, 0])
    return np.array(X), np.array(y)


def build_lstm_model(input_shape):
    model = Sequential([
        LSTM(LSTM_UNITS[0], return_sequences=True, input_shape=input_shape),
        BatchNormalization(),
        Dropout(DROPOUT),
        LSTM(LSTM_UNITS[1], return_sequences=False),
        BatchNormalization(),
        Dropout(DROPOUT),
        Dense(16, activation="relu"),
        Dense(1, activation="linear")
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="huber", metrics=["mae"]
    )
    return model


def train():
    print("=" * 55)
    print("  Agent 01 - LSTM Training")
    print("=" * 55)

    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    print(f"Loaded: {df.shape}")

    feature_cols = [
        "sales_scaled", "price", "promo", "is_weekend",
        "day_of_week", "month", "quarter",
        "lag_1", "lag_7", "lag_14", "lag_30",
        "rolling_mean_7", "rolling_mean_14", "rolling_mean_30",
        "rolling_std_7", "ewm_7"
    ]

    df = df.sort_values(["store_id", "item_id", "date"]).reset_index(drop=True)
    X_parts, y_parts = [], []
    for (store_id, item_id), grp in df.groupby(["store_id", "item_id"]):
        grp = grp.reset_index(drop=True)
        data = grp[feature_cols].values.astype(np.float32)
        if len(data) <= LOOKBACK:
            continue
        Xg, yg = build_sequences(data, LOOKBACK)
        X_parts.append(Xg)
        y_parts.append(yg)

    if not X_parts:
        raise RuntimeError("No series with enough history found for training.")

    X = np.concatenate(X_parts, axis=0)
    y = np.concatenate(y_parts, axis=0)
    X_train, X_test, y_train, y_test = train_test_split(X, y, train_size=TRAIN_SPLIT,
                                                       shuffle=True, random_state=42)
    print(f"X_train: {X_train.shape}  X_test: {X_test.shape}")

    model = build_lstm_model((LOOKBACK, len(feature_cols)))
    model.summary()

    callbacks = [
        EarlyStopping(patience=8, restore_best_weights=True, monitor="val_loss"),
        ReduceLROnPlateau(patience=4, factor=0.5, min_lr=1e-6),
        ModelCheckpoint(MODEL_PATH, save_best_only=True, monitor="val_loss")
    ]

    history = model.fit(
        X_train, y_train, validation_split=0.1,
        epochs=EPOCHS, batch_size=BATCH_SIZE, callbacks=callbacks, verbose=1
    )

    scaler = joblib.load(SCALER_PATH)
    y_pred_scaled = model.predict(X_test).flatten()
    y_pred = scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
    y_true = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae  = mean_absolute_error(y_true, y_pred)
    mape = np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1))) * 100

    print("\n-- LSTM Results --")
    print(f"  RMSE : {rmse:.3f} units")
    print(f"  MAE  : {mae:.3f}  units")
    print(f"  MAPE : {mape:.2f}%")

    metrics = {
        "lstm_rmse": float(round(float(rmse), 3)),
        "lstm_mae":  float(round(float(mae),  3)),
        "lstm_mape": float(round(float(mape), 2)),
        "epochs_trained": int(len(history.history["loss"])),
        "feature_cols": [str(c) for c in feature_cols],
        "lookback": int(LOOKBACK)
    }
    os.makedirs(os.path.dirname(METRICS_PATH), exist_ok=True)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nModel saved -> {MODEL_PATH}")
    return model, metrics


class DemandForecastingAgent(BaseAgent):
    """Agent 01: Predicts next-day demand using trained LSTM."""

    def __init__(self):
        super().__init__("DemandForecastingAgent")
        self.model = None
        self.scaler = None
        self.feature_cols = None
        self.lookback = LOOKBACK

    def load_model(self):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run --train first.")
        self.model = load_model(MODEL_PATH)
        self.scaler = joblib.load(SCALER_PATH)
        with open(METRICS_PATH) as f:
            meta = json.load(f)
        self.feature_cols = meta["feature_cols"]
        self.log(f"Model loaded. Features: {len(self.feature_cols)}")

    def run(self, context: dict) -> dict:
        self.run_count += 1
        seq = context.get("recent_sequence")
        if seq is None:
            context["demand_forecast"] = context.get("demand_forecast", 10.0)
            return context

        seq_input = seq.reshape(1, self.lookback, seq.shape[1])
        pred_scaled = self.model.predict(seq_input, verbose=0)[0][0]
        pred_units = float(self.scaler.inverse_transform([[pred_scaled]])[0][0])
        pred_units = max(0.0, round(pred_units, 2))

        context["demand_forecast"] = pred_units
        context["forecast_confidence"] = 0.85

        actual = context.get("last_actual_demand", pred_units)
        context["forecast_error"] = (pred_units - actual) / max(actual, 1)

        self.log(f"Day {context.get('current_day','?')} | Forecast: {pred_units:.1f} | Error: {context['forecast_error']:.3f}")
        return context


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    args = parser.parse_args()
    if args.train:
        train()
    else:
        print("Usage: python agents/demand_forecasting_agent.py --train")