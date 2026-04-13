import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["SMA_7"] = df["close"].rolling(window=7, min_periods=1).mean()
    df["SMA_21"] = df["close"].rolling(window=21, min_periods=1).mean()

    delta = df["close"].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=14, min_periods=1).mean()
    avg_loss = loss.rolling(window=14, min_periods=1).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    df["RSI_14"] = 100 - (100 / (1 + rs))

    ema_12 = df["close"].ewm(span=12, adjust=False).mean()
    ema_26 = df["close"].ewm(span=26, adjust=False).mean()

    df["MACD"] = ema_12 - ema_26
    df["MACD_signal"] = df["MACD"].ewm(span=9, adjust=False).mean()

    sma_20 = df["close"].rolling(window=20, min_periods=1).mean()
    std_20 = df["close"].rolling(window=20, min_periods=1).std().fillna(0)

    df["BB_upper"] = sma_20 + 2 * std_20
    df["BB_lower"] = sma_20 - 2 * std_20
    df["price_change"] = df["close"].pct_change().fillna(0)
    df["volatility_7"] = df["price_change"].rolling(window=7, min_periods=1).std().fillna(0)

    return df

def scale_features(df: pd.DataFrame, x_cols: list = None, y_col: str = "close"):
    if x_cols is None:
        x_cols = [
            "close", "open", "high", "low", "volume",
            "SMA_7", "SMA_21", "RSI_14", "MACD", "MACD_signal",
            "BB_upper", "BB_lower", "price_change", "volatility_7",
        ]
    x_cols = [c for c in x_cols if c in df.columns]

    features = df[x_cols].values
    x_scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_features = x_scaler.fit_transform(features)
    y_scaler = MinMaxScaler(feature_range=(0, 1))
    target_values = df[[y_col]].values
    y_scaler.fit(target_values)

    return scaled_features, y_scaler, x_scaler, x_cols

def make_sequences(scaled_data: np.ndarray, lookback: int = 60):
    X, y = [], []
    for i in range(lookback, len(scaled_data)):
        X.append(scaled_data[i - lookback : i])
        y.append(scaled_data[i, 0])

    X = np.array(X)
    y = np.array(y)
    return X, y

def split_data(X, y, test_ratio: float = 0.2):
    split_idx = int(len(X) * (1 - test_ratio))
    X_train = X[:split_idx]
    X_test = X[split_idx:]
    y_train = y[:split_idx]
    y_test = y[split_idx:]
    return X_train, X_test, y_train, y_test

def inverse_scale(predictions: np.ndarray, y_scaler) -> np.ndarray:
    predictions = predictions.reshape(-1, 1)
    return y_scaler.inverse_transform(predictions).flatten()
