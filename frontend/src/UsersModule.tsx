import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Filter, AlertCircle, X, Users, Shield, User, Store, Calendar, Car, History, CreditCard } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function UsersModule({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(Array.isArray(res.data) ? res.data : []);
        setError('');
      } catch (err: any) {
        setError('Unable to load users data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  // Derived Summary Metrics
  const summary = useMemo(() => {
    let citizens = 0;
    let stationOwners = 0;
    let admins = 0;
    
    users.forEach(u => {
      if (u.role === 'USER') citizens++;
      else if (u.role === 'STATION_OWNER') stationOwners++;
      else if (u.role === 'ADMIN') admins++;
    });

    return {
      total: users.length,
      citizens,
      stationOwners,
      admins
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const matchesSearch = 
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);
        
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-purple-400 bg-purple-400/10 border-purple-400/30"><Shield className="w-3 h-3 mr-1" /> Administrator</span>;
      case 'STATION_OWNER':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-amber-400 bg-amber-400/10 border-amber-400/30"><Store className="w-3 h-3 mr-1" /> Station Owner</span>;
      case 'USER':
        return <span className="px-2.5 py-1 inline-flex items-center rounded-full border text-xs font-semibold text-emerald-400 bg-emerald-400/10 border-emerald-400/30"><User className="w-3 h-3 mr-1" /> Citizen</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-400 bg-gray-800 border-gray-700">{role}</span>;
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
        <h1 className="text-3xl font-bold text-white mb-2">Users Directory</h1>
        <p className="text-gray-400 text-sm">Manage system access, roles, and administrative users.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-5 shadow-xl">
          <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Users</div>
          <div className="text-3xl font-black text-white">{summary.total.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-emerald-400 text-xs font-semibold mb-1 uppercase tracking-wider">Citizens</div>
          <div className="text-3xl font-black text-emerald-500">{summary.citizens.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">Station Owners</div>
          <div className="text-3xl font-black text-amber-500">{summary.stationOwners.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a162e]/60 backdrop-blur-md border border-purple-500/30 rounded-xl p-5 shadow-xl">
          <div className="text-purple-400 text-xs font-semibold mb-1 uppercase tracking-wider">Administrators</div>
          <div className="text-3xl font-black text-purple-500">{summary.admins.toLocaleString()}</div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/30">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-amber-500 mr-3" />
            <h2 className="text-xl font-bold text-white">User Directory</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search name, email, role..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-40">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="USER">Citizen</option>
                <option value="STATION_OWNER">Station Owner</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </div>
        </div>
        
        {users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users found in database.</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800/40 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name & Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicles</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reservations</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Transactions</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{u.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{u._count?.vehicles || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{u._count?.reservations || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{u._count?.transactions || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{new Date(u.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedUser(u)}
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
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a162e] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">{selectedUser.name || 'Unknown'}</h4>
                  <p className="text-gray-400 text-sm mb-3">{selectedUser.email}</p>
                  <div>{getRoleBadge(selectedUser.role)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center text-gray-400 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Account Created
                  </div>
                  <div className="text-white font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center text-gray-400 text-xs mb-1">
                    <Shield className="w-3.5 h-3.5 mr-1.5" />
                    Internal ID
                  </div>
                  <div className="text-white font-mono text-xs truncate" title={selectedUser.id}>
                    {selectedUser.id}
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 mt-6">Platform Activity</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
                  <div className="flex items-center text-gray-300">
                    <Car className="w-5 h-5 mr-3 text-blue-400" />
                    <span>Registered Vehicles</span>
                  </div>
                  <span className="text-xl font-bold text-white">{selectedUser._count?.vehicles || 0}</span>
                </div>
                
                <div className="flex justify-between items-center bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
                  <div className="flex items-center text-gray-300">
                    <History className="w-5 h-5 mr-3 text-amber-400" />
                    <span>Total Reservations</span>
                  </div>
                  <span className="text-xl font-bold text-white">{selectedUser._count?.reservations || 0}</span>
                </div>

                <div className="flex justify-between items-center bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
                  <div className="flex items-center text-gray-300">
                    <CreditCard className="w-5 h-5 mr-3 text-emerald-400" />
                    <span>Completed Transactions</span>
                  </div>
                  <span className="text-xl font-bold text-white">{selectedUser._count?.transactions || 0}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
