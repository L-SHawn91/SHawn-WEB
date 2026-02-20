// /app/papers/page.tsx
'use client';

import { useState } from 'react';
import { Search, Filter, Download, ExternalLink, BookOpen } from 'lucide-react';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  source: 'pubmed' | 'arxiv' | 'semantic';
  url: string;
  pdfUrl?: string;
  citations?: number;
  meshTerms?: string[];
  techniques?: string[];
  influenceScore?: number;
  rankScore?: number;
}

interface TrackStatus {
  t1: 'idle' | 'loading' | 'done' | 'error';
  t2: 'idle' | 'loading' | 'done' | 'error';
  t3: 'idle' | 'loading' | 'done' | 'error';
  t4: 'idle' | 'loading' | 'done' | 'error';
}

const trackNames = {
  t1: 'PubMed (OpenCode)',
  t2: 'arXiv (Kimi)', 
  t3: 'Semantic (Gemini)',
  t4: 'Integration (Codex)'
};

export default function PapersPage() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackStatus, setTrackStatus] = useState<TrackStatus>({
    t1: 'idle', t2: 'idle', t3: 'idle', t4: 'idle'
  });
  const [meta, setMeta] = useState<any>(null);
  const [filters, setFilters] = useState({
    sources: ['pubmed', 'arxiv', 'semantic'] as string[],
    yearFrom: '',
    yearTo: '',
  });

  const searchPapers = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setTrackStatus({ t1: 'loading', t2: 'loading', t3: 'loading', t4: 'idle' });
    setMeta(null);
    
    try {
      // Simulate track updates for UX
      setTimeout(() => setTrackStatus(s => ({ ...s, t1: 'done' })), 800);
      setTimeout(() => setTrackStatus(s => ({ ...s, t2: 'done' })), 1200);
      setTimeout(() => setTrackStatus(s => ({ ...s, t3: 'done' })), 1500);
      
      const response = await fetch('/api/papers/search-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters }),
      });
      const data = await response.json();
      
      setPapers(data.papers || []);
      setMeta(data.meta);
      setTrackStatus({ t1: 'done', t2: 'done', t3: 'done', t4: 'done' });
    } catch (error) {
      console.error('Search failed:', error);
      setTrackStatus({ t1: 'error', t2: 'error', t3: 'error', t4: 'error' });
    }
    setLoading(false);
  };

  const exportBibTeX = () => {
    const bibtex = papers.map((p, i) => `@article{paper${i},
  title={${p.title}},
  author={${p.authors.join(' and ')}},
  year={${p.year}},
  url={${p.url}}
}`).join('\n\n');
    
    const blob = new Blob([bibtex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'papers.bib';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
            <BookOpen className="w-10 h-10 text-blue-600" />
            Academic Paper Search
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Search across PubMed, arXiv, and Semantic Scholar
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPapers()}
                placeholder="Enter keywords, author, or topic..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={searchPapers}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Parallel Track Status */}
          {loading && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                4-Track Parallel Search
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(trackStatus) as Array<keyof TrackStatus>).map((track) => (
                  <div
                    key={track}
                    className={`p-3 rounded-lg border ${
                      trackStatus[track] === 'done' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' :
                      trackStatus[track] === 'loading' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700 animate-pulse' :
                      trackStatus[track] === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700' :
                      'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {trackNames[track]}
                    </div>
                    <div className="text-sm font-semibold mt-1">
                      {trackStatus[track] === 'done' && '✓ Complete'}
                      {trackStatus[track] === 'loading' && '⏳ Running...'}
                      {trackStatus[track] === 'error' && '✗ Error'}
                      {trackStatus[track] === 'idle' && '⏸ Idle'}
                    </div>
                  </div>
                ))}
              </div>
              {meta && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Total time: {meta.totalTime}ms | 
                  PubMed: {meta.trackResults?.t1 || 0} | 
                  arXiv: {meta.trackResults?.t2 || 0} | 
                  Semantic: {meta.trackResults?.t3 || 0} | 
                  Final: {meta.trackResults?.final || 0}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources:</span>
              </div>
              {['pubmed', 'arxiv', 'semantic'].map((source) => (
                <label key={source} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.sources.includes(source)}
                    onChange={(e) => {
                      const newSources = e.target.checked
                        ? [...filters.sources, source]
                        : filters.sources.filter((s) => s !== source);
                      setFilters({ ...filters, sources: newSources });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{source}</span>
                </label>
              ))}
              
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</span>
                <input
                  type="number"
                  placeholder="From"
                  value={filters.yearFrom}
                  onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })}
                  className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="To"
                  value={filters.yearTo}
                  onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })}
                  className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                />
              </div>

              {papers.length > 0 && (
                <button
                  onClick={exportBibTeX}
                  className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export BibTeX
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {papers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {papers.length} papers found
              </h2>
            </div>

            {papers.map((paper) => (
              <div
                key={paper.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        paper.source === 'pubmed' ? 'bg-green-100 text-green-800' :
                        paper.source === 'arxiv' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {paper.source}
                      </span>
                      <span className="text-sm text-gray-500">{paper.year}</span>
                      {paper.rankScore && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Score: {paper.rankScore}
                        </span>
                      )}
                      {paper.citations && (
                        <span className="text-sm text-gray-500">
                          {paper.citations} citations
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {paper.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {paper.authors.join(', ')}
                    </p>
                    
                    {/* Tags */}
                    {(paper.meshTerms?.length || paper.techniques?.length) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {paper.meshTerms?.map((term) => (
                          <span key={term} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {term}
                          </span>
                        ))}
                        {paper.techniques?.map((tech) => (
                          <span key={tech} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-4">
                      {paper.abstract}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                      {paper.pdfUrl && (
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          PDF <Download className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {papers.length === 0 && !loading && query && (
          <div className="text-center py-12 text-gray-500">
            No papers found. Try different keywords or adjust filters.
          </div>
        )}
      </div>
    </div>
  );
}