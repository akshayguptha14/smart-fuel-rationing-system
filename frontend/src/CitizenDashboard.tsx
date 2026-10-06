import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;
import axios from 'axios';
import {
  Users, Car, Droplet, Clock, FileText, LogOut, Activity, MapPin,
  AlertCircle, XCircle, Plus, CheckCircle2, ChevronRight, RefreshCw,
  ShieldAlert, ShieldCheck, ShieldEllipsis, ShieldX, UploadCloud
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = 'http://localhost:3001/api';

export default function CitizenDashboard({ token, user, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [vehRes, resvRes, staRes] = await Promise.all([
        axios.get(`${API_URL}/vehicles`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/reservations`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/stations`, { headers }).catch(() => ({ data: [] }))
      ]);

      const vehiclesWithVerification = await Promise.all(
        vehRes.data.map(async (v: any) => {
          let verification = { status: 'UNVERIFIED' };
          let priority = null;
          try {
            const vrf = await axios.get(`${API_URL}/vehicles/${v.id}/verify`, { headers });
            verification = vrf.data;
            if (verification.status === 'APPROVED') {
              const pri = await axios.get(`${API_URL}/vehicles/${v.id}/priority`, { headers });
              priority = pri.data;
            }
          } catch (err: any) {
            if (err.response?.status === 404 && err.config.url.includes('priority')) {
              priority = null;
            } else if (err.response?.status !== 404) {
              verification = { status: 'ERROR' };
            }
          }
          return { ...v, verification, priority };
        })
      );

      setVehicles(vehiclesWithVerification);
      setReservations(resvRes.data);
      setStations(staRes.data);
    } catch (err: any) {
      setError('Unable to load data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const activeReservations = reservations.filter(r => r.status === 'PENDING');
  const completedTransactions = reservations.filter(r => r.status === 'COMPLETED');

  const totalRemainingQuota = vehicles.reduce((sum, v) => {
    const q = v.fuelQuotas?.[0];
    return sum + (q ? parseFloat(q.remainingQuota) : 0);
  }, 0);

  const primaryVehicle = vehicles[0];

  return (
    <div className="min-h-screen flex bg-[#02120e] font-sans text-gray-200 overflow-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: "url('/citizen-login-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(2, 18, 14, 0.92), rgba(2, 22, 18, 0.85), rgba(4, 30, 24, 0.95))' }} />

      {/* Sidebar */}
      <aside className="relative z-10 w-64 border-r border-[#00dc82]/20 bg-[#02120e]/80 backdrop-blur-xl flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#00dc82]/20">
          <div className="flex items-center text-white space-x-2">
            <Users className="w-6 h-6 text-[#00dc82]" />
            <span className="font-bold text-lg tracking-wide">SMART FUEL</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Rationing &amp; Optimization</div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          <NavItem icon={<Activity />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <NavItem icon={<Car />} label="My Vehicles" active={activeTab === 'My Vehicles'} onClick={() => setActiveTab('My Vehicles')} />
          <NavItem icon={<Droplet />} label="Book Fuel" active={activeTab === 'Book Fuel'} onClick={() => setActiveTab('Book Fuel')} />
          <NavItem icon={<Clock />} label="My Reservations" active={activeTab === 'My Reservations'} onClick={() => setActiveTab('My Reservations')} />
          <NavItem icon={<FileText />} label="Transaction History" active={activeTab === 'Transaction History'} onClick={() => setActiveTab('Transaction History')} />
          <NavItem icon={<Users />} label="Fleet Requests" active={activeTab === 'Fleet Requests'} onClick={() => setActiveTab('Fleet Requests')} />
        </div>
        <div className="p-4 border-t border-[#00dc82]/20">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-[#00dc82]/20 flex items-center justify-center text-[#00dc82] font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{user?.name || 'Citizen'}</div>
              <div className="text-[10px] bg-[#00dc82]/20 text-[#00dc82] px-2 py-0.5 rounded-full inline-block mt-0.5">USER</div>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center w-full px-4 py-3 text-sm text-gray-400 hover:text-red-400 transition-colors hover:bg-red-500/10 rounded-lg">
            <LogOut className="w-5 h-5 mr-3" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-[#00dc82]/20 bg-[#02120e]/60 backdrop-blur-lg flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Citizen / Vehicle Owner Portal</h2>
            <div className="text-xs text-[#00dc82]/80">Dashboard / {activeTab}</div>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="hidden md:flex items-center px-4 py-1.5 bg-[#00dc82]/10 hover:bg-[#00dc82]/20 border border-[#00dc82]/30 rounded-full text-[#00dc82] text-xs font-semibold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'REFRESHING...' : 'REFRESH DATA'}
            </button>
            <div className="hidden md:flex items-center px-4 py-1.5 bg-[#00dc82]/10 border border-[#00dc82]/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-[#00dc82] mr-2 shadow-[0_0_8px_#00dc82]"></div>
              <span className="text-[#00dc82] text-xs font-semibold tracking-wider uppercase">System Online</span>
            </div>
            <div className="flex items-center space-x-3 border-l border-gray-700/50 pl-6">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-white">{user?.name || user?.email}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center mb-6"><AlertCircle className="w-5 h-5 mr-3" />{error}</div>}

          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="p-8 rounded-3xl relative overflow-hidden border border-[#00dc82]/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" style={{ background: 'rgba(2, 25, 20, 0.65)', backdropFilter: 'blur(16px)' }}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00dc82]/20 via-[#00dc82] to-[#00dc82]/20" />
                <div className="relative z-10">
                  <p className="text-[#00dc82] text-sm font-medium mb-1">Welcome back, {user?.name || 'Citizen'}</p>
                  <h1 className="text-3xl font-bold text-white mb-2">Your fuel access, simplified.</h1>
                  <p className="text-gray-300 text-sm max-w-xl mb-6">Manage your vehicles, monitor your fuel quota and reserve fuel securely.</p>

                  {primaryVehicle && (
                    <div className="inline-flex flex-col bg-[#02120e]/80 border border-[#00dc82]/20 rounded-2xl p-4 min-w-[250px]">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center text-white font-bold"><Car className="w-4 h-4 mr-2 text-[#00dc82]" />{primaryVehicle.licensePlate}</div>
                        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{primaryVehicle.vehicleType}</span>
                      </div>
                      <div className="text-sm text-gray-400 mb-1">Remaining Quota</div>
                      <div className="text-xl font-bold text-[#00dc82]">{primaryVehicle.fuelQuotas?.[0]?.remainingQuota || 0} L <span className="text-sm text-gray-500">/ {primaryVehicle.fuelQuotas?.[0]?.totalQuota || 0} L</span></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Registered Vehicles" value={vehicles.length.toString()} icon={<Car />} />
                <MetricCard title="Available Fuel Quota" value={totalRemainingQuota ? `${totalRemainingQuota} L` : '0 L'} icon={<Droplet />} />
                <MetricCard title="Active Reservations" value={activeReservations.length.toString()} icon={<Clock />} />
                <MetricCard title="Completed Transactions" value={completedTransactions.length.toString()} icon={<FileText />} />
              </div>

              <h3 className="text-xl font-bold text-white mt-8 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction icon={<Droplet />} label="Book Fuel" onClick={() => setActiveTab('Book Fuel')} />
                <QuickAction icon={<Car />} label="My Vehicles" onClick={() => setActiveTab('My Vehicles')} />
                <QuickAction icon={<Clock />} label="My Reservations" onClick={() => setActiveTab('My Reservations')} />
                <QuickAction icon={<FileText />} label="Transaction History" onClick={() => setActiveTab('Transaction History')} />
              </div>
            </div>
          )}

          {activeTab === 'My Vehicles' && <VehiclesView vehicles={vehicles} token={token} onUpdate={fetchData} />}
          {activeTab === 'Book Fuel' && <BookFuelView vehicles={vehicles} stations={stations} token={token} onBooked={() => { fetchData(); setActiveTab('My Reservations'); }} />}
          {activeTab === 'My Reservations' && <ReservationsView reservations={reservations} token={token} onUpdate={fetchData} />}
          {activeTab === 'Transaction History' && <TransactionsView transactions={completedTransactions} />}
          {activeTab === 'Fleet Requests' && <FleetRequestsView token={token} />}

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-gradient-to-r from-[#00dc82]/20 to-transparent border-l-2 border-[#00dc82] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
      <div className={`mr-3 ${active ? 'text-[#00dc82]' : ''}`}>{React.cloneElement(icon, { size: 20 })}</div>
      <span className="font-medium text-sm">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto text-[#00dc82]" />}
    </button>
  );
}

function MetricCard({ title, value, icon }: any) {
  return (
    <div className="bg-[#041812]/70 backdrop-blur-md border border-[#00dc82]/20 p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[#00dc82]/50 transition-colors">
      <div className="absolute -right-4 -top-4 text-[#00dc82]/10 group-hover:text-[#00dc82]/20 transition-colors transform group-hover:scale-110 duration-500">
        {React.cloneElement(icon, { size: 100 })}
      </div>
      <div className="flex items-center space-x-3 mb-2 relative z-10">
        <div className="text-[#00dc82]">{React.cloneElement(icon, { size: 20 })}</div>
        <span className="text-gray-400 text-sm font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold text-white relative z-10">{value}</div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-[#041812]/70 backdrop-blur-md border border-[#00dc82]/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-[#00dc82]/10 hover:border-[#00dc82]/50 transition-all group">
      <div className="w-12 h-12 rounded-full bg-[#00dc82]/10 flex items-center justify-center text-[#00dc82] mb-3 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <span className="text-white font-medium text-sm">{label}</span>
    </button>
  );
}

function VehiclesView({ vehicles, token, onUpdate }: any) {
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('CAR');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [verificationModalVehicle, setVerificationModalVehicle] = useState<any>(null);
  const [priorityModalVehicle, setPriorityModalVehicle] = useState<any>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await axios.post(`${API_URL}/vehicles`, { licensePlate: plate, vehicleType: type }, { headers: { Authorization: `Bearer ${token}` } });
      setPlate(''); setShowForm(false); onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add vehicle');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">My Vehicles</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#00dc82]/20 text-[#00dc82] border border-[#00dc82]/50 rounded-xl hover:bg-[#00dc82]/30 transition-colors flex items-center text-sm font-bold">
          {showForm ? <XCircle className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'Register Vehicle'}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#041812]/70 backdrop-blur-md border border-[#00dc82]/30 p-6 rounded-2xl mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Register New Vehicle</h3>
          {error && <div className="mb-4 text-sm text-red-400 bg-red-900/20 p-3 rounded-lg">{error}</div>}
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="License Plate" required className="flex-1 p-3 bg-[#020a08] border border-gray-700 rounded-xl text-white focus:border-[#00dc82] focus:outline-none" value={plate} onChange={e => setPlate(e.target.value)} />
            <select className="flex-1 p-3 bg-[#020a08] border border-gray-700 rounded-xl text-white focus:border-[#00dc82] focus:outline-none" value={type} onChange={e => setType(e.target.value)}>
              <option value="CAR">Car</option>
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="TRUCK">Truck</option>
            </select>
            <button type="submit" disabled={loading} className="px-8 py-3 bg-[#00dc82] text-black font-bold rounded-xl hover:bg-[#00e68a] transition-colors">{loading ? 'Saving...' : 'Register'}</button>
          </form>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-[#041812]/50 border border-gray-800 rounded-2xl">
          <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No vehicles registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v: any) => {
            const q = v.fuelQuotas?.[0];
            const active = !!q;
            return (
              <div key={v.id} className="bg-[#041812]/80 backdrop-blur-md border border-[#00dc82]/20 rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center text-xl font-bold text-white">
                    <Car className="w-6 h-6 mr-3 text-[#00dc82]" /> {v.licensePlate}
                  </div>
                  <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">{v.vehicleType}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-2 flex justify-between">
                      <span>Fuel Quota</span>
                      {active ? <span className="text-[#00dc82] font-semibold">{q.remainingQuota} L / {q.totalQuota} L</span> : <span className="text-amber-500">None</span>}
                    </div>
                    {active && (
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                        <div className="bg-[#00dc82] h-2 rounded-full" style={{ width: `${(parseFloat(q.remainingQuota) / parseFloat(q.totalQuota)) * 100}%` }}></div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{active ? 'Monthly Period' : 'No active policy'}</span>
                    {active && <span className="flex items-center text-[#00dc82]"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</span>}
                  </div>

                  {/* Verification Status */}
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    {v.verification?.status === 'APPROVED' && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-[#00dc82] font-semibold text-sm">
                          <ShieldCheck className="w-4 h-4 mr-2" /> Verified
                        </div>
                        <div className="text-xs text-gray-400">Vehicle verification approved. Aadhaar ending in &bull;&bull;&bull;&bull;{v.verification.aadhaarLast4}</div>

                        {/* Priority Section */}
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          {v.priority?.status === 'APPROVED' && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center text-[#00dc82] font-semibold text-sm">
                                Essential Service — Approved
                              </div>
                              <div className="text-xs text-gray-300 font-bold uppercase">{v.priority.serviceType.replace('_', ' ')}</div>
                              {v.priority.validUntil && <div className="text-[10px] text-gray-500">Valid until: {new Date(v.priority.validUntil).toLocaleDateString()}</div>}
                            </div>
                          )}
                          {v.priority?.status === 'PENDING' && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center text-amber-400 font-semibold text-sm">
                                Priority Review Pending
                              </div>
                              <div className="text-xs text-gray-400">Your essential-service request is under manual administrator review.</div>
                            </div>
                          )}
                          {v.priority?.status === 'REJECTED' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center text-red-400 font-semibold text-sm">
                                Priority Request Rejected
                              </div>
                              <div className="text-xs text-gray-400 bg-red-900/20 p-2 rounded border border-red-900/30">
                                Reason: {v.priority.rejectionReason}
                              </div>
                              <button onClick={() => setPriorityModalVehicle(v)} className="w-full mt-2 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors border border-gray-700">
                                Resubmit Priority Request
                              </button>
                            </div>
                          )}
                          {v.priority?.status === 'EXPIRED' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center text-amber-400 font-semibold text-sm">
                                Priority Entitlement Expired
                              </div>
                              <button onClick={() => setPriorityModalVehicle(v)} className="w-full mt-2 py-2 bg-[#00dc82]/10 hover:bg-[#00dc82]/20 text-[#00dc82] border border-[#00dc82]/30 text-sm font-semibold rounded-lg transition-colors">
                                Apply for Essential-Service Priority
                              </button>
                            </div>
                          )}
                          {(!v.priority || !v.priority.status) && (
                            <div className="flex flex-col gap-2">
                              <div className="text-xs text-gray-400">Standard Vehicle</div>
                              <button onClick={() => setPriorityModalVehicle(v)} className="w-full mt-1 py-2 bg-[#00dc82]/10 hover:bg-[#00dc82]/20 text-[#00dc82] border border-[#00dc82]/30 text-sm font-semibold rounded-lg transition-colors">
                                Apply for Essential-Service Priority
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {v.verification?.status === 'PENDING' && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-amber-400 font-semibold text-sm">
                          <ShieldEllipsis className="w-4 h-4 mr-2" /> Under Manual Review
                        </div>
                        <div className="text-xs text-gray-400">Your Aadhaar and RC documents have been submitted and are awaiting administrator review.</div>
                        {v.verification.createdAt && <div className="text-[10px] text-gray-500 mt-1">Submitted: {new Date(v.verification.createdAt).toLocaleDateString()}</div>}
                        <div className="mt-4 pt-4 border-t border-gray-700/50 text-[10px] text-gray-500">
                          Complete vehicle verification before applying for essential-service priority.
                        </div>
                      </div>
                    )}
                    {(v.verification?.status === 'UNVERIFIED' || v.verification?.status === 'REJECTED' || !v.verification?.status) && (
                      <div className="flex flex-col gap-2">
                        {v.verification?.status === 'REJECTED' ? (
                          <>
                            <div className="flex items-center text-red-400 font-semibold text-sm">
                              <ShieldX className="w-4 h-4 mr-2" /> Verification Rejected
                            </div>
                            <div className="text-xs text-gray-400 bg-red-900/20 p-2 rounded border border-red-900/30">
                              Reason: {v.verification.rejectionReason}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center text-gray-400 font-semibold text-sm">
                            <ShieldAlert className="w-4 h-4 mr-2" /> Verification required
                          </div>
                        )}
                        <button onClick={() => setVerificationModalVehicle(v)} className="w-full mt-2 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors border border-gray-700">
                          {v.verification?.status === 'REJECTED' ? 'Resubmit Documents' : 'Verify Vehicle'}
                        </button>
                        {v.verification?.status !== 'REJECTED' && (
                          <div className="text-[10px] text-gray-500 text-center">Submit Aadhaar and Vehicle RC for manual document review.</div>
                        )}
                        <div className="mt-2 pt-2 border-t border-gray-700/50 text-[10px] text-gray-500 text-center">
                          Complete vehicle verification before applying for essential-service priority.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {verificationModalVehicle && (
        <VerificationModal
          vehicle={verificationModalVehicle}
          token={token}
          onClose={() => setVerificationModalVehicle(null)}
          onSuccess={() => { setVerificationModalVehicle(null); onUpdate(); }}
        />
      )}

      {priorityModalVehicle && (
        <PriorityModal
          vehicle={priorityModalVehicle}
          token={token}
          onClose={() => setPriorityModalVehicle(null)}
          onSuccess={() => { setPriorityModalVehicle(null); onUpdate(); }}
        />
      )}
    </div>
  );
}


function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function BookFuelView({ vehicles, stations, token, onBooked }: any) {
  const [vehicle, setVehicle] = useState('');
  const [stationId, setStationId] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        _err => console.log('Location not available')
      );
    }
  }, []);

  const sortedStations = useMemo(() => {
    if (!userLoc) return stations;
    return [...stations].map(s => {
      if (s.latitude && s.longitude) {
        return { ...s, distance: getHaversineDistance(userLoc[0], userLoc[1], s.latitude, s.longitude) };
      }
      return { ...s, distance: Infinity };
    }).sort((a, b) => a.distance - b.distance);
  }, [stations, userLoc]);

  const selectedVData = vehicles.find((v:any) => v.id === vehicle);
  const remaining = selectedVData?.fuelQuotas?.[0]?.remainingQuota || 0;
  const isVehicleVerified = selectedVData?.verification?.status === 'APPROVED';

  const selectedStation = stations.find((s: any) => s.id === stationId);

  const fuelOptions = selectedStation ? selectedStation.inventory : [];
  const selectedFuel = fuelOptions.find((f: any) => f.fuelType === fuelType);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await axios.post(`${API_URL}/reservations`, {
        vehicleId: vehicle, stationId, fuelType, amount: parseFloat(amount)
      }, { headers: { Authorization: `Bearer ${token}` } });
      onBooked();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reserve fuel');
    } finally { setLoading(false); }
  };

  const mapCenter = userLoc || (stations.length > 0 && stations[0].latitude ? [stations[0].latitude, stations[0].longitude] : [20.5937, 78.9629]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Locate & Reserve</h2>
        <p className="text-gray-400 text-sm">Find the nearest station, check live availability, and reserve fuel.</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl flex items-center text-sm"><AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Map and Station List */}
        <div className="space-y-6">
          <div className="bg-[#041812]/70 backdrop-blur-md border border-gray-800 rounded-2xl p-4 h-[400px] overflow-hidden relative">
             <MapContainer center={mapCenter as any} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapUpdater center={mapCenter as any} />
                {userLoc && (
                   <Marker position={userLoc} icon={L.divIcon({ className: 'bg-blue-500 rounded-full w-4 h-4 border-2 border-white' })} />
                )}
                {sortedStations.map((s: any) => s.latitude && s.longitude ? (
                  <Marker
                    key={s.id}
                    position={[s.latitude, s.longitude]}
                    eventHandlers={{ click: () => setStationId(s.id) }}
                  >
                    <Popup>
                      <div className="text-gray-900 font-bold mb-1">{s.name}</div>
                      <div className="text-xs text-gray-700 mb-2">{s.address || s.location}</div>
                      <div className="space-y-1">
                        {s.inventory?.map((inv: any) => (
                           <div key={inv.fuelType} className="text-xs flex justify-between gap-4">
                             <span className="font-semibold">{inv.fuelType}</span>
                             <span>{inv.status === 'AVAILABLE' ? '🟢' : inv.status === 'LOW' ? '🟡' : '🔴'} {inv.price ? `₹${inv.price}/L` : 'No Price'}</span>
                           </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setStationId(s.id)}
                        className="mt-2 w-full bg-[#00dc82] text-white font-bold py-1 px-2 rounded text-xs"
                      >
                        Select Station
                      </button>
                    </Popup>
                  </Marker>
                ) : null)}
             </MapContainer>
          </div>

          <div className="bg-[#041812]/70 backdrop-blur-md border border-gray-800 rounded-2xl p-4 max-h-[300px] overflow-y-auto">
            <h3 className="text-[#00dc82] font-semibold text-sm mb-4 tracking-wider uppercase">Nearby Stations</h3>
            <div className="space-y-3">
              {sortedStations.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => setStationId(s.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${stationId === s.id ? 'bg-[#00dc82]/10 border-[#00dc82]' : 'bg-[#020a08] border-gray-700 hover:border-gray-500'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white text-sm">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.address || s.location}</div>
                    </div>
                    {s.distance !== undefined && s.distance !== Infinity && (
                      <div className="text-xs font-semibold text-[#00dc82]">
                        {s.distance.toFixed(1)} km
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                     {s.inventory?.map((inv: any) => (
                       <span key={inv.fuelType} className={`text-[10px] px-2 py-1 rounded-full border ${inv.status === 'OUT_OF_STOCK' ? 'bg-red-500/10 border-red-500/30 text-red-400' : inv.status === 'PRICE_NOT_CONFIGURED' ? 'bg-gray-500/10 border-gray-500/30 text-gray-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                         {inv.fuelType}: {inv.price ? `₹${inv.price}` : 'No Price'}
                       </span>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Booking Form */}
        <div>
          <form onSubmit={handleBook} className="space-y-6">
            <div className="bg-[#041812]/70 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
              <h3 className="text-[#00dc82] font-semibold text-sm mb-4 tracking-wider uppercase">Step 1: Select Vehicle</h3>
              <select required className="w-full p-4 bg-[#020a08] border border-gray-700 rounded-xl text-white focus:border-[#00dc82] focus:outline-none mb-4" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map((v:any) => <option key={v.id} value={v.id}>{v.licensePlate} ({v.vehicleType}) - {v.fuelQuotas?.[0]?.remainingQuota || 0} L remaining</option>)}
              </select>

              {selectedVData && !isVehicleVerified && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start mb-4">
                  <ShieldAlert className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-400 font-bold text-sm">Vehicle verification required</h4>
                    <p className="text-gray-400 text-xs mt-1">Complete manual document verification before booking fuel with this vehicle.</p>
                  </div>
                </div>
              )}

              {selectedVData && selectedVData.priority?.status === 'APPROVED' && (
                <div className="p-4 bg-[#00dc82]/10 border border-[#00dc82]/30 rounded-xl flex items-center">
                  <div className="w-8 h-8 rounded-full bg-[#00dc82]/20 flex items-center justify-center mr-3 text-[#00dc82]">
                    {selectedVData.priority.serviceType === 'AMBULANCE' ? '??' : selectedVData.priority.serviceType === 'FARMER' ? '??' : '??'}
                  </div>
                  <div>
                    <div className="text-[#00dc82] font-bold text-sm">Priority Service</div>
                    <div className="text-gray-400 text-xs mt-0.5 capitalize">{selectedVData.priority.serviceType.replace('_', ' ').toLowerCase()}</div>
                  </div>
                </div>
              )}
            </div>

            <div className={`bg-[#041812]/70 backdrop-blur-md border rounded-2xl p-6 transition-all`}>
              <h3 className="text-[#00dc82] font-semibold text-sm mb-4 tracking-wider uppercase">Step 2: Fuel Type</h3>
              {!stationId ? (
                <div className="text-sm text-gray-400 text-center py-4">Please select a station from the map first.</div>
              ) : fuelOptions.length === 0 ? (
                <div className="text-sm text-red-400 text-center py-4">No fuel available at this station.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {fuelOptions.map((ft: any) => (
                    <button
                      key={ft.fuelType}
                      type="button"
                      onClick={() => setFuelType(ft.fuelType)}
                      disabled={ft.status === 'OUT_OF_STOCK' || ft.status === 'PRICE_NOT_CONFIGURED'}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${fuelType === ft.fuelType ? "border-[#00dc82] bg-[#00dc82]/10" : "border-gray-800 bg-[#020a08] hover:border-[#00dc82]/50"}`}
                    >
                      <Droplet className={`w-6 h-6 mb-2 ${fuelType === ft.fuelType ? "text-[#00dc82]" : "text-gray-500"}`} />
                      <span className="text-sm font-semibold">{ft.fuelType}</span>
                      <span className="text-xs mt-1 font-bold">{ft.price ? `₹${ft.price}/L` : "No Price"}</span>
                      <span className={`text-[10px] mt-1 ${ft.status === "AVAILABLE" ? "text-[#00dc82]" : "text-red-400"}`}>
                        {ft.status.replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#041812]/70 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
              <h3 className="text-[#00dc82] font-semibold text-sm mb-4 tracking-wider uppercase">Step 3: Amount</h3>
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <div className="relative">
                    <input type="number" required min="1" step="0.01" placeholder="Enter liters" className="w-full p-4 pr-12 bg-[#020a08] border border-gray-700 rounded-xl text-white text-xl font-bold focus:border-[#00dc82] focus:outline-none disabled:opacity-50" value={amount} onChange={e => setAmount(e.target.value)} disabled={!fuelType} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">L</span>
                  </div>
                </div>
                {vehicle && (
                  <div className="w-full p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-sm">
                    <div className="flex justify-between mb-1"><span className="text-gray-400">Remaining Quota:</span><span className="text-white font-bold">{remaining} L</span></div>
                    <div className="flex justify-between mb-1"><span className="text-gray-400">After Reservation:</span><span className={`font-bold ${amount && parseFloat(amount) > parseFloat(remaining) ? "text-red-400" : "text-white"}`}>{amount ? (parseFloat(remaining) - parseFloat(amount)).toFixed(2) : remaining} L</span></div>
                    {selectedFuel && selectedFuel.price && amount && (
                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
                        <span className="text-gray-400">Estimated Total:</span>
                        <span className="text-white font-bold">?{(parseFloat(amount) * selectedFuel.price).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading || !fuelType || !isVehicleVerified || !stationId} className="w-full py-5 bg-gradient-to-r from-[#00b956] to-[#00e676] text-black font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(0,220,130,0.3)] hover:shadow-[0_0_30px_rgba(0,220,130,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : 'Confirm Fuel Reservation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
function VerificationModal({ vehicle, token, onClose, onSuccess }: any) {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      setError('Enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!aadhaarFile) {
      setError('Aadhaar document is required.');
      return;
    }
    if (!rcFile) {
      setError('Vehicle RC document is required.');
      return;
    }
    if (aadhaarFile.size > 5 * 1024 * 1024 || rcFile.size > 5 * 1024 * 1024) {
      setError('File size must be 5 MB or less.');
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(aadhaarFile.type) || !allowedTypes.includes(rcFile.type)) {
      setError('Only PDF, JPG and PNG files are supported.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('aadhaarNumber', aadhaarNumber);
      formData.append('aadhaarDocument', aadhaarFile);
      formData.append('rcDocument', rcFile);

      await axios.post(`${API_URL}/vehicles/${vehicle.id}/verify`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
          // Let browser set Content-Type with boundary for multipart/form-data
        }
      });

      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit verification');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#041812]/90 backdrop-blur-xl border border-[#00dc82]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
        <div className="p-6 border-b border-[#00dc82]/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-[#00dc82]" /> Verify Your Vehicle
            </h2>
            <p className="text-xs text-gray-400 mt-1">Submit your Aadhaar and Vehicle RC for manual document review.</p>
          </div>
          <button onClick={onClose} disabled={loading || success} className="text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#00dc82]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#00dc82]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verification submitted successfully.</h3>
            <p className="text-gray-400 text-sm">Your documents are under manual review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Aadhaar Number</label>
              <input
                type="password"
                maxLength={12}
                required
                placeholder="12-digit Aadhaar number"
                className="w-full p-3 bg-[#020a08] border border-gray-700 rounded-xl text-white focus:border-[#00dc82] focus:outline-none font-mono"
                value={aadhaarNumber}
                onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Aadhaar Document</label>
              <div className="relative">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setAadhaarFile(e.target.files?.[0] || null)} />
                <div className={`w-full p-4 border border-dashed rounded-xl flex items-center justify-center ${aadhaarFile ? 'border-[#00dc82] bg-[#00dc82]/5' : 'border-gray-600 bg-gray-800/30'}`}>
                  {aadhaarFile ? (
                    <div className="flex items-center text-[#00dc82] text-sm"><CheckCircle2 className="w-4 h-4 mr-2" /> {aadhaarFile.name}</div>
                  ) : (
                    <div className="flex items-center text-gray-400 text-sm"><UploadCloud className="w-4 h-4 mr-2" /> Select Aadhaar PDF/Image (Max 5MB)</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle RC Document</label>
              <div className="relative">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setRcFile(e.target.files?.[0] || null)} />
                <div className={`w-full p-4 border border-dashed rounded-xl flex items-center justify-center ${rcFile ? 'border-[#00dc82] bg-[#00dc82]/5' : 'border-gray-600 bg-gray-800/30'}`}>
                  {rcFile ? (
                    <div className="flex items-center text-[#00dc82] text-sm"><CheckCircle2 className="w-4 h-4 mr-2" /> {rcFile.name}</div>
                  ) : (
                    <div className="flex items-center text-gray-400 text-sm"><UploadCloud className="w-4 h-4 mr-2" /> Select RC PDF/Image (Max 5MB)</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
              <p className="text-[11px] text-blue-300 mb-1 leading-relaxed">
                <strong>Privacy Notice:</strong> Your Aadhaar number is used only for verification. The system stores only the last 4 digits and keeps submitted documents in protected storage.
              </p>
              <p className="text-[11px] text-blue-300 font-semibold">
                Manual Document Review — This does not perform live UIDAI verification.
              </p>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#00b956] to-[#00e676] text-black font-bold text-lg rounded-xl shadow-[0_0_15px_rgba(0,220,130,0.3)] hover:shadow-[0_0_25px_rgba(0,220,130,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Submitting documents...' : 'Submit Verification'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ReservationsView({ reservations, token, onUpdate }: any) {
  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation?')) return;
    try {
      await axios.post(`${API_URL}/reservations/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to cancel'); }
  };

  if (reservations.length === 0) {
    return (
      <div className="text-center py-20 bg-[#041812]/50 border border-gray-800 rounded-3xl max-w-2xl mx-auto mt-10">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No reservations yet</h3>
        <p className="text-gray-400">Your confirmed fuel reservations will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">My Reservations</h2>
      {reservations.map((r:any) => {
        const priorityApproved = r.vehicle?.priority?.status === 'APPROVED';
        return (
          <div key={r.id} className={`p-6 border rounded-2xl backdrop-blur-md flex flex-col md:flex-row gap-8 ${r.status === 'PENDING' ? 'bg-[#041812]/90 border-[#00dc82]/30 shadow-[0_8px_30px_rgba(0,220,130,0.1)]' : 'bg-[#020a08]/80 border-gray-800'}`}>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-white mb-1">{r.station?.name || 'Station'}</h3>
                  <div className="text-sm text-gray-400 flex items-center"><MapPin className="w-3 h-3 mr-1"/> {r.station?.location || 'Location'}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    r.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' :
                    r.status === 'COMPLETED' ? 'bg-[#00dc82]/20 text-[#00dc82] border border-[#00dc82]/50' :
                    r.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                    'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>{r.status}</span>
                  {priorityApproved && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00dc82]/10 text-[#00dc82] border border-[#00dc82]/30 flex flex-col items-end">
                      <div className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1" /> Priority Service</div>
                      <div className="text-[#00dc82]/70">{r.vehicle.priority.serviceType.replace('_', ' ')}</div>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-black/30 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Vehicle</div>
                  <div className="text-sm font-semibold text-gray-200">{r.vehicle?.licensePlate || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Fuel Type</div>
                  <div className="text-sm font-semibold text-gray-200">{r.fuelType}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Requested Amount</div>
                  <div className="text-xl font-bold text-white">{parseFloat(r.amount)} L</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Reservation Time</div>
                  <div className="text-sm font-semibold text-gray-200">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {r.status === 'PENDING' && (
              <div className="w-full md:w-64 flex flex-col items-center justify-center p-6 bg-white rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full bg-amber-500 text-black text-[10px] font-bold text-center py-1 uppercase tracking-widest">Reservation Active</div>
                <div className="mt-4 mb-3">
                  <QRCodeSVG value={r.qrToken} size={130} />
                </div>
                <div className="text-xs text-gray-600 font-semibold mb-4 text-center">Scan at {r.station?.name || 'station'}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Valid Until</div>
                <div className="text-sm font-bold text-black">{new Date(r.validUntil).toLocaleTimeString()}</div>
                <button onClick={() => handleCancel(r.id)} className="absolute bottom-2 right-2 text-xs text-red-500 font-bold hover:underline flex items-center bg-white"><XCircle className="w-3 h-3 mr-1"/> Cancel</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TransactionsView({ transactions }: { transactions: any[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 bg-[#041812]/50 border border-gray-800 rounded-3xl max-w-2xl mx-auto mt-10">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No transactions yet</h3>
        <p className="text-gray-400">Your completed fuel transactions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Transaction History</h2>
      <div className="bg-[#041812]/70 backdrop-blur-md border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#020a08] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Station</th>
                <th className="px-6 py-4 font-medium">Fuel Type</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {transactions.map((t:any) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(t.transaction?.createdAt || t.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{t.station?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{t.fuelType}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-[#00dc82]">{parseFloat(t.transaction?.amount || t.amount)} L</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-[#00dc82]/10 text-[#00dc82] text-xs font-bold border border-[#00dc82]/30">{t.transaction?.status || t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PriorityModal({ vehicle, token, onClose, onSuccess }: any) {
  const [serviceType, setServiceType] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!serviceType) {
      setError('Select an essential-service category.');
      return;
    }
    if (!proofFile) {
      setError('Supporting proof is required.');
      return;
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      setError('File size must be 5 MB or less.');
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(proofFile.type)) {
      setError('Only PDF, JPG and PNG files are supported.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('serviceType', serviceType);
      formData.append('proofDocument', proofFile);

      await axios.post(`${API_URL}/vehicles/${vehicle.id}/priority`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit priority request');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#041812]/90 backdrop-blur-xl border border-[#00dc82]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
        <div className="p-6 border-b border-[#00dc82]/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-[#00dc82]" /> Apply for Essential-Service Priority
            </h2>
            <p className="text-xs text-gray-400 mt-1">Submit supporting proof for manual administrator review.</p>
          </div>
          <button onClick={onClose} disabled={loading || success} className="text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#00dc82]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#00dc82]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Priority application submitted successfully.</h3>
            <p className="text-gray-400 text-sm">Pending administrator review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Service Type</label>
              <select required className="w-full p-3 bg-[#020a08] border border-gray-700 rounded-xl text-white focus:border-[#00dc82] focus:outline-none" value={serviceType} onChange={e => setServiceType(e.target.value)}>
                <option value="">-- Select Category --</option>
                <option value="AMBULANCE">Ambulance</option>
                <option value="FARMER">Farmer</option>
                <option value="PUBLIC_TRANSPORT">Public Transport</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Service Proof Document</label>
              <div className="relative">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                <div className={`w-full p-4 border border-dashed rounded-xl flex items-center justify-center ${proofFile ? 'border-[#00dc82] bg-[#00dc82]/5' : 'border-gray-600 bg-gray-800/30'}`}>
                  {proofFile ? (
                    <div className="flex items-center text-[#00dc82] text-sm"><CheckCircle2 className="w-4 h-4 mr-2" /> {proofFile.name}</div>
                  ) : (
                    <div className="flex items-center text-gray-400 text-sm"><UploadCloud className="w-4 h-4 mr-2" /> Select PDF/Image (Max 5MB)</div>
                  )}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#00b956] to-[#00e676] text-black font-bold text-lg rounded-xl shadow-[0_0_15px_rgba(0,220,130,0.3)] hover:shadow-[0_0_25px_rgba(0,220,130,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Submitting for review...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FleetRequestsView({ token }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/vehicles/fleet-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (vehicleId: string, requestId: string, action: 'approve' | 'reject') => {
    try {
      await axios.post(`http://localhost:3001/api/vehicles/${vehicleId}/fleet-requests/${requestId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to process request');
    }
  };

  if (loading) return <div className="text-gray-400 p-8">Loading requests...</div>;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-[#02120e]/80 border border-blue-500/20 rounded-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Fleet Access Requests</h3>
        <p className="text-sm text-gray-400 mb-6">
          Fleet access gives the fleet operator analytical access to this vehicle. You remain the vehicle owner.
        </p>
        {requests.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">No pending fleet requests.</div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl">
                <div>
                  <div className="text-white font-medium">{req.fleet.name}</div>
                  <div className="text-gray-400 text-sm">Requests access to <span className="font-mono text-gray-300">{req.vehicle.licensePlate}</span></div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleAction(req.vehicleId, req.id, 'reject')} className="px-4 py-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 text-sm transition-colors">Reject</button>
                  <button onClick={() => handleAction(req.vehicleId, req.id, 'approve')} className="px-4 py-2 bg-emerald-900/20 text-emerald-400 rounded hover:bg-emerald-900/40 text-sm transition-colors">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
