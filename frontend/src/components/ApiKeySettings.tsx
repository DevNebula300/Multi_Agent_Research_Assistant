import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  OPEN_API_KEY_EVENT,
  clearLlmSettings,
  getLlmApiKey,
  getLlmModel,
  getLlmProvider,
  getProviderMeta,
  LLM_PROVIDERS,
  setLlmApiKey,
  setLlmModel,
  setLlmProvider,
  type LlmProvider,
} from '../api/llmSettings';

type Props = {
  className?: string;
};

export default function ApiKeySettings({ className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [promptReason, setPromptReason] = useState<string | null>(null);
  const [provider, setProvider] = useState<LlmProvider>(() => getLlmProvider());
  const [draftKey, setDraftKey] = useState('');
  const [draftModel, setDraftModel] = useState('');
  const [savedKey, setSavedKey] = useState(() => getLlmApiKey());
  const [showKey, setShowKey] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const meta = useMemo(() => getProviderMeta(provider), [provider]);
  const hasKey = Boolean(savedKey);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      setPromptReason(detail?.reason || 'Add an LLM API key to use AI features.');
      setOpen(true);
    };
    window.addEventListener(OPEN_API_KEY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_API_KEY_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    setProvider(getLlmProvider());
    setDraftKey(getLlmApiKey());
    setDraftModel(getLlmModel());
    setJustSaved(false);
    setShowKey(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleProviderChange = (next: LlmProvider) => {
    const prevDefault = getProviderMeta(provider).defaultModel;
    setProvider(next);
    setJustSaved(false);
    if (!draftModel.trim() || draftModel.trim() === prevDefault) {
      setDraftModel('');
    }
  };

  const handleSave = () => {
    if (!draftKey.trim()) return;
    setLlmProvider(provider);
    setLlmApiKey(draftKey);
    setLlmModel(draftModel);
    setSavedKey(getLlmApiKey());
    setJustSaved(true);
    setPromptReason(null);
    window.setTimeout(() => setOpen(false), 400);
  };

  const handleClear = () => {
    clearLlmSettings();
    setDraftKey('');
    setDraftModel('');
    setSavedKey('');
    setProvider('gemini');
    setJustSaved(false);
  };

  const closeModal = () => {
    setOpen(false);
    setPromptReason(null);
  };

  const modal = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4 py-8">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="api-key-title"
              className="w-full max-w-md rounded-2xl border border-neutral-700 bg-[#1c1f26] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div className="min-w-0">
                  <h3 id="api-key-title" className="text-base font-bold text-white tracking-tight">
                    Add LLM API Key
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Choose any provider. Key stays in this browser only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-shrink-0 h-8 w-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-lg leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="px-5 pb-5 space-y-3.5">
                {promptReason && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 leading-relaxed">
                    {promptReason}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="llm-provider"
                    className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-1.5"
                  >
                    Provider
                  </label>
                  <select
                    id="llm-provider"
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
                    className="w-full rounded-xl border border-neutral-700 bg-[#131314] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  >
                    {LLM_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="llm-api-key"
                    className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-1.5"
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      id="llm-api-key"
                      type={showKey ? 'text' : 'password'}
                      value={draftKey}
                      onChange={(e) => {
                        setDraftKey(e.target.value);
                        setJustSaved(false);
                      }}
                      placeholder={meta.keyHint}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-xl border border-neutral-700 bg-[#131314] px-3 py-2.5 pr-16 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-md hover:bg-neutral-800"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="llm-model"
                    className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-1.5"
                  >
                    Model{' '}
                    <span className="normal-case tracking-normal font-normal text-neutral-500">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="llm-model"
                    type="text"
                    value={draftModel}
                    onChange={(e) => {
                      setDraftModel(e.target.value);
                      setJustSaved(false);
                    }}
                    placeholder={meta.defaultModel}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-neutral-700 bg-[#131314] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono"
                  />
                </div>

                <p className="text-xs text-neutral-500 leading-relaxed">
                  Get a key from{' '}
                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    {meta.docsLabel}
                  </a>
                  . Database Search works without a key; AI tools need one.
                </p>

                {justSaved && savedKey && (
                  <p className="text-xs text-emerald-400">
                    {meta.label} settings saved for this browser.
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!draftKey.trim()}
                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  {hasKey && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPromptReason(null);
          setOpen(true);
        }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
          hasKey
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
        } ${className}`}
        title={hasKey ? `${getProviderMeta().label} key saved` : 'Add your LLM API key'}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
          />
        </svg>
        {hasKey ? 'API Key' : 'Add API Key'}
      </button>
      {modal}
    </>
  );
}
