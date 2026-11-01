import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CollegeSearchSelect, CollegeItem } from '../components/common/CollegeSearchSelect';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Building,
  User as UserIcon,
  Phone,
  CheckCircle2,
  Briefcase,
  MapPin
} from 'lucide-react';

interface LoginPageProps {
  initialMode?: 'login' | 'register';
}

interface PublicInstitution {
  id: number;
  name: string;
  aicte_permanent_id: string;
  city: string;
  state: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode = 'login' }) => {
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'register'
  const isRegisterParam = new URLSearchParams(location.search).get('tab') === 'register' || location.pathname.includes('register');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode === 'register' || isRegisterParam ? 'register' : 'login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDesignation, setRegDesignation] = useState('Principal');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Institution Selection Mode: 'existing' | 'new'
  const [instMode, setInstMode] = useState<'existing' | 'new'>('existing');
  const [institutions, setInstitutions] = useState<PublicInstitution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<number | ''>('');
  const [selectedCollege, setSelectedCollege] = useState<CollegeItem | null>(null);
  const [newInstName, setNewInstName] = useState('');
  const [newInstAicteId, setNewInstAicteId] = useState('');
  const [newInstState, setNewInstState] = useState('');
  const [newInstCity, setNewInstCity] = useState('');
  const [newInstAddress, setNewInstAddress] = useState('');
  const [newInstPincode, setNewInstPincode] = useState('');

  // Load public institutions for dropdown
  useEffect(() => {
    api.getPublicInstitutions()
      .then((data) => {
        setInstitutions(data);
        if (data.length > 0 && !selectedInstId) {
          setSelectedInstId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load institutions list', err));
  }, []);

  // Redirect if already authenticated as institution
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'institution') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both institutional email address and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'institution') {
        navigate('/dashboard');
      } else {
        setError(`Access Denied: Your account role is '${loggedUser.role}'. This portal is strictly for Institutional Applicants.`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regFullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Please enter an institutional email address.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (instMode === 'existing' && !selectedInstId) {
      setError('Please select an affiliated institution from the list.');
      return;
    }

    if (instMode === 'new' && !newInstName.trim()) {
      setError('Please enter the institution name.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        full_name: regFullName.trim(),
        role: 'institution',
        phone: regPhone.trim(),
        designation: regDesignation
      };

      if (instMode === 'existing') {
        payload.institution_id = Number(selectedInstId);
      } else {
        payload.institution_name = newInstName.trim();
        payload.aicte_permanent_id = newInstAicteId.trim() || undefined;
        payload.state = newInstState.trim() || undefined;
        payload.city = newInstCity.trim() || undefined;
        payload.address = newInstAddress.trim() || undefined;
        payload.pincode = newInstPincode.trim() || undefined;
      }

      const res = await api.register(payload);
      setSuccessMsg(res.message || 'Registration successful! You can now sign in with your credentials.');
      setEmail(regEmail.trim().toLowerCase());
      setPassword('');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-emerald-600 selection:text-white">
      {/* Top Banner */}
      <header className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white">
              AICTE <span className="text-emerald-400">SmartApproval</span>
            </h1>
            <p className="text-[11px] text-slate-400">Institution & Applicant Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Statutory Session 2026-27</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Logo & Portal Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {mode === 'login' ? 'Institution Sign In' : 'Institutional Registration'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              {mode === 'login'
                ? 'Authorized Institutional Signatory Login for AICTE Extension of Approval (EoA), New Courses, and Compliance Monitoring.'
                : 'New college applicant? Register your institution representative details first, then sign in to submit statutory applications.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>First Time User? Register</span>
            </button>
          </div>

          {/* Success Message Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMsg}</div>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* ----------------- LOGIN MODE ----------------- */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. institution@greenfield.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter institutional password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Institution Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                >
                  Don't have an institutional account? Register details here
                </button>
              </div>


            </form>
          ) : (
            /* ----------------- REGISTRATION MODE ----------------- */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Authorized Signatory Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Kumar"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Designation *
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <select
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      <option value="Principal">Principal / Head of Institution</option>
                      <option value="Director">Director</option>
                      <option value="Dean">Dean</option>
                      <option value="Registrar">Registrar</option>
                      <option value="Trustee">Trustee / Society Secretary</option>
                      <option value="Authorized Representative">Authorized Representative</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Institutional Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. principal@college.edu.in"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Institution Association Option */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>Institution Affiliation</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setInstMode('existing')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        instMode === 'existing'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Choose Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstMode('new')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        instMode === 'new'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      + Register New
                    </button>
                  </div>
                </div>

                {instMode === 'existing' ? (
                  <div>
                    <CollegeSearchSelect
                      theme="dark"
                      placeholder="Type 2+ letters to search AICTE institutions..."
                      value={selectedInstId}
                      selectedCollege={selectedCollege}
                      onSelect={(col) => {
                        setSelectedCollege(col);
                        setSelectedInstId(col.id);
                      }}
                      allowManualEntry={true}
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Search across 13,000+ AICTE institutions, or switch to "+ Register New" if applying for a new campus.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <input
                          type="text"
                          required
                          value={newInstName}
                          onChange={(e) => setNewInstName(e.target.value)}
                          placeholder="Institution Name (e.g. Apex Institute)"
                          className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newInstAicteId}
                          onChange={(e) => setNewInstAicteId(e.target.value)}
                          placeholder="AICTE Permanent ID (Optional)"
                          className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newInstCity}
                        onChange={(e) => setNewInstCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        value={newInstState}
                        onChange={(e) => setNewInstState(e.target.value)}
                        placeholder="State"
                        className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        value={newInstPincode}
                        onChange={(e) => setNewInstPincode(e.target.value)}
                        placeholder="Pincode"
                        className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password (min 6 chars) *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering Institutional Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration & Proceed to Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                >
                  Already have an account? <span className="text-emerald-400 underline">Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
        AICTE SmartApproval • Dedicated Institutional Portal • Strictly for Authorized Higher Education Signatories
      </footer>
    </div>
  );
};
