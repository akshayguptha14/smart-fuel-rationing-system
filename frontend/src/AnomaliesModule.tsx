import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertCircle, RefreshCw, AlertTriangle, User,
  ShieldAlert, Activity, CheckCircle, Clock, Shield
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function AnomaliesModule({ token }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnomalies = () => {
    setLoading(true);
    setError('');
    axios.get(`${API_URL}/admin/anomalies`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setData(res.data);
    }).catch(() => {
      setError('Failed to fetch anomaly intelligence.');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAnomalies();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-500/80">Scanning intelligence network...</p>
      </div>
    );
  }

  const anomaliesData = data || { anomalies: [] };
  const { anomalies } = anomaliesData;

  return (
    <div className="flex flex-col h-full bg-[#040d1f] text-gray-200">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Anti-Hoarding & Anomaly Detection
          </h2>
          <p className="text-slate-400 text-sm mt-1">Deterministic read-only intelligence flags for administrative review.</p>
        </div>
        <button 
          onClick={fetchAnomalies}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 shrink-0">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Flagged Citizens</p>
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-white">{anomaliesData.totalFlaggedUsers || 0}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Flags</p>
            <Shield className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-white">{anomaliesData.totalFlags || 0}</p>
        </div>

        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">High Severity</p>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-100">{anomaliesData.highSeverityFlags || 0}</p>
        </div>
        
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Rapid Purchases</p>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-100">{anomaliesData.rapidPurchaseFlags || 0}</p>
        </div>

        <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Quota Velocity</p>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-100">{anomaliesData.quotaVelocityFlags || 0}</p>
        </div>

        <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Phantom Booking</p>
            <AlertCircle className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-100">{anomaliesData.phantomBookingFlags || 0}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-800/30 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Anomalies Detected</h3>
            <p className="text-slate-400 max-w-md">
              No anomalous activity detected from the available transaction history. The system is actively monitoring real activity.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800/80 sticky top-0 z-10 border-b border-slate-700/50 backdrop-blur-md">
                <tr>
                  <th className="p-4 font-semibold text-slate-300">Citizen</th>
                  <th className="p-4 font-semibold text-slate-300">Anomaly Type</th>
                  <th className="p-4 font-semibold text-slate-300">Severity</th>
                  <th className="p-4 font-semibold text-slate-300">Metric</th>
                  <th className="p-4 font-semibold text-slate-300">Last Activity</th>
                  <th className="p-4 font-semibold text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {anomalies.map((anom: any, idx: number) => {
                  
                  const severityBadge = (sev: string) => {
                    if (sev === 'HIGH') return <span className="text-red-400 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded">HIGH</span>;
                    if (sev === 'MEDIUM') return <span className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">MEDIUM</span>;
                    return <span className="text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-500/10 px-2 py-0.5 rounded">{sev}</span>;
                  };

                  const typeBadge = (type: string) => {
                    if (type === 'RAPID_PURCHASE') return <span className="text-amber-400 font-semibold">Rapid Purchase</span>;
                    if (type === 'QUOTA_VELOCITY') return <span className="text-orange-400 font-semibold">Quota Velocity</span>;
                    if (type === 'PHANTOM_BOOKING') return <span className="text-indigo-400 font-semibold">Phantom Booking</span>;
                    return <span>{type}</span>;
                  };

                  return (
                    <tr key={`${anom.userId}-${anom.anomalyType}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{anom.userName}</div>
                        <div className="text-xs text-slate-400">{anom.email}</div>
                        {anom.vehicleInfo && (
                          <div className="text-xs text-slate-500 mt-1">
                            {anom.vehicleInfo.vehicleType} - {anom.vehicleInfo.licensePlate}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-slate-400" />
                          {typeBadge(anom.anomalyType)}
                        </div>
                      </td>
                      <td className="p-4">
                        {severityBadge(anom.severity)}
                      </td>
                      <td className="p-4">
                        <span className="text-white font-mono">{anom.metric}</span>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-300">
                          {new Date(anom.lastActivityAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(anom.lastActivityAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 border border-slate-600 px-2 py-1 rounded-lg">
                          Flag for Review
                        </span>
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
