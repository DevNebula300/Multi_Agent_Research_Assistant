import { useState } from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Literature Search',
    desc: 'Query arXiv using keywords or natural language. Retrieve metadata, authors, publication dates, and abstracts in a high-performance grid.',
  },
  {
    title: 'AI Summarization',
    desc: 'Extract the problem statement, methodology, key findings, and limitations from any scientific paper with a single click.',
  },
  {
    title: 'Literature Reviews',
    desc: 'Synthesize selected papers automatically to draft comprehensive, highly structured literature reviews with proper internal references.',
  },
  {
    title: 'Claim Verification',
    desc: 'Fact-check assertions and scientific claims against your workspace literature, assigning verified, contradicted, or unsupported grounding verdicts.',
  },
  {
    title: 'Gap Detection',
    desc: 'Scan across multiple papers to surface limitations, unresolved conflicts, and open questions in the current research landscape.',
  },
  {
    title: 'DOCX Export',
    desc: 'Download generated lit reviews as clean, formatted Word documents instantly to accelerate your writing workflow.',
  },
];

export default function LandingPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#131314] text-white relative flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* Main Hero Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto z-10">
        {/* Sub-badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-medium tracking-wide text-neutral-400 mb-8 animate-fade-in shadow-inner">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Multi-Agent Academic Assistant
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Supercharge Your Academic Research with{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
            ScholarAI
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mb-10 leading-relaxed">
          An advanced multi-agent workspace to search, summarize, compare, and verify research literature instantly.
        </p>

        {/* CTA Button */}
        <div className="mb-14">
          <Link
            to="/dashboard"
            className="relative group inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border border-[#333333] text-white font-semibold text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
          >
            Open Workspace
            <svg
              className="h-4 w-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Accordion / Dropdown Features */}
        <div className="w-full max-w-2xl bg-[#1e1e21] border border-[#333333] rounded-2xl overflow-hidden transition-all duration-300 shadow-md relative">
          {/* Subtle quill and inkpot icon at top-left corner of the pill container */}
          <div className="absolute top-4 left-3 pointer-events-none opacity-50">
            <svg className="h-4 w-4 text-[#8a7f70]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <title>Quill and Inkpot</title>
              {/* Inkpot base */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 19c0 1.1.9 2 2 2h8a2 2 0 002-2v-4H6v4z" />
              {/* Inkpot neck */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15v-2h6v2M10 13h4" />
              {/* Quill feather */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 3c-2.5.5-5 3-6.5 5.5S10.5 13 10.5 13s2.5-.5 5-2.5S19.5 5.5 20 3c-2 .5-4 .5-6 0z" />
              {/* Quill line detail */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10l1.5 1.5" />
            </svg>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full pl-9 pr-6 py-4 flex items-center justify-between text-left text-neutral-200 hover:text-white font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              How it works & Features
            </span>
            <svg
              className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isOpen ? 'max-h-[800px] border-t border-neutral-800/60' : 'max-h-0'
            }`}
          >
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
              {features.map((f, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-200 text-sm">{f.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-neutral-900 bg-[#0e0e10] text-center z-10">
        <p className="text-xs text-neutral-500 font-mono tracking-wider">
          SCHOLARAI RESEARCH PLATFORM © 2026 // POWERED BY MULTI-AGENT SYNTHESIS
        </p>
      </footer>
    </div>
  );
}
