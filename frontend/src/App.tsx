import { useState } from 'react';
import axios from 'axios';
import { Fuel, AlertCircle, Shield, Users, ArrowLeft, ArrowRight, Leaf, ShieldCheck, BarChart3, Landmark, Database, Calendar, Search, Zap, FileText, MapPin, QrCode, Car, Activity } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import StationOwnerDashboard from './StationOwnerDashboard';
import CitizenDashboard from './CitizenDashboard';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isLogin, setIsLogin] = useState(true);
  const [portal, setPortal] = useState<string | null>(null);

  const handleAuth = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    if (!portal) {
      return <LandingPage onSelect={setPortal} />;
    }
    return isLogin ? (
      <LoginForm onAuth={handleAuth} onSwitch={() => setIsLogin(false)} portal={portal} onBack={() => setPortal(null)} />
    ) : (
      <RegisterForm onSwitch={() => setIsLogin(true)} portal={portal} onBack={() => setPortal(null)} />
    );
  }

  if (user?.role === 'ADMIN') {
    return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
  }
  if (user?.role === 'STATION_OWNER') {
    return <StationOwnerDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  return <CitizenDashboard token={token} user={user} onLogout={handleLogout} />;
}

function LoginForm({ onAuth, onSwitch, portal, onBack }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      onAuth(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const config: Record<string, any> = {
    ADMIN: {
      title: 'Government Administrator Login',
      subtitle: 'Access and manage fuel policies, stations, quotas and system operations.',
      Icon: Landmark,
      bg: '/government-login-bg.png',
      overlay: 'linear-gradient(90deg, rgba(3, 10, 24, 0.55), rgba(3, 10, 24, 0.25), rgba(3, 10, 24, 0.60))',
      cardBg: 'rgba(8, 16, 32, 0.72)',
      border: 'border-amber-500/45',
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      btnBg: 'bg-gradient-to-r from-amber-500 to-amber-400',
      btnText: 'Sign In to Admin Portal',
      btnShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
      hoverBtnBg: 'hover:from-amber-400 hover:to-amber-300'
    },
    STATION_OWNER: {
      title: 'Fuel Station Login',
      subtitle: 'Manage fuel inventory, reservations, QR verification and fuel dispensing.',
      Icon: Fuel,
      bg: '/fuel-station-login-bg.png',
      overlay: 'linear-gradient(90deg, rgba(2, 12, 30, 0.58), rgba(2, 12, 30, 0.25), rgba(2, 12, 30, 0.62))',
      cardBg: 'rgba(5, 15, 32, 0.72)',
      border: 'border-[#328cff]/50',
      iconColor: 'text-[#328cff]',
      iconBg: 'bg-[#328cff]/10 border-[#328cff]/50 shadow-[0_0_20px_rgba(50,140,255,0.2)]',
      btnBg: 'bg-gradient-to-r from-[#1264FF] to-[#4AA3FF]',
      btnText: 'Sign In to Station Portal',
      btnShadow: 'shadow-[0_0_20px_rgba(18,100,255,0.4)]',
      hoverBtnBg: 'hover:from-[#4AA3FF] hover:to-[#1264FF]'
    },
    USER: {
      title: 'Citizen / Vehicle Owner Login',
      subtitle: 'Manage your vehicles, check fuel quota, reserve fuel and view transaction history.',
      Icon: Users,
      bg: '/citizen-login-bg.png',
      overlay: 'linear-gradient(90deg, rgba(2, 18, 18, 0.58), rgba(2, 18, 18, 0.25), rgba(2, 18, 18, 0.62))',
      cardBg: 'rgba(5, 18, 22, 0.72)',
      border: 'border-[#00dc82]/45',
      iconColor: 'text-[#00dc82]',
      iconBg: 'bg-[#00dc82]/10 border-[#00dc82]/50 shadow-[0_0_20px_rgba(0,220,130,0.2)]',
      btnBg: 'bg-gradient-to-r from-[#00B956] to-[#00E676]',
      btnText: 'Sign In to Citizen Portal',
      btnShadow: 'shadow-[0_0_20px_rgba(0,185,86,0.4)]',
      hoverBtnBg: 'hover:from-[#00E676] hover:to-[#00B956]'
    }
  };

  const currentConfig = config[portal] || config.USER;
  const { title, subtitle, Icon, bg, overlay, cardBg, border, iconColor, iconBg, btnBg, btnText, btnShadow, hoverBtnBg } = currentConfig;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans bg-[#030a18]">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${bg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div 
        className="absolute inset-0"
        style={{ background: overlay }}
      />
      
      {/* Branding */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 flex flex-col z-20">
        <div className="flex items-center text-white space-x-2">
          <Icon className={`w-6 h-6 ${iconColor}`} />
          <span className="font-bold text-lg md:text-xl tracking-wide">SMART FUEL</span>
        </div>
        <div className="text-xs text-gray-300 tracking-wider mt-1 font-medium">Rationing & Optimization System</div>
        <div className="text-[10px] text-gray-400 mt-0.5">Digital Fuel Management Platform</div>
      </div>

      {/* Back Button */}
      <button onClick={onBack} className="absolute top-6 right-6 md:top-8 md:right-10 text-gray-300 hover:text-white transition-colors flex items-center text-sm font-medium z-20 bg-[#050c17]/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:border-white/20">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
      </button>

      {/* Card */}
      <div className={`max-w-[460px] w-full p-8 md:p-10 rounded-3xl relative z-20 shadow-[0_20px_70px_rgba(0,0,0,0.45)] border ${border} flex flex-col items-center`} style={{ background: cardBg, backdropFilter: 'blur(12px)' }}>
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border-[2px] ${iconBg}`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3 tracking-tight leading-tight">{title}</h2>
        <p className="text-sm text-gray-300 text-center mb-8 leading-relaxed px-2">{subtitle}</p>
        
        {error && <div className="mb-6 p-4 w-full bg-red-900/40 border border-red-500/30 text-red-200 rounded-xl flex items-center text-sm"><AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />{error}</div>}
        
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input type="email" placeholder="Email Address" required className="w-full p-4 bg-[#050c17]/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full p-4 bg-[#050c17]/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm" value={password} onChange={e => setPassword(e.target.value)} />
          
          <button type="submit" disabled={loading} className={`w-full group/btn relative flex items-center justify-center p-4 mt-6 rounded-xl font-bold text-white transition-all duration-300 overflow-hidden ${btnBg} ${btnShadow} ${hoverBtnBg}`}>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
            <span className="relative z-10">{loading ? 'Authenticating...' : btnText}</span>
            {!loading && <ArrowRight className="w-4 h-4 ml-2 relative z-10 group-hover/btn:translate-x-1 transition-transform" />}
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-gray-400">
          Don't have an account? <button onClick={onSwitch} className={`font-semibold ml-1 ${iconColor} hover:text-white transition-colors`}>Register</button>
        </p>
      </div>
    </div>
  );
}

function RegisterForm({ onSwitch, onBack, portal }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post(`${API_URL}/auth/register`, { name, email, password });
      setTimeout(() => onSwitch(), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const config: Record<string, any> = {
    ADMIN: {
      title: 'Administrator Access',
      subtitle: 'System administration is restricted to authorized personnel.',
      Icon: Landmark,
      bg: '/government-login-bg.png',
      overlay: 'linear-gradient(90deg, rgba(3, 10, 24, 0.55), rgba(3, 10, 24, 0.25), rgba(3, 10, 24, 0.60))',
      cardBg: 'rgba(8, 16, 32, 0.74)',
      border: 'border-amber-500/45',
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      btnBg: 'bg-gradient-to-r from-amber-500 to-amber-400',
      btnText: 'Create Admin Account',
      btnShadow: 'shadow-[0_8px_30px_rgba(245,158,11,0.3)]',
      hoverBtnBg: 'hover:from-amber-400 hover:to-amber-300'
    },
    STATION_OWNER: {
      title: 'Station Owner Access',
      subtitle: 'Station access requires official authorization.',
      Icon: Fuel,
      bg: '/fuel-station-login-bg.png',
      overlay: 'linear-gradient(90deg, rgba(2, 12, 30, 0.58), rgba(2, 12, 30, 0.25), rgba(2, 12, 30, 0.62))',
      cardBg: 'rgba(5, 15, 32, 0.74)',
      border: 'border-[#328cff]/50',
      iconColor: 'text-[#328cff]',
      iconBg: 'bg-[#328cff]/10 border-[#328cff]/50 shadow-[0_0_20px_rgba(50,140,255,0.2)]',
      btnBg: 'bg-gradient-to-r from-[#1264FF] to-[#4AA3FF]',
      btnText: 'Create Station Account',
      btnShadow: 'shadow-[0_8px_30px_rgba(18,100,255,0.3)]',
      hoverBtnBg: 'hover:from-[#4AA3FF] hover:to-[#1264FF]'
    },
    USER: {
      title: 'Create Citizen Account',
      subtitle: 'Register to manage your vehicles, check fuel quota, reserve fuel and view transaction history.',
      Icon: Users,
      bg: '/citizen-login-bg.png',
      overlay: 'linear-gradient(90deg, rgba(2, 18, 18, 0.58), rgba(2, 18, 18, 0.25), rgba(2, 18, 18, 0.62))',
      cardBg: 'rgba(5, 18, 22, 0.74)',
      border: 'border-[#00dc82]/45',
      iconColor: 'text-[#00dc82]',
      iconBg: 'bg-[#00dc82]/10 border-[#00dc82]/50 shadow-[0_0_20px_rgba(0,220,130,0.2)]',
      btnBg: 'bg-gradient-to-r from-[#00B956] to-[#00E676]',
      btnText: 'Create Citizen Account',
      btnShadow: 'shadow-[0_8px_30px_rgba(0,185,86,0.3)]',
      hoverBtnBg: 'hover:from-[#00E676] hover:to-[#00B956]'
    }
  };

  const currentConfig = config[portal] || config.USER;
  const { title, subtitle, Icon, bg, overlay, cardBg, border, iconColor, iconBg, btnBg, btnText, btnShadow, hoverBtnBg } = currentConfig;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans bg-[#030a18]">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${bg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div 
        className="absolute inset-0"
        style={{ background: overlay }}
      />
      
      {/* Branding */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 flex flex-col z-20">
        <div className="flex items-center text-white space-x-2">
          <Icon className={`w-6 h-6 ${iconColor}`} />
          <span className="font-bold text-lg md:text-xl tracking-wide">SMART FUEL</span>
        </div>
        <div className="text-xs text-gray-300 tracking-wider mt-1 font-medium">Rationing & Optimization System</div>
        <div className="text-[10px] text-gray-400 mt-0.5">Digital Fuel Management Platform</div>
      </div>

      {/* Back Button */}
      <button onClick={onBack} className="absolute top-6 right-6 md:top-8 md:right-10 text-gray-300 hover:text-white transition-colors flex items-center text-sm font-medium z-20 bg-[#050c17]/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:border-white/20">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
      </button>

      {/* Card */}
      <div className={`max-w-[460px] w-full p-8 md:p-10 rounded-3xl relative z-20 shadow-[0_20px_70px_rgba(0,0,0,0.45)] border ${border} flex flex-col items-center`} style={{ background: cardBg, backdropFilter: 'blur(12px)' }}>
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border-[2px] ${iconBg}`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3 tracking-tight leading-tight">{title}</h2>
        <p className="text-sm text-gray-300 text-center mb-8 leading-relaxed px-2">{subtitle}</p>
        
        {portal === 'STATION_OWNER' || portal === 'ADMIN' ? (
          <div className="w-full flex flex-col items-center">
            <p className="text-white text-center mb-4">
              {portal === 'STATION_OWNER' ? 'Station Owner' : 'Administrator'} accounts are provisioned by the system administrator.
            </p>
            <p className="text-gray-300 text-center mb-8">
              Please contact your administrator if you need an account.
            </p>
            <button onClick={onSwitch} className={`w-full group/btn relative flex items-center justify-center p-4 rounded-xl font-bold text-white transition-all duration-300 overflow-hidden ${btnBg} ${btnShadow} ${hoverBtnBg}`}>
              <span className="relative z-10">Back to {portal === 'STATION_OWNER' ? 'Fuel Station' : 'Government'} Login</span>
            </button>
          </div>
        ) : (
          <>
            {error && <div className="mb-6 p-4 w-full bg-red-900/40 border border-red-500/30 text-red-200 rounded-xl flex items-center text-sm"><AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />{error}</div>}
            
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <input type="text" placeholder="Full Name" required className="w-full p-4 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#328CFF] focus:ring-1 focus:ring-[#328CFF] transition-all text-sm" style={{ background: 'rgba(3, 12, 25, 0.65)', border: '1px solid rgba(100, 150, 200, 0.30)' }} value={name} onChange={e => setName(e.target.value)} />
              <input type="email" placeholder="Email Address" required className="w-full p-4 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#328CFF] focus:ring-1 focus:ring-[#328CFF] transition-all text-sm" style={{ background: 'rgba(3, 12, 25, 0.65)', border: '1px solid rgba(100, 150, 200, 0.30)' }} value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" required className="w-full p-4 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#328CFF] focus:ring-1 focus:ring-[#328CFF] transition-all text-sm" style={{ background: 'rgba(3, 12, 25, 0.65)', border: '1px solid rgba(100, 150, 200, 0.30)' }} value={password} onChange={e => setPassword(e.target.value)} />
              
              <button type="submit" disabled={loading} className={`w-full group/btn relative flex items-center justify-center p-4 mt-6 rounded-xl font-bold text-white transition-all duration-300 overflow-hidden ${btnBg} ${btnShadow} ${hoverBtnBg}`}>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                <span className="relative z-10">{loading ? 'Processing...' : btnText}</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-2 relative z-10 group-hover/btn:translate-x-1 transition-transform" />}
              </button>
            </form>
            
            <p className="mt-8 text-center text-sm text-gray-400">
              Already have an account? <button onClick={onSwitch} className={`font-semibold ml-1 ${iconColor} hover:text-white transition-colors`}>Login</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function LandingPage({ onSelect }: { onSelect: (role: string) => void }) {
  return (
    <div 
      className="min-h-screen relative flex flex-col font-sans overflow-x-hidden bg-[#020813]"
      style={{
        backgroundImage: "url('/fuel-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#020813]/80 via-[#020813]/50 to-[#020813]/90 backdrop-brightness-75 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      
      <header className="relative z-10 w-full px-8 py-5 flex flex-col md:flex-row justify-between items-center">
        {/* Top Left */}
        <div className="flex items-center space-x-3 mb-4 md:mb-0">
          <Shield className="w-10 h-10 text-white" strokeWidth={1.5} />
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">SMART FUEL</h1>
            <p className="text-[11px] md:text-xs text-gray-300 tracking-wider font-medium">Rationing & Optimization System</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Government of India Initiative</p>
          </div>
        </div>
        
        {/* Top Center */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-medium text-gray-200 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            <Shield className="w-4 h-4 text-blue-400" /><span>Secure</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-gray-200 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            <BarChart3 className="w-4 h-4 text-gray-300" /><span>Transparent</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-gray-200 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            <Zap className="w-4 h-4 text-gray-300" /><span>Efficient</span>
          </div>
        </div>

        {/* Top Right */}
        <div className="mt-2 md:mt-0 flex items-center space-x-2 text-white text-xs text-right">
          <div className="flex flex-col items-end leading-tight">
            <span>Fuel for a</span>
            <span className="font-semibold">Sustainable Tomorrow</span>
          </div>
          <Leaf className="w-6 h-6 text-green-500 ml-2" />
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col items-center pt-8 md:pt-12 px-4 pb-32">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="w-20 h-1 bg-blue-500 rounded-full mb-6" />
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-2 text-white drop-shadow-md">SMART FUEL</h2>
          <h3 className="text-2xl md:text-4xl font-bold tracking-widest text-[#3b82f6] mb-4 drop-shadow-sm uppercase">RATIONING & OPTIMIZATION SYSTEM</h3>
          <p className="text-sm md:text-base text-gray-300 font-medium tracking-wide flex items-center">
            Digital Fuel Management <span className="mx-3 text-gray-500">•</span> Fair Distribution <span className="mx-3 text-gray-500">•</span> A Sustainable Future
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1200px] w-full">
          {/* GOVERNMENT CARD */}
          <div className="group relative overflow-hidden flex flex-col border border-amber-500/30 rounded-3xl p-7 transition-all duration-300 hover:border-amber-400/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]" style={{ backgroundImage: "url('/fuel-background.png')", backgroundSize: '220% auto', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(180deg, rgba(20, 12, 4, 0.20) 0%, rgba(8, 10, 18, 0.60) 55%, rgba(5, 8, 15, 0.88) 100%)' }} />
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-amber-500/50 rounded-b-full shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none z-10" />
            
            <div className="relative z-10 flex flex-col items-start mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-[3px] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-[#0a1526]">
                <Landmark className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide leading-tight">GOVERNMENT /<br/>ADMINISTRATOR</h3>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium relative z-10">Manage fuel policies, monitor stations,<br/>manage quotas, users and system-wide<br/>operations.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8 relative z-10 flex-1">
              <div className="flex items-center text-[10px] text-gray-300"><FileText className="w-3.5 h-3.5 mr-2 text-amber-500" /> Policy Management</div>
              <div className="flex items-center text-[10px] text-gray-300"><MapPin className="w-3.5 h-3.5 mr-2 text-amber-500" /> Station Monitoring</div>
              <div className="flex items-center text-[10px] text-gray-300"><BarChart3 className="w-3.5 h-3.5 mr-2 text-amber-500" /> System Analytics</div>
              <div className="flex items-center text-[10px] text-gray-300"><Users className="w-3.5 h-3.5 mr-2 text-amber-500" /> User Management</div>
            </div>

            <div className="mt-auto relative z-10">
              <button onClick={() => onSelect('ADMIN')} className="w-full relative group/btn flex items-center justify-center px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full font-bold text-white shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.8)] hover:scale-[1.02] transition-all duration-300 overflow-hidden border border-amber-300/50">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                <Landmark className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10 mr-2">Government Login</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* STATION CARD */}
          <div className="group relative overflow-hidden flex flex-col border border-blue-500/30 rounded-3xl p-7 transition-all duration-300 hover:border-blue-400/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]" style={{ backgroundImage: "url('/fuel-background.png')", backgroundSize: '220% auto', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(180deg, rgba(3, 20, 45, 0.18) 0%, rgba(4, 12, 28, 0.58) 55%, rgba(3, 8, 18, 0.88) 100%)' }} />
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-blue-500/50 rounded-b-full shadow-[0_0_20px_rgba(59,130,246,0.5)] z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none z-10" />
            
            <div className="relative z-10 flex flex-col items-start mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-[3px] border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-[#0a1526]">
                <Fuel className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide leading-tight">FUEL STATION<br/><span className="text-transparent select-none">.</span></h3>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium relative z-10">Manage fuel inventory, reservations,<br/>QR verification and fuel dispensing.<br/><span className="text-transparent select-none">.</span></p>
            
            <div className="grid grid-cols-2 gap-3 mb-8 relative z-10 flex-1">
              <div className="flex items-center text-[10px] text-gray-300"><Database className="w-3.5 h-3.5 mr-2 text-blue-500" /> Inventory Management</div>
              <div className="flex items-center text-[10px] text-gray-300"><Calendar className="w-3.5 h-3.5 mr-2 text-blue-500" /> Manage Reservations</div>
              <div className="flex items-center text-[10px] text-gray-300"><QrCode className="w-3.5 h-3.5 mr-2 text-blue-500" /> Verify QR Codes</div>
              <div className="flex items-center text-[10px] text-gray-300"><Fuel className="w-3.5 h-3.5 mr-2 text-blue-500" /> Fuel Dispensing</div>
            </div>

            <div className="mt-auto relative z-10">
              <button onClick={() => onSelect('STATION_OWNER')} className="w-full relative group/btn flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full font-bold text-white shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:shadow-[0_0_35px_rgba(59,130,246,0.8)] hover:scale-[1.02] transition-all duration-300 overflow-hidden border border-blue-300/50">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                <Fuel className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10 mr-2">Station Login</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* CITIZEN CARD */}
          <div className="group relative overflow-hidden flex flex-col border border-green-500/30 rounded-3xl p-7 transition-all duration-300 hover:border-green-400/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]" style={{ backgroundImage: "url('/fuel-background.png')", backgroundSize: '220% auto', backgroundPosition: '50% center', backgroundRepeat: 'no-repeat' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(180deg, rgba(2, 30, 20, 0.16) 0%, rgba(3, 18, 18, 0.58) 55%, rgba(2, 10, 14, 0.88) 100%)' }} />
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-green-500/50 rounded-b-full shadow-[0_0_20px_rgba(34,197,94,0.5)] z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none z-10" />
            
            <div className="relative z-10 flex flex-col items-start mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-[3px] border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-[#0a1526]">
                <Users className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide leading-tight">CITIZEN /<br/>VEHICLE OWNER</h3>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium relative z-10">Manage vehicles, check fuel quota,<br/>reserve fuel and view transaction history.<br/><span className="text-transparent select-none">.</span></p>
            
            <div className="grid grid-cols-2 gap-3 mb-8 relative z-10 flex-1">
              <div className="flex items-center text-[10px] text-gray-300"><Car className="w-3.5 h-3.5 mr-2 text-green-500" /> Vehicle Registration</div>
              <div className="flex items-center text-[10px] text-gray-300"><Search className="w-3.5 h-3.5 mr-2 text-green-500" /> Find Stations</div>
              <div className="flex items-center text-[10px] text-gray-300"><Activity className="w-3.5 h-3.5 mr-2 text-green-500" /> Check Fuel Quota</div>
              <div className="flex items-center text-[10px] text-gray-300"><FileText className="w-3.5 h-3.5 mr-2 text-green-500" /> View Transactions</div>
            </div>

            <div className="mt-auto relative z-10">
              <button onClick={() => onSelect('USER')} className="w-full relative group/btn flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-400 rounded-full font-bold text-white shadow-[0_0_25px_rgba(34,197,94,0.5)] hover:shadow-[0_0_35px_rgba(34,197,94,0.8)] hover:scale-[1.02] transition-all duration-300 overflow-hidden border border-green-300/50">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                <Users className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10 mr-2">Citizen Login</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 w-full bg-black/40 backdrop-blur-md py-5 hidden md:block border-t border-white/5 z-20">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-4 gap-4 text-white">
          <div className="flex items-center space-x-4">
            <ShieldCheck className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">100%</span>
              <span className="text-xs text-gray-400">Secure Platform</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <BarChart3 className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Real-Time</span>
              <span className="text-xs text-gray-400">Fuel Monitoring</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Leaf className="w-8 h-8 text-green-400" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Sustainable</span>
              <span className="text-xs text-gray-400">Resource Management</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Users className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Transparent</span>
              <span className="text-xs text-gray-400">Fair Distribution</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
