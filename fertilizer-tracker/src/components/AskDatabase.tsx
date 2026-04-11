import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../store/authStore';
import './AskDatabase.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fcbvcwszzxpgilconwky.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ASK_DB_URL = `${SUPABASE_URL}/functions/v1/ask-database`;

interface AskResult {
  sql: string | null;
  rowCount: number;
  data: Record<string, unknown>[];
  answer: string | null;
  mode: 'markdown' | 'table';
  thinking?: string;
  models: { sql: string; answer: string | null };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Assistant-specific fields
  result?: AskResult;
  error?: string;
  loading?: boolean;
}

// Messages sent to backend for conversation context
interface BackendMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: Record<string, unknown>[];
  rowCount?: number;
}

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

let msgIdCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export function AskDatabase() {
  const user = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSQL, setExpandedSQL] = useState<Set<string>>(new Set());
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build backend conversation history from messages
  const buildBackendHistory = useCallback((msgs: ChatMessage[]): BackendMessage[] => {
    return msgs
      .filter(m => !m.loading && !m.error)
      .map(m => {
        if (m.role === 'user') {
          return { role: 'user' as const, content: m.content };
        }
        return {
          role: 'assistant' as const,
          content: m.result?.answer || '',
          sql: m.result?.sql || undefined,
          data: m.result?.data?.slice(0, 5), // Send only first 5 rows for context
          rowCount: m.result?.rowCount,
        };
      });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || !user?.email || loading) return;

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'user',
      content: question.trim(),
    };

    const assistantMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'assistant',
      content: '',
      loading: true,
    };

    const currentQuestion = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    try {
      // Build history from all prior messages (excluding the loading placeholder)
      const history = buildBackendHistory(messages);

      const response = await fetch(ASK_DB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          question: currentQuestion,
          email: user.email,
          messages: history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, loading: false, content: data.answer || '', result: data }
            : m
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, loading: false, error: err instanceof Error ? err.message : 'Failed to get answer' }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [question, user?.email, loading, messages, buildBackendHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleSQL = (msgId: string) => {
    setExpandedSQL(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const toggleThinking = (msgId: string) => {
    setExpandedThinking(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setQuestion('');
    setExpandedSQL(new Set());
    setExpandedThinking(new Set());
  };

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
              <div className="ask-db-header-actions">
                {messages.length > 0 && (
                  <button
                    className="ask-db-new-chat"
                    onClick={handleNewChat}
                    title="New conversation"
                  >
&#x2b;
                  </button>
                )}
                <button className="ask-db-close" onClick={() => setIsOpen(false)}>
                  &times;
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="ask-db-chat">
              {/* Empty state */}
              {messages.length === 0 && (
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

              {/* Message thread */}
              {messages.map((msg) => (
                <div key={msg.id} className={`ask-db-msg ask-db-msg-${msg.role}`}>
                  {msg.role === 'user' ? (
                    <div className="ask-db-bubble ask-db-bubble-user">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="ask-db-bubble ask-db-bubble-assistant">
                      {/* Loading */}
                      {msg.loading && (
                        <div className="ask-db-loading">
                          <div className="ask-db-spinner" />
                          <span>Analyzing...</span>
                        </div>
                      )}

                      {/* Error */}
                      {msg.error && (
                        <div className="ask-db-error">{msg.error}</div>
                      )}

                      {/* Result */}
                      {msg.result && !msg.loading && (
                        <>
                          {/* Markdown Answer */}
                          {msg.result.mode === 'markdown' && msg.result.answer && (
                            <div className="ask-db-answer">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.result.answer}</ReactMarkdown>
                            </div>
                          )}

                          {/* Table Mode */}
                          {msg.result.mode === 'table' && msg.result.data.length > 0 && (
                            <>
                              <div className="ask-db-table-info">
                                <span>Showing {Math.min(PREVIEW_ROWS, msg.result.rowCount)} of {msg.result.rowCount} rows</span>
                              </div>
                              <div className="ask-db-table-wrapper">
                                <table className="ask-db-table">
                                  <thead>
                                    <tr>
                                      {Object.keys(msg.result.data[0]).map((col) => (
                                        <th key={col}>{col}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {msg.result.data.slice(0, PREVIEW_ROWS).map((row, i) => (
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

                          {/* Non-SQL message (greetings, unrelated questions) */}
                          {!msg.result.sql && msg.result.answer && msg.result.mode !== 'markdown' && (
                            <div className="ask-db-answer">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.result.answer}</ReactMarkdown>
                            </div>
                          )}

                          {/* Empty result */}
                          {msg.result.sql && msg.result.data.length === 0 && !msg.result.answer && (
                            <div className="ask-db-error">No data found for this query.</div>
                          )}

                          {/* CSV Download */}
                          {msg.result.data.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                className="ask-db-csv-btn"
                                onClick={() => downloadCSV(msg.result!.data, `query-${Date.now()}.csv`)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download CSV ({msg.result.rowCount} rows)
                              </button>
                            </div>
                          )}

                          {/* Thinking Toggle */}
                          {msg.result.thinking && (
                            <div className="ask-db-sql-toggle">
                              <button onClick={() => toggleThinking(msg.id)}>
                                {expandedThinking.has(msg.id) ? 'Hide Thinking' : 'Show Thinking'}
                              </button>
                              {expandedThinking.has(msg.id) && (
                                <div className="ask-db-thinking-code">{msg.result.thinking}</div>
                              )}
                            </div>
                          )}

                          {/* SQL Toggle */}
                          {msg.result.sql && (
                            <div className="ask-db-sql-toggle">
                              <button onClick={() => toggleSQL(msg.id)}>
                                {expandedSQL.has(msg.id) ? 'Hide SQL' : 'Show SQL'}
                              </button>
                              {expandedSQL.has(msg.id) && (
                                <>
                                  <div className="ask-db-sql-code">{msg.result.sql}</div>
                                  <div className="ask-db-model-info">
                                    Model: {msg.result.models.sql}
                                    {msg.result.models.answer && ` / ${msg.result.models.answer}`}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - pinned to bottom */}
            <div className="ask-db-input-area">
              <input
                ref={inputRef}
                type="text"
                className="ask-db-input"
                placeholder={messages.length > 0 ? "Follow up or correct..." : "Ask anything about your data..."}
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
                {loading ? (
                  <div className="ask-db-spinner-small" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
