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
}

export default function PapersPage() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    sources: ['pubmed', 'arxiv', 'semantic'] as string[],
    yearFrom: '',
    yearTo: '',
  });

  const searchPapers = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/papers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters }),
      });
      const data = await response.json();
      setPapers(data.papers || []);
    } catch (error) {
      console.error('Search failed:', error);
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