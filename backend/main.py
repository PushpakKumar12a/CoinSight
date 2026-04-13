from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import numpy as np
import pandas as pd
import warnings

import os
import sys

from pathlib import Path
import uvicorn
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

from src.data_fetcher import Fetcher
from src.utils import add_indicators, inverse_scale
from sklearn.metrics import mean_squared_error, mean_absolute_error

app = FastAPI(title="CryptoVision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    coin: str
    history_days: int = 365
    prediction_days: int = 7
    lookback: int = 60
    epochs: int = 50
    batch_size: int = 32

@app.get("/api/coins")
def get_coins():
    import requests

    res = requests.get("https://api.coingecko.com/api/v3/search/trending", timeout=10)
    if res.status_code == 200:
        data = res.json()
        top_coins = [coin["item"]["symbol"].upper() for coin in data["coins"]]
        if "BTC" in top_coins:
            top_coins.remove("BTC")
        top_coins = ["BTC"] + top_coins
        return {"coins": top_coins}

    return {"coins": ["BTC", "ETH", "SOL", "USDT", "XRP"]}

@app.post("/api/predict")
def predict_api(request: Query):
    from src.model import Predictor

    coin = request.coin.upper()
    fetcher = Fetcher()
    df = fetcher.get_history(coin, period="1DAY", days=request.history_days)

    df_full = add_indicators(df)
    df_full = df_full.dropna().reset_index(drop=True)

    pipeline = Predictor(
        lookback=request.lookback,
        epochs=request.epochs,
        batch_size=request.batch_size
    )
    pipeline.fit(df_full, validation_split=0.2)
    assert pipeline.model is not None
    assert pipeline.history is not None

    pred_scl = pipeline.model.predict(pipeline.X_test, verbose=0).flatten()
    y_test_real = inverse_scale(pipeline.y_test, pipeline.y_scaler)
    pred_real = inverse_scale(pred_scl, pipeline.y_scaler)
    test_dates = df_full["date"].iloc[-len(y_test_real):]

    rmse = float(np.sqrt(mean_squared_error(y_test_real, pred_real)))
    mae = float(mean_absolute_error(y_test_real, pred_real))
    mape = float(np.mean(np.abs((y_test_real - pred_real) / (y_test_real + 1e-10))) * 100)

    future_prices = pipeline.forecast(df_full, days=request.prediction_days)
    last_date = df_full["date"].iloc[-1]
    future_dates = [(last_date + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, request.prediction_days + 1)]

    history_json = format_json(df_full.tail(90).reset_index(drop=True))
    raw_data = format_json(df.head(20).reset_index(drop=True))
    train_data = format_json(df_full.head(20).reset_index(drop=True))
    history_obj = pipeline.history.history

    real_time_data = fetcher.get_price(coin)
    if real_time_data and real_time_data.get("price"):
        current_price = float(real_time_data["price"])
        change_24 = float(real_time_data.get("change_24h", 0))
        prev_price = current_price / (1 + (change_24 / 100)) if change_24 else float(df_full["close"].iloc[-1])
        volume_24h = float(real_time_data.get("volume_24h", 0))
    else:
        current_price = float(df_full["close"].iloc[-1])
        prev_price = float(df_full["close"].iloc[-2])
        change_24 = 0.0
        volume_24h = 0.0

    return {
        "historical": history_json,
        "future_dates": future_dates,
        "future_prices": [float(p) for p in future_prices],
        "metrics": {
            "rmse": rmse,
            "mae": mae,
            "mape": mape
        },
        "training_history": {
            "loss": [float(v) for v in history_obj.get("loss", [])],
            "val_loss": [float(v) for v in history_obj.get("val_loss", [])],
            "mae": [float(v) for v in history_obj.get("mae", [])],
            "val_mae": [float(v) for v in history_obj.get("val_mae", [])],
        },
        "test_eval": {
            "dates": [d.strftime("%Y-%m-%d") for d in test_dates],
            "actual": [float(v) for v in y_test_real],
            "predicted": [float(v) for v in pred_real],
        },
        "raw_data": raw_data,
        "train_data": train_data,
        "current_price": current_price,
        "prev_price": prev_price,
        "change_24h": change_24,
        "volume_24h": volume_24h,
    }

def format_json(df):
    df_clean = df.copy()
    if 'date' in df_clean.columns:
        df_clean['date'] = df_clean['date'].dt.strftime("%Y-%m-%d")
    df_clean = df_clean.replace({np.nan: None})
    return df_clean.to_dict(orient="records")

if __name__ == "__main__":
    uvicorn.run(app)