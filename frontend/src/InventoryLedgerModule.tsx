import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History, Filter, RefreshCw, AlertCircle, MapPin, 
  ChevronLeft, ChevronRight, Droplet
} from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

interface Station {
  id: string;
  name: string;
  location: string;
}

interface LedgerEvent {
  id: string;
  stationId: string;
  fuelType: string;
  eventType: string;
  quantityChange: string;
  quantityAfter: string;
  referenceId: string | null;
  createdAt: string;
  station: Station;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Props {
  token?: string;
}

export default function InventoryLedgerModule({ token }: Props) {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [stationId, setStationId] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [stations, setStations] = useState<Station[]>([]);

  const authToken = token || localStorage.getItem('token');

  const fetchStations = async () => {
    try {
      const res = await axios.get(`${API_URL}/station`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setStations(res.data);
    } catch (err) {
      console.error("Failed to fetch stations", err);
    }
  };

  const fetchLedger = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      
      if (stationId) params.append('stationId', stationId);
      if (fuelType) params.append('fuelType', fuelType);
      if (eventType) params.append('eventType', eventType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await axios.get(`${API_URL}/admin/inventory-ledger?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setEvents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch ledger events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
    fetchLedger();
  }, []);

  const handleApplyFilters = () => {
    fetchLedger(1);
  };

  const handleClearFilters = () => {
    setStationId('');
    setFuelType('');
    setEventType('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => {
      setLoading(true);
      axios.get(`${API_URL}/admin/inventory-ledger?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).then(res => {
        setEvents(res.data.data);
        setPagination(res.data.pagination);
      }).catch(() => {
        setError('Failed to fetch ledger events.');
      }).finally(() => {
        setLoading(false);
      });
    }, 0);
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'RESERVED': return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">Reserved</span>;
      case 'REFUNDED': return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">Refunded</span>;
      case 'SUPPLIED': return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">Supplied</span>;
      case 'DISPENSED': return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">Dispensed</span>;
      case 'MANUAL_ADJUSTMENT': return <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded-full text-xs font-semibold">Manual Adjustment</span>;
      default: return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-semibold">{type}</span>;
    }
  };

  const getQuantityColor = (change: string) => {
    const val = parseFloat(change);
    if (val < 0) return 'text-red-400';
    if (val > 0) return 'text-green-400';
    return 'text-gray-300';
  };

  const totalEvents = events.length;
  const suppliedEvents = events.filter(e => e.eventType === 'SUPPLIED').length;
  const reservedEvents = events.filter(e => e.eventType === 'RESERVED').length;
  const refundedEvents = events.filter(e => e.eventType === 'REFUNDED').length;
  const dispensedEvents = events.filter(e => e.eventType === 'DISPENSED').length;
  const manualEvents = events.filter(e => e.eventType === 'MANUAL_ADJUSTMENT').length;

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 p-6 overflow-hidden">
      
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-blue-400" />
            Inventory Ledger
          </h2>
          <p className="text-slate-400 text-sm mt-1">Immutable operational history of station fuel inventory movements.</p>
        </div>
        <button 
          onClick={() => fetchLedger(pagination.page)}
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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 shrink-0">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Page Events</p>
          <p className="text-2xl font-bold text-white">{totalEvents}</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">Supplied (Page)</p>
          <p className="text-2xl font-bold text-blue-100">{suppliedEvents}</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">Reserved (Page)</p>
          <p className="text-2xl font-bold text-yellow-100">{reservedEvents}</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">Refunded (Page)</p>
          <p className="text-2xl font-bold text-green-100">{refundedEvents}</p>
        </div>
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
          <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">Dispensed (Page)</p>
          <p className="text-2xl font-bold text-purple-100">{dispensedEvents}</p>
        </div>
        <div className="bg-gray-500/10 rounded-xl p-4 border border-gray-500/20">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Manual (Page)</p>
          <p className="text-2xl font-bold text-gray-100">{manualEvents}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl shrink-0">
        <div className="flex items-center gap-2 text-slate-300 mr-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <select 
          value={stationId} 
          onChange={e => setStationId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Stations</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select 
          value={fuelType} 
          onChange={e => setFuelType(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Fuel Types</option>
          <option value="PETROL">Petrol</option>
          <option value="DIESEL">Diesel</option>
          <option value="ELECTRIC">Electric</option>
          <option value="HYBRID">Hybrid</option>
        </select>

        <select 
          value={eventType} 
          onChange={e => setEventType(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Event Types</option>
          <option value="RESERVED">Reserved</option>
          <option value="REFUNDED">Refunded</option>
          <option value="SUPPLIED">Supplied</option>
          <option value="DISPENSED">Dispensed</option>
          <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
        </select>

        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <span className="text-slate-500">-</span>
          <input 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <button 
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors ml-auto"
        >
          Apply Filters
        </button>
        <button 
          onClick={handleClearFilters}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 border border-slate-700/50 rounded-xl bg-slate-800/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
            <History className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No inventory ledger events have been recorded yet.</p>
            <p className="text-sm mt-2 opacity-60">Adjust filters or wait for operational activity.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800/80 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Date / Time</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Station</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Fuel Type</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Event</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Quantity Change</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Quantity After</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Reference ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="text-sm text-white font-medium">{new Date(event.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{new Date(event.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-white font-medium">{event.station?.name || 'Unknown Station'}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {event.station?.location || 'N/A'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Droplet className={`w-4 h-4 ${event.fuelType === 'ELECTRIC' ? 'text-blue-400' : event.fuelType === 'DIESEL' ? 'text-green-400' : 'text-yellow-400'}`} />
                      <span className="text-sm text-slate-200 font-medium">{event.fuelType}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {getEventBadge(event.eventType)}
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-bold ${getQuantityColor(event.quantityChange)}`}>
                      {parseFloat(event.quantityChange) > 0 ? '+' : ''}{event.quantityChange} L
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-semibold text-slate-300">{event.quantityAfter} L</span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-mono text-slate-500 truncate max-w-[120px] inline-block" title={event.referenceId || 'N/A'}>
                      {event.referenceId || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && events.length > 0 && (
        <div className="flex items-center justify-between mt-6 shrink-0">
          <div className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-semibold text-white">{pagination.total}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLedger(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-white px-2">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <button
              onClick={() => fetchLedger(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
