import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, Clock, Database, RefreshCw, AlertTriangle, History, MapPin } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function SupplyAllocationModule({ token }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals state
  const [approveModal, setApproveModal] = useState<{ open: boolean, request: any }>({ open: false, request: null });
  const [rejectModal, setRejectModal] = useState<{ open: boolean, request: any }>({ open: false, request: null });
  const [rejectReason, setRejectReason] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [reqsRes, stationsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/allocation-requests`, { headers }),
        axios.get(`${API_URL}/stations`, { headers })
      ]);
      setRequests(reqsRes.data);
      setStations(stationsRes.data);
    } catch (err) {
      console.error("Failed to load allocation data", err);
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

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const historyRequests = requests.filter(r => r.status !== 'PENDING');

  const getStationInventory = (stationId: string, fuelType: string) => {
    const st = stations.find(s => s.id === stationId);
    if (!st || !st.inventory) return null;
    return st.inventory.find((i: any) => i.fuelType === fuelType) || null;
  };

  const getStation = (stationId: string) => stations.find(s => s.id === stationId);

  const handleApprove = async () => {
    if (!approveModal.request) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/admin/allocation-requests/${approveModal.request.id}/approve`, {}, { headers });
      setActionMessage({ type: 'success', text: 'Allocation approved successfully.' });
      setApproveModal({ open: false, request: null });
      fetchData(); // Refresh data
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to approve allocation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.request || !rejectReason.trim()) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/admin/allocation-requests/${rejectModal.request.id}/reject`, { reason: rejectReason }, { headers });
      setActionMessage({ type: 'success', text: 'Allocation rejected successfully.' });
      setRejectModal({ open: false, request: null });
      setRejectReason('');
      fetchData(); // Refresh data
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reject allocation.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-6">
        <div className="h-32 bg-[#0a162e]/50 rounded-2xl animate-pulse"></div>
        <div className="h-64 bg-[#0a162e]/50 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar text-gray-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Supply Allocation Control</h2>
          <p className="text-gray-400 text-sm">Review, approve, and monitor station fuel allocations.</p>
        </div>
        <button 
          onClick={handleRefresh} disabled={isRefreshing}
          className="flex items-center px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {actionMessage && (
        <div className={`mb-6 p-4 rounded-xl flex items-center ${actionMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
          {actionMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
          {actionMessage.text}
        </div>
      )}

      {/* Pending Requests Section */}
      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-700/50 bg-gray-900/30 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-500" /> Pending Allocation Requests
          </h3>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full text-xs font-bold">
            {pendingRequests.length} Pending
          </span>
        </div>
        
        {pendingRequests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-gray-600 mb-4 opacity-50" />
            <p className="text-gray-400">No pending allocation requests at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Requested Date</th>
                  <th className="px-6 py-4 font-semibold">Station / Location</th>
                  <th className="px-6 py-4 font-semibold">Owner</th>
                  <th className="px-6 py-4 font-semibold">Fuel Type</th>
                  <th className="px-6 py-4 font-semibold">Request Qty</th>
                  <th className="px-6 py-4 font-semibold">Current / Cap (%)</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {pendingRequests.map(r => {
                  const inv = getStationInventory(r.stationId, r.fuelType);
                  const st = getStation(r.stationId);
                  const qty = inv ? parseFloat(inv.quantity) : 0;
                  const cap = inv ? parseFloat(inv.capacity) : 0;
                  const pct = cap > 0 ? ((qty / cap) * 100).toFixed(1) : 'N/A';

                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-300">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="text-white font-semibold">{st?.name || r.station?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1"/> {st?.location || r.station?.location || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300">{r.requestedBy?.name}</div>
                        <div className="text-xs text-gray-500">{r.requestedBy?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs font-medium text-gray-300">{r.fuelType}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-amber-500">{parseFloat(r.requestedQuantity).toLocaleString()} L</td>
                      <td className="px-6 py-4">
                        {inv ? (
                          <>
                            <div className="text-gray-300">{qty.toLocaleString()} / {cap.toLocaleString()} L</div>
                            <div className="w-24 bg-gray-800 rounded-full h-1.5 mt-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, parseFloat(pct))}%` }}></div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-500 italic">No inventory record</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => setApproveModal({ open: true, request: r })}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
                        >Approve</button>
                        <button 
                          onClick={() => setRejectModal({ open: true, request: r })}
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
                        >Reject</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Station Supply Status */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-700/50 bg-gray-900/30 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-500" /> Station Supply Status
            </h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Station</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold text-right">Inventory Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {stations.map(st => (
                  <tr key={st.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-semibold">{st.name}</td>
                    <td className="px-6 py-4 text-gray-400">{st.location}</td>
                    <td className="px-6 py-4 text-right">
                      {st.inventory && st.inventory.length > 0 ? (
                        <div className="space-y-2">
                          {st.inventory.map((inv: any) => {
                            const q = parseFloat(inv.quantity);
                            const c = parseFloat(inv.capacity);
                            const p = c > 0 ? ((q/c)*100).toFixed(1) : 0;
                            return (
                              <div key={inv.fuelType} className="flex justify-end items-center text-xs">
                                <span className="text-gray-500 mr-2">{inv.fuelType}:</span>
                                <span className="text-gray-300 w-24 text-right">{q.toLocaleString()}/{c.toLocaleString()}</span>
                                <span className="text-amber-400 ml-3 font-mono">{p}%</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : <span className="text-gray-500 text-xs italic">No data</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Allocation History */}
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-700/50 bg-gray-900/30 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center">
              <History className="w-5 h-5 mr-2 text-purple-500" /> Allocation History
            </h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Station</th>
                  <th className="px-6 py-4 font-semibold">Details</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {historyRequests.slice(0, 10).map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-white">{r.station?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 font-medium">{parseFloat(r.requestedQuantity).toLocaleString()} L of {r.fuelType}</div>
                      {r.rejectionReason && <div className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={r.rejectionReason}>Reason: {r.rejectionReason}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === 'APPROVED' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">APPROVED</span>}
                      {r.status === 'REJECTED' && <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] font-bold">REJECTED</span>}
                      {r.status === 'CANCELLED' && <span className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-md text-[10px] font-bold">CANCELLED</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historyRequests.length === 0 && (
               <div className="p-8 text-center text-gray-500">No allocation history available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {approveModal.open && approveModal.request && (() => {
        const r = approveModal.request;
        const st = getStation(r.stationId);
        const inv = getStationInventory(r.stationId, r.fuelType);
        const qty = inv ? parseFloat(inv.quantity) : 0;
        const cap = inv ? parseFloat(inv.capacity) : 0;
        const reqQty = parseFloat(r.requestedQuantity);
        const invAfter = qty + reqQty;
        const exceeds = invAfter > cap;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0a152e] border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-900/40 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Confirm Allocation Approval</h3>
                <button onClick={() => setApproveModal({open: false, request: null})} className="text-gray-400 hover:text-white transition-colors">&times;</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500 text-xs uppercase">Station</span><div className="text-white text-sm font-medium">{st?.name}</div></div>
                  <div><span className="text-gray-500 text-xs uppercase">Fuel Type</span><div className="text-white text-sm font-medium">{r.fuelType}</div></div>
                  <div><span className="text-gray-500 text-xs uppercase">Current Inventory</span><div className="text-white text-sm font-medium">{qty.toLocaleString()} L</div></div>
                  <div><span className="text-gray-500 text-xs uppercase">Storage Capacity</span><div className="text-white text-sm font-medium">{cap.toLocaleString()} L</div></div>
                  <div><span className="text-gray-500 text-xs uppercase">Requested Amount</span><div className="text-amber-400 text-sm font-bold">+{reqQty.toLocaleString()} L</div></div>
                  <div><span className="text-gray-500 text-xs uppercase">Inventory After</span><div className={`text-sm font-bold ${exceeds ? 'text-red-500' : 'text-emerald-400'}`}>{invAfter.toLocaleString()} L</div></div>
                </div>

                {exceeds && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
                    <div>
                      <strong>Approval Blocked</strong>
                      <p className="mt-1">Inventory after allocation ({invAfter.toLocaleString()} L) exceeds the station's physical storage capacity ({cap.toLocaleString()} L). You cannot approve this request.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-900/40 flex justify-end space-x-3">
                <button onClick={() => setApproveModal({open: false, request: null})} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button 
                  onClick={handleApprove}
                  disabled={exceeds || actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  {actionLoading ? 'Processing...' : 'Approve & Allocate'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectModal.open && rejectModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a152e] border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-900/40 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Reject Allocation Request</h3>
              <button onClick={() => {setRejectModal({open: false, request: null}); setRejectReason('');}} className="text-gray-400 hover:text-white transition-colors">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-300 mb-4">You are rejecting a request of <strong className="text-amber-400">{parseFloat(rejectModal.request.requestedQuantity).toLocaleString()} L</strong> of <strong>{rejectModal.request.fuelType}</strong> for <strong>{getStation(rejectModal.request.stationId)?.name}</strong>.</p>
              <label className="block text-xs font-medium text-gray-400 mb-2">Reason for Rejection (Required)</label>
              <textarea 
                rows={3} 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this request cannot be fulfilled..."
                className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white text-sm focus:border-red-500 outline-none resize-none"
              ></textarea>
            </div>
            <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-900/40 flex justify-end space-x-3">
              <button onClick={() => {setRejectModal({open: false, request: null}); setRejectReason('');}} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">Cancel</button>
              <button 
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
