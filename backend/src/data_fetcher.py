import os
import time
import requests

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from pathlib import Path
from typing import Optional, cast


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

class Fetcher:
    API_URL = "https://api.coingecko.com/api/v3"

    def __init__(self):
        pass

    @staticmethod
    def clean_symbol(coin: str) -> str:
        return coin.strip().upper()

    def find_id(self, symbol: str) -> str:

        url = f"{self.API_URL}/search"
        params = {"query": symbol.strip()}
        res = requests.get(url, params=params, timeout=15)
        if res.status_code == 200:
            data = res.json()
            if data.get("coins") and len(data["coins"]) > 0:
                return data["coins"][0]["id"]
        return symbol.lower()

    def fetch_market_data(self, coin_id: str, days: int, vs_currency: str = "usd") -> dict | None:

        url = f"{self.API_URL}/coins/{coin_id}/market_chart"
        params = {"vs_currency": vs_currency, "days": str(days), "interval": "daily"}
        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            print("[WARN] CoinGecko rate limit hit. Waiting 60s...")
            time.sleep(60)
            response = requests.get(url, params=params, timeout=30)
            if response.status_code == 200:
                return response.json()
        elif response.status_code == 404:
            print(f"[WARN] CoinGecko ID '{coin_id}' not found.")
        else:
            print(f"[WARN] CoinGecko returned status {response.status_code}")
        return None

    def fetch_candles(self, coin_id: str, days: int, vs_currency: str = "usd") -> list | None:
        url = f"{self.API_URL}/coins/{coin_id}/ohlc"
        params = {"vs_currency": vs_currency, "days": str(days)}
        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 200:
            return response.json()
        return None

    def create_dataframe(self, coin: str, days: int, vs_currency: str = "usd") -> pd.DataFrame | None:
        coin_id = self.find_id(coin)
        market_data = self.fetch_market_data(coin_id, days, vs_currency)
        if not market_data:
            return None

        prices = market_data.get("prices", [])
        volumes = market_data.get("total_volumes", [])

        if not prices:
            return None
        price_df = pd.DataFrame(prices, columns=["timestamp", "close"])
        vol_df = pd.DataFrame(volumes, columns=["timestamp", "volume"])

        df = price_df.merge(vol_df, on="timestamp", how="left")
        df["date"] = pd.to_datetime(df["timestamp"], unit="ms")
        df["volume"] = df["volume"].fillna(0)
        ohlc_data = self.fetch_candles(coin_id, days, vs_currency)
        if ohlc_data:
            ohlc_df = pd.DataFrame(ohlc_data, columns=["timestamp", "open", "high", "low", "ohlc_close"])
            ohlc_dates = cast(pd.Series, pd.to_datetime(ohlc_df["timestamp"], unit="ms"))
            ohlc_df["ohlc_date"] = ohlc_dates.dt.date
            df["date_key"] = df["date"].dt.date
            daily_ohlc = ohlc_df.groupby("ohlc_date").agg(
                open=("open", "first"),
                high=("high", "max"),
                low=("low", "min"),
            ).reset_index()
            daily_ohlc.rename(columns={"ohlc_date": "date_key"}, inplace=True)

            df = df.merge(daily_ohlc, on="date_key", how="left")
            df.drop(columns=["date_key"], inplace=True)
            df["open"] = df["open"].fillna(df["close"])
            df["high"] = df["high"].fillna(df["close"])
            df["low"] = df["low"].fillna(df["close"])
        else:
            df["open"] = df["close"].shift(1).fillna(df["close"])
            df["high"] = df["close"] * (1 + abs(df["close"].pct_change().fillna(0)) * 0.5)
            df["low"] = df["close"] * (1 - abs(df["close"].pct_change().fillna(0)) * 0.5)
        df_frame = cast(pd.DataFrame, df[["date", "open", "high", "low", "close", "volume"]])
        df_frame = df_frame.sort_values("date").reset_index(drop=True)
        df_frame = df_frame.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)

        return df_frame

    def get_history(
        self,
        coin: str,
        period: str = "1DAY",
        days: int = 365,
        use_cache: bool = True,
    ) -> pd.DataFrame:
        coin = self.clean_symbol(coin)
        cache_file = DATA_DIR / f"{coin}_{period}_{days}d.csv"
        if use_cache and cache_file.exists():
            file_age = datetime.now().timestamp() - cache_file.stat().st_mtime
            if file_age < 3600:
                print(f"[CACHE] Using cached data: {cache_file.name}")
                df = pd.read_csv(cache_file, parse_dates=["date"])
                return df

        print(f"[FETCH] Fetching {coin} data ({days} days)...")

        df = self.create_dataframe(coin, days=min(days, 365))
        if df is not None and len(df) > 0:
            source = "CoinGecko"
            print(f"[OK] CoinGecko: {len(df)} records fetched")
        else:
            raise ValueError(
                f"No data found for {coin} via CoinGecko. "
                "Check that the symbol is valid or you may be rate limited."
            )

        df = cast(pd.DataFrame, df)
        df["source"] = source
        df.to_csv(cache_file, index=False)
        print(f"[SAVED] Cached {len(df)} records to {cache_file.name}")

        return df

    def get_price(self, coin: str) -> dict | None:
        coin = self.clean_symbol(coin)
        coin_id = self.find_id(coin)
        url = f"{self.API_URL}/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_24hr_vol": "true",
        }
        response = requests.get(url, params=params, timeout=15)
        if response.status_code != 200:
            return None
        data = response.json().get(coin_id, {})
        return {
            "coin": coin,
            "price": data.get("usd"),
            "change_24h": data.get("usd_24h_change"),
            "volume_24h": data.get("usd_24h_vol"),
        }