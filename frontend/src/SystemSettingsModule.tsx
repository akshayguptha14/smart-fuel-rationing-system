import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, Activity, Database, Server, Shield, 
  RefreshCw, CheckCircle, AlertTriangle, ArrowRight,
  UserCheck, ShieldCheck, Map, Fuel
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function SystemSettingsModule({ token, setActiveTab }: { token: string, setActiveTab: (tab: string) => void }) {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    users: 0,
    stations: 0,
    activeStations: 0,
    vehicles: 0,
    reservations: 0,
    transactions: 0
  });
  const [policies, setPolicies] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [healthRes, usersRes, stationsRes, resRes, txRes, polRes] = await Promise.all([
        axios.get(`${API_URL}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { status: 'Degraded', api: 'Offline', database: 'Disconnected' } })),
        axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/stations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/reservations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/transactions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/policies`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      setHealth(healthRes.data);
      setPolicies(Array.isArray(polRes.data) ? polRes.data : []);

      const usersList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const stationsList = Array.isArray(stationsRes.data) ? stationsRes.data : [];
      
      const totalVehicles = usersList.reduce((sum: number, u: any) => sum + (u._count?.vehicles || 0), 0);
      
      setStats({
        users: usersList.length,
        stations: stationsList.length,
        activeStations: stationsList.filter((s: any) => s.isActive).length,
        vehicles: totalVehicles,
        reservations: Array.isArray(resRes.data) ? resRes.data.length : 0,
        transactions: Array.isArray(txRes.data) ? txRes.data.length : 0
      });

      setError('');
    } catch (err: any) {
      setError('Unable to load system data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-amber-500" />
            System Settings
          </h1>
          <p className="text-gray-400 text-sm">Manage and monitor Smart Fuel system configuration.</p>
        </div>
        <button 
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
          Refresh System Status
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center mb-6">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System Health */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6 lg:col-span-1">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-amber-500" />
            System Health
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
              <div className="flex items-center text-gray-300">
                <Server className="w-4 h-4 mr-3 text-blue-400" />
                Backend API
              </div>
              {health?.api === 'Online' ? (
                <span className="flex items-center text-emerald-400 text-sm font-medium"><CheckCircle className="w-4 h-4 mr-1" /> Operational</span>
              ) : (
                <span className="flex items-center text-red-400 text-sm font-medium"><AlertTriangle className="w-4 h-4 mr-1" /> Degraded</span>
              )}
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
              <div className="flex items-center text-gray-300">
                <Database className="w-4 h-4 mr-3 text-purple-400" />
                Database
              </div>
              {health?.database === 'Connected' ? (
                <span className="flex items-center text-emerald-400 text-sm font-medium"><CheckCircle className="w-4 h-4 mr-1" /> Connected</span>
              ) : (
                <span className="flex items-center text-red-400 text-sm font-medium"><AlertTriangle className="w-4 h-4 mr-1" /> Disconnected</span>
              )}
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
              <div className="flex items-center text-gray-300">
                <Shield className="w-4 h-4 mr-3 text-amber-400" />
                Authentication
              </div>
              <span className="flex items-center text-emerald-400 text-sm font-medium"><CheckCircle className="w-4 h-4 mr-1" /> Operational</span>
            </div>
          </div>
        </div>

        {/* Application Information */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Server className="w-5 h-5 mr-2 text-amber-500" />
            Application Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Application Name</div>
              <div className="text-white font-medium">Smart Fuel Rationing & Optimization System</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Version</div>
              <div className="text-white font-medium">{health?.version || '1.0.0'}</div>
            </div>
            <div className="border-t border-gray-800/50 pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Frontend Stack</div>
              <div className="text-gray-300">React + TypeScript + Vite</div>
            </div>
            <div className="border-t border-gray-800/50 pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Backend Stack</div>
              <div className="text-gray-300">Node.js + Express + TypeScript</div>
            </div>
            <div className="border-t border-gray-800/50 pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Database & ORM</div>
              <div className="text-gray-300">PostgreSQL + Prisma</div>
            </div>
            <div className="border-t border-gray-800/50 pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Uptime</div>
              <div className="text-gray-300 font-mono text-sm">{health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'N/A'}</div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Database Summary */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Database className="w-5 h-5 mr-2 text-amber-500" />
            Database Summary
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1">Total Users</div>
              <div className="text-2xl font-bold text-white">{stats.users}</div>
            </div>
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1">Total Vehicles</div>
              <div className="text-2xl font-bold text-white">{stats.vehicles}</div>
            </div>
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1">Total Reservations</div>
              <div className="text-2xl font-bold text-white">{stats.reservations}</div>
            </div>
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1">Total Transactions</div>
              <div className="text-2xl font-bold text-white">{stats.transactions}</div>
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-amber-500" />
            Security & Access Model
          </h2>
          
          <p className="text-sm text-gray-400 mb-6">Access is controlled by authenticated JWT role authorization. Passwords and secrets are never exposed in this console.</p>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center mr-3 mt-1 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">ADMIN</div>
                <div className="text-gray-500 text-xs">Government Administrator</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center mr-3 mt-1 shrink-0">
                <Map className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">STATION_OWNER</div>
                <div className="text-gray-500 text-xs">Fuel Station Operator</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center mr-3 mt-1 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">USER</div>
                <div className="text-gray-500 text-xs">Citizen / Vehicle Owner</div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-800/50 pt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">JWT Authentication</span>
              <span className="text-emerald-400 font-medium">Enabled</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Role-Based Access Control</span>
              <span className="text-emerald-400 font-medium">Enabled</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Protected Admin Routes</span>
              <span className="text-emerald-400 font-medium">Enabled</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">QR Token Sanitization</span>
              <span className="text-emerald-400 font-medium">Enabled</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station Summary */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Map className="w-5 h-5 mr-2 text-amber-500" />
              Station Network
            </h2>
            <button 
              onClick={() => setActiveTab('Stations')}
              className="text-amber-500 hover:text-amber-400 text-sm font-medium flex items-center transition-colors"
            >
              View Stations <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{stats.stations}</div>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
              <div className="text-emerald-400 text-xs mb-1">Active</div>
              <div className="text-2xl font-bold text-emerald-500">{stats.activeStations}</div>
            </div>
            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <div className="text-red-400 text-xs mb-1">Inactive</div>
              <div className="text-2xl font-bold text-red-500">{stats.stations - stats.activeStations}</div>
            </div>
          </div>
        </div>

        {/* Fuel Policies Summary */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Fuel className="w-5 h-5 mr-2 text-amber-500" />
              Fuel Policy Rules
            </h2>
            <button 
              onClick={() => setActiveTab('Fuel Policies')}
              className="text-amber-500 hover:text-amber-400 text-sm font-medium flex items-center transition-colors"
            >
              Manage Policies <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {policies.length === 0 ? (
            <div className="text-gray-500 italic text-sm py-4">No active policies found.</div>
          ) : (
            <div className="space-y-3">
              {policies.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-gray-800/30 p-3 rounded-lg border border-gray-700/30">
                  <div>
                    <div className="text-white font-medium text-sm">{p.vehicleType}</div>
                    <div className="text-gray-500 text-xs">Updated: {new Date(p.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{p.defaultQuota} L</div>
                    <div className="text-gray-500 text-xs uppercase">{p.period}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
