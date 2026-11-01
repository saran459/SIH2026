import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Application, ApplicationStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { ApplicationWizard } from '../components/applications/ApplicationWizard';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  ExternalLink,
  Calendar,
  Building,
  ChevronRight,
  Layers
} from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, categoryFilter, yearFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        academic_year: yearFilter !== 'all' ? yearFilter : undefined,
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track, filter, inspect, and progress statutory AICTE approval dossiers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={api.getApplicationsCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Application Number or Institution name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
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
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Categories</option>
            <option value="Extension of Approval (EOA)">Extension of Approval (EOA)</option>
            <option value="Increase in Intake">Increase in Intake</option>
            <option value="Introduction of New Courses">New Courses</option>
            <option value="New Technical Institution">New Institution</option>
            <option value="Closure of Course">Closure of Course</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Years</option>
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
          </select>

          <button
            type="button"
            onClick={() => fetchApplications()}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Application ID</th>
                <th className="px-5 py-3.5">Institution</th>
                <th className="px-5 py-3.5">Category & AY</th>
                <th className="px-5 py-3.5">Workflow Status</th>
                <th className="px-5 py-3.5 text-center">Readiness</th>
                <th className="px-5 py-3.5">Assigned Reviewer</th>
                <th className="px-5 py-3.5">Next Action</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading application records...</span>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No applications match the selected criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-blue-700 group-hover:underline">
                        {app.application_number}
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        {app.level} • {app.program}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 block truncate max-w-xs">
                        {app.institution_name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Faculty: {app.total_faculty_declared} • Intake: {app.total_intake_declared}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-800 block">{app.category}</span>
                      <span className="text-[11px] text-slate-500">{app.academic_year}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          app.readiness_score >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.readiness_score >= 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {app.readiness_score}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {app.assigned_reviewer_name ? (
                        <span className="font-medium">{app.assigned_reviewer_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {app.next_deadline ? (
                        <span className="text-[11px] text-amber-800 font-semibold">
                          Due: {new Date(app.next_deadline).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Standard Timeline</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/applications/${app.id}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
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

      <ApplicationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => fetchApplications()}
      />
    </div>
  );
};
