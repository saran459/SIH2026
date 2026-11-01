import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, Institution } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Shield,
  UserCheck,
  Mail,
  Lock,
  Plus
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // New User Modal
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'institution',
    institution_id: undefined as number | undefined,
    designation: '',
    phone: ''
  });

  useEffect(() => {
    loadUsersAndInstitutions();
  }, []);

  const loadUsersAndInstitutions = async () => {
    setLoading(true);
    try {
      const [uData, iData] = await Promise.all([
        api.getUsers(),
        api.getInstitutions()
      ]);
      setUsers(uData);
      setInstitutions(iData);
    } catch (e: any) {
      showToast('error', 'Failed to load user roster', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      showToast('error', 'Validation Error', 'Email, password, and full name are required.');
      return;
    }
    if (newUser.role === 'institution' && !newUser.institution_id && institutions.length > 0) {
      newUser.institution_id = institutions[0].id;
    }

    setFormLoading(true);
    try {
      await api.createUser(newUser);
      showToast('success', 'User Created', `Account for ${newUser.full_name} created successfully.`);
      setShowModal(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'institution',
        institution_id: undefined,
        designation: '',
        phone: ''
      });
      loadUsersAndInstitutions();
    } catch (e: any) {
      showToast('error', 'Failed to create user', e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      showToast('error', 'Action Forbidden', 'You cannot deactivate your own administrative account.');
      return;
    }

    try {
      const updated = await api.updateUser(targetUser.id, { is_active: !targetUser.is_active });
      showToast('success', 'Account Status Updated', `${targetUser.full_name} is now ${updated.is_active ? 'Active' : 'Inactive'}.`);
      setUsers(users.map(u => u.id === targetUser.id ? updated : u));
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'institution':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Identity & Access Management (IAM)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System User Directory</h1>
          <p className="text-sm text-slate-600 mt-1">
            Provision and manage accounts, role authorizations, and institutional bindings across all three portals.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Provision New User
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="all">All Roles</option>
            <option value="institution">Institution</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading user accounts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No users found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or role filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Full Name & Email</th>
                  <th className="px-5 py-3">Authorized Role</th>
                  <th className="px-5 py-3">Institution Association</th>
                  <th className="px-5 py-3">Account Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${getRoleBadge(u.role)}`}>
                        {u.role === 'admin' ? 'Administrator' : u.role === 'reviewer' ? 'Reviewer' : 'Institution'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {u.role === 'institution' ? (
                        u.institution_name ? (
                          <span className="font-semibold text-slate-800">{u.institution_name}</span>
                        ) : u.institution_id ? (
                          <span>Institution #{u.institution_id}</span>
                        ) : (
                          <span className="text-rose-500 font-semibold">Unlinked Institution</span>
                        )
                      ) : (
                        <span className="text-slate-400">National Council</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.id !== currentUser?.id ? (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            u.is_active
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-purple-700 font-semibold">(Current User)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provision New User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-700" />
                Provision New Portal Account
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. officer@aicte.gov.in"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Authorized Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden font-semibold"
                >
                  <option value="institution">Institution (Applicant)</option>
                  <option value="reviewer">Reviewer / Compliance Officer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {newUser.role === 'institution' && (
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Associated Institution</label>
                  <select
                    value={newUser.institution_id || ''}
                    onChange={(e) => setNewUser({ ...newUser, institution_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  >
                    <option value="">Select Institution...</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.aicte_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={formLoading}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  {formLoading ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
