import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Fuel, Settings, History, MapPin, QrCode, Scan, Camera,
  CheckCircle, AlertTriangle, AlertCircle, Clock, BarChart3, Menu, X, Database, Droplet, Activity,
  RefreshCw, Zap, Search, Filter, Phone, Navigation, Globe, Calendar, Info, User, PieChart as LucidePieChart, BarChart2, ShieldCheck, Truck
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API_URL = 'http://localhost:3001/api';

export default function StationOwnerDashboard({ token, user, onLogout }: any) {
  const [activeTab, setActiveTab] = useState<'Overview' | 'QR Verification' | 'Fuel Inventory' | 'Dispensing History' | 'Station Profile' | 'Reports' | 'Supply Requests'>('Overview');
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [reservations, setReservations] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [resError, setResError] = useState(false);
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allocationRequests, setAllocationRequests] = useState<any[]>([]);
  const [allocLoading, setAllocLoading] = useState(true);

  // QR Scanner State
  const [qrToken, setQrToken] = useState('');
  const [dispensed, setDispensed] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{type: 'success' | 'error', text: string, reservation?: any} | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStations = async () => {
    try {
      const r = await axios.get(`${API_URL}/stations`, { headers });
      setStations(r.data);
    } catch (e) {
      console.error("Failed to fetch stations", e);
    }
  };

  const fetchReservations = async () => {
    try {
      const r = await axios.get(`${API_URL}/station/reservations`, { headers });
      setReservations(r.data);
      setResError(false);
    } catch (e) {
      console.error("Failed to fetch reservations", e);
      setResError(true);
    }
  };

  const fetchAllocationRequests = async () => {
    try {
      const r = await axios.get(`${API_URL}/station/allocation-requests`, { headers });
      setAllocationRequests(r.data);
    } catch (e) {
      console.error("Failed to fetch allocation requests", e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStations(), fetchReservations(), fetchAllocationRequests()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStations().finally(() => setLoading(false));
    fetchReservations().finally(() => setResLoading(false));
    fetchAllocationRequests().finally(() => setAllocLoading(false));
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (showScanner) {
      setScanMessage('');

      const onScanSuccess = (decodedText: string) => {
        setQrToken(decodedText);
        setScanMessage('QR code scanned successfully');
        if (scanner) {
          scanner.clear().catch(console.error);
          scanner = null;
        }
        setTimeout(() => setShowScanner(false), 1000);
      };

      const onScanFailure = () => {};

      // html5-qrcode has an issue where if it renders into a node that isn't ready it fails.
      // setTimeout gives React a cycle to mount the #qr-reader div
      setTimeout(() => {
        if (!document.getElementById('qr-reader')) return;
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );
        scanner.render(onScanSuccess, onScanFailure);
      }, 0);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showScanner]);

  // KPI Calculations
  const today = new Date().toISOString().split('T')[0];
  const todaysReservations = reservations.filter(r => r.createdAt.startsWith(today)).length;
  const pendingVerification = reservations.filter(r => r.status === 'PENDING').length;

  const fuelDispensedToday = reservations
    .filter(r => r.status === 'COMPLETED' && r.transaction?.createdAt?.startsWith(today))
    .reduce((sum, r) => sum + parseFloat(r.transaction.amount || 0), 0);

  const todaysTransactionsData = reservations
    .filter(r => r.status === 'COMPLETED' && r.transaction && r.transaction.createdAt.startsWith(today))
    .sort((a, b) => new Date(b.transaction.createdAt).getTime() - new Date(a.transaction.createdAt).getTime());

  const renderKPI = (value: number | string, unit = '') => {
    if (resLoading) return '...';
    if (resError) return 'Unavailable';
    return `${value}${unit}`;
  };

  const primaryStation = stations.length > 0 ? stations[0] : null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryStation) return;
    setVerifyLoading(true); setVerifyMessage(null);
    try {
      const res = await axios.post(`${API_URL}/reservations/verify`, {
        qrToken, stationId: primaryStation.id, dispensedAmount: dispensed ? parseFloat(dispensed) : undefined
      }, { headers });
      setVerifyMessage({
        type: 'success',
        text: `Success! Dispensed ${res.data.transaction.amount} L of ${res.data.transaction.fuelType}`,
        reservation: res.data.reservation
      });
      setQrToken(''); setDispensed('');
    } catch (err: any) {
      setVerifyMessage({ type: 'error', text: err.response?.data?.error || 'Verification failed' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const navItems = [
    { name: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'QR Verification', icon: <Scan className="w-5 h-5" /> },
    { name: 'Fuel Inventory', icon: <Fuel className="w-5 h-5" /> },
    { name: 'Dispensing History', icon: <History className="w-5 h-5" /> },
    { name: 'Supply Requests', icon: <Truck className="w-5 h-5" /> },
    { name: 'Station Profile', icon: <Settings className="w-5 h-5" /> },
    { name: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#030a18] font-sans flex text-white relative">
      {/* Global Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/fuel-station-login-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-r from-[#020c1e]/85 via-[#020c1e]/60 to-[#020c1e]/85" />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#050f24]/80 backdrop-blur-xl border-r border-[#328cff]/20 z-40 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static flex flex-col`}>
        <div className="p-6 flex items-center justify-between lg:justify-center">
          <div className="flex items-center space-x-2 text-[#328cff]">
            <Fuel className="w-8 h-8" />
            <div>
              <div className="font-bold text-xl tracking-wide leading-tight text-white">SMART FUEL</div>
              <div className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Rationing & Optimization</div>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.name}
              onClick={() => { setActiveTab(item.name as any); setSidebarOpen(false); }}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${
                activeTab === item.name
                  ? 'bg-[#328cff]/15 text-[#4AA3FF] shadow-[inset_0_0_12px_rgba(50,140,255,0.1)] border border-[#328cff]/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
              }`}
            >
              <div className="mr-3">{item.icon}</div>
              {item.name}
              {activeTab === item.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4AA3FF] shadow-[0_0_8px_#4AA3FF]" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-[#051329]/80 border border-[#328cff]/20 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#328cff]/20 flex items-center justify-center text-[#4AA3FF] font-bold">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold truncate text-white">{user?.name || user?.email}</div>
                <div className="text-[10px] text-[#4AA3FF] font-bold tracking-wider">STATION OWNER</div>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-colors">
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative z-10 w-full lg:w-[calc(100%-16rem)]">
        {/* Header */}
        <header className="h-20 bg-[#050f24]/60 backdrop-blur-md border-b border-[#328cff]/20 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center">
            <button className="lg:hidden text-gray-400 hover:text-white mr-4" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center">
                <Fuel className="w-5 h-5 mr-2 text-[#328cff]" /> Fuel Station Dashboard
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">Manage reservations, verify QR codes, monitor inventory and dispensing operations.</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden sm:flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full mr-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_#34d399]"></div>
              <span className="text-emerald-400 text-xs font-semibold">System Online</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          {activeTab === 'Overview' && (
            <>
              {/* Hero */}
              <div className="bg-[#050f24]/60 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 mb-6 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[#4AA3FF] font-medium text-sm mb-1">Welcome back, {user?.name || user?.email}</p>
                  <h2 className="text-2xl font-bold text-white">Station operations overview</h2>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                  {loading ? (
                    <div className="h-12 w-48 bg-white/5 animate-pulse rounded-lg"></div>
                  ) : primaryStation ? (
                    <>
                      <div className="bg-black/30 border border-white/10 px-4 py-2.5 rounded-xl flex-1 lg:flex-none">
                        <div className="text-white font-bold text-sm leading-tight">{primaryStation.name}</div>
                        <div className="text-gray-400 text-xs flex items-center mt-0.5"><MapPin className="w-3 h-3 mr-1"/> {primaryStation.location}</div>
                      </div>
                      <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_#34d399]"></div>
                        <span className="text-emerald-400 text-xs font-bold">Station Online</span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-sm flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" /> No station registered yet.
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 hover:border-[#328cff]/40 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm font-medium mb-1">Today's Reservations</div>
                  <div className="text-2xl font-bold text-white">{renderKPI(todaysReservations)}</div>
                </div>

                <div className="bg-[#051329]/70 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 hover:border-emerald-500/40 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <Fuel className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm font-medium mb-1">Fuel Dispensed Today</div>
                  <div className="text-2xl font-bold text-white">{renderKPI(fuelDispensedToday, ' L')}</div>
                </div>

                <div className="bg-[#051329]/70 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 hover:border-amber-500/40 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                      <Scan className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm font-medium mb-1">Pending Verification</div>
                  <div className="text-2xl font-bold text-white">{renderKPI(pendingVerification)}</div>
                </div>

                <div className="bg-[#051329]/70 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 hover:border-purple-500/40 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                      <Database className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm font-medium mb-1">Fuel Inventory Items</div>
                  <div className="text-2xl font-bold text-white">{primaryStation?.inventory?.length || 0}</div>
                </div>
              </div>

              {/* Main Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Fuel Inventory */}
                <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/30">
                    <h3 className="text-lg font-bold text-white flex items-center"><Fuel className="w-5 h-5 mr-2 text-[#4AA3FF]"/> Fuel Inventory</h3>
                  </div>
                  <div className="p-6 flex-1">
                    {!primaryStation ? (
                       <div className="text-gray-400 text-center py-8">No station found.</div>
                    ) : primaryStation.inventory?.length === 0 ? (
                       <div className="text-gray-400 text-center py-8 flex flex-col items-center">
                         <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
                         No inventory configured yet.
                       </div>
                    ) : (
                      <div className="space-y-6">
                        {primaryStation.inventory?.map((inv: any) => {
                          const qty = parseFloat(inv.quantity);
                          const cap = parseFloat(inv.capacity);
                          const pct = cap > 0 ? Math.min(100, Math.max(0, (qty / cap) * 100)) : 0;

                          let colorClass = 'bg-blue-500';
                          if (pct < 20) colorClass = 'bg-red-500';
                          else if (pct < 50) colorClass = 'bg-amber-500';
                          else if (pct > 80) colorClass = 'bg-emerald-500';

                          return (
                            <div key={inv.id}>
                              <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mr-3">
                                    <Droplet className="w-4 h-4 text-gray-300" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-white">{inv.fuelType}</div>
                                    <div className="text-xs text-gray-400">{qty.toLocaleString()} L / {cap.toLocaleString()} L</div>
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-white">{pct.toFixed(1)}%</div>
                              </div>
                              <div className="w-full bg-gray-800/80 rounded-full h-3 overflow-hidden border border-gray-700/50">
                                <div className={`h-full ${colorClass} shadow-[0_0_10px_currentColor] transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Reservations */}
                <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/30">
                    <h3 className="text-lg font-bold text-white flex items-center"><Clock className="w-5 h-5 mr-2 text-[#4AA3FF]"/> Recent Reservations</h3>
                  </div>
                  {resLoading ? (
                    <div className="p-6 flex-1 flex items-center justify-center min-h-[200px]">
                       <div className="w-8 h-8 border-2 border-[#4AA3FF] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : resError ? (
                    <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                      <AlertTriangle className="w-10 h-10 text-red-500 mb-3 opacity-70" />
                      <p className="text-white text-sm font-medium">Unable to load reservation data</p>
                    </div>
                  ) : reservations.length === 0 ? (
                    <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                      <Clock className="w-10 h-10 text-gray-500 mb-3 opacity-50" />
                      <p className="text-white text-sm font-medium">No reservations yet</p>
                      <p className="text-gray-400 text-xs mt-1 text-center max-w-xs leading-relaxed">Reservations for this station will appear here when citizens book fuel.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                          <tr>
                            <th className="px-6 py-3 font-semibold">ID</th>
                            <th className="px-6 py-3 font-semibold">Citizen</th>
                            <th className="px-6 py-3 font-semibold">Vehicle</th>
                            <th className="px-6 py-3 font-semibold">Fuel</th>
                            <th className="px-6 py-3 font-semibold">Amount</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                            <th className="px-6 py-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {reservations.slice(0, 5).map(r => (
                             <tr key={r.id} className="hover:bg-white/5 transition-colors">
                               <td className="px-6 py-4 font-mono text-xs text-gray-300">{r.id.split('-')[0]}...</td>
                               <td className="px-6 py-4">
                                 <div className="text-white font-medium">{r.user.name}</div>
                                 <div className="text-xs text-gray-500">{r.user.email}</div>
                               </td>
                               <td className="px-6 py-4">
                                 <div className="text-gray-300">{r.vehicle.licensePlate}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">{r.vehicle.vehicleType}</div>
                                 {r.vehicle?.priority?.status === 'APPROVED' && (
                                   <div className="mt-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                     PRIORITY
                                   </div>
                                 )}
                               </td>
                               <td className="px-6 py-4 text-gray-300">{r.fuelType}</td>
                               <td className="px-6 py-4 text-gray-300">{parseFloat(r.amount)} L</td>
                               <td className="px-6 py-4">
                                  {r.status === 'PENDING' && <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Pending</span>}
                                  {r.status === 'COMPLETED' && <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Completed</span>}
                                  {r.status === 'CANCELLED' && <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Cancelled</span>}
                                  {r.status === 'EXPIRED' && <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Expired</span>}
                               </td>
                               <td className="px-6 py-4 text-right">
                                 {r.status === 'PENDING' ? (
                                    <button onClick={() => setActiveTab('QR Verification')} className="text-xs font-bold text-[#4AA3FF] hover:text-white transition-colors bg-[#328cff]/10 hover:bg-[#328cff]/30 px-3 py-1.5 rounded-lg border border-[#328cff]/30">Verify QR</button>
                                 ) : (
                                    <button onClick={() => setSelectedRes(r)} className="text-xs font-bold text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-600">View</button>
                                 )}
                               </td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Lower Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

                {/* Dispensing Activity */}
                <div className="lg:col-span-2 bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/30">
                    <h3 className="text-lg font-bold text-white flex items-center"><Activity className="w-5 h-5 mr-2 text-[#4AA3FF]"/> Today's Dispensing Activity</h3>
                  </div>
                  {todaysTransactionsData.length === 0 ? (
                    <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[200px] bg-[url('/grid-pattern.svg')] bg-center bg-opacity-20">
                      <Activity className="w-10 h-10 text-gray-500 mb-3 opacity-50" />
                      <p className="text-white text-sm font-medium">No dispensing activity data available yet</p>
                      <p className="text-gray-400 text-xs mt-1 text-center max-w-sm leading-relaxed">Station transaction analytics will appear here once station-level transaction data is available.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                          <tr>
                            <th className="px-6 py-3 font-semibold">Time</th>
                            <th className="px-6 py-3 font-semibold">Vehicle</th>
                            <th className="px-6 py-3 font-semibold">Fuel</th>
                            <th className="px-6 py-3 font-semibold">Amount</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {todaysTransactionsData.map(r => {
                            const tx = r.transaction;
                            return (
                              <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-gray-300">
                                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-gray-300">{r.vehicle?.licensePlate || 'Unknown'}</div>
                                  {r.vehicle?.priority?.status === 'APPROVED' && (
                                    <div className="mt-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                      PRIORITY
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-medium text-white">{tx.fuelType}</td>
                                <td className="px-6 py-4 font-bold text-[#4AA3FF]">{parseFloat(tx.amount)} L</td>
                                <td className="px-6 py-4">
                                  {tx.status === 'SUCCESS' && <span className="flex items-center text-emerald-400 text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1" /> SUCCESS</span>}
                                  {tx.status === 'FAILED' && <span className="flex items-center text-red-400 text-xs font-bold"><AlertCircle className="w-3 h-3 mr-1" /> FAILED</span>}
                                  {tx.status === 'PENDING' && <span className="flex items-center text-amber-400 text-xs font-bold"><Clock className="w-3 h-3 mr-1" /> PENDING</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => setActiveTab('QR Verification')}
                      className="w-full flex items-center p-4 bg-gray-800/40 hover:bg-[#328cff]/10 border border-gray-700/50 hover:border-[#328cff]/40 rounded-xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#328cff]/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <Scan className="w-5 h-5 text-[#4AA3FF]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-[#4AA3FF] transition-colors">Scan QR & Verify</div>
                        <div className="text-xs text-gray-400">Verify reservations and dispense fuel</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('Fuel Inventory')}
                      className="w-full flex items-center p-4 bg-gray-800/40 hover:bg-[#328cff]/10 border border-gray-700/50 hover:border-[#328cff]/40 rounded-xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <Fuel className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Fuel Inventory</div>
                        <div className="text-xs text-gray-400">View current fuel levels</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('Dispensing History')}
                      className="w-full flex items-center p-4 bg-gray-800/40 hover:bg-[#328cff]/10 border border-gray-700/50 hover:border-[#328cff]/40 rounded-xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <History className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Dispensing History</div>
                        <div className="text-xs text-gray-400">View all past transactions</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('Reports')}
                      className="w-full flex items-center p-4 bg-gray-800/40 hover:bg-[#328cff]/10 border border-gray-700/50 hover:border-[#328cff]/40 rounded-xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">View Reports</div>
                        <div className="text-xs text-gray-400">Open dispensing analytics</div>
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}

          {activeTab === 'QR Verification' && (
            <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto mt-8">
              <div className="p-6 border-b border-[#328cff]/20 bg-[#328cff]/5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center"><Scan className="w-6 h-6 mr-3 text-[#4AA3FF]"/> QR Verification</h3>
              </div>
              <div className="p-8">
                {verifyMessage && (
                  <div className={`mb-6 p-5 rounded-xl border flex flex-col text-sm font-medium ${verifyMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    <div className={`flex items-center ${verifyMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {verifyMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
                      {verifyMessage.text}
                    </div>
                    {verifyMessage.type === 'success' && verifyMessage.reservation && (
                      <div className="mt-4 pt-4 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        {verifyMessage.reservation.vehicle?.priority?.status === 'APPROVED' ? (
                          <div className="flex items-center px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 w-full sm:w-auto">
                            <ShieldCheck className="w-5 h-5 mr-2" />
                            <div>
                              <div className="font-bold text-sm tracking-wide">PRIORITY SERVICE</div>
                              <div className="text-xs capitalize">{verifyMessage.reservation.vehicle.priority.serviceType.replace('_', ' ').toLowerCase()}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 w-full sm:w-auto">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <div>
                              <div className="font-bold text-sm tracking-wide">Normal Service</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">QR Token <span className="text-red-400">*</span></label>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="mt-2 sm:mt-0 px-4 py-1.5 bg-[#328cff]/20 hover:bg-[#328cff]/40 text-[#4AA3FF] font-bold rounded-xl border border-[#328cff]/30 flex items-center transition-colors text-xs"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Scan QR with Camera
                    </button>
                  </div>
                  <div>
                    <div className="relative">
                      <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        required
                        value={qrToken}
                        onChange={e => setQrToken(e.target.value)}
                        placeholder="Scan or enter QR token"
                        className="w-full pl-12 pr-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#4AA3FF] focus:ring-1 focus:ring-[#4AA3FF] transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Dispensed Amount (Liters) <span className="text-gray-500 font-normal text-xs ml-1">(Optional)</span></label>
                    <div className="relative">
                      <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={dispensed}
                        onChange={e => setDispensed(e.target.value)}
                        placeholder="Leave blank to dispense full reserved amount"
                        className="w-full pl-12 pr-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#4AA3FF] focus:ring-1 focus:ring-[#4AA3FF] transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading || !primaryStation}
                    className="w-full py-4 bg-gradient-to-r from-[#1264FF] to-[#4AA3FF] hover:from-[#4AA3FF] hover:to-[#1264FF] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(18,100,255,0.3)] transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyLoading ? 'Verifying...' : 'Verify & Dispense'}
                  </button>
                  {!primaryStation && <p className="text-center text-sm text-red-400 mt-2">No station available to process verification.</p>}
                </form>
              </div>
            </div>
          )}

          {activeTab === 'Fuel Inventory' && (
            <FuelInventoryView
              station={primaryStation}
              loading={loading}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              token={token}
            />
          )}

          {activeTab === 'Dispensing History' && (
            <DispensingHistoryView
              reservations={reservations}
              loading={resLoading}
              error={resError}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'Station Profile' && (
            <StationProfileView
              station={primaryStation}
              loading={loading}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              user={user}
            />
          )}

          {activeTab === 'Reports' && (
            <ReportsView
              station={primaryStation}
              reservations={reservations}
              loading={loading || resLoading}
              error={resError}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'Supply Requests' && (
            <SupplyRequestsView
              station={primaryStation}
              requests={allocationRequests}
              loading={loading || allocLoading}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              token={token}
            />
          )}

        </div>
      </main>

      {/* Reservation Details Modal */}
      {selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a152e] border border-gray-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-900/40 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Reservation Details</h3>
              <button onClick={() => setSelectedRes(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reservation ID</div>
                <div className="text-sm font-mono text-gray-300 break-all bg-black/30 p-2 rounded-lg border border-gray-800">{selectedRes.id}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Citizen</div>
                  <div className="text-sm font-medium text-white">{selectedRes.user.name}</div>
                  <div className="text-xs text-gray-400">{selectedRes.user.email}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vehicle</div>
                  <div className="text-sm font-medium text-white">{selectedRes.vehicle.licensePlate}</div>
                  <div className="text-xs text-gray-400 uppercase">{selectedRes.vehicle.vehicleType}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fuel Request</div>
                  <div className="text-sm font-medium text-white">{parseFloat(selectedRes.amount)} L of {selectedRes.fuelType}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="text-sm font-medium text-white">{selectedRes.status}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created At</div>
                  <div className="text-sm text-gray-300">{new Date(selectedRes.createdAt).toLocaleString()}</div>
                </div>
                {selectedRes.transaction && (
                  <>
                    <div className="col-span-2 mt-2 pt-4 border-t border-gray-800">
                      <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Transaction Record</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Dispensed</div>
                          <div className="text-sm font-medium text-white">{parseFloat(selectedRes.transaction.amount)} L</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Timestamp</div>
                          <div className="text-sm text-gray-300">{new Date(selectedRes.transaction.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-900/40 border-t border-gray-700/50 flex justify-end">
               <button onClick={() => setSelectedRes(null)} className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors border border-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#050f24]/95 border border-[#328cff]/50 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(50,140,255,0.2)] overflow-hidden flex flex-col relative">
            <div className="p-4 border-b border-[#328cff]/20 bg-[#328cff]/10 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center"><Camera className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Scan Citizen Reservation QR</h3>
              <button onClick={() => setShowScanner(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-400 text-sm mb-4 text-center">Position the QR code inside the frame</p>
              <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-2 border-[#328cff]/50 bg-black min-h-[250px]"></div>
              {scanMessage && <p className="mt-4 text-center text-emerald-400 font-bold text-sm bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/30">{scanMessage}</p>}
            </div>
            <div className="p-4 border-t border-[#328cff]/20 flex justify-center bg-[#030a18]">
              <button onClick={() => setShowScanner(false)} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold border border-gray-600 transition-colors">
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FuelInventoryView({ station, loading, isRefreshing, onRefresh, token }: any) {
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleUpdatePrice = async (fuelType: string) => {
    if (!priceInput || isNaN(Number(priceInput)) || Number(priceInput) < 0) {
      setUpdateMessage({ type: 'error', text: 'Enter a valid positive price.' });
      return;
    }
    setUpdateLoading(true);
    setUpdateMessage(null);
    try {
      await axios.put(`${API_URL}/stations/${station.id}/inventory/${fuelType}/price`, {
        price: Number(priceInput)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpdateMessage({ type: 'success', text: `Price for ${fuelType} updated successfully.` });
      setEditingPrice(null);
      setPriceInput('');
      onRefresh(); // Refresh inventory data
    } catch (err: any) {
      setUpdateMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update price' });
    } finally {
      setUpdateLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Fuel Inventory</h2>
            <p className="text-gray-400 text-sm">Monitor fuel availability, capacity and station inventory.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to load inventory</h2>
        <button onClick={onRefresh} disabled={isRefreshing} className="mt-4 px-6 py-2 bg-[#328cff]/20 text-[#4AA3FF] hover:bg-[#328cff]/30 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  const inventory = station.inventory || [];

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl relative">
        <div className="absolute top-4 right-4">
          <button onClick={onRefresh} disabled={isRefreshing} className="p-2 text-[#4AA3FF] hover:bg-[#328cff]/20 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <Database className="w-12 h-12 text-gray-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white mb-2">No inventory data available</h2>
        <p className="text-gray-400 text-sm">Fuel inventory has not been configured for this station.</p>
      </div>
    );
  }

  const totalQty = inventory.reduce((sum: number, item: any) => sum + parseFloat(item.quantity), 0);
  const totalCap = inventory.reduce((sum: number, item: any) => sum + parseFloat(item.capacity), 0);
  const overallUtil = totalCap > 0 ? (totalQty / totalCap) * 100 : 0;
  const numTypes = inventory.length;

  const lowInventoryItems = inventory.filter((item: any) => {
    const q = parseFloat(item.quantity);
    const c = parseFloat(item.capacity);
    return c > 0 && (q / c) * 100 <= 20;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Fuel Inventory</h2>
          <p className="text-gray-400 text-sm">Monitor fuel availability, capacity and station inventory.</p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_#34d399]"></div>
            <span className="text-emerald-400 text-xs font-semibold">Inventory Live</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-1.5 bg-[#328cff]/10 hover:bg-[#328cff]/20 border border-[#328cff]/30 rounded-full text-[#4AA3FF] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Fuel Available</div>
          <div className="text-2xl font-bold text-white">{totalQty.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Storage Capacity</div>
          <div className="text-2xl font-bold text-white">{totalCap.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Overall Utilization</div>
          <div className="text-2xl font-bold text-white">{overallUtil.toFixed(1)}%</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Fuel Types</div>
          <div className="text-2xl font-bold text-white">{numTypes}</div>
        </div>
      </div>

      {/* LOW INVENTORY ALERT */}
      {lowInventoryItems.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
          <h3 className="text-amber-400 font-bold flex items-center mb-4"><AlertTriangle className="w-5 h-5 mr-2" /> Low Inventory Alert</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowInventoryItems.map((item: any) => (
              <div key={item.id} className="bg-black/30 border border-amber-500/20 rounded-xl p-4 flex justify-between items-center">
                <div className="text-white font-bold">{item.fuelType}</div>
                <div className="text-sm text-amber-400 font-medium">{parseFloat(item.quantity).toLocaleString()} L remaining</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUEL INVENTORY CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {inventory.map((inv: any) => {
          const q = parseFloat(inv.quantity);
          const c = parseFloat(inv.capacity);
          const pct = c > 0 ? (q / c) * 100 : 0;

          let statusStr = 'Healthy';
          let statusColor = 'text-emerald-400';
          if (pct === 100) { statusStr = 'Full'; statusColor = 'text-[#4AA3FF]'; }
          else if (pct >= 90) { statusStr = 'Low'; statusColor = 'text-amber-400'; }
          else if (pct >= 70) { statusStr = 'Moderate'; statusColor = 'text-yellow-400'; }
          else { statusStr = 'Healthy'; statusColor = 'text-emerald-400'; }

          let barColor = 'bg-emerald-500';
          if (pct < 20) barColor = 'bg-red-500';
          else if (pct < 50) barColor = 'bg-amber-500';
          else if (pct >= 70) barColor = 'bg-[#328cff]';

          return (
            <div key={inv.id} className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-[#328cff]/10 flex items-center justify-center border border-[#328cff]/20 mr-4">
                    {['ELECTRIC', 'HYBRID'].includes(inv.fuelType) ? <Zap className="w-6 h-6 text-[#4AA3FF]" /> : <Droplet className="w-6 h-6 text-[#4AA3FF]" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{inv.fuelType}</h3>
                    <div className={`text-sm font-semibold ${statusColor}`}>{statusStr}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#4AA3FF]">{q.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L</div>
                  <div className="text-sm text-gray-400 font-medium">of {c.toLocaleString()} L</div>
                </div>
              </div>

              <div className="mb-2 flex justify-between items-center text-sm">
                <span className="font-semibold text-white">{pct.toFixed(1)}% utilized</span>
              </div>
              <div className="w-full bg-gray-900/80 rounded-full h-3 overflow-hidden border border-gray-700/50 mb-4">
                <div className={`h-full ${barColor} shadow-[0_0_8px_currentColor] transition-all duration-1000`} style={{ width: `${Math.min(100, pct)}%` }}></div>
              </div>

              <div className="text-xs text-gray-500 flex items-center justify-between mt-4 border-t border-gray-700/50 pt-4">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold text-white">Current Price</span>
                    {editingPrice === inv.fuelType ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="w-24 p-1 px-2 bg-[#020a08] border border-gray-600 rounded text-white text-sm"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                        <button
                          onClick={() => handleUpdatePrice(inv.fuelType)}
                          disabled={updateLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingPrice(null); setPriceInput(''); }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[#4AA3FF] font-bold">{inv.price !== null && inv.price !== undefined ? `₹${Number(inv.price).toFixed(2)}/L` : 'Not Configured'}</span>
                        <button
                          onClick={() => { setEditingPrice(inv.fuelType); setPriceInput(inv.price ? String(inv.price) : ''); setUpdateMessage(null); }}
                          className="text-gray-400 hover:text-white transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center mt-2 text-gray-500">
                    <Clock className="w-3 h-3 mr-1.5" />
                    Last updated: {new Date(inv.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DispensingHistoryView({ reservations, loading, error, isRefreshing, onRefresh }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fuelFilter, setFuelFilter] = useState('All Fuel Types');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Dispensing History</h2>
            <p className="text-gray-400 text-sm">Review completed fuel dispensing operations at your station.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
        </div>
        <div className="h-64 bg-gray-800/50 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to load dispensing history</h2>
        <p className="text-gray-400 text-sm mb-4">Please try again.</p>
        <button onClick={onRefresh} disabled={isRefreshing} className="px-6 py-2 bg-[#328cff]/20 text-[#4AA3FF] hover:bg-[#328cff]/30 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  const completedCount = reservations.filter((r: any) => r.status === 'COMPLETED' && r.transaction).length;
  const totalDispensed = reservations
    .filter((r: any) => r.status === 'COMPLETED' && r.transaction)
    .reduce((sum: number, r: any) => sum + parseFloat(r.transaction.amount || 0), 0);
  const pendingCount = reservations.filter((r: any) => r.status === 'PENDING').length;
  const cancelledCount = reservations.filter((r: any) => r.status === 'CANCELLED').length;

  const availableFuelTypes = Array.from(new Set(reservations.map((r: any) => r.fuelType)));

  const filtered = reservations.filter((r: any) => {
    if (statusFilter !== 'All') {
      if (statusFilter === 'Completed' && r.status !== 'COMPLETED') return false;
      if (statusFilter === 'Pending' && r.status !== 'PENDING') return false;
      if (statusFilter === 'Cancelled' && r.status !== 'CANCELLED') return false;
    }
    if (fuelFilter !== 'All Fuel Types' && r.fuelType !== fuelFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const citizenMatch = r.user?.name?.toLowerCase().includes(term) || r.user?.email?.toLowerCase().includes(term);
      const vehicleMatch = r.vehicle?.licensePlate?.toLowerCase().includes(term);
      const fuelMatch = r.fuelType?.toLowerCase().includes(term);
      const idMatch = r.id.toLowerCase().includes(term);

      if (!citizenMatch && !vehicleMatch && !fuelMatch && !idMatch) return false;
    }
    return true;
  });

  const latestTransaction = [...reservations]
    .filter((r: any) => r.status === 'COMPLETED' && r.transaction)
    .sort((a: any, b: any) => new Date(b.transaction.createdAt).getTime() - new Date(a.transaction.createdAt).getTime())[0];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Dispensing History</h2>
          <p className="text-gray-400 text-sm">Review completed fuel dispensing operations at your station.</p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_#34d399]"></div>
            <span className="text-emerald-400 text-xs font-semibold">Transaction Records</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-1.5 bg-[#328cff]/10 hover:bg-[#328cff]/20 border border-[#328cff]/30 rounded-full text-[#4AA3FF] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* LATEST TRANSACTION HIGHLIGHT */}
      {latestTransaction && (
        <div className="bg-[#328cff]/10 border border-[#328cff]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-xl">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="w-10 h-10 rounded-full bg-[#328cff]/20 flex items-center justify-center text-[#4AA3FF] mr-4 border border-[#328cff]/40">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[#4AA3FF] font-bold text-sm">Latest Dispensing</div>
              <div className="text-white font-medium text-xs">{new Date(latestTransaction.transaction.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <div className="text-gray-400 text-xs">Vehicle</div>
              <div className="text-white font-bold">{latestTransaction.vehicle?.licensePlate}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Fuel</div>
              <div className="text-white font-bold">{latestTransaction.fuelType}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Amount</div>
              <div className="text-[#00dc82] font-bold">{parseFloat(latestTransaction.transaction.amount)} L</div>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Dispensed</div>
          <div className="text-2xl font-bold text-white">{totalDispensed.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Completed Transactions</div>
          <div className="text-2xl font-bold text-white">{completedCount}</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Pending Reservations</div>
          <div className="text-2xl font-bold text-white">{pendingCount}</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Cancelled Reservations</div>
          <div className="text-2xl font-bold text-white">{cancelledCount}</div>
        </div>
      </div>

      {/* DISPENSING TABLE AREA */}
      <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-900/30 gap-4">
          <h3 className="text-lg font-bold text-white flex items-center"><History className="w-5 h-5 mr-2 text-[#4AA3FF]"/> Transaction History</h3>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search citizen, vehicle..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 lg:w-64 pl-9 pr-4 py-2 bg-gray-900/60 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#4AA3FF] transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-8 py-2 bg-gray-900/60 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#4AA3FF] transition-colors appearance-none"
                >
                  <option value="All">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <select
                value={fuelFilter}
                onChange={e => setFuelFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-900/60 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#4AA3FF] transition-colors appearance-none"
              >
                <option value="All Fuel Types">All Fuel Types</option>
                {availableFuelTypes.map((ft: any) => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <History className="w-12 h-12 text-gray-500 mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No dispensing records yet</h3>
            <p className="text-gray-400 text-sm text-center">Completed fuel transactions will appear here after QR verification.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Search className="w-12 h-12 text-gray-500 mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No matching records</h3>
            <p className="text-gray-400 text-sm text-center">Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Citizen</th>
                  <th className="px-6 py-4 font-semibold">Vehicle</th>
                  <th className="px-6 py-4 font-semibold">Fuel Type</th>
                  <th className="px-6 py-4 font-semibold">Dispensed Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Reservation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filtered.map((r: any) => {
                  const displayAmount = parseFloat(r.transaction?.amount ?? r.amount);
                  const displayStatus = r.transaction?.status ?? r.status;
                  const displayTime = r.transaction?.createdAt ?? r.createdAt;

                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(displayTime).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{r.user?.name || "Unknown Citizen"}</div>
                        {r.user?.email && <div className="text-xs text-gray-500">{r.user.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-300">{r.vehicle?.licensePlate || "Unknown"}</td>
                      <td className="px-6 py-4 text-gray-300 flex items-center">
                        {['ELECTRIC', 'HYBRID'].includes(r.fuelType) ? <Zap className="w-4 h-4 mr-2 text-[#4AA3FF]"/> : <Droplet className="w-4 h-4 mr-2 text-[#4AA3FF]"/>}
                        {r.fuelType}
                      </td>
                      <td className="px-6 py-4 text-white font-bold">{displayAmount.toLocaleString()} L</td>
                      <td className="px-6 py-4">
                        {displayStatus === 'SUCCESS' && <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">SUCCESS</span>}
                        {displayStatus === 'COMPLETED' && <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">COMPLETED</span>}
                        {displayStatus === 'PENDING' && <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">PENDING</span>}
                        {displayStatus === 'CANCELLED' && <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">CANCELLED</span>}
                        {displayStatus === 'EXPIRED' && <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">EXPIRED</span>}
                        {![ 'SUCCESS', 'COMPLETED', 'PENDING', 'CANCELLED', 'EXPIRED' ].includes(displayStatus) && (
                          <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">{displayStatus}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-xs text-gray-500 bg-gray-900/50 px-2 py-1 rounded border border-gray-800">{r.id.split('-')[0]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StationProfileView({ station, loading, isRefreshing, onRefresh, user }: any) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Station Profile</h2>
            <p className="text-gray-400 text-sm">View your registered fuel station information and operational status.</p>
          </div>
        </div>
        <div className="h-48 bg-gray-800/50 animate-pulse rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="h-64 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-64 bg-gray-800/50 animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No station profile available</h2>
        <p className="text-gray-400 text-sm mb-4">Your station account is not currently associated with a fuel station.</p>
        <button onClick={onRefresh} disabled={isRefreshing} className="px-6 py-2 bg-[#328cff]/20 text-[#4AA3FF] hover:bg-[#328cff]/30 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  const inventory = station.inventory || [];
  const totalQty = inventory.reduce((sum: number, item: any) => sum + parseFloat(item.quantity), 0);
  const totalCap = inventory.reduce((sum: number, item: any) => sum + parseFloat(item.capacity), 0);
  const overallUtil = totalCap > 0 ? (totalQty / totalCap) * 100 : 0;
  const numTypes = inventory.length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Station Profile</h2>
          <p className="text-gray-400 text-sm">View your registered fuel station information and operational status.</p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center space-x-4">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-1.5 bg-[#328cff]/10 hover:bg-[#328cff]/20 border border-[#328cff]/30 rounded-full text-[#4AA3FF] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* STATION HERO */}
      <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-6 md:mb-0">
          <div className="w-20 h-20 rounded-2xl bg-[#328cff]/10 flex items-center justify-center border border-[#328cff]/30 mr-6 shadow-lg shadow-[#328cff]/10">
            <Fuel className="w-10 h-10 text-[#4AA3FF]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{station.name || "Unnamed Station"}</h1>
            <div className="flex items-center text-gray-400 text-sm">
              <MapPin className="w-4 h-4 mr-1 text-[#4AA3FF]" />
              {station.location || "Location not provided"}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {station.isActive ? (
            <div className="flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.1)]">
              <div className="w-3 h-3 rounded-full bg-emerald-400 mr-3 shadow-[0_0_8px_#34d399] animate-pulse"></div>
              <span className="text-emerald-400 font-bold tracking-wider">STATION ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-3 shadow-[0_0_8px_#ef4444]"></div>
              <span className="text-red-400 font-bold tracking-wider">STATION INACTIVE</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STATION INFORMATION */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Info className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Station Details
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-start p-3 bg-gray-900/30 rounded-xl border border-gray-800">
              <div className="text-sm text-gray-400">Station Name</div>
              <div className="text-sm text-white font-medium text-right">{station.name || "Not provided"}</div>
            </div>
            <div className="flex justify-between items-start p-3 bg-gray-900/30 rounded-xl border border-gray-800">
              <div className="text-sm text-gray-400">Location</div>
              <div className="text-sm text-white font-medium text-right">{station.location || "Not provided"}</div>
            </div>
            <div className="flex justify-between items-start p-3 bg-gray-900/30 rounded-xl border border-gray-800">
              <div className="text-sm text-gray-400">Address</div>
              <div className="text-sm text-white font-medium text-right max-w-[60%]">{station.address || "Not provided"}</div>
            </div>
            <div className="flex justify-between items-start p-3 bg-gray-900/30 rounded-xl border border-gray-800">
              <div className="text-sm text-gray-400 flex items-center"><Phone className="w-3 h-3 mr-1"/> Contact Phone</div>
              <div className="text-sm text-white font-medium text-right">{station.contactPhone || "Not provided"}</div>
            </div>
          </div>
        </div>

        {/* LOCATION SECTION */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Coordinates
          </h3>
          <div className="h-full flex flex-col">
            {(station.latitude != null && station.longitude != null) ? (
              <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[url('/grid-pattern.svg')] bg-center bg-opacity-20 rounded-xl border border-gray-800 relative overflow-hidden">
                <Globe className="w-16 h-16 text-[#328cff]/30 mb-4" />
                <div className="text-lg font-bold text-white tracking-widest">{station.latitude}, {station.longitude}</div>
                <div className="text-xs text-[#4AA3FF] mt-2 bg-[#328cff]/10 px-3 py-1 rounded-full border border-[#328cff]/20">Verified Location</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center p-6 bg-gray-900/30 rounded-xl border border-gray-800">
                <Navigation className="w-12 h-12 text-gray-600 mb-4" />
                <div className="text-sm text-gray-400">Coordinates not available</div>
              </div>
            )}
          </div>
        </div>

        {/* INVENTORY SNAPSHOT */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Database className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Inventory Snapshot
          </h3>
          {numTypes > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#328cff]/10 border border-[#328cff]/20 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Fuel Types Configured</div>
                <div className="text-xl font-bold text-white">{numTypes}</div>
              </div>
              <div className="bg-[#328cff]/10 border border-[#328cff]/20 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Overall Utilization</div>
                <div className="text-xl font-bold text-[#4AA3FF]">{overallUtil.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-400">Total Available / Capacity</div>
                  <div className="text-sm font-bold text-white">{totalQty.toLocaleString()} / {totalCap.toLocaleString()} L</div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700/50">
                  <div className="h-full bg-[#328cff] shadow-[0_0_8px_#328cff] transition-all duration-1000" style={{ width: `${Math.min(100, overallUtil)}%` }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-32 bg-gray-900/30 rounded-xl border border-gray-800">
              <Database className="w-8 h-8 text-gray-600 mb-2" />
              <div className="text-sm text-gray-400">No inventory configured</div>
            </div>
          )}
        </div>

        {/* ACCOUNT & METADATA */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Account & Registration
          </h3>
          <div className="space-y-4">
            {user && (
              <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-xl border border-gray-800">
                <div className="flex items-center text-sm text-gray-400">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  Station Account
                </div>
                <div className="text-right">
                  <div className="text-sm text-white font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
            )}

            {station.createdAt && (
              <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-xl border border-gray-800">
                <div className="text-sm text-gray-400">Station Registered</div>
                <div className="text-sm text-white font-medium">
                  {new Date(station.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            )}

            {station.updatedAt && (
              <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-xl border border-gray-800">
                <div className="text-sm text-gray-400">Last Updated</div>
                <div className="text-sm text-white font-medium">
                  {new Date(station.updatedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function ReportsView({ station, reservations, loading, error, isRefreshing, onRefresh }: any) {
  const [dateFilter, setDateFilter] = useState('All Time');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Reports & Analytics</h2>
            <p className="text-gray-400 text-sm">Operational insights from your station's fuel dispensing activity.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
           <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
        </div>
        <div className="h-64 bg-gray-800/50 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to load reports</h2>
        <p className="text-gray-400 text-sm mb-4">Please try again.</p>
        <button onClick={onRefresh} disabled={isRefreshing} className="px-6 py-2 bg-[#328cff]/20 text-[#4AA3FF] hover:bg-[#328cff]/30 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-1">Reports & Analytics</h2>
            <p className="text-gray-400 text-sm">Operational insights from your station's fuel dispensing activity.</p>
          </div>
          <div className="relative z-10 mt-4 md:mt-0 flex items-center space-x-4">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-1.5 bg-[#328cff]/10 hover:bg-[#328cff]/20 border border-[#328cff]/30 rounded-full text-[#4AA3FF] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl relative">
          <BarChart3 className="w-12 h-12 text-gray-500 mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">No report data available yet</h2>
          <p className="text-gray-400 text-sm">Station analytics will appear after reservations and dispensing activity are recorded.</p>
        </div>
      </div>
    );
  }

  // Time Filtering Logic
  const now = new Date();
  const filteredReservations = reservations.filter((r: any) => {
    if (dateFilter === 'All Time') return true;

    // For filtering by date, use the transaction.createdAt if it exists, otherwise reservation.createdAt
    const dateToCompare = (r.status === 'COMPLETED' && r.transaction) ? new Date(r.transaction.createdAt) : new Date(r.createdAt);
    const diffTime = Math.abs(now.getTime() - dateToCompare.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dateFilter === '7 Days') return diffDays <= 7;
    if (dateFilter === '30 Days') return diffDays <= 30;
    if (dateFilter === '90 Days') return diffDays <= 90;
    return true;
  });

  const allCompleted = filteredReservations.filter((r: any) => r.status === 'COMPLETED' && r.transaction);
  const totalDispensed = allCompleted.reduce((sum: number, r: any) => sum + parseFloat(r.transaction.amount || 0), 0);
  const completedCount = allCompleted.length;
  const pendingCount = filteredReservations.filter((r: any) => r.status === 'PENDING').length;
  const cancelledCount = filteredReservations.filter((r: any) => r.status === 'CANCELLED').length;
  const totalCount = filteredReservations.length;

  // Fuel Type Breakdown (Donut Chart)
  const fuelTypeMap = new Map<string, number>();
  allCompleted.forEach((r: any) => {
    const amount = parseFloat(r.transaction.amount || 0);
    fuelTypeMap.set(r.fuelType, (fuelTypeMap.get(r.fuelType) || 0) + amount);
  });

  const fuelTypeData = Array.from(fuelTypeMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  const COLORS = ['#328cff', '#00dc82', '#f59e0b', '#8b5cf6'];

  // Dispensing Activity Over Time
  const activityMap = new Map<string, number>();
  allCompleted.forEach((r: any) => {
    const dateStr = new Date(r.transaction.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + parseFloat(r.transaction.amount || 0));
  });
  // Sort by real Date object
  const activityData = Array.from(activityMap.entries())
    .map(([date, amount]) => ({ date, dateObj: new Date(date), amount }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(({ date, amount }) => ({ date, amount }));

  // Recent Activity
  const recentTransactions = [...allCompleted]
    .sort((a: any, b: any) => new Date(b.transaction.createdAt).getTime() - new Date(a.transaction.createdAt).getTime())
    .slice(0, 5);

  // Operational Insights
  const mostDispensedFuel = fuelTypeData.length > 0 ? fuelTypeData[0].name : null;
  const avgDispensing = completedCount > 0 ? (totalDispensed / completedCount) : null;

  // Inventory Snapshot
  const inventory = station.inventory || [];
  const totalInvQty = inventory.reduce((sum: number, item: any) => sum + parseFloat(item.quantity), 0);
  const totalInvCap = inventory.reduce((sum: number, item: any) => sum + parseFloat(item.capacity), 0);
  const inventoryUtil = totalInvCap > 0 ? (totalInvQty / totalInvCap) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Reports & Analytics</h2>
          <p className="text-gray-400 text-sm">Operational insights from your station's fuel dispensing activity.</p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_#34d399]"></div>
            <span className="text-emerald-400 text-xs font-semibold">Live Station Data</span>
          </div>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-900/60 border border-gray-700 rounded-full text-white text-xs focus:outline-none focus:border-[#4AA3FF] transition-colors appearance-none"
          >
            <option value="All Time">All Time</option>
            <option value="90 Days">Last 90 Days</option>
            <option value="30 Days">Last 30 Days</option>
            <option value="7 Days">Last 7 Days</option>
          </select>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-1.5 bg-[#328cff]/10 hover:bg-[#328cff]/20 border border-[#328cff]/30 rounded-full text-[#4AA3FF] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {completedCount === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center shadow-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 mr-3" />
          <div className="text-amber-400 font-medium text-sm">No completed dispensing activity yet. Displaying reservation metrics only.</div>
        </div>
      )}

      {/* PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Fuel Dispensed</div>
          <div className="text-2xl font-bold text-[#4AA3FF]">{totalDispensed.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Completed Transactions</div>
          <div className="text-2xl font-bold text-white">{completedCount}</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Pending Reservations</div>
          <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
        </div>
        <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl hover:bg-[#081a38]/80 transition-colors">
          <div className="text-gray-400 text-sm font-medium mb-1">Cancelled Reservations</div>
          <div className="text-2xl font-bold text-red-400">{cancelledCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FUEL TYPE BREAKDOWN */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <LucidePieChart className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Fuel Type Breakdown
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {fuelTypeData.length > 0 ? (
              <>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fuelTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {fuelTypeData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any) => [`${Number(value).toLocaleString()} L`, 'Dispensed']}
                        contentStyle={{ backgroundColor: '#0a152e', borderColor: '#334155', color: '#fff', borderRadius: '0.75rem' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                  {fuelTypeData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <div className="text-sm">
                        <div className="text-gray-400 text-xs">{entry.name}</div>
                        <div className="text-white font-semibold">{entry.value.toLocaleString()} L</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 my-8">
                <LucidePieChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No completed transactions to display.</p>
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTION STATUS DISTRIBUTION */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Transaction Status Distribution
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-300 font-medium flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Completed</div>
                <div className="text-sm font-bold text-white">
                  {completedCount} <span className="text-gray-500 font-normal ml-1">({totalCount > 0 ? Math.round((completedCount/totalCount)*100) : 0}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981] rounded-full transition-all duration-1000" style={{ width: `${totalCount > 0 ? (completedCount/totalCount)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-300 font-medium flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>Pending</div>
                <div className="text-sm font-bold text-white">
                  {pendingCount} <span className="text-gray-500 font-normal ml-1">({totalCount > 0 ? Math.round((pendingCount/totalCount)*100) : 0}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="h-full bg-amber-500 shadow-[0_0_8px_#f59e0b] rounded-full transition-all duration-1000" style={{ width: `${totalCount > 0 ? (pendingCount/totalCount)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-300 font-medium flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>Cancelled</div>
                <div className="text-sm font-bold text-white">
                  {cancelledCount} <span className="text-gray-500 font-normal ml-1">({totalCount > 0 ? Math.round((cancelledCount/totalCount)*100) : 0}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="h-full bg-red-500 shadow-[0_0_8px_#ef4444] rounded-full transition-all duration-1000" style={{ width: `${totalCount > 0 ? (cancelledCount/totalCount)*100 : 0}%` }}></div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-700/50">
              {/* OPERATIONAL INSIGHTS */}
              <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Most Dispensed</div>
                <div className="text-sm font-bold text-[#4AA3FF]">{mostDispensedFuel || "N/A"}</div>
              </div>
              <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Avg Dispensing</div>
                <div className="text-sm font-bold text-white">{avgDispensing ? `${avgDispensing.toLocaleString(undefined, { maximumFractionDigits: 1 })} L` : "N/A"}</div>
              </div>
              <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Current Pending</div>
                <div className="text-sm font-bold text-amber-400">{pendingCount}</div>
              </div>
              <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Inventory Util.</div>
                <div className="text-sm font-bold text-emerald-400">{inventoryUtil > 0 ? `${inventoryUtil.toFixed(1)}%` : "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* DISPENSING ACTIVITY OVER TIME */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl xl:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Dispensing Activity Over Time
          </h3>
          <div className="h-64 w-full">
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0a152e', borderColor: '#334155', color: '#fff', borderRadius: '0.75rem' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} L`, 'Dispensed']}
                  />
                  <Bar dataKey="amount" fill="#328cff" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No dispensing activity yet</p>
                <p className="text-xs text-gray-600 mt-1">Completed fuel transactions will appear here.</p>
              </div>
            )}
          </div>
          {activityData.length === 1 && (
            <p className="text-xs text-center text-gray-500 mt-4 italic">Historical activity will expand as more transactions are completed.</p>
          )}
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-[#051329]/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl xl:col-span-1">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Recent Activity
          </h3>

          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((r: any) => (
                <div key={r.id} className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center">
                        {['ELECTRIC', 'HYBRID'].includes(r.fuelType) ? <Zap className="w-3 h-3 mr-1.5 text-[#4AA3FF]"/> : <Droplet className="w-3 h-3 mr-1.5 text-[#4AA3FF]"/>}
                        {r.fuelType}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.vehicle?.licensePlate || "Unknown Vehicle"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#00dc82]">{parseFloat(r.transaction.amount).toLocaleString()} L</div>
                      <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">SUCCESS</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {new Date(r.transaction.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
              <History className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No recent transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SupplyRequestsView({ station, requests, loading, isRefreshing, onRefresh, token }: any) {
  const [fuelType, setFuelType] = useState('PETROL');
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-800/50 animate-pulse rounded-2xl"></div>
        <div className="h-64 bg-gray-800/50 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/30 rounded-2xl shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No station available</h2>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await axios.post('http://localhost:3001/api/station/allocation-requests', {
        stationId: station.id,
        fuelType,
        requestedQuantity: parseFloat(requestedQuantity),
        reason
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Allocation request submitted for Admin approval.' });
      setRequestedQuantity('');
      setReason('');
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#328cff]/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Supply Requests</h2>
          <p className="text-gray-400 text-sm">Request fuel allocation and track supply history.</p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center space-x-4">
          <button onClick={onRefresh} disabled={isRefreshing} className="flex items-center px-4 py-1.5 bg-[#328cff]/10 hover:bg-[#328cff]/20 border border-[#328cff]/30 rounded-full text-[#4AA3FF] text-xs font-semibold transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-1 bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Request Fuel Allocation
          </h3>

          {message && (
            <div className={`mb-4 p-3 rounded-lg border text-sm flex items-start ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Fuel Type</label>
              <select
                value={fuelType} onChange={e => setFuelType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:border-[#4AA3FF] outline-none"
              >
                {station.inventory?.map((inv: any) => (
                  <option key={inv.fuelType} value={inv.fuelType}>{inv.fuelType}</option>
                )) || <option value="PETROL">PETROL</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Requested Quantity (Liters)</label>
              <input
                type="number" min="1" step="0.01" required
                value={requestedQuantity} onChange={e => setRequestedQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:border-[#4AA3FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Reason (Optional)</label>
              <textarea
                rows={2} value={reason} onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm focus:border-[#4AA3FF] outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full py-2.5 bg-[#328cff] hover:bg-[#2563eb] text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Inventory & Requests */}
        <div className="lg:col-span-2 space-y-6">

          {/* Real Inventory Status */}
          <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl p-6 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Current Inventory
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {station.inventory?.map((inv: any) => {
                const q = parseFloat(inv.quantity);
                const c = parseFloat(inv.capacity);
                const pct = c > 0 ? (q / c) * 100 : 0;
                let barColor = pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500';

                return (
                  <div key={inv.fuelType} className="bg-gray-900/40 p-4 rounded-xl border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white">{inv.fuelType}</span>
                      <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-400 text-right">{q.toLocaleString()} / {c.toLocaleString()} L</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Request History */}
          <div className="bg-[#051329]/70 backdrop-blur-md border border-[#328cff]/20 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-[#328cff]/20 flex justify-between items-center bg-gray-900/30">
              <h3 className="text-lg font-bold text-white flex items-center"><History className="w-5 h-5 mr-2 text-[#4AA3FF]" /> Allocation History</h3>
            </div>
            {(!requests || requests.length === 0) ? (
              <div className="p-8 text-center text-gray-500">No allocation requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Fuel</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {requests.map((r: any) => (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">{r.fuelType}</td>
                        <td className="px-6 py-4 text-[#4AA3FF] font-bold">{parseFloat(r.requestedQuantity).toLocaleString()} L</td>
                        <td className="px-6 py-4">
                          {r.status === 'PENDING' && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold">PENDING</span>}
                          {r.status === 'APPROVED' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">APPROVED</span>}
                          {r.status === 'REJECTED' && <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold">REJECTED</span>}
                          {r.status === 'CANCELLED' && <span className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-[10px] font-bold">CANCELLED</span>}
                        </td>
                        <td className="px-6 py-4">
                          {r.status === 'REJECTED' && r.rejectionReason && <div className="text-xs text-red-400 truncate max-w-[150px]" title={r.rejectionReason}>{r.rejectionReason}</div>}
                          {r.reviewedAt && <div className="text-[10px] text-gray-500">Rev: {new Date(r.reviewedAt).toLocaleDateString()}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
