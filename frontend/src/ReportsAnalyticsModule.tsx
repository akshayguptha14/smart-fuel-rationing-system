import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart2, Activity, PieChart, Store, Droplet, 
  RefreshCw, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

const API_URL = 'http://localhost:3001/api';

const COLORS = {
  PETROL: '#3b82f6', // blue-500
  DIESEL: '#eab308', // yellow-500
  ELECTRIC: '#10b981', // emerald-500
  HYBRID: '#8b5cf6', // violet-500
  SUCCESS: '#10b981',
  PENDING: '#f59e0b',
  FAILED: '#ef4444',
  CANCELLED: '#ef4444'
};

export default function ReportsAnalyticsModule({ token }: { token: string }) {
  const [data, setData] = useState({
    transactions: [] as any[],
    stations: [] as any[],
    users: [] as any[],
    reservations: [] as any[]
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('All Time');

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const [txRes, stRes, usRes, resRes] = await Promise.all([
        axios.get(`${API_URL}/admin/transactions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/stations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/reservations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      
      setData({
        transactions: Array.isArray(txRes.data) ? txRes.data : [],
        stations: Array.isArray(stRes.data) ? stRes.data : [],
        users: Array.isArray(usRes.data) ? usRes.data : [],
        reservations: Array.isArray(resRes.data) ? resRes.data : []
      });
      setError('');
    } catch (err: any) {
      setError('Unable to load analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Apply Time Filter
  const filteredTransactions = useMemo(() => {
    if (timeFilter === 'All Time') return data.transactions;
    
    const now = new Date();
    const cutoff = new Date();
    
    if (timeFilter === 'Today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'Last 7 Days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeFilter === 'Last 30 Days') {
      cutoff.setDate(now.getDate() - 30);
    }
    
    return data.transactions.filter(t => new Date(t.createdAt) >= cutoff);
  }, [data.transactions, timeFilter]);

  // Compute KPIs
  const kpis = useMemo(() => {
    const totalTx = filteredTransactions.length;
    const successfulTx = filteredTransactions.filter(t => t.status === 'SUCCESS');
    
    const totalFuelDispensed = successfulTx.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const activeStations = data.stations.filter(s => s.isActive).length;
    
    // Total Vehicles from users
    const totalVehicles = data.users.reduce((sum, u) => sum + (u._count?.vehicles || 0), 0);
    
    // Active Reservations
    const activeReservations = data.reservations.filter(r => r.status === 'PENDING').length;

    return {
      totalTx,
      successfulTx: successfulTx.length,
      totalFuelDispensed,
      activeStations,
      totalVehicles,
      activeReservations
    };
  }, [filteredTransactions, data.stations, data.users, data.reservations]);

  // Fuel Distribution (Pie Chart)
  const fuelDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.status === 'SUCCESS' && t.reservation?.fuelType) {
        const ft = t.reservation.fuelType;
        dist[ft] = (dist[ft] || 0) + parseFloat(t.amount || 0);
      }
    });
    
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Transaction Status (Bar Chart)
  const txStatusDist = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const st = t.status;
      dist[st] = (dist[st] || 0) + 1;
    });
    return Object.entries(dist).map(([name, count]) => ({ name, count }));
  }, [filteredTransactions]);

  // Station Performance
  const stationPerformance = useMemo(() => {
    return data.stations.map(station => {
      const stTx = filteredTransactions.filter(t => t.stationId === station.id && t.status === 'SUCCESS');
      const fuelDispensed = stTx.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      return {
        ...station,
        successfulTxCount: stTx.length,
        fuelDispensed
      };
    });
  }, [data.stations, filteredTransactions]);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 mr-3" />
          {error}
        </div>
        <button onClick={() => fetchData(true)} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors">Retry</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm">System-wide operational intelligence and metrics.</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 text-white rounded-lg focus:outline-none focus:border-amber-500/50 transition-colors"
          >
            <option>All Time</option>
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-5 shadow-xl">
          <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Trans.</div>
          <div className="text-3xl font-black text-white">{kpis.totalTx}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-emerald-400 text-xs font-semibold mb-1 uppercase tracking-wider">Successful</div>
          <div className="text-3xl font-black text-emerald-500">{kpis.successfulTx}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-blue-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-blue-400 text-xs font-semibold mb-1 uppercase tracking-wider">Dispensed (L)</div>
          <div className="text-3xl font-black text-blue-500">{kpis.totalFuelDispensed}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">Active Stations</div>
          <div className="text-3xl font-black text-amber-500">{kpis.activeStations}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-purple-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-purple-400 text-xs font-semibold mb-1 uppercase tracking-wider">Active Res.</div>
          <div className="text-3xl font-black text-purple-500">{kpis.activeReservations}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-indigo-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-indigo-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Vehicles</div>
          <div className="text-3xl font-black text-indigo-500">{kpis.totalVehicles}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuel Distribution */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-amber-500" />
            Fuel Dispensed by Type
          </h2>
          {fuelDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 italic">No transaction data available for this period.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={fuelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {fuelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-amber-500" />
            Transaction Status Breakdown
          </h2>
          {txStatusDist.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 italic">No transaction data available for this period.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={txStatusDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {txStatusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name] || '#8884d8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Station Performance */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Store className="w-5 h-5 mr-2 text-amber-500" />
            Station Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-700/50">
                <tr>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Station</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Successful Tx</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase text-right">Dispensed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stationPerformance.map(st => (
                  <tr key={st.id}>
                    <td className="py-3">
                      <div className="text-sm font-bold text-white">{st.name}</div>
                      <div className="text-xs text-gray-500">{st.location || 'Unknown'}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-sm text-gray-300">{st.successfulTxCount}</div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-sm font-bold text-blue-400">{st.fuelDispensed} L</div>
                    </td>
                  </tr>
                ))}
                {stationPerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500 italic">No stations available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Inventory Snapshot */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Droplet className="w-5 h-5 mr-2 text-amber-500" />
            Current Inventory Snapshot
          </h2>
          {data.stations.length === 0 ? (
            <div className="py-8 text-center text-gray-500 italic">No stations available to show inventory.</div>
          ) : (
            <div className="space-y-6">
              {data.stations.map(st => (
                <div key={st.id} className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <div className="text-sm font-bold text-white mb-3 border-b border-gray-700/50 pb-2">{st.name}</div>
                  {st.inventory && st.inventory.length > 0 ? (
                    <div className="space-y-3">
                      {st.inventory.map((inv: any) => {
                        const usagePct = inv.capacity > 0 ? (inv.quantity / inv.capacity) * 100 : 0;
                        const colorClass = inv.fuelType === 'ELECTRIC' ? 'bg-emerald-500' : inv.fuelType === 'DIESEL' ? 'bg-yellow-500' : 'bg-blue-500';
                        return (
                          <div key={inv.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400 font-medium">{inv.fuelType}</span>
                              <span className="text-white font-mono">{inv.quantity} / {inv.capacity} {inv.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${Math.min(100, Math.max(0, usagePct))}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic">No inventory records.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-amber-500" />
          Recent Activity
        </h2>
        
        {filteredTransactions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 italic">No activity matches the current period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-700/50">
                <tr>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Date & Time</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Station</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Fuel</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredTransactions.slice(0, 10).map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{new Date(t.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{t.station?.name || 'Unknown'}</div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{t.reservation?.fuelType || 'N/A'}</div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-400">{t.amount} L</div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        t.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30' : 
                        t.status === 'PENDING' ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30' : 
                        'text-red-400 bg-red-400/10 border border-red-400/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length > 10 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing most recent 10 transactions. Use the Transactions module to view all.
              </div>
            )}
            {filteredTransactions.length === 1 && (
              <div className="mt-4 text-center text-sm text-gray-500 italic">
                Limited historical data (1 transaction available).
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
