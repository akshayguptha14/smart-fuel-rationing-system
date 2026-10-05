import React, { useState, useEffect } from 'react';

interface FleetDashboardData {
  fleetName: string;
  totalVehicles: number;
  activeVehicles: number;
  totalQuota: number;
  remainingQuota: number;
  consumedQuota: number;
  quotaUtilization: number;
  successfulTransactions: number;
  activeReservations: number;
  totalFuelConsumed: number;
}

const FleetOperatorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<FleetDashboardData | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/fleet/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        const err = await res.json();
        if (res.status === 404 && err.error === 'Fleet not found') {
          // need to register fleet
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVehicles = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3001/api/fleet/vehicles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setVehicles(await res.json());
    }
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3001/api/fleet/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setTransactions(await res.json());
    }
  };

  const fetchReservations = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3001/api/fleet/reservations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setReservations(await res.json());
    }
  };

  const fetchRequests = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3001/api/fleet/requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setRequests(await res.json());
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'vehicles') fetchVehicles();
    else if (activeTab === 'transactions') fetchTransactions();
    else if (activeTab === 'reservations') fetchReservations();
    else if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

  const handleRegisterFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (e.target as any).fleetName.value;
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3001/api/fleet/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      fetchDashboard();
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3001/api/fleet/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ licensePlate: newVehiclePlate })
    });
    if (res.ok) {
      setNewVehiclePlate('');
      fetchRequests();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleCancelRequest = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3001/api/fleet/requests/${id}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchRequests();
  };

  if (dashboardData === null) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-gray-900 text-white rounded-lg shadow-xl mt-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Register Fleet</h2>
        <form onSubmit={handleRegisterFleet}>
          <div className="mb-4">
            <label className="block text-sm mb-2 text-gray-300">Fleet Name</label>
            <input name="fleetName" type="text" className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white" required />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition-colors">Create Fleet</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              {dashboardData.fleetName}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Fleet Operations Command Center</p>
          </div>
          <nav className="flex space-x-2">
            {['overview', 'vehicles', 'transactions', 'reservations', 'requests'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium mb-1">Total Vehicles</h3>
              <p className="text-3xl font-bold text-white">{dashboardData.totalVehicles}</p>
              <p className="text-emerald-400 text-xs mt-2">{dashboardData.activeVehicles} active</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium mb-1">Total Quota Allocation</h3>
              <p className="text-3xl font-bold text-white">{dashboardData.totalQuota.toFixed(2)}L</p>
              <p className="text-blue-400 text-xs mt-2">{dashboardData.remainingQuota.toFixed(2)}L remaining</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium mb-1">Consumed Fuel</h3>
              <p className="text-3xl font-bold text-white">{dashboardData.consumedQuota.toFixed(2)}L</p>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(dashboardData.quotaUtilization, 100)}%` }}></div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium mb-1">Successful Transactions</h3>
              <p className="text-3xl font-bold text-white">{dashboardData.successfulTransactions}</p>
              <p className="text-blue-400 text-xs mt-2">{dashboardData.totalFuelConsumed.toFixed(2)}L dispensed</p>
            </div>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-sm border-b border-gray-700">
                  <th className="p-4 font-medium">License Plate</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Verification</th>
                  <th className="p-4 font-medium text-right">Total Quota</th>
                  <th className="p-4 font-medium text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-800">
                {vehicles.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No vehicles in fleet</td></tr>
                ) : vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-mono text-gray-200">{v.licensePlate}</td>
                    <td className="p-4 text-gray-400">{v.vehicleType}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${v.verification?.status === 'APPROVED' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {v.verification?.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-300">{v.fuelQuotas?.[0]?.totalQuota || 0}L</td>
                    <td className="p-4 text-right text-blue-400 font-medium">{v.fuelQuotas?.[0]?.remainingQuota || 0}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-sm border-b border-gray-700">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Station</th>
                  <th className="p-4 font-medium">Fuel</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-800">
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No transactions found</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="p-4 text-gray-300">{t.station.name}</td>
                    <td className="p-4 text-gray-400">{t.fuelType}</td>
                    <td className="p-4 text-right font-medium text-white">{t.amount}L</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-900/30 text-emerald-400">{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-sm border-b border-gray-700">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Vehicle</th>
                  <th className="p-4 font-medium">Station</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-800">
                {reservations.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No reservations found</td></tr>
                ) : reservations.map(r => (
                  <tr key={r.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-4 font-mono text-gray-300">{r.vehicle?.licensePlate}</td>
                    <td className="p-4 text-gray-300">{r.station.name}</td>
                    <td className="p-4 text-right font-medium text-white">{r.amount}L</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'COMPLETED' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg h-fit">
              <h3 className="text-lg font-bold text-white mb-4">Invite Vehicle</h3>
              {error && <div className="bg-red-900/50 text-red-400 p-3 rounded text-sm mb-4 border border-red-800">{error}</div>}
              <form onSubmit={handleCreateRequest}>
                <div className="mb-4">
                  <label className="block text-sm mb-2 text-gray-400">License Plate</label>
                  <input
                    type="text"
                    value={newVehiclePlate}
                    onChange={(e) => setNewVehiclePlate(e.target.value)}
                    className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="e.g. MH12AB1234"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                  Send Request
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-sm border-b border-gray-700">
                    <th className="p-4 font-medium">License Plate</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium text-center">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-800">
                  {requests.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No pending requests</td></tr>
                  ) : requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 font-mono text-gray-200">{req.vehicle.licensePlate}</td>
                      <td className="p-4 text-gray-400">{req.vehicle.vehicleType}</td>
                      <td className="p-4 text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          req.status === 'APPROVED' ? 'bg-emerald-900/30 text-emerald-400' :
                          req.status === 'REJECTED' ? 'bg-red-900/30 text-red-400' :
                          req.status === 'CANCELLED' ? 'bg-gray-800 text-gray-400' :
                          'bg-blue-900/30 text-blue-400'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {req.status === 'PENDING' && (
                          <button onClick={() => handleCancelRequest(req.id)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetOperatorDashboard;
