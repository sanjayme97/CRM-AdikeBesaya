import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../store/authStore';
import './AskDatabase.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fcbvcwszzxpgilconwky.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ASK_DB_URL = `${SUPABASE_URL}/functions/v1/ask-gemma`;
interface AskResult {
  sql: string;
  rowCount: number;
  data: Record<string, unknown>[];
  answer: string | null;
  mode: 'markdown' | 'table';
  models: { sql: string; answer: string | null };
}

// Preview rows shown in table mode before CSV download
const PREVIEW_ROWS = 20;

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        // Escape quotes and wrap in quotes if needed
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AskDatabase() {
  const user = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || !user?.email || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowSQL(false);

    try {
      const response = await fetch(ASK_DB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ question: question.trim(), email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  }, [question, user?.email, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Don't render anything if user doesn't have ask_db access
  if (!user?.canAskDb) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="ask-db-fab"
          onClick={() => setIsOpen(true)}
          title="Ask AI"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <>
          <div className="ask-db-overlay" onClick={() => setIsOpen(false)} />
          <div className="ask-db-panel">
            {/* Header */}
            <div className="ask-db-header">
              <h3>Ask AI</h3>
              <button className="ask-db-close" onClick={() => setIsOpen(false)}>
                &times;
              </button>
            </div>

            {/* Input */}
            <div className="ask-db-input-area">
              <input
                ref={inputRef}
                type="text"
                className="ask-db-input"
                placeholder="Ask anything about your data..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="ask-db-submit"
                onClick={handleSubmit}
                disabled={loading || !question.trim()}
              >
                {loading ? 'Asking...' : 'Ask'}
              </button>
            </div>

            {/* Results */}
            <div className="ask-db-results">
              {/* Loading */}
              {loading && (
                <div className="ask-db-loading">
                  <div className="ask-db-spinner" />
                  <span>Analyzing your question...</span>
                </div>
              )}

              {/* Error */}
              {error && <div className="ask-db-error">{error}</div>}

              {/* Result */}
              {result && !loading && (
                <>
                  {/* Markdown Answer */}
                  {result.mode === 'markdown' && result.answer && (
                    <div className="ask-db-answer">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
                    </div>
                  )}

                  {/* Table Mode (raw data) */}
                  {result.mode === 'table' && result.data.length > 0 && (
                    <>
                      <div className="ask-db-table-info">
                        <span>Showing {Math.min(PREVIEW_ROWS, result.rowCount)} of {result.rowCount} rows</span>
                      </div>
                      <div className="ask-db-table-wrapper">
                        <table className="ask-db-table">
                          <thead>
                            <tr>
                              {Object.keys(result.data[0]).map((col) => (
                                <th key={col}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.data.slice(0, PREVIEW_ROWS).map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).map((val, j) => (
                                  <td key={j}>{val === null ? '' : String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Empty result */}
                  {result.data.length === 0 && !result.answer && (
                    <div className="ask-db-error">No data found for this query.</div>
                  )}

                  {/* CSV Download - always shown when there's data */}
                  {result.data.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <button
                        className="ask-db-csv-btn"
                        onClick={() => downloadCSV(result.data, `query-${Date.now()}.csv`)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download CSV ({result.rowCount} rows)
                      </button>
                    </div>
                  )}

                  {/* SQL Toggle */}
                  <div className="ask-db-sql-toggle">
                    <button onClick={() => setShowSQL(!showSQL)}>
                      {showSQL ? 'Hide SQL' : 'Show SQL'}
                    </button>
                    {showSQL && (
                      <>
                        <div className="ask-db-sql-code">{result.sql}</div>
                        <div className="ask-db-model-info">
                          Model: {result.models.sql}
                          {result.models.answer && ` / ${result.models.answer}`}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Empty State */}
              {!loading && !error && !result && (
                <div className="ask-db-empty">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3 }}>
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  <p>Ask anything about your data</p>
                  <p className="ask-db-hint">
                    "How many leads this month?"<br />
                    "Show quotations by district"<br />
                    "Who is the top salesman?"
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
