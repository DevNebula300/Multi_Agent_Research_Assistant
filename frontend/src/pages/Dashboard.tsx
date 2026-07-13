import { useState, useCallback } from 'react';

export interface WorkspacePaper {
  id: string;
  title: string;
  authors: string[] | string;
  published: string;
  summary: string;
}

// ── localStorage helpers (safe, no throws) ──────────────────────
const WS_KEY = 'scholarai_workspace';

function loadWorkspace(): WorkspacePaper[] {
  try {
    const raw = localStorage.getItem(WS_KEY);
    return raw ? (JSON.parse(raw) as WorkspacePaper[]) : [];
  } catch {
    return [];
  }
}

function saveWorkspace(papers: WorkspacePaper[]): void {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(papers));
  } catch { /* quota exceeded — silently ignore */ }
}

// ── Lazy import to avoid circular dep issues ─────────────────────
import {
  DatabaseSearchContent,
  SemanticSearchContent,
  LiteratureReviewContent,
  ClaimVerificationContent,
  GapDetectionContent,
  SummarizationContent,
  PaperComparisonContent,
  DocxExportContent,
} from '../components/DashboardTabs';

// ── Navigation config ────────────────────────────────────────────
const NAV = [
  { id: 'search',   name: 'Database Search',    desc: 'Search arXiv for academic papers' },
  { id: 'semantic', name: 'Semantic Search',     desc: 'Ask questions across indexed papers' },
  { id: 'review',   name: 'Literature Review',   desc: 'Generate comprehensive literature reviews' },
  { id: 'claims',   name: 'Claim Verification',  desc: 'Fact-check claims against papers' },
  { id: 'gaps',     name: 'Gap Detection',        desc: 'Identify unresolved research gaps' },
  { id: 'summary',  name: 'Summarization',        desc: 'Summarize complex academic papers' },
  { id: 'compare',  name: 'Paper Comparison',     desc: 'Compare methodologies and results' },
  { id: 'export',   name: 'DOCX Export',          desc: 'Export research to Word documents' },
] as const;

type TabId = typeof NAV[number]['id'];

// ── Icons (inline SVGs — no framer-motion, no stars) ─────────────
const ICONS: Record<TabId, React.ReactNode> = {
  search:   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" /></svg>,
  semantic: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
  review:   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  claims:   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  gaps:     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  summary:  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>,
  compare:  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
  export:   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
};

// ── Dashboard Component ──────────────────────────────────────────
export default function Dashboard() {
  // Workspace: initialized once from localStorage (lazy init fn avoids re-runs)
  const [workspace, setWorkspace] = useState<WorkspacePaper[]>(() => loadWorkspace());
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem('scholarai_active_tab');
      return (saved as TabId) || 'search';
    } catch {
      return 'search';
    }
  });

  const currentTab = NAV.find(n => n.id === activeTab)!;

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('scholarai_active_tab', tab);
    } catch {}
  }, []);

  // Stable callbacks — no new function references on every render
  const addToWorkspace = useCallback((paper: WorkspacePaper) => {
    setWorkspace(prev => {
      if (prev.some(p => p.id === paper.id)) return prev;
      const next = [...prev, paper];
      saveWorkspace(next);
      return next;
    });
  }, []);

  const removeFromWorkspace = useCallback((paperId: string) => {
    setWorkspace(prev => {
      const next = prev.filter(p => p.id !== paperId);
      saveWorkspace(next);
      return next;
    });
  }, []);

  const workspaceIds = workspace.map(p => p.id);

  const renderContent = () => {
    switch (activeTab) {
      case 'search':   return <DatabaseSearchContent onAddToWorkspace={addToWorkspace} workspaceIds={workspaceIds} />;
      case 'semantic': return <SemanticSearchContent />;
      case 'review':   return <LiteratureReviewContent workspace={workspace} />;
      case 'claims':   return <ClaimVerificationContent workspace={workspace} />;
      case 'gaps':     return <GapDetectionContent workspace={workspace} />;
      case 'summary':  return <SummarizationContent workspace={workspace} />;
      case 'compare':  return <PaperComparisonContent workspace={workspace} />;
      case 'export':   return <DocxExportContent />;
      default:         return null;
    }
  };

  return (
    <div
      className="flex bg-[#131314] overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl"
      style={{ height: 'calc(100vh - 80px)' }}
    >
      {/* ── Sidebar (Cosmic Slate) ─────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-neutral-800 bg-[#1c1f26] text-white">
        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-5">
          <p className="px-5 text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-3 font-sans">
            Research Tools
          </p>
          <nav className="space-y-1 px-3">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-neutral-800 text-white border-l-2 border-indigo-500 shadow-sm'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                }`}
              >
                <span className={activeTab === item.id ? 'text-indigo-400' : 'text-neutral-500'}>
                  {ICONS[item.id]}
                </span>
                <span className="font-sans tracking-wide text-neutral-200">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Workspace Panel */}
        <div className="border-t border-neutral-800 p-4 bg-[#13161c]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase font-sans">
              Workspace
            </span>
            {workspace.length > 0 && (
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {workspace.length}
              </span>
            )}
          </div>

          {workspace.length === 0 ? (
            <p className="text-xs text-neutral-500 leading-relaxed font-sans">
              Add papers from Database Search to begin workspace analysis.
            </p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
              {workspace.map(p => (
                <div
                  key={p.id}
                  className="flex items-start gap-2 bg-[#1c1f26] border border-neutral-800 hover:border-neutral-700 rounded-lg p-2 group transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-neutral-300 line-clamp-2 leading-tight font-sans">
                      {p.title}
                    </p>
                    <span className="text-[9px] font-mono text-indigo-400 mt-0.5 block tracking-wider">
                      {p.id}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromWorkspace(p.id)}
                    className="flex-shrink-0 text-neutral-500 hover:text-red-400 transition-colors text-base leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content (Dark Slate) ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#131314] text-white">
        {/* Tab header */}
        <div className="flex-shrink-0 px-8 pt-7 pb-5 border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-1">
            <span className="p-1.5 bg-[#1c1f26] border border-neutral-800 rounded-lg text-indigo-400 shadow-sm">
              {ICONS[activeTab]}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              {currentTab.name}
            </h2>
          </div>
          <p className="text-sm text-neutral-400 ml-9 font-sans">{currentTab.desc}</p>
        </div>

        {/* Tab body */}
        <div className="flex-1 px-8 py-6 flex flex-col">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
