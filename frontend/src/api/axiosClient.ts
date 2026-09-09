import axios from 'axios';
import {
  getLlmRequestHeaders,
  openApiKeyModal,
} from './llmSettings';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach client LLM provider + key (+ optional model) on every API call.
axiosClient.interceptors.request.use((config) => {
  const { provider, apiKey, model } = getLlmRequestHeaders();
  if (apiKey) {
    config.headers.set('X-LLM-Provider', provider);
    config.headers.set('X-LLM-Api-Key', apiKey);
    if (model) {
      config.headers.set('X-LLM-Model', model);
    }
  }
  return config;
});

function looksLikeAuthError(status?: number, detail?: string): boolean {
  if (status === 401 || status === 403) return true;
  if (!detail) return false;
  const lower = detail.toLowerCase();
  return (
    lower.includes('api key') ||
    lower.includes('unauthenticated') ||
    lower.includes('authentication') ||
    lower.includes('invalid authentication') ||
    lower.includes('no llm api key')
  );
}

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      const detailText = typeof detail === 'string' ? detail : '';
      if (looksLikeAuthError(status, detailText)) {
        openApiKeyModal(
          detailText || 'Your LLM API key is missing or invalid. Please add a valid key.',
        );
      }
    }
    return Promise.reject(error);
  },
);

/** Pull a readable message out of FastAPI / Axios errors. */
export function getApiErrorMessage(err: unknown, fallback = 'Request failed.'): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default axiosClient;
