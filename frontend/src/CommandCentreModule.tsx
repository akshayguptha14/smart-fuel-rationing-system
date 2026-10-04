import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, 
  MapPin, ShieldCheck, Zap, AlertCircle
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function CommandCentreModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/command-centre`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load command centre data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4AA3FF]"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Error Loading Data</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <button 
          onClick={fetchData}
          className="px-6 py-2 bg-[#2D3340] hover:bg-[#3D4350] text-white rounded-lg transition-colors inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </button>
      </div>
    );
  }

  const { metrics, fuelSummary, stationSupplies, reservationStats } = data;
  const criticalStations = stationSupplies.filter((s: any) => s.riskLevel === 'CRITICAL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Activity className="w-8 h-8 mr-3 text-[#4AA3FF]" />
            Command Centre
          </h2>
          <p className="text-gray-400 mt-2">Real-time operational analytics and shortage risk detection</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-[#232936] hover:bg-[#2D3340] text-[#4AA3FF] rounded-lg transition-colors flex items-center border border-[#2D3340]"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Critical Alerts */}
      {criticalStations.length > 0 ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-400 mr-4 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-2">CRITICAL SUPPLY RISK DETECTED</h3>
              <ul className="space-y-2">
                {criticalStations.map((station: any) => (
                  <li key={station.id} className="text-red-300">
                    {station.fuelType} inventory at <strong>{station.stationName}</strong> is below the critical supply threshold ({station.percentageRemaining.toFixed(1)}% remaining).
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 backdrop-blur-sm flex items-center">
          <CheckCircle className="w-6 h-6 text-emerald-400 mr-4" />
          <p className="text-emerald-400 font-medium">All monitored fuel supplies are above the critical threshold.</p>
        </div>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Stations" value={metrics.totalStations} sub={`${metrics.activeStations} Active`} icon={<MapPin className="w-5 h-5 text-[#4AA3FF]" />} />
        <MetricCard title="Total Verified Vehicles" value={metrics.totalVerifiedVehicles} sub={`${metrics.activeFuelQuotas} Active Quotas`} icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />} />
        <MetricCard title="Reservations" value={metrics.currentReservations} sub={`${reservationStats.PENDING} Pending`} icon={<Clock className="w-5 h-5 text-amber-400" />} />
        <MetricCard title="Successful Transactions" value={metrics.successfulTransactions} sub={`${metrics.totalFuelDispensed.toFixed(1)} L Dispensed`} icon={<CheckCircle className="w-5 h-5 text-indigo-400" />} />
      </div>

      {/* Fuel Inventory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.keys(fuelSummary).map(fuelType => {
          const stats = fuelSummary[fuelType];
          const percent = stats.capacity > 0 ? (stats.quantity / stats.capacity) * 100 : 0;
          let color = "text-[#4AA3FF]";
          let bg = "bg-[#4AA3FF]";
          let risk = "NORMAL";
          
          if (percent < 20) {
            color = "text-red-400";
            bg = "bg-red-400";
            risk = "CRITICAL";
          } else if (percent <= 50) {
            color = "text-amber-400";
            bg = "bg-amber-400";
            risk = "LOW";
          }

          return (
            <div key={fuelType} className="bg-[#1A1F2B] border border-[#2D3340] rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{fuelType}</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold bg-[#232936] ${color}`}>
                  {risk} RISK
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Current Quantity</span>
                    <span className="text-white font-medium">{stats.quantity.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Total Capacity</span>
                    <span className="text-white font-medium">{stats.capacity.toFixed(1)} L</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">{percent.toFixed(1)}% Remaining</span>
                  </div>
                  <div className="w-full bg-[#232936] rounded-full h-2">
                    <div className={`${bg} h-2 rounded-full`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shortage Risk Board */}
      <div className="bg-[#1A1F2B] border border-[#2D3340] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#2D3340] flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-400" />
            Shortage Risk Board
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#232936] text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-medium">Station</th>
                <th className="px-6 py-4 text-left font-medium">Fuel Type</th>
                <th className="px-6 py-4 text-left font-medium">Inventory</th>
                <th className="px-6 py-4 text-left font-medium">Capacity</th>
                <th className="px-6 py-4 text-left font-medium">Remaining</th>
                <th className="px-6 py-4 text-left font-medium">Risk Level</th>
                <th className="px-6 py-4 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3340]">
              {stationSupplies.map((supply: any) => (
                <tr key={supply.id} className="hover:bg-[#232936]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{supply.stationName}</div>
                    <div className="text-xs text-gray-400">{supply.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-[#232936] border border-[#2D3340] text-gray-300 rounded text-xs font-medium">
                      {supply.fuelType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {supply.quantity.toFixed(1)} L
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {supply.capacity.toFixed(1)} L
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-[#232936] rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full ${supply.riskLevel === 'CRITICAL' ? 'bg-red-400' : supply.riskLevel === 'LOW' ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                          style={{ width: `${Math.min(supply.percentageRemaining, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-300">{supply.percentageRemaining.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      supply.riskLevel === 'CRITICAL' ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 
                      supply.riskLevel === 'LOW' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 
                      'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                    }`}>
                      {supply.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(supply.riskLevel === 'CRITICAL' || supply.riskLevel === 'LOW') ? (
                      <button 
                        className="text-[#4AA3FF] hover:text-white transition-colors flex items-center text-xs font-medium"
                        onClick={() => window.location.hash = '#supply'}
                      >
                        <Zap className="w-3 h-3 mr-1" /> Allocate
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {stationSupplies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No station inventory data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, icon }: { title: string, value: string | number, sub: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#1A1F2B] border border-[#2D3340] rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-[#232936] rounded-lg">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-gray-500 text-xs mt-2">{sub}</p>
      </div>
    </div>
  );
}
