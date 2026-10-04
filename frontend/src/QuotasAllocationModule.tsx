import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BarChart3, Search, Activity, Fuel, Car, X, AlertCircle, Calendar } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'TRUCK', 'THREE_WHEELER', 'BUS', 'OTHER'];

export default function QuotasAllocationModule({ token }: { token: string }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/vehicles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVehicles(res.data || []);
        setError('');
      } catch (err: any) {
        setError('Unable to load quota allocation data.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [token]);

  // Derived Summary Metrics
  const { totalVehicles, totalAllocated, totalRemaining, utilization } = useMemo(() => {
    let tAllocated = 0;
    let tRemaining = 0;
    
    vehicles.forEach(v => {
      if (v.fuelQuotas && v.fuelQuotas.length > 0) {
        const q = v.fuelQuotas[0];
        if (q.isActive) {
          tAllocated += parseFloat(q.totalQuota || 0);
          tRemaining += parseFloat(q.remainingQuota || 0);
        }
      }
    });

    const tUsed = tAllocated - tRemaining;
    const util = tAllocated > 0 ? (tUsed / tAllocated) * 100 : 0;

    return {
      totalVehicles: vehicles.length,
      totalAllocated: tAllocated,
      totalRemaining: tRemaining,
      utilization: util
    };
  }, [vehicles]);

  // Distribution Metrics
  const distribution = useMemo(() => {
    const dist: Record<string, { count: number, allocated: number, remaining: number }> = {};
    VEHICLE_TYPES.forEach(t => dist[t] = { count: 0, allocated: 0, remaining: 0 });

    vehicles.forEach(v => {
      const type = v.vehicleType || 'OTHER';
      if (!dist[type]) dist[type] = { count: 0, allocated: 0, remaining: 0 };
      
      dist[type].count += 1;
      
      if (v.fuelQuotas && v.fuelQuotas.length > 0) {
        const q = v.fuelQuotas[0];
        if (q.isActive) {
          dist[type].allocated += parseFloat(q.totalQuota || 0);
          dist[type].remaining += parseFloat(q.remainingQuota || 0);
        }
      }
    });

    return dist;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter(v => 
      v.licensePlate?.toLowerCase().includes(q) ||
      v.user?.name?.toLowerCase().includes(q) ||
      v.user?.email?.toLowerCase().includes(q) ||
      v.vehicleType?.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center">
        <AlertCircle className="w-6 h-6 mr-3" />
        {error}
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Quotas &amp; Allocation</h1>
        <p className="text-gray-400 text-sm">Monitor system-wide fuel allocations and vehicle quotas.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mr-4">
            <Car className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Vehicles</div>
            <div className="text-2xl font-black text-white">{totalVehicles.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex items-center">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mr-4">
            <Fuel className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Allocated</div>
            <div className="text-2xl font-black text-white">{totalAllocated.toLocaleString()} <span className="text-sm font-normal text-gray-500">L</span></div>
          </div>
        </div>

        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mr-4">
            <Activity className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Remaining</div>
            <div className="text-2xl font-black text-white">{totalRemaining.toLocaleString()} <span className="text-sm font-normal text-gray-500">L</span></div>
          </div>
        </div>

        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mr-4">
            <BarChart3 className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">System Utilization</div>
            <div className="text-2xl font-black text-white">{utilization.toFixed(1)}<span className="text-sm font-normal text-gray-500">%</span></div>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <h3 className="text-xl font-bold text-white mb-4">Distribution by Vehicle Type</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {VEHICLE_TYPES.map(vType => {
          const stats = distribution[vType];
          const used = stats.allocated - stats.remaining;
          const pct = stats.allocated > 0 ? Math.min(100, Math.max(0, (used / stats.allocated) * 100)) : 0;
          
          return (
            <div key={vType} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-amber-500 mb-1">{vType}</div>
                <div className="text-xl font-black text-white mb-3">{stats.count} <span className="text-[10px] text-gray-500 font-normal uppercase">Vehicles</span></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-semibold">
                  <span>{used.toLocaleString()} L used</span>
                  <span>{stats.allocated.toLocaleString()} L total</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger */}
      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/30">
          <div className="flex items-center">
            <BarChart3 className="w-6 h-6 text-amber-500 mr-3" />
            <h2 className="text-xl font-bold text-white">Vehicle Quota Ledger</h2>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search plate, owner..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>
        </div>
        
        {vehicles.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No vehicle quota data available.</div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No vehicles match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800/40 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type / Period</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quota Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredVehicles.map(v => {
                  const hasQuota = v.fuelQuotas && v.fuelQuotas.length > 0;
                  const q = hasQuota ? v.fuelQuotas[0] : null;
                  
                  let total = 0, remaining = 0, used = 0, pct = 0;
                  if (q) {
                    total = parseFloat(q.totalQuota || 0);
                    remaining = parseFloat(q.remainingQuota || 0);
                    used = total - remaining;
                    pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
                  }

                  return (
                    <tr key={v.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-white">{v.licensePlate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{v.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{v.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-amber-500">{v.vehicleType}</div>
                        <div className="text-xs text-gray-500">{q?.period || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasQuota ? (
                          <div className="w-48">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>{used} L / {total} L</span>
                              <span className="font-semibold text-gray-300">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-700/30">
                              <div className="bg-gradient-to-r from-blue-500 to-amber-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">No active quota</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasQuota && q.isActive ? (
                          <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-green-400 bg-green-400/10 border-green-400/30">Active</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-400 bg-gray-800 border-gray-700">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => setSelectedVehicle(v)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedVehicle && (() => {
        const hasQuota = selectedVehicle.fuelQuotas && selectedVehicle.fuelQuotas.length > 0;
        const q = hasQuota ? selectedVehicle.fuelQuotas[0] : null;
        let total = 0, remaining = 0, used = 0;
        if (q) {
          total = parseFloat(q.totalQuota || 0);
          remaining = parseFloat(q.remainingQuota || 0);
          used = total - remaining;
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0a162e] border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/50">
                <h2 className="text-xl font-bold text-white flex items-center"><Car className="w-5 h-5 mr-2 text-amber-500" /> Allocation Details</h2>
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-white tracking-widest">{selectedVehicle.licensePlate}</h3>
                    <div className="text-amber-500 font-bold mt-1">{selectedVehicle.vehicleType}</div>
                  </div>
                  <div>
                    {hasQuota && q.isActive ? (
                      <span className="px-3 py-1 rounded-full border text-xs font-semibold text-green-400 bg-green-400/10 border-green-400/30">Active</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full border text-xs font-semibold text-gray-400 bg-gray-800 border-gray-700">Inactive</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Owner Details</h4>
                  <div className="grid grid-cols-2 gap-2 bg-gray-900/40 p-3 rounded-lg border border-gray-800">
                    <div className="text-gray-400">Name</div>
                    <div className="text-white text-right font-medium">{selectedVehicle.user?.name || 'Not provided'}</div>
                    <div className="text-gray-400">Email</div>
                    <div className="text-white text-right font-medium truncate" title={selectedVehicle.user?.email}>{selectedVehicle.user?.email || 'Not provided'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Quota Status</h4>
                  {hasQuota ? (
                    <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800 space-y-3">
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Total Quota</span>
                        <span className="text-white font-bold">{total} L</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Used Quota</span>
                        <span className="text-white font-bold">{used} L</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Remaining Quota</span>
                        <span className="text-emerald-400 font-bold">{remaining} L</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Period</span>
                        <span className="text-blue-400 font-bold">{q.period}</span>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center text-gray-400 mb-1">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          <span className="text-xs">Validity</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-300 font-medium bg-gray-800 p-2 rounded">
                          <span>{new Date(q.startDate).toLocaleDateString()}</span>
                          <span className="text-gray-500 mx-2">to</span>
                          <span>{new Date(q.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-gray-900/40 border border-gray-800 border-dashed rounded-lg text-gray-500 italic">
                      No active quota allocated.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-700/50 bg-gray-900/50 flex justify-end">
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
