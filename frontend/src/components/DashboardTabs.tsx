/**
 * DashboardTabs.tsx
 * All tab content components for ScholarAI.
 *
 * Rules applied to prevent infinite loops:
 *   - NO side-effects in render body (no setState / fetch outside handlers)
 *   - localStorage reads via lazy useState(() => ...) initializers ONLY
 *   - No useEffect that depend on frequently-changing object/array references
 *   - All callbacks are pure event handlers triggered by user action
 */
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  searchArxivPubmed,
  askQuestion,
  generateLiteratureReview,
  verifyClaim,
  detectGaps,
  summarizePapers,
  comparePapers,
  exportDocx,
} from '../api/researchService';
import type { WorkspacePaper } from '../pages/Dashboard';

// ─────────────────────────────────────────────────────────────────
// localStorage helpers for persisting analysis results
// ─────────────────────────────────────────────────────────────────

function loadResult<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveResult(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota issues */ }
}

function loadString(key: string, defaultValue: string = ''): string {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 px-4 py-3 bg-red-950/20 border border-red-900/50 rounded-xl text-red-400 flex items-start gap-3 flex-shrink-0">
      <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-[#1c1f26] border border-neutral-800 rounded-xl p-5">
      <div className="h-4 bg-neutral-800 rounded w-3/4 mb-3" />
      <div className="flex gap-3 mb-3">
        <div className="h-3 bg-neutral-800 rounded w-1/4" />
        <div className="h-3 bg-neutral-800 rounded w-1/5" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-neutral-800 rounded" />
        <div className="h-3 bg-neutral-800 rounded w-5/6" />
      </div>
    </div>
  );
}

function MarkdownOutput({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-neutral-300 font-sans
      prose-headings:text-white prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight
      prose-p:text-neutral-300 prose-p:leading-relaxed
      prose-li:text-neutral-300
      prose-strong:text-white
      prose-code:text-blue-400 prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.82em] font-mono
      prose-pre:bg-[#131314] prose-pre:border prose-pre:border-neutral-800 prose-pre:rounded-xl prose-pre:text-neutral-200
      prose-blockquote:border-indigo-500 prose-blockquote:text-neutral-400 prose-blockquote:italic
      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline hover:text-indigo-300
      prose-hr:border-neutral-800">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

/** Shown in analysis tabs when no workspace papers exist */
function EmptyWorkspace() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-[#1c1f26] border border-neutral-800 flex items-center justify-center mb-5 shadow-sm">
        <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
        </svg>
      </div>
      <p className="text-lg font-bold text-white mb-2 tracking-wide font-sans">Workspace Empty</p>
      <p className="text-sm text-neutral-400 max-w-xs leading-relaxed font-sans">
        Head to <strong className="text-white">Database Search</strong>, run a search, and click{' '}
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20">
          + Add
        </span>{' '}
        on any paper card to enlist it.
      </p>
    </div>
  );
}

/** Checkbox list of workspace papers */
function PaperSelector({
  workspace,
  selected,
  onToggle,
}: {
  workspace: WorkspacePaper[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mb-5 flex-shrink-0">
      <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-2.5 font-sans">
        Select papers from your workspace
      </p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {workspace.map(p => {
          const checked = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-200 ${
                checked
                  ? 'bg-indigo-950/20 border-indigo-500/50 text-white'
                  : 'bg-[#1c1f26] border-neutral-800 hover:bg-neutral-800/40 hover:border-neutral-700 text-neutral-300'
              }`}
            >
              <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                checked ? 'bg-indigo-600 border-indigo-600' : 'border-neutral-600'
              }`}>
                {checked && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans font-semibold truncate">{p.title}</p>
                <p className="text-[10px] font-mono text-indigo-400">{p.id}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  label,
  loadingLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-sans font-bold rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex-shrink-0 border-0"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingLabel}
        </span>
      ) : label}
    </button>
  );
}

const formatGapsMarkdown = (result: any): string => {
  if (!result) return '';
  if (typeof result === 'string') return result;

  let md = '';
  if (result.summary) {
    md += `### Summary of Gaps\n${result.summary}\n\n`;
  }

  if (Array.isArray(result.gaps) && result.gaps.length > 0) {
    md += `### Recurring Research Themes & Gaps\n\n`;
    result.gaps.forEach((gap: any, index: number) => {
      md += `#### ${index + 1}. ${gap.theme || 'Untitled Theme'}\n`;
      md += `* **Description**: ${gap.description || 'No description provided.'}\n`;
      if (Array.isArray(gap.supporting_paper_ids) && gap.supporting_paper_ids.length > 0) {
        md += `* **Supporting Papers**: ${gap.supporting_paper_ids.join(', ')}\n`;
      }
      md += `\n`;
    });
  } else if (result.raw_response) {
    md += `### Raw Analysis\n${result.raw_response}\n`;
  } else if (result.gaps && typeof result.gaps === 'string') {
    md += result.gaps;
  } else {
    md += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }
  return md;
};

const formatClaimsMarkdown = (result: any): string => {
  if (!result) return '';
  if (typeof result === 'string') return result;

  let md = '';
  if (result.grounding_score !== undefined) {
    md += `### Grounding Score: **${Math.round(result.grounding_score * 100)}%**\n\n`;
  }

  if (Array.isArray(result.claims) && result.claims.length > 0) {
    md += `| Claim | Cited ID | Verdict | Explanation |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    result.claims.forEach((c: any) => {
      const verdictEmoji = c.verdict === 'supported' ? '✅ Supported' : c.verdict === 'partially_supported' ? '⚠️ Partially Supported' : '❌ Unsupported';
      md += `| ${c.claim || 'No claim text'} | \`${c.cited_id || 'N/A'}\` | ${verdictEmoji} | ${c.explanation || ''} |\n`;
    });
    md += '\n';
  } else {
    md += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }
  return md;
};

const formatCompareMarkdown = (result: any): string => {
  if (!result) return '';
  if (typeof result === 'string') return result;

  let md = '';
  if (result.table_markdown) {
    md += `${result.table_markdown}\n\n`;
  }
  if (result.narrative) {
    md += `### Narrative Analysis\n${result.narrative}\n`;
  }
  if (!md) {
    md += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }
  return md;
};

/** Result area that expands naturally without inner scrollbar */
function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[400px] bg-[#1c1f26] border border-neutral-800 rounded-xl p-6 text-white">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DATABASE SEARCH
// ─────────────────────────────────────────────────────────────────

interface DBSearchProps {
  onAddToWorkspace: (p: WorkspacePaper) => void;
  workspaceIds: string[];
}

export function DatabaseSearchContent({ onAddToWorkspace, workspaceIds }: DBSearchProps) {
  const [query, setQuery] = useState(() => loadString('scholarai_search_query'));
  const [source, setSource] = useState<'arxiv' | 'pubmed'>(() => (loadString('scholarai_search_source') as any) || 'arxiv');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WorkspacePaper[]>(() => loadResult('scholarai_search_results') || []);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    saveString('scholarai_search_query', val);
  }, []);

  const handleSourceChange = useCallback((val: 'arxiv' | 'pubmed') => {
    setSource(val);
    saveString('scholarai_search_source', val);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setExpandedId(null);
    try {
      const data = await searchArxivPubmed(query, source);
      const papers = data?.papers || data?.results || [];
      setResults(papers);
      saveResult('scholarai_search_results', papers);
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
      setResults([]);
      saveResult('scholarai_search_results', []);
    } finally {
      setIsLoading(false);
    }
  }, [query, source]);

  return (
    <div className="flex flex-col h-full gap-4 text-white">
      {/* Search bar */}
      <div className="flex gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 border border-neutral-800 rounded-xl bg-[#1c1f26] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-sans"
            placeholder="Search papers by topic, author, keyword…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select
          value={source}
          onChange={e => handleSourceChange(e.target.value as 'arxiv' | 'pubmed')}
          className="px-3 py-3 border border-neutral-800 rounded-xl bg-[#1c1f26] text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm cursor-pointer font-sans"
        >
          <option value="arxiv">arXiv</option>
          <option value="pubmed">PubMed</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-sans font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] whitespace-nowrap shadow-sm border-0"
        >
          {isLoading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Results */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3 pb-4">
            {results.map((paper, idx) => {
              const pid = paper.id || String(idx);
              const expanded = expandedId === pid;
              const inWS = workspaceIds.includes(pid);
              return (
                <div
                  key={pid}
                  className="bg-[#1c1f26] border border-neutral-800 rounded-xl shadow-sm hover:border-neutral-700 transition-all duration-200"
                >
                  <div className="p-5">
                    {/* Title */}
                    <h3 className="font-sans font-bold text-white text-[15px] leading-snug mb-2.5">
                      {paper.title}
                    </h3>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-neutral-400">
                      <span className="font-mono text-xs tracking-wider text-blue-400 bg-neutral-800 px-2 py-0.5 rounded">
                        {pid}
                      </span>
                      <span className="flex items-center gap-1.5 font-sans">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        {Array.isArray(paper.authors) ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? '…' : '') : paper.authors}
                      </span>
                      <span className="font-sans">{paper.published}</span>
                    </div>

                    {/* Abstract */}
                    <p className={`text-sm text-neutral-300 leading-relaxed font-sans transition-all duration-300 ${
                      expanded ? '' : 'line-clamp-3'
                    }`}>
                      {paper.summary}
                    </p>

                    {/* Expanded ID callout */}
                    {expanded && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-indigo-950/20 border border-indigo-900/50 rounded-lg text-xs text-indigo-300 font-sans">
                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                        </svg>
                        <span>Paper ID: <strong className="font-mono text-blue-400">{pid}</strong> — automatically used when added to workspace</span>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between">
                      <button
                        onClick={() => setExpandedId(expanded ? null : pid)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                      >
                        {expanded ? (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                            Collapse
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                            Read Abstract
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => !inWS && onAddToWorkspace(paper)}
                        disabled={inWS}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border-0 ${
                          inWS
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-sm'
                        }`}
                      >
                        {inWS ? (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            In Workspace
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Add to Workspace
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-ink-400">
              <svg className="h-12 w-12 text-ivory-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
              </svg>
              <p className="text-sm font-medium text-ink-600">{query ? 'No papers found' : 'Enter a topic to begin searching'}</p>
              {query && <p className="text-xs mt-1 text-ink-400">Try a broader search term or switch sources</p>}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SEMANTIC SEARCH (Ask AI)
// ─────────────────────────────────────────────────────────────────

export function SemanticSearchContent() {
  const [query, setQuery] = useState(() => loadString('scholarai_ask_query'));
  const [isLoading, setIsLoading] = useState(false);
  // Persist last result across refreshes
  const [result, setResult] = useState<any>(() => loadResult('scholarai_ask'));
  const [error, setError] = useState<string | null>(null);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    saveString('scholarai_ask_query', val);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await askQuestion(query, 5);
      setResult(data);
      saveResult('scholarai_ask', data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-3 flex-shrink-0">
        <input
          type="text"
          className="flex-1 px-4 py-3 border border-neutral-800 rounded-xl bg-[#1c1f26] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-sans"
          placeholder="Ask a question across all indexed papers…"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-sans font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] whitespace-nowrap shadow-sm border-0"
        >
          {isLoading ? 'Asking…' : 'Ask AI'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <ResultBox>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3,4].map(i => <div key={i} className={`h-4 bg-ivory-300 rounded ${i % 3 === 0 ? 'w-2/3' : 'w-full'}`} />)}
          </div>
        ) : result ? (
          <div className="space-y-6">
            <div className="pb-5 border-b border-ivory-300">
              <p className="text-[10px] font-bold tracking-widest text-ink-400 uppercase mb-3">AI Answer</p>
              <MarkdownOutput content={result.answer || '*No answer returned.*'} />
            </div>
            {result.sources && result.sources.length > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-widest text-ink-400 uppercase mb-3">Sources</p>
                <div className="space-y-3">
                  {result.sources.map((s: any, i: number) => (
                    <div key={i} className="px-4 py-3 bg-ivory-100 border border-ivory-300 rounded-xl">
                      <p className="text-sm font-semibold text-ink-800">{s.title || 'Unknown Source'}</p>
                      <p className="text-xs text-ink-500 mt-1 line-clamp-2">{s.content || s.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-ink-400">
            <svg className="h-12 w-12 text-ivory-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <p className="text-sm">Ask anything — AI searches across all indexed papers.</p>
          </div>
        )}
      </ResultBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LITERATURE REVIEW
// ─────────────────────────────────────────────────────────────────

export function LiteratureReviewContent({ workspace }: { workspace: WorkspacePaper[] }) {
  const [topic, setTopic] = useState(() => loadString('scholarai_litreview_topic'));
  const [selected, setSelected] = useState<string[]>(() => loadResult('scholarai_litreview_selected') || []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(() => loadResult('scholarai_litreview'));
  const [error, setError] = useState<string | null>(null);

  const handleTopicChange = useCallback((val: string) => {
    setTopic(val);
    saveString('scholarai_litreview_topic', val);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveResult('scholarai_litreview_selected', next);
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim() || selected.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateLiteratureReview(topic, selected, true);
      setResult(data);
      saveResult('scholarai_litreview', data);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setIsLoading(false);
    }
  }, [topic, selected]);

  if (workspace.length === 0) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0 space-y-3">
        <input
          type="text"
          className="w-full px-4 py-3 border border-neutral-800 rounded-xl bg-[#1c1f26] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-sans"
          placeholder="Research Topic (e.g. Vision Transformers in Medical Imaging)"
          value={topic}
          onChange={e => handleTopicChange(e.target.value)}
        />
        <PaperSelector workspace={workspace} selected={selected} onToggle={toggle} />
        <ActionButton
          onClick={handleGenerate}
          disabled={isLoading || !topic.trim() || selected.length === 0}
          loading={isLoading}
          label={`Generate Review (${selected.length} paper${selected.length !== 1 ? 's' : ''})`}
          loadingLabel="Generating Literature Review…"
        />
      </div>

      {error && <ErrorBanner message={error} />}

      <ResultBox>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className={`h-4 bg-ivory-300 rounded ${i % 2 === 0 ? 'w-5/6' : 'w-full'}`} />)}
          </div>
        ) : result ? (
          <div className="space-y-4">
            {result.docx_filename && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                DOCX saved as <strong className="font-mono">{result.docx_filename}</strong> — download from <em>DOCX Export</em> tab.
              </div>
            )}
            <MarkdownOutput content={result.lit_review_markdown || result.review || JSON.stringify(result, null, 2)} />
          </div>
        ) : (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-ink-400">
            <svg className="h-12 w-12 text-ivory-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm">Select papers and a topic, then generate a full review.</p>
          </div>
        )}
      </ResultBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CLAIM VERIFICATION
// ─────────────────────────────────────────────────────────────────

export function ClaimVerificationContent({ workspace }: { workspace: WorkspacePaper[] }) {
  const [claim, setClaim] = useState(() => loadString('scholarai_claims_claim'));
  const [selected, setSelected] = useState<string[]>(() => loadResult('scholarai_claims_selected') || []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(() => loadResult('scholarai_claims'));
  const [error, setError] = useState<string | null>(null);

  const handleClaimChange = useCallback((val: string) => {
    setClaim(val);
    saveString('scholarai_claims_claim', val);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveResult('scholarai_claims_selected', next);
      return next;
    });
  }, []);

  const handleVerify = useCallback(async () => {
    if (!claim.trim() || selected.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await verifyClaim(claim, selected);
      setResult(data);
      saveResult('scholarai_claims', data);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  }, [claim, selected]);

  const status = result?.overall_status || result?.status;

  if (workspace.length === 0) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0 space-y-3">
        <textarea
          className="w-full px-4 py-3 border border-neutral-800 rounded-xl bg-[#1c1f26] text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm resize-none font-sans"
          rows={3}
          placeholder="Paste a scientific claim to fact-check against your papers…"
          value={claim}
          onChange={e => handleClaimChange(e.target.value)}
        />
        <PaperSelector workspace={workspace} selected={selected} onToggle={toggle} />
        <ActionButton
          onClick={handleVerify}
          disabled={isLoading || !claim.trim() || selected.length === 0}
          loading={isLoading}
          label="Verify Claim"
          loadingLabel="Verifying…"
        />
      </div>

      {error && <ErrorBanner message={error} />}

      <ResultBox>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-ivory-300 rounded w-full" />)}
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div>
              {status === 'Verified' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 font-bold text-sm rounded-full border border-green-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Verified
                </span>
              ) : status === 'Contradicted' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 font-bold text-sm rounded-full border border-red-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Contradicted
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 font-bold text-sm rounded-full border border-yellow-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  Unverified
                </span>
              )}
            </div>
            <MarkdownOutput content={formatClaimsMarkdown(result)} />
          </div>
        ) : (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-neutral-500">
            <svg className="h-12 w-12 text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-sans">Enter a claim and select papers to verify grounding against literature.</p>
          </div>
        )}
      </ResultBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// GAP DETECTION
// ─────────────────────────────────────────────────────────────────

export function GapDetectionContent({ workspace }: { workspace: WorkspacePaper[] }) {
  const [selected, setSelected] = useState<string[]>(() => loadResult('scholarai_gaps_selected') || []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(() => loadResult('scholarai_gaps'));
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveResult('scholarai_gaps_selected', next);
      return next;
    });
  }, []);

  const handleDetect = useCallback(async () => {
    if (selected.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await detectGaps(selected);
      setResult(data);
      saveResult('scholarai_gaps', data);
    } catch (err: any) {
      setError(err.message || 'Detection failed.');
    } finally {
      setIsLoading(false);
    }
  }, [selected]);

  if (workspace.length === 0) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0 space-y-3">
        <PaperSelector workspace={workspace} selected={selected} onToggle={toggle} />
        <ActionButton
          onClick={handleDetect}
          disabled={isLoading || selected.length === 0}
          loading={isLoading}
          label={`Detect Research Gaps (${selected.length} papers)`}
          loadingLabel="Detecting gaps…"
        />
      </div>
      {error && <ErrorBanner message={error} />}
      <ResultBox>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-ivory-300 rounded w-full" />)}
          </div>
        ) : result ? (
          <MarkdownOutput content={formatGapsMarkdown(result)} />
        ) : (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-ink-400">
            <svg className="h-12 w-12 text-ivory-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm">Select papers to surface unresolved research gaps.</p>
          </div>
        )}
      </ResultBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUMMARIZATION
// ─────────────────────────────────────────────────────────────────

export function SummarizationContent({ workspace }: { workspace: WorkspacePaper[] }) {
  const [selected, setSelected] = useState<string[]>(() => loadResult('scholarai_summary_selected') || []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(() => loadResult('scholarai_summary'));
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveResult('scholarai_summary_selected', next);
      return next;
    });
  }, []);

  const handleSummarize = useCallback(async () => {
    if (selected.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await summarizePapers(selected);
      setResult(data);
      saveResult('scholarai_summary', data);
    } catch (err: any) {
      setError(err.message || 'Summarization failed.');
    } finally {
      setIsLoading(false);
    }
  }, [selected]);

  if (workspace.length === 0) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0 space-y-3">
        <PaperSelector workspace={workspace} selected={selected} onToggle={toggle} />
        <ActionButton
          onClick={handleSummarize}
          disabled={isLoading || selected.length === 0}
          loading={isLoading}
          label={`Summarize ${selected.length} Paper${selected.length !== 1 ? 's' : ''}`}
          loadingLabel="Summarizing…"
        />
      </div>
      {error && <ErrorBanner message={error} />}
      <ResultBox>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3,4].map(i => <div key={i} className={`h-4 bg-ivory-300 rounded ${i % 3 === 0 ? 'w-2/3' : 'w-full'}`} />)}
          </div>
        ) : result ? (
          <div className="space-y-6">
            {Array.isArray(result.cards) ? result.cards.map((card: any, i: number) => (
              <div key={i} className="pb-6 border-b border-ivory-300 last:border-0 last:pb-0">
                <h3 className="font-bold text-ink-900 text-base mb-3">{card.title || `Paper ${i + 1}`}</h3>
                <MarkdownOutput content={
                  card.summary || card.problem
                    ? Object.entries(card)
                        .filter(([k]) => k !== 'id')
                        .map(([k, v]) => `**${k.replace(/_/g, ' ')}:** ${v}`)
                        .join('\n\n')
                    : JSON.stringify(card, null, 2)
                } />
              </div>
            )) : (
              <MarkdownOutput content={`\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``} />
            )}
          </div>
        ) : (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-ink-400">
            <svg className="h-12 w-12 text-ivory-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            <p className="text-sm">Select papers to generate structured summary cards.</p>
          </div>
        )}
      </ResultBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAPER COMPARISON
// ─────────────────────────────────────────────────────────────────

export function PaperComparisonContent({ workspace }: { workspace: WorkspacePaper[] }) {
  const [selected, setSelected] = useState<string[]>(() => loadResult('scholarai_compare_selected') || []);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(() => loadResult('scholarai_compare'));
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveResult('scholarai_compare_selected', next);
      return next;
    });
  }, []);

  const handleCompare = useCallback(async () => {
    if (selected.length < 2) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await comparePapers(selected);
      setResult(data);
      saveResult('scholarai_compare', data);
    } catch (err: any) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  }, [selected]);

  if (workspace.length === 0) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0 space-y-3">
        {selected.length === 1 && (
          <p className="text-xs text-indigo-400 bg-indigo-950/20 border border-indigo-900/50 px-3 py-2 rounded-xl flex items-center gap-2">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            Select at least 2 papers to compare.
          </p>
        )}
        <PaperSelector workspace={workspace} selected={selected} onToggle={toggle} />
        <ActionButton
          onClick={handleCompare}
          disabled={isLoading || selected.length < 2}
          loading={isLoading}
          label={`Compare ${selected.length} Papers`}
          loadingLabel="Comparing…"
        />
      </div>
      {error && <ErrorBanner message={error} />}
      <ResultBox>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-4 bg-neutral-800 rounded w-full" />)}
          </div>
        ) : result ? (
          <div className="space-y-8">
            {/* Grid for comparison cards */}
            {Array.isArray(result.cards) && result.cards.length > 0 && (
              <div>
                <h3 className="font-sans font-bold text-base text-white mb-4 uppercase tracking-widest">
                  Comparison Matrix
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.cards.map((card: any) => (
                    <div
                      key={card.id}
                      className="bg-[#1c1f26] border border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col gap-4 transition-all duration-300"
                    >
                      <div className="border-b border-neutral-800 pb-3">
                        <span className="font-mono text-xs text-blue-400 font-bold tracking-widest bg-neutral-800 px-2.5 py-0.5 rounded">
                          ID: {card.id}
                        </span>
                        <h4 className="font-sans font-bold text-base text-white mt-3 leading-snug">
                          {card.title}
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {/* Problem */}
                        <div>
                          <span className="inline-block text-[10px] font-mono tracking-wider font-bold bg-neutral-800 text-blue-400 px-2 py-0.5 rounded mb-1.5 uppercase">
                            The Problem
                          </span>
                          <p className="text-sm text-neutral-300 leading-relaxed font-sans">{card.problem || 'Not specified'}</p>
                        </div>

                        {/* Methodology */}
                        <div>
                          <span className="inline-block text-[10px] font-mono tracking-wider font-bold bg-neutral-800 text-purple-400 px-2 py-0.5 rounded mb-1.5 uppercase">
                            The Methodology
                          </span>
                          <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                            <span className="block mb-1"><strong className="text-white font-semibold">Approach:</strong> {card.method || 'Not specified'}</span>
                            {card.dataset && <span className="block mb-1"><strong className="text-white font-semibold">Dataset:</strong> {card.dataset}</span>}
                            {card.metrics && <span className="block"><strong className="text-white font-semibold">Metrics:</strong> {card.metrics}</span>}
                          </p>
                        </div>

                        {/* Key Findings */}
                        <div>
                          <span className="inline-block text-[10px] font-mono tracking-wider font-bold bg-neutral-800 text-emerald-400 px-2 py-0.5 rounded mb-1.5 uppercase">
                            Key Findings
                          </span>
                          <p className="text-sm text-neutral-300 leading-relaxed font-sans">{card.findings || 'Not specified'}</p>
                        </div>

                        {/* System Limitations */}
                        <div>
                          <span className="inline-block text-[10px] font-mono tracking-wider font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded mb-1.5 uppercase">
                            System Limitations
                          </span>
                          <p className="text-sm text-neutral-300 leading-relaxed font-sans">{card.limitations || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI synthesis narrative */}
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="font-sans font-bold text-base text-white mb-4 uppercase tracking-widest">
                Comparative Synthesis
              </h3>
              <div className="bg-[#1c1f26] border border-neutral-800 rounded-xl p-6 shadow-sm">
                <MarkdownOutput content={formatCompareMarkdown(result)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-neutral-500">
            <svg className="h-12 w-12 text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm font-sans italic">Select 2+ papers to compare their methods and findings.</p>
          </div>
        )}
      </ResultBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DOCX EXPORT
// ─────────────────────────────────────────────────────────────────

export function DocxExportContent() {
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!filename.trim()) return;
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const blob = await exportDocx(filename.trim());
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename.trim());
      document.body.appendChild(a);
      a.click();
      a.parentNode?.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Download failed.');
    } finally {
      setIsLoading(false);
    }
  }, [filename]);

  return (
    <div className="flex flex-col h-full items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#1c1f26] border border-neutral-800 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <h3 className="font-sans font-bold text-white text-xl mb-1">Download DOCX</h3>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed font-sans">
          Enter the filename shown in the Literature Review result to download your document.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            className="w-full px-4 py-3 border border-neutral-800 rounded-xl bg-[#131314] text-sm font-mono text-center text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="lit_review_xxxx.docx"
            value={filename}
            onChange={e => setFilename(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleExport()}
          />
          <button
            onClick={handleExport}
            disabled={isLoading || !filename.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-sans font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-sm border-0"
          >
            {isLoading ? 'Downloading…' : 'Download DOCX'}
          </button>
        </div>
        {success && (
          <p className="mt-4 text-sm text-green-400 font-medium flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Download started!
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400 font-medium flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
