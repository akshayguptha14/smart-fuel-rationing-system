import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Filter, AlertCircle, X, History, Store, CheckCircle, XCircle, Clock, Droplet, User, MapPin, Calendar, CreditCard, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function TransactionsModule({ token }: { token: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fuelFilter, setFuelFilter] = useState('All');
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const fetchTransactions = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await axios.get(`${API_URL}/admin/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err: any) {
      setError('Unable to load transactions data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  // Derived Summary Metrics
  const summary = useMemo(() => {
    let successful = 0;
    let pending = 0;
    let failed = 0;
    let totalDispensed = 0;
    
    transactions.forEach(t => {
      if (t.status === 'SUCCESS') {
        successful++;
        totalDispensed += parseFloat(t.amount || 0);
      }
      else if (t.status === 'PENDING') pending++;
      else if (t.status === 'FAILED' || t.status === 'CANCELLED') failed++;
    });

    return {
      total: transactions.length,
      successful,
      pending,
      failed,
      totalDispensed
    };
  }, [transactions]);

  const fuelTypes = useMemo(() => {
    const types = new Set<string>();
    transactions.forEach(t => {
      if (t.reservation?.fuelType) types.add(t.reservation.fuelType);
    });
    return Array.from(types);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(t => {
      const matchesSearch = 
        t.id?.toLowerCase().includes(q) ||
        t.reservationId?.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q) ||
        t.user?.email?.toLowerCase().includes(q) ||
        t.vehicle?.licensePlate?.toLowerCase().includes(q) ||
        t.station?.name?.toLowerCase().includes(q) ||
        t.reservation?.fuelType?.toLowerCase().includes(q);
        
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesFuel = fuelFilter === 'All' || t.reservation?.fuelType === fuelFilter;
      
      return matchesSearch && matchesStatus && matchesFuel;
    });
  }, [transactions, search, statusFilter, fuelFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-emerald-400 bg-emerald-400/10 border-emerald-400/30"><CheckCircle className="w-3 h-3 mr-1" /> Success</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-amber-400 bg-amber-400/10 border-amber-400/30"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'FAILED':
      case 'CANCELLED':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-red-400 bg-red-400/10 border-red-400/30"><XCircle className="w-3 h-3 mr-1" /> {status === 'FAILED' ? 'Failed' : 'Cancelled'}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-400 bg-gray-800 border-gray-700">{status}</span>;
    }
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 mr-3" />
          {error}
        </div>
        <button 
          onClick={() => fetchTransactions(true)}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
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
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Transactions Ledger</h1>
          <p className="text-gray-400 text-sm">Monitor system-wide fuel dispensing and transactions.</p>
        </div>
        <button 
          onClick={() => fetchTransactions(true)}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-5 shadow-xl">
          <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Trans.</div>
          <div className="text-3xl font-black text-white">{summary.total.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-emerald-400 text-xs font-semibold mb-1 uppercase tracking-wider">Successful</div>
          <div className="text-3xl font-black text-emerald-500">{summary.successful.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">Pending</div>
          <div className="text-3xl font-black text-amber-500">{summary.pending.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-red-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-red-400 text-xs font-semibold mb-1 uppercase tracking-wider">Failed/Cancelled</div>
          <div className="text-3xl font-black text-red-500">{summary.failed.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-blue-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-blue-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Dispensed</div>
          <div className="text-3xl font-black text-blue-500">{summary.totalDispensed.toLocaleString()} <span className="text-lg">L</span></div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/30">
          <div className="flex items-center">
            <History className="w-6 h-6 text-amber-500 mr-3" />
            <h2 className="text-xl font-bold text-white">Global Transactions</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search ID, user, plate, station..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            
            {fuelTypes.length > 0 && (
              <div className="relative w-full sm:w-32">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <select
                  value={fuelFilter}
                  onChange={(e) => setFuelFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Fuels</option>
                  {fuelTypes.map(ft => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="relative w-full sm:w-40">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No transactions recorded yet.</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No transactions match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800/40 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Citizen</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Station</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fuel</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-500" title={t.id}>{t.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{new Date(t.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{t.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{t.vehicle?.licensePlate || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{t.station?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{t.reservation?.fuelType || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-400">{t.amount} L</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedTx(t)}
                        className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a162e] border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h3 className="text-xl font-bold text-white flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-amber-500" />
                Transaction Details
              </h3>
              <button 
                onClick={() => setSelectedTx(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Header Status & Amount */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-gray-800/30 p-6 rounded-xl border border-gray-700/50">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Total Amount</div>
                  <div className="text-4xl font-black text-blue-400">{selectedTx.amount} <span className="text-2xl text-blue-500">L</span></div>
                  <div className="text-gray-500 text-xs mt-1 font-mono">{selectedTx.id}</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="mb-2">{getStatusBadge(selectedTx.status)}</div>
                  <div className="text-white text-sm">{new Date(selectedTx.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Station Info */}
                <div className="bg-gray-800/20 rounded-xl p-5 border border-gray-700/30">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Store className="w-4 h-4 mr-2" />
                    Station Location
                  </h4>
                  <div className="text-lg font-bold text-white mb-1">{selectedTx.station?.name || 'Unknown Station'}</div>
                  <div className="text-gray-400 text-sm flex items-start">
                    <MapPin className="w-4 h-4 mr-1 mt-0.5 shrink-0 text-gray-500" />
                    <span>{selectedTx.station?.address || 'Address unavailable'}</span>
                  </div>
                </div>

                {/* Citizen Info */}
                <div className="bg-gray-800/20 rounded-xl p-5 border border-gray-700/30">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Citizen Details
                  </h4>
                  <div className="text-lg font-bold text-white mb-1">{selectedTx.user?.name || 'Unknown'}</div>
                  <div className="text-gray-400 text-sm mb-3">{selectedTx.user?.email || 'N/A'}</div>
                  <div className="flex items-center text-sm">
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 font-mono mr-2">
                      {selectedTx.vehicle?.licensePlate || 'N/A'}
                    </span>
                    <span className="text-gray-500">{selectedTx.vehicle?.vehicleType || 'Unknown Type'}</span>
                  </div>
                </div>
              </div>

              {/* Reservation Context */}
              {selectedTx.reservation && (
                <div className="mt-6 bg-gray-800/20 rounded-xl p-5 border border-gray-700/30">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Associated Reservation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Fuel Type</div>
                      <div className="text-white font-medium flex items-center">
                        <Droplet className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        {selectedTx.reservation.fuelType}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Reserved Amount</div>
                      <div className="text-white font-medium">{selectedTx.reservation.amount} L</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Res. Status</div>
                      <div className="text-white font-medium">{selectedTx.reservation.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Reservation ID</div>
                      <div className="text-white font-mono text-xs truncate" title={selectedTx.reservation.id}>{selectedTx.reservation.id.substring(0, 8)}...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
