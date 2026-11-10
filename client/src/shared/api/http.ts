import axios from 'axios';
import { API_URL } from '@shared/config';

export const http = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  withCredentials: true,
});
