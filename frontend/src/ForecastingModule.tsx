import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, AlertCircle, RefreshCw, Zap, Droplet, Clock, 
  MapPin, ShieldAlert, CheckCircle, Activity, BarChart3, AlertTriangle
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function ForecastingModule({ token }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchForecast = () => {
    setLoading(true);
    setError('');
    axios.get(`${API_URL}/admin/forecasting`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setData(res.data);
    }).catch(() => {
      setError('Failed to fetch forecasting intelligence.');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchForecast();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-amber-500/80">Analyzing inventory history...</p>
      </div>
    );
  }

  const { summary, stations } = data || { summary: {}, stations: [] };

  return (
    <div className="flex flex-col h-full bg-[#040d1f] text-gray-200">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            Supply Intelligence & Forecasting
          </h2>
          <p className="text-slate-400 text-sm mt-1">Deterministic run-rate calculations based on real physical ledger consumption.</p>
        </div>
        <button 
          onClick={fetchForecast}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Forecastable</p>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.forecastableStations || 0}</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Insufficient Data</p>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-300">{summary.insufficientDataStations || 0}</p>
        </div>

        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">Critical Risk</p>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-100">{summary.criticalStations || 0}</p>
        </div>

        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Low Risk</p>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-100">{summary.lowStations || 0}</p>
        </div>

        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Normal</p>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-100">{summary.normalStations || 0}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-800/30 rounded-xl border border-slate-700/50 backdrop-blur-sm custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-800/80 sticky top-0 z-10 border-b border-slate-700/50 backdrop-blur-md">
            <tr>
              <th className="p-4 font-semibold text-slate-300">Station</th>
              <th className="p-4 font-semibold text-slate-300">Fuel</th>
              <th className="p-4 font-semibold text-slate-300">Current Stock</th>
              <th className="p-4 font-semibold text-slate-300">Burn Rate</th>
              <th className="p-4 font-semibold text-slate-300">ETA</th>
              <th className="p-4 font-semibold text-slate-300">24h Proj</th>
              <th className="p-4 font-semibold text-slate-300">48h Proj</th>
              <th className="p-4 font-semibold text-slate-300">72h Proj</th>
              <th className="p-4 font-semibold text-slate-300">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {stations.map((st: any, idx: number) => {
              
              const isPetrol = st.fuelType === 'PETROL';
              const isDiesel = st.fuelType === 'DIESEL';
              const isElectric = st.fuelType === 'ELECTRIC';

              const riskBadge = (risk: string) => {
                if (risk === 'CRITICAL') return <span className="text-red-400 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded">CRITICAL</span>;
                if (risk === 'LOW') return <span className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">LOW</span>;
                return <span className="text-green-400 text-xs font-bold uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded">NORMAL</span>;
              };

              return (
                <tr key={`${st.stationId}-${st.fuelType}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-white">{st.stationName}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {st.location}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border w-fit ${
                      isPetrol ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                      isDiesel ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                      isElectric ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                      'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    }`}>
                      {isElectric ? <Zap className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
                      <span className="font-semibold">{st.fuelType}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white mb-1">
                      {st.currentInventory.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                    </div>
                    {riskBadge(st.currentRisk)}
                  </td>
                  <td className="p-4">
                    {st.status === 'READY' ? (
                      <span className="text-white font-mono">{st.netBurnRateLitersPerDay.toFixed(1)} L/d</span>
                    ) : st.status === 'NO_CONSUMPTION' ? (
                      <span className="text-slate-500 text-xs uppercase tracking-wider">No Cons.</span>
                    ) : (
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Insufficient</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.status === 'READY' ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-bold">{st.hoursUntilShortage.toFixed(1)} h</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">N/A</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.status === 'READY' ? (
                      <div>
                        <div className="font-mono text-white mb-1">{st.projected24h.toFixed(1)} L</div>
                        {riskBadge(st.forecastedRisk24h)}
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">--</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.status === 'READY' ? (
                      <div>
                        <div className="font-mono text-white mb-1">{st.projected48h.toFixed(1)} L</div>
                        {riskBadge(st.forecastedRisk48h)}
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">--</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.status === 'READY' ? (
                      <div>
                        <div className="font-mono text-white mb-1">{st.projected72h.toFixed(1)} L</div>
                        {riskBadge(st.forecastedRisk72h)}
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">--</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      st.recommendation.includes('URGENT') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      st.recommendation.includes('PLAN') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      st.recommendation.includes('NO IMMEDIATE') ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      st.recommendation.includes('NO RECENT') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}>
                      {st.recommendation}
                    </span>
                    {st.status === 'INSUFFICIENT_DATA' && (
                      <div className="text-xs text-slate-500 mt-2">Insufficient historical data</div>
                    )}
                    {st.status === 'NO_CONSUMPTION' && (
                      <div className="text-xs text-slate-500 mt-2">No recent consumption detected</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
