import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { PolicyAssistantResponse, Application } from '../../types';
import { Bot, Send, Sparkles, BookOpen, AlertCircle, CheckCircle2, User } from 'lucide-react';

interface Props {
  activeApplicationId?: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citedRules?: string[];
  sourceReference?: string;
  recommendedAction?: string;
  warning?: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Which documents are missing for this application?',
  'Why is this application marked as needing review?',
  'What caused the consistency warning?',
  'Summarise outstanding reviewer correction requests',
  'What are the minimum land and built-up area requirements?'
];

export const PolicyChatbot: React.FC<Props> = ({ activeApplicationId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: 'Namaste! I am your AICTE SmartApproval Statutory Policy Assistant. Ask me anything regarding AICTE Approval Process Handbook (APH) 2026-27 regulations, statutory document requirements, or your application compliance findings.',
      sourceReference: 'AICTE Approval Process Handbook (APH) 2026-27',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | undefined>(activeApplicationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getApplications().then(setApplications).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeApplicationId) {
      setSelectedAppId(activeApplicationId);
    }
  }, [activeApplicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res: PolicyAssistantResponse = await api.askPolicyAssistant(q, selectedAppId);
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: res.direct_answer,
        citedRules: res.cited_rules,
        sourceReference: res.source_reference,
        recommendedAction: res.recommended_action,
        warning: res.warning,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: `Unable to process query: ${e.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">Evidence-First Policy Assistant</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                APH 2026-27
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Contextual statutory reasoning with verified citations</p>
          </div>
        </div>

        {/* Application context selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Context:</span>
          <select
            value={selectedAppId || ''}
            onChange={(e) => setSelectedAppId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">General AICTE Regulations</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_number} ({app.institution_name?.substring(0, 20)}...)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-indigo-600 text-white shadow-xs'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[82%] space-y-2`}>
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <span
                  className={`block text-[10px] mt-2 text-right ${
                    m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>

              {/* Statutory Citations & Action Box */}
              {m.sender === 'assistant' && (m.sourceReference || m.citedRules) && (
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs text-[11px] space-y-1.5">
                  {m.sourceReference && (
                    <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Source: {m.sourceReference}</span>
                    </div>
                  )}

                  {m.citedRules && m.citedRules.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.citedRules.map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.recommendedAction && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="font-semibold">Recommended Action:</strong> {m.recommendedAction}</span>
                    </div>
                  )}

                  {m.warning && (
                    <div className="mt-1 flex items-center gap-1.5 text-amber-700 text-[10px]">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{m.warning}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 w-fit text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
            <span>Consulting AICTE Handbook & application records...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 shrink-0 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about AICTE regulations, FSR, land area, or missing evidence..."
          className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-xs transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
