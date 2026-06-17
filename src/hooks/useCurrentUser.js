import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isBranchSpecific = !!currentUser?.branch_id;
  const userBranchId = currentUser?.branch_id;

  const canAccessBranch = (branchId) => {
    if (isAdmin) return true;
    if (!isBranchSpecific) return true;
    return userBranchId === branchId;
  };

  const filterByBranch = (records) => {
    if (isAdmin || !isBranchSpecific) return records;
    return records.filter(r => !r.branch_id || r.branch_id === userBranchId);
  };

  return { currentUser, loading, isAdmin, isBranchSpecific, userBranchId, canAccessBranch, filterByBranch };
}