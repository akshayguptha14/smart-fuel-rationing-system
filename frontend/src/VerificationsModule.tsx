import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, ShieldEllipsis, ShieldX, Search, AlertCircle, 
  RefreshCw, XCircle, FileText,
  User, Car, Check, X, FileQuestion
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function VerificationsModule({ token }: any) {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [aadhaarDocUrl, setAadhaarDocUrl] = useState('');
  const [rcDocUrl, setRcDocUrl] = useState('');
  const [aadhaarDocError, setAadhaarDocError] = useState(false);
  const [rcDocError, setRcDocError] = useState(false);
  const [aadhaarDocLoading, setAadhaarDocLoading] = useState(false);
  const [rcDocLoading, setRcDocLoading] = useState(false);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/admin/verifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVerifications(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to review verifications.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const loadDocument = async (vId: string, type: 'aadhaar' | 'rc') => {
    const setUrl = type === 'aadhaar' ? setAadhaarDocUrl : setRcDocUrl;
    const setErrorState = type === 'aadhaar' ? setAadhaarDocError : setRcDocError;
    const setLoadingState = type === 'aadhaar' ? setAadhaarDocLoading : setRcDocLoading;
    
    setLoadingState(true);
    setErrorState(false);
    try {
      const response = await axios.get(`${API_URL}/admin/verifications/${vId}/document/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(response.data);
      setUrl(blobUrl);
    } catch (err: any) {
      console.error(err);
      setErrorState(true);
    } finally {
      setLoadingState(false);
    }
  };

  const openReviewModal = (v: any) => {
    setSelectedVerification(v);
    setAadhaarDocUrl('');
    setRcDocUrl('');
    setAadhaarDocError(false);
    setRcDocError(false);
    setShowReviewModal(true);
    loadDocument(v.id, 'aadhaar');
    loadDocument(v.id, 'rc');
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedVerification(null);
    if (aadhaarDocUrl) URL.revokeObjectURL(aadhaarDocUrl);
    if (rcDocUrl) URL.revokeObjectURL(rcDocUrl);
    setAadhaarDocUrl('');
    setRcDocUrl('');
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    setActionLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/admin/verifications/${selectedVerification.id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVerifications();
      closeReviewModal();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to approve verification.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectReason.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/admin/verifications/${selectedVerification.id}/reject`, 
        { reason: rejectReason.trim() }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchVerifications();
      setShowRejectModal(false);
      closeReviewModal();
      setRejectReason('');
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to reject verification.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredVerifications = verifications.filter(v => {
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const citizenName = (v.user?.name || '').toLowerCase();
      const citizenEmail = (v.user?.email || '').toLowerCase();
      const licensePlate = (v.vehicle?.licensePlate || '').toLowerCase();
      if (!citizenName.includes(q) && !citizenEmail.includes(q) && !licensePlate.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const totalReq = verifications.length;
  const pendingReq = verifications.filter(v => v.status === 'PENDING').length;
  const approvedReq = verifications.filter(v => v.status === 'APPROVED').length;
  const rejectedReq = verifications.filter(v => v.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Manual Document Review</h2>
          <p className="text-sm text-gray-400 mt-1">Review and verify Aadhaar and Vehicle RC documents securely.</p>
        </div>
        <button 
          onClick={fetchVerifications} 
          disabled={loading}
          className="flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-sm font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center mb-8">
          <AlertCircle className="w-6 h-6 mr-3" />
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 p-6 rounded-2xl flex items-center shadow-xl">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mr-4">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Total Requests</p>
                <p className="text-2xl font-bold text-white">{totalReq}</p>
              </div>
            </div>
            <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 p-6 rounded-2xl flex items-center shadow-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mr-4">
                <ShieldEllipsis className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-white">{pendingReq}</p>
              </div>
            </div>
            <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 p-6 rounded-2xl flex items-center shadow-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mr-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Approved</p>
                <p className="text-2xl font-bold text-white">{approvedReq}</p>
              </div>
            </div>
            <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 p-6 rounded-2xl flex items-center shadow-xl">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mr-4">
                <ShieldX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-white">{rejectedReq}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              <div className="flex gap-2 bg-[#020617] p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setStatusFilter(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search name, email, plate..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#020617] border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredVerifications.length === 0 ? (
              <div className="text-center py-12 bg-gray-900/20 border border-dashed border-gray-700/50 rounded-2xl">
                <FileQuestion className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No verification requests</h3>
                <p className="text-sm text-gray-400">New Aadhaar and RC submissions will appear here for manual review.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Citizen</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aadhaar</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Submitted</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredVerifications.map((v: any) => (
                      <tr key={v.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold text-white">{v.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-400">{v.user?.email || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-bold text-gray-200">{v.vehicle?.licensePlate || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{v.vehicle?.vehicleType || ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-300 font-mono">&bull;&bull;&bull;&bull;{v.aadhaarLast4}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {v.status === 'PENDING' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20"><ShieldEllipsis className="w-3 h-3 mr-1" /> PENDING</span>}
                          {v.status === 'APPROVED' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><ShieldCheck className="w-3 h-3 mr-1" /> APPROVED</span>}
                          {v.status === 'REJECTED' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20"><ShieldX className="w-3 h-3 mr-1" /> REJECTED</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            onClick={() => openReviewModal(v)}
                            className="text-amber-500 hover:text-amber-400 text-sm font-semibold transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg"
                          >
                            {v.status === 'PENDING' ? 'Review' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showReviewModal && selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#040d1f] border border-amber-500/30 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a162e]/50 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2 text-amber-500" /> 
                  Verification Review
                  {selectedVerification.status === 'PENDING' && <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 uppercase">Awaiting Manual Review</span>}
                  {selectedVerification.status === 'APPROVED' && <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-500 uppercase">Approved</span>}
                  {selectedVerification.status === 'REJECTED' && <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-500 uppercase">Rejected</span>}
                </h2>
              </div>
              <button onClick={closeReviewModal} className="text-gray-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-800">
              {/* Left sidebar: Details */}
              <div className="p-6 lg:w-1/3 bg-[#020617]/50 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Citizen Details</h3>
                  <div className="flex items-start">
                    <User className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-white">{selectedVerification.user?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-400">{selectedVerification.user?.email}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vehicle Details</h3>
                  <div className="flex items-start">
                    <Car className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-white">{selectedVerification.vehicle?.licensePlate}</div>
                      <div className="text-xs text-gray-400">{selectedVerification.vehicle?.vehicleType}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Verification Data</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Aadhaar (Last 4)</span>
                      <span className="text-white font-mono">&bull;&bull;&bull;&bull;{selectedVerification.aadhaarLast4}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Submitted</span>
                      <span className="text-white">{new Date(selectedVerification.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedVerification.reviewedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Reviewed</span>
                        <span className="text-white">{new Date(selectedVerification.reviewedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedVerification.status === 'REJECTED' && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Rejection Reason
                    </h3>
                    <p className="text-sm text-gray-300">{selectedVerification.rejectionReason}</p>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mt-auto">
                  <p className="text-[11px] text-amber-500/80 leading-relaxed font-semibold">
                    Manual Document Review — This review is performed by an authorized administrator. It does not represent live UIDAI verification.
                  </p>
                </div>

                {selectedVerification.status === 'PENDING' && (
                  <div className="space-y-3 pt-4 border-t border-gray-800">
                    <button 
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
                    >
                      {actionLoading ? 'Processing...' : <><Check className="w-4 h-4 mr-2"/> Approve Verification</>}
                    </button>
                    <button 
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
                    >
                      <X className="w-4 h-4 mr-2"/> Reject Verification
                    </button>
                  </div>
                )}
              </div>

              {/* Right side: Documents */}
              <div className="p-6 lg:w-2/3 flex flex-col space-y-6 overflow-y-auto">
                <div className="flex-1 bg-[#020617] border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
                  <div className="bg-gray-900/50 p-3 border-b border-gray-800 text-sm font-semibold text-gray-300 flex justify-between items-center">
                    <span>Aadhaar Document</span>
                  </div>
                  <div className="flex-1 relative flex items-center justify-center p-2">
                    {aadhaarDocLoading ? (
                      <div className="flex flex-col items-center text-gray-500"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>Loading document...</div>
                    ) : aadhaarDocError ? (
                      <div className="flex flex-col items-center text-gray-500">
                        <AlertCircle className="w-8 h-8 text-red-500/50 mb-2" />
                        <span>Unable to load document</span>
                        <button onClick={() => loadDocument(selectedVerification.id, 'aadhaar')} className="text-amber-500 text-xs mt-2 hover:underline">Retry</button>
                      </div>
                    ) : aadhaarDocUrl ? (
                      <iframe src={aadhaarDocUrl} className="w-full h-full min-h-[300px] bg-white rounded-lg" title="Aadhaar Document" />
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 bg-[#020617] border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
                  <div className="bg-gray-900/50 p-3 border-b border-gray-800 text-sm font-semibold text-gray-300 flex justify-between items-center">
                    <span>Vehicle RC Document</span>
                  </div>
                  <div className="flex-1 relative flex items-center justify-center p-2">
                    {rcDocLoading ? (
                      <div className="flex flex-col items-center text-gray-500"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>Loading document...</div>
                    ) : rcDocError ? (
                      <div className="flex flex-col items-center text-gray-500">
                        <AlertCircle className="w-8 h-8 text-red-500/50 mb-2" />
                        <span>Unable to load document</span>
                        <button onClick={() => loadDocument(selectedVerification.id, 'rc')} className="text-amber-500 text-xs mt-2 hover:underline">Retry</button>
                      </div>
                    ) : rcDocUrl ? (
                      <iframe src={rcDocUrl} className="w-full h-full min-h-[300px] bg-white rounded-lg" title="RC Document" />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a162e] border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center"><XCircle className="w-5 h-5 text-red-500 mr-2" /> Reject Verification</h3>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea 
                className="w-full bg-[#020617] border border-gray-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500 min-h-[100px]"
                placeholder="e.g. RC document is unclear. Please upload a clearer copy."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2">This reason will be visible to the citizen so they can correct the issue.</p>
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end space-x-3 bg-black/20">
              <button 
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
