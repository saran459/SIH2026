import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Institution } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  ExternalLink,
  Edit2
} from 'lucide-react';

export const AdminInstitutionsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Institution>>({
    name: '',
    aicte_code: '',
    region: 'North-West',
    category: 'Engineering & Technology',
    city: 'New Delhi',
    state: 'Delhi',
    email: ''
  });

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const data = await api.getInstitutions();
      setInstitutions(data);
    } catch (e: any) {
      showToast('error', 'Failed to load institutions', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.aicte_code) {
      showToast('error', 'Validation Error', 'Institution name and AICTE code are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createInstitution(formData);
      showToast('success', 'Institution Registered', `${formData.name} added to national registry.`);
      setShowModal(false);
      setFormData({
        name: '',
        aicte_code: '',
        region: 'North-West',
        category: 'Engineering & Technology',
        city: '',
        state: '',
        email: ''
      });
      loadInstitutions();
    } catch (e: any) {
      showToast('error', 'Failed to register institution', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = institutions.filter(inst =>
    (inst.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (inst.aicte_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (inst.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (inst.state || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            National Institutional Master
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institution Registry</h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain master records of all approved, pending, and affiliated technical institutions across India.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Register Institution
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code, institution name, city, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} Registered Institutions</span>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading institutions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No institutions found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inst => (
            <div
              key={inst.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-150">
                    {inst.aicte_code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Registry
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mt-1">{inst.name}</h3>

                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {inst.city}, {inst.state} ({inst.region} Region)
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold text-slate-800">{inst.category || 'Engineering'}</span>
                  </div>
                  {inst.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-mono text-[11px] text-slate-700">{inst.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <span className="text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer">
                  View Dossiers & Records →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-700" />
                Register Technical Institution
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Official Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">AICTE Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1-1009871"
                    value={formData.aicte_code}
                    onChange={(e) => setFormData({ ...formData, aicte_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Regional Office</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  >
                    <option value="North-West">North-West (Chandigarh)</option>
                    <option value="Northern">Northern (Kanpur)</option>
                    <option value="Central">Central (Bhopal)</option>
                    <option value="Western">Western (Mumbai)</option>
                    <option value="Southern">Southern (Chennai)</option>
                    <option value="South-West">South-West (Bangalore)</option>
                    <option value="Eastern">Eastern (Kolkata)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Official Contact Email</label>
                <input
                  type="email"
                  placeholder="contact@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
