import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Edit2, AlertCircle, X, Save } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'TRUCK', 'THREE_WHEELER', 'BUS', 'OTHER'];

export default function FuelPoliciesModule({ token }: { token: string }) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [editForm, setEditForm] = useState({ defaultQuota: '', period: 'WEEKLY' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPolicies(res.data.policies || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [token]);

  const handleEditClick = (vType: string, existingPolicy: any) => {
    setEditingPolicy(vType);
    if (existingPolicy) {
      setEditForm({
        defaultQuota: existingPolicy.defaultQuota.toString(),
        period: existingPolicy.period
      });
    } else {
      setEditForm({ defaultQuota: '20', period: 'WEEKLY' });
    }
    setEditError('');
  };

  const handleSave = async () => {
    setEditError('');
    const quota = parseFloat(editForm.defaultQuota);
    
    if (isNaN(quota) || quota <= 0) {
      setEditError('Default quota must be a positive number.');
      return;
    }

    try {
      setEditLoading(true);
      await axios.put(`${API_URL}/policies/${editingPolicy}`, {
        defaultQuota: quota,
        period: editForm.period
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchPolicies();
      setEditingPolicy(null);
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Failed to update policy.');
    } finally {
      setEditLoading(false);
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
        <h1 className="text-3xl font-bold text-white mb-2">Fuel Policies</h1>
        <p className="text-gray-400 text-sm">Configure system-wide fuel quotas and limits.</p>
      </div>

      <div className="bg-[#0a162e]/60 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/30">
          <div className="flex items-center">
            <ShieldCheck className="w-6 h-6 text-amber-500 mr-3" />
            <h2 className="text-xl font-bold text-white">Vehicle Quota Policies</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/40 border-b border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Default Quota</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {VEHICLE_TYPES.map(vType => {
                const policy = policies.find(p => p.vehicleType === vType);
                
                return (
                  <tr key={vType} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{vType}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {policy ? (
                        <div className="text-sm text-white font-semibold">{policy.defaultQuota} L</div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Not configured</div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {policy ? (
                        <span className="px-2.5 py-1 rounded-full border text-xs font-semibold text-blue-400 bg-blue-400/10 border-blue-400/30">
                          {policy.period}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400">
                      {policy?.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleEditClick(vType, policy)}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-800 hover:bg-amber-500 hover:text-white text-amber-500 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <Edit2 className="w-4 h-4 mr-1.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a162e] border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/50">
              <h2 className="text-lg font-bold text-white">Edit Policy</h2>
              <button 
                onClick={() => setEditingPolicy(null)}
                className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {editError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vehicle Type</label>
                <div className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white font-bold opacity-70 cursor-not-allowed">
                  {editingPolicy}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Default Quota (Liters)</label>
                <input 
                  type="number"
                  min="1"
                  step="0.1"
                  value={editForm.defaultQuota}
                  onChange={(e) => setEditForm({...editForm, defaultQuota: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="e.g. 20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Period</label>
                <select
                  value={editForm.period}
                  onChange={(e) => setEditForm({...editForm, period: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                >
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                </select>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-700/50 bg-gray-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={editLoading}
                className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                {editLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
