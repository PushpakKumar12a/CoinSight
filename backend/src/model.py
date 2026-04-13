import os
import numpy as np
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from tensorflow import keras
from tensorflow.keras.models import Sequential, load_model as keras_load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

from sklearn.base import BaseEstimator
import pandas as pd
from typing import List, Optional

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

def make_model(input_shape: tuple, units_1: int = 128, units_2: int = 64) -> Sequential:
    model = Sequential([
        Input(shape=input_shape),
        LSTM(units_1, return_sequences=True),
        Dropout(0.2),
        LSTM(units_2, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(1, activation="linear"),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=["mae"],
    )

    return model

def train(
    model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray = None,
    y_val: np.ndarray = None,
    epochs: int = 50,
    batch_size: int = 32,
):
    monitor = "val_loss" if X_val is not None else "loss"
    callbacks = [
        EarlyStopping(
            monitor=monitor,
            patience=10,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor=monitor,
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    validation_data = (X_val, y_val) if X_val is not None else None

    history = model.fit(
        X_train,
        y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_data=validation_data,
        callbacks=callbacks,
        verbose=1,
    )

    return history

def forecast(
    model,
    last_sequence: np.ndarray,
    y_scaler,
    x_scaler,
    n_features: int,
    days: int = 7,
) -> np.ndarray:

    predictions = []
    current_sequence = last_sequence.copy()

    for _ in range(days):
        input_seq = current_sequence.reshape(1, current_sequence.shape[0], current_sequence.shape[1])
        pred_scaled = model.predict(input_seq, verbose=0)[0, 0]
        pred_actual = y_scaler.inverse_transform([[pred_scaled]])[0, 0]
        predictions.append(pred_actual)
        new_row = current_sequence[-1].copy()
        new_row[0] = pred_scaled
        current_sequence = np.vstack([current_sequence[1:], new_row.reshape(1, -1)])

    return np.array(predictions)

def save_model(model, coin: str, suffix: str = "") -> str:
    filename = f"{coin.upper()}_lstm{suffix}.keras"
    filepath = MODELS_DIR / filename
    model.save(filepath)
    print(f"[SAVED] Model saved: {filepath}")
    return str(filepath)

def load_ckpt(coin: str, suffix: str = ""):
    filename = f"{coin.upper()}_lstm{suffix}.keras"
    filepath = MODELS_DIR / filename
    model = keras_load_model(filepath)
    print(f"[LOADED] Model loaded: {filepath}")
    return model

def get_summary(model) -> str:
    lines = []
    model.summary(print_fn=lambda x: lines.append(x))
    return "\n".join(lines)

class Predictor(BaseEstimator):
    def __init__(
        self,
        lookback: int = 60,
        epochs: int = 50,
        batch_size: int = 32,
        units_1: int = 128,
        units_2: int = 64,
        x_cols: Optional[List[str]] = None,
        y_col: str = "close"
    ):
        self.lookback = lookback
        self.epochs = epochs
        self.batch_size = batch_size
        self.units_1 = units_1
        self.units_2 = units_2
        self.x_cols = x_cols
        self.y_col = y_col
        
        self.y_scaler = None
        self.x_scaler = None
        self.model = None
        self.history = None

    def fit(self, df: pd.DataFrame, validation_split: float = 0.2):
        from src.utils import scale_features, make_sequences, split_data
        scaled_features, y_scaler, x_scaler, feature_cols = scale_features(
            df, self.x_cols, self.y_col
        )
        self.y_scaler = y_scaler
        self.x_scaler = x_scaler
        self.x_cols = feature_cols
        X, y = make_sequences(scaled_features, lookback=self.lookback)
        X_train, X_test, y_train, y_test = split_data(X, y, test_ratio=validation_split)
        self.X_test = X_test
        self.y_test = y_test
        input_shape = (X_train.shape[1], X_train.shape[2])
        self.model = make_model(input_shape, units_1=self.units_1, units_2=self.units_2)
        self.history = train(
            self.model,
            X_train, y_train,
            X_val=X_test, y_val=y_test,
            epochs=self.epochs,
            batch_size=self.batch_size
        )
        return self

    def forecast(self, df: pd.DataFrame, days: int = 7) -> np.ndarray:
        if len(df) < self.lookback:
            raise ValueError(f"Need at least {self.lookback} records, got {len(df)}")
            
        features = df[self.x_cols].values
        scaled_features = self.x_scaler.transform(features)
        
        last_sequence = scaled_features[-self.lookback:]
        return forecast(
            self.model,
            last_sequence,
            self.y_scaler,
            self.x_scaler,
            n_features=len(self.x_cols),
            days=days
        )