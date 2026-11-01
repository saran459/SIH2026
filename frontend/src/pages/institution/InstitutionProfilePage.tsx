import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Institution } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  CheckCircle2,
  Calendar,
  UserCheck
} from 'lucide-react';

export const InstitutionProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (user?.institution_id) {
      loadInstitution(user.institution_id);
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadInstitution = async (id: number) => {
    setLoading(true);
    try {
      const data = await api.getInstitution(id);
      setInstitution(data);
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setWebsite(data.website || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    setSaving(true);
    try {
      await api.updateInstitution(institution.id, {
        contact_email: contactEmail,
        contact_phone: contactPhone,
        website
      });
      showToast('success', 'Profile Updated', 'Institutional contact metadata updated in MySQL.');
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Institutional Profile & Statutory Record</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Official statutory registry details maintained under the AICTE Approval Bureau
        </p>
      </div>

      {institution ? (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Permanent Identifier Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{institution.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      AICTE Permanent ID: {institution.aicte_permanent_id}
                    </span>
                    <span className="text-xs text-slate-400">• Established: {institution.established_year}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Institution Type</label>
                <input
                  type="text"
                  readOnly
                  value={institution.institution_type}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Head of Institution / Principal</label>
                <input
                  type="text"
                  readOnly
                  value={institution.head_of_institution_name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-500 font-semibold block mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  readOnly
                  value={`${institution.address}, ${institution.city}, ${institution.state} - ${institution.pincode}`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Editable Contact Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Official Contact & Web Registry</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Official Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Administrative Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Official Website URL</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {saving ? 'Updating Record...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
          No institutional record linked to this account.
        </div>
      )}
    </div>
  );
};
