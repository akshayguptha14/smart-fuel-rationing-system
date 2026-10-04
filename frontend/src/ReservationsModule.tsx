import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Filter, AlertCircle, X, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function ReservationsModule({ token }: { token: string }) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/admin/reservations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReservations(Array.isArray(res.data) ? res.data : []);
        setError('');
      } catch (err: any) {
        setError('Unable to load reservations data.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [token]);

  // Derived Summary Metrics
  const summary = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let cancelled = 0;
    let expired = 0;
    
    reservations.forEach(r => {
      if (r.status === 'PENDING') pending++;
      else if (r.status === 'COMPLETED') completed++;
      else if (r.status === 'CANCELLED') cancelled++;
      else if (r.status === 'EXPIRED') expired++;
    });

    return {
      total: reservations.length,
      pending,
      completed,
      cancelled,
      expired
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const q = search.toLowerCase();
    return reservations.filter(r => {
      const matchesSearch = 
        r.id.toLowerCase().includes(q) ||
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.vehicle?.licensePlate?.toLowerCase().includes(q) ||
        r.station?.name?.toLowerCase().includes(q) ||
        r.fuelType?.toLowerCase().includes(q);
        
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [reservations, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-amber-400 bg-amber-400/10 border-amber-400/30"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-emerald-400 bg-emerald-400/10 border-emerald-400/30"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-red-400 bg-red-400/10 border-red-400/30"><XCircle className="w-3 h-3 mr-1" /> Cancelled</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-gray-400 bg-gray-500/10 border-gray-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Expired</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-400 bg-gray-800 border-gray-700">{status}</span>;
    }
  };

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
        <h1 className="text-3xl font-bold text-white mb-2">Reservations</h1>
        <p className="text-gray-400 text-sm">Monitor system-wide fuel reservations and their current status.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-5 shadow-xl">
          <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total</div>
          <div className="text-3xl font-black text-white">{summary.total.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">Pending</div>
          <div className="text-3xl font-black text-amber-500">{summary.pending.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-emerald-400 text-xs font-semibold mb-1 uppercase tracking-wider">Completed</div>
          <div className="text-3xl font-black text-emerald-500">{summary.completed.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-red-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-red-400 text-xs font-semibold mb-1 uppercase tracking-wider">Cancelled</div>
          <div className="text-3xl font-black text-red-500">{summary.cancelled.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-5 shadow-xl">
          <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Expired</div>
          <div className="text-3xl font-black text-gray-300">{summary.expired.toLocaleString()}</div>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/30">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 text-amber-500 mr-3" />
            <h2 className="text-xl font-bold text-white">Reservation Ledger</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search ID, citizen, plate..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-40">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>
        </div>
        
        {reservations.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No reservations found system-wide.</div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No reservations match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800/40 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Citizen</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Station & Fuel</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valid Until</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredReservations.map(r => (
                  <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-500" title={r.id}>{r.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{r.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{r.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-300">{r.vehicle?.licensePlate || '-'}</div>
                      <div className="text-xs text-gray-500">{r.vehicle?.vehicleType || '-'}</div>
                      {r.vehicle?.priority?.status === 'APPROVED' && (
                        <div className="mt-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          PRIORITY: {r.vehicle.priority.serviceType.replace('_', ' ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-400">{r.station?.name || 'Unknown Station'}</div>
                      <div className="text-xs text-gray-500">{r.fuelType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{parseFloat(r.amount).toLocaleString()} L</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                      <div>{new Date(r.validUntil).toLocaleDateString()}</div>
                      <div>{new Date(r.validUntil).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedReservation(r)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        Details
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
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a162e] border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/50">
              <h2 className="text-xl font-bold text-white flex items-center">Reservation Details</h2>
              <button 
                onClick={() => setSelectedReservation(null)}
                className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm custom-scrollbar">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Reservation ID</div>
                  <div className="font-mono text-gray-300 text-xs break-all bg-gray-900/50 p-2 rounded border border-gray-800">{selectedReservation.id}</div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(selectedReservation.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wider">Citizen</h4>
                  <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-800">
                    <div className="text-white font-medium">{selectedReservation.user?.name || 'Unknown'}</div>
                    <div className="text-gray-500 mt-1 truncate" title={selectedReservation.user?.email}>{selectedReservation.user?.email}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wider">Vehicle</h4>
                  <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-800 flex flex-col justify-between h-full">
                    <div>
                      <div className="text-white font-medium">{selectedReservation.vehicle?.licensePlate || '-'}</div>
                      <div className="text-gray-500 mt-1">{selectedReservation.vehicle?.vehicleType || '-'}</div>
                    </div>
                    {selectedReservation.vehicle?.priority?.status === 'APPROVED' ? (
                      <div className="mt-3 pt-2 border-t border-gray-800 flex items-center text-xs font-bold text-amber-400">
                        <span className="mr-1">PRIORITY:</span>
                        {selectedReservation.vehicle.priority.serviceType.replace('_', ' ')}
                      </div>
                    ) : (
                      <div className="mt-3 pt-2 border-t border-gray-800 flex items-center text-xs font-medium text-gray-500">
                        Normal Service
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wider">Station & Fuel</h4>
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800">
                  <div className="flex items-start mb-3">
                    <MapPin className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white font-semibold">{selectedReservation.station?.name || 'Unknown Station'}</div>
                      <div className="text-gray-500 text-xs mt-1 leading-relaxed">
                        {selectedReservation.station?.address || 'No address provided'}
                        {selectedReservation.station?.location && <span> &bull; {selectedReservation.station?.location}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-3">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Fuel Type</div>
                      <div className="text-blue-400 font-bold">{selectedReservation.fuelType}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Requested Amount</div>
                      <div className="text-white font-bold">{parseFloat(selectedReservation.amount).toLocaleString()} L</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wider">Timeline</h4>
                <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created At</span>
                    <span className="text-gray-300 font-medium">{new Date(selectedReservation.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Updated At</span>
                    <span className="text-gray-300 font-medium">{new Date(selectedReservation.updatedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-3">
                    <span className="text-gray-400">Valid Until</span>
                    <span className={`${new Date(selectedReservation.validUntil) < new Date() && selectedReservation.status === 'PENDING' ? 'text-red-400' : 'text-gray-300'} font-bold`}>
                      {new Date(selectedReservation.validUntil).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-gray-700/50 bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => setSelectedReservation(null)}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
