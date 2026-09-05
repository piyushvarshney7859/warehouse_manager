import React, { useState } from 'react';
import {
  Factory,
  Warehouse as WarehouseIcon,
  Truck,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  Building,
  Car,
} from 'lucide-react';
import { IAuthUser } from '../types.js';
import { api } from '../services/api.js';

interface LoginPageProps {
  onLoginSuccess: (user: IAuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<'manufacturer' | 'warehouse' | 'delivery'>('manufacturer');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agency, setAgency] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick 1-click Demo Login
  const handleQuickDemo = async (role: 'manufacturer' | 'warehouse' | 'delivery') => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.loginUser({ role, isQuickDemo: true });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.message || 'Quick login failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login error');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit standard login / signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (activeTab === 'login') {
        const res = await api.loginUser({
          email: email || (selectedRole === 'manufacturer' ? 'manufacturer@stockpilot.io' : selectedRole === 'warehouse' ? 'warehouse@stockpilot.io' : 'delivery@stockpilot.io'),
          password: password || 'password123',
          role: selectedRole,
        });
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.message || 'Login failed');
        }
      } else {
        // Sign up
        const res = await api.signupUser({
          name: name || 'Operations Specialist',
          email,
          phone,
          password: password || 'password123',
          role: selectedRole,
          companyName: companyName || (selectedRole === 'manufacturer' ? 'Apex Industrial Works' : 'StockPilot Central Logistics'),
          agency: agency || 'Delhivery Express',
          vehicleNumber,
        });
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.message || 'Signup failed');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            STOCKPILOT LOGISTICS NETWORK
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Unified Supply Chain & Warehouse Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Choose your persona below to access real-time warehouse vacancies, inbound arrivals, or delivery dispatch schedules.
          </p>
        </div>

        {/* Demo Personas (Instant Access) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 sm:p-5 shadow-xl backdrop-blur-md">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Instant 1-Click Demo Login
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Manufacturer Persona */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickDemo('manufacturer')}
              className="flex flex-col items-start p-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:border-amber-500/80 hover:bg-amber-950/20 transition-all text-left group"
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Factory className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-amber-300">Manufacturer</span>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                Check warehouse vacancies, manually list factory products & dispatch stock
              </p>
            </button>

            {/* Warehouse Manager Persona */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickDemo('warehouse')}
              className="flex flex-col items-start p-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:border-emerald-500/80 hover:bg-emerald-950/20 transition-all text-left group"
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <WarehouseIcon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-emerald-300">Warehouse</span>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                Manage bins, 3D rack twin, receive inbound shipments & barcode order picks
              </p>
            </button>

            {/* Delivery Partner Persona */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickDemo('delivery')}
              className="flex flex-col items-start p-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:border-blue-500/80 hover:bg-blue-950/20 transition-all text-left group"
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Truck className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-blue-300">Delivery Partner</span>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                Live warehouse GPS navigation, daily task pickup barcode scanner & inventory
              </p>
            </button>
          </div>
        </div>

        {/* Custom Login / Signup Form Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/90 p-5 sm:p-6 shadow-2xl space-y-4">
          {/* Tabs: Sign In / Create Account */}
          <div className="flex items-center border-b border-slate-700 pb-3 justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In to Account
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create New Account
              </button>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Role Authentication</span>
          </div>

          {/* Role Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Select Your Portal Role:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('manufacturer')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  selectedRole === 'manufacturer'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-xs'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Factory className="h-3.5 w-3.5" /> Manufacturer
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('warehouse')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  selectedRole === 'warehouse'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-xs'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <WarehouseIcon className="h-3.5 w-3.5" /> Warehouse
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('delivery')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  selectedRole === 'delivery'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-xs'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Truck className="h-3.5 w-3.5" /> Delivery Partner
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {activeTab === 'signup' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder={
                        selectedRole === 'delivery'
                          ? 'e.g. Ramesh Kumar / Amit Verma'
                          : selectedRole === 'manufacturer'
                          ? 'e.g. Rajesh Singhania'
                          : 'e.g. Vikram Malhotra'
                      }
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {selectedRole === 'manufacturer' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Manufacturing Company / Factory Name</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="e.g. Apex Industrial Electronics Ltd."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'delivery' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Logistics Agency / Delivery Fleet Name
                      </label>
                      <div className="relative">
                        <Truck className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="e.g. Delhivery Express / Blinkit / Shadowfax / BlueDart"
                          value={agency}
                          onChange={(e) => setAgency(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Vehicle Number</label>
                        <div className="relative">
                          <Car className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="e.g. MH 02 AB 1234"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 uppercase font-mono focus:border-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Mobile Contact Phone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="e.g. 9876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {activeTab === 'login' ? 'Email or Mobile Number' : 'Work Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder={
                    selectedRole === 'manufacturer'
                      ? 'manufacturer@stockpilot.io'
                      : selectedRole === 'delivery'
                      ? 'delivery@stockpilot.io (or 9876543210)'
                      : 'warehouse@stockpilot.io'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden ${
                    selectedRole === 'manufacturer'
                      ? 'focus:border-amber-500'
                      : selectedRole === 'delivery'
                      ? 'focus:border-blue-500'
                      : 'focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password or Security PIN</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden ${
                    selectedRole === 'manufacturer'
                      ? 'focus:border-amber-500'
                      : selectedRole === 'delivery'
                      ? 'focus:border-blue-500'
                      : 'focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white transition-all shadow-lg disabled:opacity-50 ${
                selectedRole === 'manufacturer'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                  : selectedRole === 'delivery'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              }`}
            >
              {isLoading ? (
                'Authenticating...'
              ) : activeTab === 'login' ? (
                <>
                  Access {selectedRole === 'delivery' ? 'DELIVERY PARTNER' : selectedRole.toUpperCase()} Portal <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Create Account & Enter Portal <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Role Access: Manufacturer • Warehouse Floor Operations • Delivery Partner Fleet</span>
        </div>
      </div>
    </div>
  );
};
