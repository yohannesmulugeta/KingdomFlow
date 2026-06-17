import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users as UsersIcon, Plus, Pencil, Mail } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

const ROLES = [
  { value: 'admin', label: 'Church Admin' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'finance_officer', label: 'Finance Officer' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'viewer', label: 'Viewer' },
];

export default function Users() {
  const { isAdmin } = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [editForm, setEditForm] = useState({ role: 'viewer', branch_id: '', phone: '' });
  const [inviting, setInviting] = useState(false);

  const load = () => {
    Promise.all([base44.entities.User.list(), base44.entities.Branch.list()]).then(([u, b]) => {
      setUsers(u); setBranches(b); setLoading(false);
    });
  };
  useEffect(load, []);

  const branchName = (id) => branches.find(b => b.id === id)?.name || 'Church-wide';

  const handleInvite = async () => {
    setInviting(true);
    await base44.users.inviteUser(inviteForm.email, inviteForm.role === 'admin' ? 'admin' : 'user');
    setInviting(false);
    setInviteOpen(false);
    setInviteForm({ email: '', role: 'viewer' });
    load();
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditForm({ role: u.role || 'viewer', branch_id: u.branch_id || '', phone: u.phone || '' });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const data = { ...editForm };
    if (!data.branch_id) delete data.branch_id;
    await base44.entities.User.update(editingUser.id, data);
    setEditOpen(false);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Users" description="Manage system users and their roles">
        {isAdmin && <Button onClick={() => setInviteOpen(true)}><Plus className="w-4 h-4 mr-2" /> Invite User</Button>}
      </PageHeader>

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" description="Invite users to start managing your church finances" actionLabel={isAdmin ? "Invite User" : undefined} onAction={isAdmin ? () => setInviteOpen(true) : undefined} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch Access</th>
                  {isAdmin && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                        {ROLES.find(r => r.value === u.role)?.label || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{branchName(u.branch_id)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUser(u)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Invite User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> An invitation email will be sent to the user.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteForm.email || inviting}>{inviting ? 'Sending...' : 'Send Invite'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm font-medium">{editingUser?.full_name} ({editingUser?.email})</p>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch Assignment</Label>
              <Select value={editForm.branch_id || 'all'} onValueChange={v => setEditForm({ ...editForm, branch_id: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Church-wide (all branches)</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}