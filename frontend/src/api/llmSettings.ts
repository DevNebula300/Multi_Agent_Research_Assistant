/** Client-side LLM provider + API key settings (localStorage). */

export type LlmProvider = 'gemini' | 'anthropic' | 'openai' | 'openrouter';

export const LLM_PROVIDERS: {
  id: LlmProvider;
  label: string;
  keyHint: string;
  docsUrl: string;
  docsLabel: string;
  defaultModel: string;
}[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    keyHint: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    docsLabel: 'Google AI Studio',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyHint: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Anthropic Console',
    defaultModel: 'claude-3-5-haiku-latest',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyHint: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'OpenAI Platform',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyHint: 'sk-or-...',
    docsUrl: 'https://openrouter.ai/keys',
    docsLabel: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
  },
];

const PROVIDER_KEY = 'scholarai_llm_provider';
const API_KEY_KEY = 'scholarai_llm_api_key';
const MODEL_KEY = 'scholarai_llm_model';
const LEGACY_GEMINI_KEY = 'scholarai_gemini_api_key';

function read(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() || '';
  } catch {
    return '';
  }
}

function write(key: string, value: string): void {
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(key, trimmed);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getLlmProvider(): LlmProvider {
  const raw = read(PROVIDER_KEY) as LlmProvider;
  if (LLM_PROVIDERS.some((p) => p.id === raw)) return raw;

  // Migrate from Gemini-only BYOK
  if (read(LEGACY_GEMINI_KEY)) return 'gemini';
  return 'gemini';
}

export function setLlmProvider(provider: LlmProvider): void {
  write(PROVIDER_KEY, provider);
}

export function getLlmApiKey(): string {
  const key = read(API_KEY_KEY);
  if (key) return key;
  // Migrate legacy Gemini key into the shared slot
  return read(LEGACY_GEMINI_KEY);
}

export function setLlmApiKey(key: string): void {
  write(API_KEY_KEY, key);
  if (key.trim()) remove(LEGACY_GEMINI_KEY);
}

export function getLlmModel(): string {
  return read(MODEL_KEY);
}

export function setLlmModel(model: string): void {
  write(MODEL_KEY, model);
}

export function clearLlmSettings(): void {
  remove(PROVIDER_KEY);
  remove(API_KEY_KEY);
  remove(MODEL_KEY);
  remove(LEGACY_GEMINI_KEY);
}

export function hasLlmApiKey(): boolean {
  return Boolean(getLlmApiKey());
}

export function getProviderMeta(provider: LlmProvider = getLlmProvider()) {
  return LLM_PROVIDERS.find((p) => p.id === provider) ?? LLM_PROVIDERS[0];
}

/** Snapshot used by the axios interceptor. */
export function getLlmRequestHeaders(): {
  provider: LlmProvider;
  apiKey: string;
  model: string;
} {
  return {
    provider: getLlmProvider(),
    apiKey: getLlmApiKey(),
    model: getLlmModel(),
  };
}

/** Custom event so any screen can open the API key modal. */
export const OPEN_API_KEY_EVENT = 'scholarai:open-api-key';

export function openApiKeyModal(
  reason = 'Add an LLM API key to use AI features.',
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OPEN_API_KEY_EVENT, { detail: { reason } }),
  );
}

/**
 * Call before any AI action. Opens the API key modal and returns false
 * when no client key is saved yet.
 */
export function ensureLlmApiKey(
  reason = 'This tool needs an LLM API key. Add one to continue.',
): boolean {
  if (hasLlmApiKey()) return true;
  openApiKeyModal(reason);
  return false;
}
