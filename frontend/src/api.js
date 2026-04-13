import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getCoins = async () => {
  const { data } = await apiClient.get('/coins');
  return data.coins;
};

export const predictPrices = async (payload) => {
  const { data } = await apiClient.post('/predict', payload);
  return data;
};
