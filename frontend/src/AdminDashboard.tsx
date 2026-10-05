import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Landmark, Settings, FileText, Search, Bell, MapPin, Map as MapIcon,
  LogOut, Activity, BarChart3, Users, Clock, ArrowRight, ShieldCheck,
  AlertCircle, RefreshCw, Zap, Droplet, Database, History, TrendingUp,
  Globe
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import StationsModule from './StationsModule';
import FuelPoliciesModule from './FuelPoliciesModule';
import QuotasAllocationModule from './QuotasAllocationModule';
import ReservationsModule from './ReservationsModule';
import UsersModule from './UsersModule';
import TransactionsModule from './TransactionsModule';
import ReportsAnalyticsModule from './ReportsAnalyticsModule';
import SystemSettingsModule from './SystemSettingsModule';
import VerificationsModule from './VerificationsModule';
import PriorityRequestsModule from './PriorityRequestsModule';
import SupplyAllocationModule from './SupplyAllocationModule';
import CommandCentreModule from './CommandCentreModule';
import InventoryLedgerModule from './InventoryLedgerModule';
import ForecastingModule from './ForecastingModule';
import OMCIntelligenceModule from './OMCIntelligenceModule';

const API_URL = 'http://localhost:3001/api';

export default function AdminDashboard({ token, user, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [stations, setStations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ todayDispensedFuel: number | 'error' | null, activeReservations: number | 'error' | null }>({ todayDispensedFuel: null, activeReservations: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [stationsRes, txRes, resvRes, vehiclesRes, adminResvRes] = await Promise.all([
        axios.get(`${API_URL}/stations`, { headers }),
        axios.get(`${API_URL}/transactions/metrics`, { headers }).catch(() => ({ data: { todayDispensedFuel: null, error: true } })),
        axios.get(`${API_URL}/reservations/metrics`, { headers }).catch(() => ({ data: { activeReservations: null, error: true } })),
        axios.get(`${API_URL}/vehicles`, { headers }).catch(() => ({ data: [], error: true })),
        axios.get(`${API_URL}/admin/reservations`, { headers }).catch(() => ({ data: [], error: true }))
      ]);
      
      setStations(stationsRes.data);
      setVehicles(vehiclesRes.data.error ? [] : vehiclesRes.data);
      
      const adminResvs = adminResvRes.data.error ? [] : adminResvRes.data;
      const completedTx = adminResvs.filter((r: any) => r.status === 'COMPLETED' && r.transaction);
      setRecentTransactions(completedTx);

      setMetrics({
        todayDispensedFuel: txRes.data.error ? 'error' : txRes.data.todayDispensedFuel,
        activeReservations: resvRes.data.error ? 'error' : resvRes.data.activeReservations
      });
    } catch (err: any) {
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const totalStations = stations.length;
  const activeStations = stations.filter(s => s.isActive).length;
  const totalVehicles = vehicles.length;

  return (
    <div className="min-h-screen flex bg-[#030a18] font-sans text-gray-200 overflow-hidden relative">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/government-login-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Dark Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(2, 6, 18, 0.92), rgba(2, 8, 22, 0.85), rgba(4, 12, 28, 0.95))' }} />

      {/* Sidebar */}
      <aside className="relative z-10 w-64 border-r border-amber-500/20 bg-[#040d1f]/80 backdrop-blur-xl flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-amber-500/20">
          <div className="flex items-center text-white space-x-2">
            <Landmark className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-lg tracking-wide">SMART FUEL</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Rationing &amp; Optimization</div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          <NavItem icon={<Activity />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <NavItem icon={<ShieldCheck />} label="Fuel Policies" active={activeTab === 'Fuel Policies'} onClick={() => setActiveTab('Fuel Policies')} />
          <NavItem icon={<MapPin />} label="Stations" active={activeTab === 'Stations'} onClick={() => setActiveTab('Stations')} />
          <NavItem icon={<BarChart3 />} label="Quotas &amp; Allocation" active={activeTab === 'Quotas & Allocation'} onClick={() => setActiveTab('Quotas & Allocation')} />
          <NavItem icon={<Users />} label="Users" active={activeTab === 'Users'} onClick={() => setActiveTab('Users')} />
          <NavItem icon={<ShieldCheck />} label="Verifications" active={activeTab === 'Verifications'} onClick={() => setActiveTab('Verifications')} />
          <NavItem icon={<ShieldCheck />} label="Priority Requests" active={activeTab === 'Priority Requests'} onClick={() => setActiveTab('Priority Requests')} />
          <NavItem icon={<Database />} label="Supply Allocation" active={activeTab === 'Supply Allocation'} onClick={() => setActiveTab('Supply Allocation')} />
          <NavItem icon={<Clock />} label="Reservations" active={activeTab === 'Reservations'} onClick={() => setActiveTab('Reservations')} />
          <NavItem icon={<FileText />} label="Transactions" active={activeTab === 'Transactions'} onClick={() => setActiveTab('Transactions')} />
          <NavItem icon={<MapIcon />} label="Reports &amp; Analytics" active={activeTab === 'Reports & Analytics'} onClick={() => setActiveTab('Reports & Analytics')} />
          <NavItem icon={<Activity />} label="Command Centre" active={activeTab === 'Command Centre'} onClick={() => setActiveTab('Command Centre')} />
          <NavItem icon={<History />} label="Inventory Ledger" active={activeTab === 'Inventory Ledger'} onClick={() => setActiveTab('Inventory Ledger')} />
          <NavItem icon={<TrendingUp />} label="Forecasting / Supply Intelligence" active={activeTab === 'Forecasting / Supply Intelligence'} onClick={() => setActiveTab('Forecasting / Supply Intelligence')} />
          <NavItem icon={<Globe />} label="OMC Intelligence" active={activeTab === 'OMC Intelligence'} onClick={() => setActiveTab('OMC Intelligence')} />
          <NavItem icon={<Settings />} label="System Settings" active={activeTab === 'System Settings'} onClick={() => setActiveTab('System Settings')} />
        </div>
        
        <div className="p-4 border-t border-amber-500/20">
          <button onClick={onLogout} className="flex items-center w-full px-4 py-3 text-sm text-gray-400 hover:text-red-400 transition-colors hover:bg-red-500/10 rounded-lg">
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-amber-500/20 bg-[#040d1f]/60 backdrop-blur-lg flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Government Administrator Dashboard</h2>
            <div className="text-xs text-amber-500/80">Dashboard / Overview</div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search stations, users..." className="pl-9 pr-4 py-2 bg-[#0a162e]/60 border border-gray-700/50 rounded-full text-sm focus:outline-none focus:border-amber-500/50 w-64 transition-all" />
            </div>
            <button className="relative text-gray-400 hover:text-amber-500 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3 border-l border-gray-700/50 pl-6">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-white">{user?.name || user?.email}</div>
                <div className="text-xs text-amber-500">Administrator</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'Overview' ? (
            <>
              {/* Hero section */}
              <div className="mb-8">
            <p className="text-amber-500 text-sm font-medium mb-1">Welcome back, {user?.name || user?.email}</p>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Government Administrator Dashboard</h1>
                <p className="text-gray-400 text-sm">Monitor and manage fuel distribution across the system.</p>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-sm font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
                <div className="flex items-center px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_#22c55e]"></div>
                  <span className="text-green-400 text-sm font-semibold">System Operational</span>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center mb-8">
              <AlertCircle className="w-6 h-6 mr-3" />
              {error}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[#0a162e]/50 rounded-2xl animate-pulse"></div>)}
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <KPICard 
                  title="Total Fuel Stations" 
                  value={totalStations} 
                  icon={<Landmark className="w-6 h-6 text-amber-500" />} 
                  colorClass="border-amber-500/30 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                />
                <KPICard 
                  title="Active Stations" 
                  value={activeStations} 
                  icon={<MapPin className="w-6 h-6 text-emerald-500" />} 
                  colorClass="border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                />
                <KPICard 
                  title="Total Vehicles" 
                  value={totalVehicles} 
                  icon={<Users className="w-6 h-6 text-purple-500" />} 
                  colorClass="border-purple-500/30 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.05)]"
                />
                <KPICard 
                  title="Active Reservations" 
                  value={metrics.activeReservations === 'error' ? 'Data unavailable' : metrics.activeReservations !== null ? metrics.activeReservations : 'Loading...'} 
                  icon={<Clock className="w-6 h-6 text-blue-500" />} 
                  colorClass="border-blue-500/30 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                />
                <KPICard 
                  title="Today's Dispensed" 
                  value={metrics.todayDispensedFuel === 'error' ? 'Data unavailable' : metrics.todayDispensedFuel !== null ? `${metrics.todayDispensedFuel.toLocaleString(undefined, { maximumFractionDigits: 1 })} L` : 'Loading...'} 
                  icon={<Activity className="w-6 h-6 text-cyan-500" />} 
                  colorClass="border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.05)]"
                />
              </div>

              {/* Quick Actions */}
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <ActionCard title="Manage Fuel Policies" desc="Configure policies and limits" icon={<ShieldCheck />} onClick={() => setActiveTab('Fuel Policies')} />
                <ActionCard title="Monitor Stations" desc="View station status and inventory" icon={<MapPin />} onClick={() => setActiveTab('Stations')} />
                <ActionCard title="Manage Quotas" desc="Allocate and adjust fuel quotas" icon={<BarChart3 />} onClick={() => setActiveTab('Quotas & Allocation')} />
                <ActionCard title="Monitor Reservations" desc="Track system reservations" icon={<Clock />} onClick={() => setActiveTab('Reservations')} />
                <ActionCard title="View Reports" desc="Analytics and system insights" icon={<FileText />} onClick={() => setActiveTab('Reports & Analytics')} />
              </div>

              {/* Data Grids */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                {/* Station Status */}
                <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Fuel Station Status</h3>
                    <button className="text-amber-500 text-sm font-semibold hover:text-amber-400 flex items-center">View All <ArrowRight className="w-4 h-4 ml-1" /></button>
                  </div>
                  {stations.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No registered stations found.</div>
                  ) : (
                    <div className="space-y-3">
                      {stations.slice(0, 5).map(station => {
                        const status = station.isActive ? 'Active/Online' : 'Inactive/Offline';
                        const statusColor = station.isActive ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-red-400 bg-red-400/10 border-red-400/30';
                        return (
                          <div key={station.id} className="flex justify-between items-center p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl hover:bg-gray-800/50 transition-colors">
                            <div>
                              <div className="text-white font-semibold">{station.name || "Unnamed Station"}</div>
                              <div className="text-xs text-gray-400 mt-1">{station.location || "No location provided"}</div>
                            </div>
                            <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${statusColor}`}>
                              {status}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Fuel Inventory &amp; Distribution</h3>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 text-xs text-emerald-400 font-semibold">Live Data</div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-h-[250px]">
                    {(() => {
                      const allInventory = stations.flatMap(s => s.inventory || []);
                      if (allInventory.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center border border-dashed border-gray-700/50 rounded-xl bg-gray-900/20 py-10">
                            <BarChart3 className="w-10 h-10 text-gray-600 mb-3" />
                            <p className="text-gray-400 text-sm">No inventory data available.</p>
                            <p className="text-gray-500 text-xs mt-1">Current inventory will be shown from live station records.</p>
                          </div>
                        );
                      }
                      
                      const fuelTypes = new Map<string, { qty: number, cap: number }>();
                      allInventory.forEach((inv: any) => {
                        const existing = fuelTypes.get(inv.fuelType) || { qty: 0, cap: 0 };
                        fuelTypes.set(inv.fuelType, {
                          qty: existing.qty + parseFloat(inv.quantity),
                          cap: existing.cap + parseFloat(inv.capacity)
                        });
                      });

                      const fuelData = Array.from(fuelTypes.entries()).sort((a,b) => b[1].qty - a[1].qty);

                      return (
                        <div className="space-y-4">
                          {fuelData.map(([type, data]) => {
                            const util = data.cap > 0 ? (data.qty / data.cap) * 100 : 0;
                            const isLiquid = ['PETROL', 'DIESEL'].includes(type);
                            return (
                              <div key={type} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="font-semibold text-white text-sm flex items-center">
                                    {isLiquid ? <Droplet className="w-4 h-4 mr-2 text-amber-500" /> : <Zap className="w-4 h-4 mr-2 text-blue-500" />}
                                    {type}
                                  </div>
                                  <div className="text-sm font-bold text-amber-400">
                                    {data.qty.toLocaleString()} <span className="text-gray-500 text-xs font-normal">/ {data.cap.toLocaleString()} {isLiquid ? 'L' : 'Units'}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-900 rounded-full h-2">
                                  <div className="bg-amber-500 h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min(100, util)}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-8">
                {/* Station Map */}
                <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl xl:col-span-1">
                  <h3 className="text-lg font-bold text-white mb-6">Station Network Map</h3>
                  <div className="flex flex-col min-h-[250px] h-[300px] rounded-xl overflow-hidden border border-gray-700/50 relative">
                    {(() => {
                      const validStations = stations.filter(s => s.latitude != null && s.longitude != null);
                      if (validStations.length === 0) {
                        return (
                          <div className="flex-1 flex flex-col items-center justify-center bg-gray-900/20 border border-dashed border-gray-700/50 rounded-xl m-2">
                            <MapIcon className="w-10 h-10 text-gray-600 mb-3" />
                            <p className="text-gray-400 text-sm">Station location data unavailable.</p>
                          </div>
                        );
                      }

                      // Calculate bounds and center
                      const coordinates = validStations.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number]);
                      let bounds: [number, number][] | undefined = undefined;
                      let zoom = 11;
                      
                      const sumLat = coordinates.reduce((sum, c) => sum + c[0], 0);
                      const sumLng = coordinates.reduce((sum, c) => sum + c[1], 0);
                      const center: [number, number] = [sumLat / coordinates.length, sumLng / coordinates.length];

                      if (coordinates.length > 1) {
                        bounds = coordinates;
                      } else {
                        zoom = 13;
                      }

                      return (
                        <div className="absolute inset-0 z-0">
                          <MapContainer 
                            center={bounds ? undefined : center} 
                            bounds={bounds ? (bounds as any) : undefined}
                            zoom={bounds ? undefined : zoom} 
                            style={{ height: '100%', width: '100%', background: '#0a152e' }}
                            zoomControl={true}
                            className="admin-map-container"
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {validStations.map(station => (
                              <Marker 
                                key={station.id} 
                                position={[parseFloat(station.latitude), parseFloat(station.longitude)]}
                              >
                                <Popup className="admin-map-popup">
                                  <div className="p-1">
                                    <div className="font-bold text-[#0a152e]">{station.name || "Unnamed Station"}</div>
                                    <div className="text-xs text-gray-600">{station.location}</div>
                                    <div className={`mt-2 text-xs font-bold ${station.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                      {station.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            ))}
                          </MapContainer>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl xl:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                    <button onClick={() => setActiveTab('Transactions')} className="text-amber-500 text-sm font-semibold hover:text-amber-400 flex items-center">View All <ArrowRight className="w-4 h-4 ml-1" /></button>
                  </div>
                  {recentTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[250px] border border-dashed border-gray-700/50 rounded-xl bg-gray-900/20">
                      <FileText className="w-10 h-10 text-gray-600 mb-3" />
                      <p className="text-gray-400 text-sm">No recent transactions found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-700/50">
                            <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Station</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fuel Type</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Dispensed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {recentTransactions.slice(0, 5).map((r: any) => (
                            <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="py-3 px-4 text-sm text-gray-300">
                                {new Date(r.transaction.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-4 text-sm text-white">
                                {r.user?.name || r.user?.email || 'Unknown User'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-300">
                                {r.station?.name || 'Unknown Station'}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs font-medium text-gray-300">
                                  {r.fuelType}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-emerald-400 text-right">
                                {parseFloat(r.transaction.amount).toLocaleString()} L
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      ) : activeTab === 'Stations' ? (
        <StationsModule stations={stations} loading={loading} error={error} />
      ) : activeTab === 'Fuel Policies' ? (
        <FuelPoliciesModule token={token} />
      ) : activeTab === 'Quotas & Allocation' ? (
        <QuotasAllocationModule token={token} />
      ) : activeTab === 'Reservations' ? (
        <ReservationsModule token={token} />
      ) : activeTab === 'Users' ? (
        <UsersModule token={token} />
      ) : activeTab === 'Transactions' ? (
        <TransactionsModule token={token} />
      ) : activeTab === 'Reports & Analytics' ? (
        <ReportsAnalyticsModule token={token} />
      ) : activeTab === 'System Settings' ? (
        <SystemSettingsModule token={token} setActiveTab={setActiveTab} />
      ) : activeTab === 'Verifications' ? (
        <VerificationsModule token={token} />
      ) : activeTab === 'Priority Requests' ? (
        <PriorityRequestsModule token={token} />
      ) : activeTab === 'Supply Allocation' ? (
        <SupplyAllocationModule token={token} />
      ) : activeTab === 'Command Centre' ? (
        <CommandCentreModule />
      ) : activeTab === 'Inventory Ledger' ? (
        <InventoryLedgerModule token={token} />
      ) : activeTab === 'Forecasting / Supply Intelligence' ? (
        <ForecastingModule token={token} />
      ) : activeTab === 'OMC Intelligence' ? (
        <OMCIntelligenceModule token={token} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{activeTab}</h2>
          <p className="text-gray-400">This module is under construction.</p>
        </div>
      )}
    </div>
  </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300 ${
      active 
        ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-2 border-amber-500 text-amber-500 font-semibold' 
        : 'text-gray-400 hover:text-amber-400 hover:bg-gray-800/40'
    }`}>
      <div className={`mr-3 ${active ? 'text-amber-500' : 'text-gray-500'}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function ActionCard({ title, desc, icon, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 p-5 rounded-2xl hover:bg-gray-800/70 hover:border-amber-500/30 transition-all transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer text-left group w-full">
      <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-300 mb-4 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-colors">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <h4 className="text-white font-bold mb-1">{title}</h4>
      <p className="text-xs text-gray-400">{desc}</p>
    </button>
  );
}

function KPICard({ title, value, icon, colorClass }: any) {
  return (
    <div className={`backdrop-blur-md border rounded-2xl p-6 relative overflow-hidden ${colorClass}`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-gray-400 text-sm font-semibold">{title}</h3>
        <div className="p-2 rounded-lg bg-gray-900/50">
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-black relative z-10 ${value === 'Data unavailable' ? 'text-xl text-gray-500 font-medium mt-2' : value === 'Loading...' ? 'text-xl text-gray-400 animate-pulse font-medium mt-2' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
