import { useState } from 'react';
import { Search, MapPin, Activity, AlertCircle, X, Fuel } from 'lucide-react';

export default function StationsModule({ stations, loading, error }: { stations: any[], loading: boolean, error: string }) {
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<any>(null);

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

  const filteredStations = stations.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.owner?.name && s.owner.name.toLowerCase().includes(q)) ||
      (s.owner?.email && s.owner.email.toLowerCase().includes(q))
    );
  });

  const activeCount = stations.filter(s => s.isActive).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Fuel Stations</h1>
        <p className="text-gray-400 text-sm">Monitor and manage the fuel station network.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mr-4">
            <MapPin className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-gray-400 text-sm font-semibold mb-1">Total Stations</div>
            <div className="text-3xl font-black text-white">{stations.length}</div>
          </div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mr-4">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <div className="text-gray-400 text-sm font-semibold mb-1">Active Stations</div>
            <div className="text-3xl font-black text-white">{activeCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl mb-8">
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search stations, locations, or owners..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-all"
            aria-label="Search stations"
          />
        </div>

        {stations.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed border-gray-700/50 rounded-xl">
            No fuel stations found.
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed border-gray-700/50 rounded-xl">
            No stations match your search.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStations.map(station => (
              <div key={station.id} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{station.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${station.isActive ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-red-400 bg-red-400/10 border-red-400/30'}`}>
                        {station.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mb-1">
                      <span className="font-semibold text-gray-300">Owner:</span> {station.owner?.name || station.owner?.email}
                    </div>
                    <div className="text-sm text-gray-400">
                      <span className="font-semibold text-gray-300">Location:</span> {station.location} {station.address ? `(${station.address})` : ''}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-300 mb-2">Available Inventory</div>
                    <div className="grid grid-cols-2 gap-2">
                      {station.inventory && station.inventory.length > 0 ? (
                        station.inventory.map((inv: any) => {
                          const qty = Number(inv.quantity || 0);
                          const cap = Number(inv.capacity || 0);
                          const pct = cap > 0 ? (qty / cap * 100).toFixed(1) : 0;
                          return (
                            <div key={inv.id} className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-2 text-xs">
                              <div className="text-amber-500 font-bold mb-1">{inv.fuelType}</div>
                              <div className="text-white">{qty} L / {cap} L</div>
                              <div className="text-gray-500 mt-1">{pct}% utilization</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-gray-500 italic col-span-2">No inventory data.</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <button 
                      onClick={() => setSelectedStation(station)}
                      className="px-4 py-2 bg-gray-700/50 hover:bg-amber-500 hover:text-white border border-gray-600 hover:border-amber-500 text-gray-300 text-sm font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a162e] border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/50">
              <h2 className="text-xl font-bold text-white">Station Details</h2>
              <button 
                onClick={() => setSelectedStation(null)}
                className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded p-1"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Fuel className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{selectedStation.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${selectedStation.isActive ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-red-400 bg-red-400/10 border-red-400/30'}`}>
                    {selectedStation.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-wider">Contact Info</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500 block">Owner Name</span><span className="text-white">{selectedStation.owner?.name || 'Not provided'}</span></div>
                    <div><span className="text-gray-500 block">Owner Email</span><span className="text-white">{selectedStation.owner?.email || 'Not provided'}</span></div>
                    <div><span className="text-gray-500 block">Phone</span><span className="text-white">{selectedStation.contactPhone || 'Not provided'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-wider">Location Info</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500 block">Location</span><span className="text-white">{selectedStation.location || 'Not provided'}</span></div>
                    <div><span className="text-gray-500 block">Address</span><span className="text-white">{selectedStation.address || 'Not provided'}</span></div>
                    <div><span className="text-gray-500 block">Coordinates</span><span className="text-white">{selectedStation.latitude && selectedStation.longitude ? `${selectedStation.latitude}, ${selectedStation.longitude}` : 'Not provided'}</span></div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-wider">System Info</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500 block">Created At</span><span className="text-white">{selectedStation.createdAt ? new Date(selectedStation.createdAt).toLocaleString() : 'Not provided'}</span></div>
                  <div><span className="text-gray-500 block">Last Updated</span><span className="text-white">{selectedStation.updatedAt ? new Date(selectedStation.updatedAt).toLocaleString() : 'Not provided'}</span></div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-wider">Complete Inventory</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedStation.inventory && selectedStation.inventory.length > 0 ? (
                    selectedStation.inventory.map((inv: any) => {
                      const qty = Number(inv.quantity || 0);
                      const cap = Number(inv.capacity || 0);
                      const pct = cap > 0 ? (qty / cap * 100).toFixed(1) : 0;
                      return (
                        <div key={inv.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
                          <div className="text-amber-500 font-bold mb-2">{inv.fuelType}</div>
                          <div className="text-white font-semibold text-lg">{qty} <span className="text-xs text-gray-400">L</span></div>
                          <div className="text-gray-400 text-xs mt-1 border-t border-gray-700/50 pt-1">Cap: {cap} L</div>
                          <div className="text-gray-500 text-[10px] mt-1">{pct}% full</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500 italic col-span-4">No inventory data available for this station.</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-700/50 bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => setSelectedStation(null)}
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
