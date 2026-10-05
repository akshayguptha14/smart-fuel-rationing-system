import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AlertCircle, RefreshCw, Zap, Droplet, Clock,
  MapPin, ShieldAlert, CheckCircle, Activity, BarChart3, AlertTriangle, FileText
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function OMCIntelligenceModule({ token }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<any>(null);

  const fetchIntelligence = () => {
    setLoading(true);
    setError('');
    axios.get(`${API_URL}/admin/allocation-intelligence`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setData(res.data);
    }).catch(() => {
      setError('Failed to fetch OMC Intelligence data.');
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleDispatch = () => {
    if (!selectedStation) return;
    setDispatching(true);
    setError('');

    axios.post(`${API_URL}/admin/allocation-requests/dispatch-recommended`, {
      stationId: selectedStation.stationId,
      fuelType: selectedStation.fuelType
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setSuccessMessage({
        station: res.data.stationName,
        fuel: res.data.fuelType,
        allocated: res.data.allocatedQuantity,
        before: res.data.inventoryBefore,
        after: res.data.inventoryAfter
      });
      setSelectedStation(null);
      fetchIntelligence();
    }).catch(err => {
      setError(err.response?.data?.error || 'Failed to dispatch allocation.');
    }).finally(() => {
      setDispatching(false);
    });
  };

  useEffect(() => {
    fetchIntelligence();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-500/80">Compiling OMC Intelligence...</p>
      </div>
    );
  }

  const { summary, stations } = data || { summary: {}, stations: [] };

  return (
    <div className="flex flex-col h-full bg-[#040d1f] text-gray-200">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            OMC Allocation Intelligence
          </h2>
          <p className="text-slate-400 text-sm mt-1">Deterministic read-only urgency and allocation recommendations.</p>
        </div>
        <button
          onClick={fetchIntelligence}
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

      {successMessage && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col gap-1 text-green-400 shrink-0 relative">
          <button onClick={() => setSuccessMessage(null)} className="absolute top-2 right-2 text-green-500 hover:text-green-300">✕</button>
          <div className="flex items-center gap-2 font-bold mb-2">
            <CheckCircle className="w-5 h-5" />
            Allocation Successful
          </div>
          <p className="text-sm">Station: <span className="text-white">{successMessage.station}</span></p>
          <p className="text-sm">Fuel: <span className="text-white">{successMessage.fuel}</span></p>
          <p className="text-sm">Allocated: <span className="text-white">{successMessage.allocated.toLocaleString()} L</span></p>
          <p className="text-sm">Inventory: <span className="text-slate-400">{successMessage.before.toLocaleString()} L</span> → <span className="text-white">{successMessage.after.toLocaleString()} L</span></p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 shrink-0">
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">Urgent</p>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-100">{summary.urgent || 0}</p>
        </div>

        <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">High</p>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-100">{summary.high || 0}</p>
        </div>

        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Medium</p>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-100">{summary.medium || 0}</p>
        </div>

        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Low</p>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-100">{summary.low || 0}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Data Insufficient</p>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-300">{summary.dataInsufficient || 0}</p>
        </div>

        <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Pending Requests</p>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-100">{summary.pendingAllocationRequests || 0}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-800/30 rounded-xl border border-slate-700/50 backdrop-blur-sm custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-800/80 sticky top-0 z-10 border-b border-slate-700/50 backdrop-blur-md">
            <tr>
              <th className="p-4 font-semibold text-slate-300">Station</th>
              <th className="p-4 font-semibold text-slate-300">Fuel</th>
              <th className="p-4 font-semibold text-slate-300">Current Stock / Risk</th>
              <th className="p-4 font-semibold text-slate-300">Burn Rate</th>
              <th className="p-4 font-semibold text-slate-300">Shortage ETA</th>
              <th className="p-4 font-semibold text-slate-300">Pending Request</th>
              <th className="p-4 font-semibold text-slate-300">Score / Class</th>
              <th className="p-4 font-semibold text-slate-300">Recommended Allocation</th>
              <th className="p-4 font-semibold text-slate-300">Action</th>
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

              const classBadge = (cls: string) => {
                if (cls === 'URGENT') return <span className="text-red-400 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded">URGENT</span>;
                if (cls === 'HIGH') return <span className="text-orange-400 text-xs font-bold uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded">HIGH</span>;
                if (cls === 'MEDIUM') return <span className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">MEDIUM</span>;
                if (cls === 'DATA_INSUFFICIENT') return <span className="text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-500/10 px-2 py-0.5 rounded">DATA INSUFFICIENT</span>;
                return <span className="text-green-400 text-xs font-bold uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded">LOW</span>;
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
                    {st.forecastStatus === 'READY' ? (
                      <span className="text-white font-mono">{st.netBurnRateLitersPerDay.toFixed(1)} L/d</span>
                    ) : st.forecastStatus === 'NO_CONSUMPTION' ? (
                      <span className="text-slate-500 text-xs uppercase tracking-wider">N/A</span>
                    ) : (
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Insufficient</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.forecastStatus === 'READY' ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-bold">{st.hoursUntilShortage.toFixed(1)} h</span>
                      </div>
                    ) : st.forecastStatus === 'NO_CONSUMPTION' ? (
                      <span className="text-slate-600 font-mono">N/A</span>
                    ) : (
                      <span className="text-slate-600 font-mono">N/A</span>
                    )}
                  </td>
                  <td className="p-4">
                    {st.pendingRequestCount > 0 ? (
                      <div>
                        <div className="text-indigo-400 font-bold mb-1">{st.pendingRequestCount} Request(s)</div>
                        <div className="text-slate-300 text-xs">{st.pendingRequestedLiters.toLocaleString()} L</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs uppercase">None</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white text-lg mb-1">{st.urgencyScore}</div>
                    {classBadge(st.urgencyClassification)}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white mb-1">
                      {st.recommendedAllocationLiters !== null ? `${st.recommendedAllocationLiters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L` : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-400 max-w-[200px] whitespace-normal">
                      {st.recommendationReason}
                    </div>
                  </td>
                  <td className="p-4">
                    {(st.currentRisk === 'CRITICAL' || st.currentRisk === 'LOW') && st.recommendedAllocationLiters > 0 ? (
                      <button
                        onClick={() => setSelectedStation(st)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        Dispatch Supply
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 bg-slate-800/50 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Confirm Dispatch
              </h3>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Station:</span>
                  <span className="text-white font-semibold text-sm">{selectedStation.stationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Fuel Type:</span>
                  <span className="text-white font-semibold text-sm">{selectedStation.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Current Risk:</span>
                  <span className={`${selectedStation.currentRisk === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'} font-bold text-sm`}>{selectedStation.currentRisk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Current Inventory:</span>
                  <span className="text-slate-300 text-sm">{selectedStation.currentInventory.toLocaleString()} / {selectedStation.capacity.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-slate-300 text-sm font-semibold">Recommended:</span>
                  <span className="text-indigo-400 font-bold text-sm">{selectedStation.recommendedAllocationLiters.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300 text-sm font-semibold">Est. After:</span>
                  <span className="text-green-400 font-bold text-sm">{(selectedStation.currentInventory + selectedStation.recommendedAllocationLiters).toLocaleString()} L</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-200 text-xs">
                <strong>Reason:</strong> OMC Recommended Replenishment
                <br /><br />
                <strong>Warning:</strong> This action will immediately increase station inventory and create an auditable supply allocation.
              </div>
            </div>

            <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setSelectedStation(null)}
                disabled={dispatching}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 rounded-lg transition-colors flex items-center gap-2"
              >
                {dispatching && <RefreshCw className="w-4 h-4 animate-spin" />}
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
