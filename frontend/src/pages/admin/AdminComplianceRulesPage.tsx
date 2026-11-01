import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ComplianceRule } from '../../types';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { useNotifications } from '../../context/NotificationContext';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Sliders,
  ShieldCheck,
  Layers
} from 'lucide-react';

export const AdminComplianceRulesPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRule, setNewRule] = useState<Partial<ComplianceRule>>({
    rule_code: '',
    name: '',
    category: 'Land & Infrastructure',
    severity: 'critical',
    description: '',
    threshold_value: '',
    is_active: true
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await api.getComplianceRules();
      setRules(data);
    } catch (e: any) {
      showToast('error', 'Failed to load rules', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.rule_code || !newRule.name) {
      showToast('error', 'Validation Error', 'Rule code and name are required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createComplianceRule(newRule);
      showToast('success', 'Compliance Rule Added', `${newRule.name} registered in APH rule engine.`);
      setShowModal(false);
      setNewRule({
        rule_code: '',
        name: '',
        category: 'Land & Infrastructure',
        severity: 'critical',
        description: '',
        threshold_value: '',
        is_active: true
      });
      loadRules();
    } catch (e: any) {
      showToast('error', 'Failed to create rule', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = rules.filter(r => {
    const matchesSearch =
      (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.rule_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(rules.map(r => r.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            AICTE Approval Process Handbook (APH)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Rule Engine Configuration</h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain regulatory norms, land area minima, faculty cadre ratios, and automated cross-verification rules.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Compliance Rule
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rules by code, title, criteria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading compliance rules...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No rules found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-150">
                      {r.rule_code}
                    </span>
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {r.is_active ? 'Active Rule' : 'Inactive'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{r.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Category & Regulatory Standard</span>
                  <div className="font-semibold text-slate-800">{r.category}</div>
                  {r.threshold_value && (
                    <div className="font-mono text-[11px] text-purple-700 mt-1">Threshold: {r.threshold_value}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-700" />
                Configure New Compliance Rule
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Rule Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APH-2025-LAND-01"
                    value={newRule.rule_code}
                    onChange={(e) => setNewRule({ ...newRule, rule_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  >
                    <option value="critical">Critical (Blocking)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minimum Land Area Requirement"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Category</label>
                <select
                  value={newRule.category}
                  onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                >
                  <option value="Land & Infrastructure">Land & Infrastructure</option>
                  <option value="Faculty & Staff">Faculty & Staff</option>
                  <option value="Laboratories & Equipment">Laboratories & Equipment</option>
                  <option value="Financial & Corpus">Financial & Corpus</option>
                  <option value="Governance & Affiliation">Governance & Affiliation</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Regulatory Threshold / Standard</label>
                <input
                  type="text"
                  placeholder="e.g. >= 2.5 Acres for Rural / >= 1.5 Acres Mega-City"
                  value={newRule.threshold_value}
                  onChange={(e) => setNewRule({ ...newRule, threshold_value: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Rule Description & Citation</label>
                <textarea
                  rows={3}
                  placeholder="Official Approval Process Handbook Clause and compliance guidelines..."
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
