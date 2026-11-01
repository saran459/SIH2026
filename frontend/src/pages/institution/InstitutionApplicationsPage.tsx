import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Application } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  ChevronRight,
  Layers,
  Calendar,
  Building
} from 'lucide-react';

export const InstitutionApplicationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, categoryFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search.trim() || undefined
      });
      setApplications(data);
    } catch (e) {
      console.error('Failed to load applications', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Institutional Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your AICTE statutory approval dossiers, track review progress, and submit compliance responses
          </p>
        </div>

        <button
          onClick={() => navigate('/institution/applications/new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search application number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Correction Required">Correction Required</option>
            <option value="Resubmitted">Resubmitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
            <option value="New Technical Institution">New Technical Institution</option>
            <option value="Increase in Intake / Additional Course">Increase in Intake</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Application No.</th>
                <th className="px-5 py-3.5">Category & Academic Year</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Readiness Score</th>
                <th className="px-5 py-3.5">Declared Metrics</th>
                <th className="px-5 py-3.5">Next Milestone</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading institutional applications...</span>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-12 text-slate-400">
                    No applications found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => navigate(`/institution/applications/${app.id}`)}
                    className="hover:bg-emerald-50/20 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-emerald-800">
                      {app.application_number}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{app.category}</div>
                      <div className="text-[11px] text-slate-400">{app.academic_year} • {app.program}</div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          app.readiness_score >= 80
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : app.readiness_score >= 60
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {app.readiness_score}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-[11px]">
                      <div>Faculty: <strong className="text-slate-900">{app.total_faculty_declared}</strong></div>
                      <div>Intake: <strong className="text-slate-900">{app.total_intake_declared}</strong></div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-[11px]">
                      {app.next_deadline ? (
                        <span className="text-amber-800 font-semibold">
                          Due: {new Date(app.next_deadline).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard Timeline</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/institution/applications/${app.id}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
