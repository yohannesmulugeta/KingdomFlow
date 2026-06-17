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
import useCurrentUser, { ROLE_LABELS } from '@/hooks/useCurrentUser';
import { toast } from '@/components/ui/use-toast';

export default function Users() {
  const { can, role } = useCurrentUser();
  const canManage = can('canManageUsers');
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', appRole: 'user', churchRole: 'department_leader' });
  const [editForm, setEditForm] = useState({ role: 'department_leader', branch_id: '', department_id: '', phone: '' });
  const [inviting, setInviting] = useState(false);

  const load = () => {
    Promise.all([base44.entities.User.list(), base44.entities.Branch.list()]).then(([u, b]) => { setUsers(u); setBranches(b); setLoading(false); });
  };
  useEffect(load, []);

  const branchName = (id) => branches.find(b => b.id === id)?.name || 'Church-wide';

  const handleInvite = async () => {
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.appRole);
      // Give a moment for the user to be created, then update their role
      setTimeout(async () => {
        const allUsers = await base44.entities.User.list();
        const newUser = allUsers.find(u => u.email === inviteForm.email);
        if (newUser) {
          await base44.entities.User.update(newUser.id, { role: inviteForm.churchRole });
        }
        load();
      }, 2000);
      toast({ title: 'Invitation sent' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
    setInviteOpen(false);
    setInviteForm({ email: '', appRole: 'user', churchRole: 'department_leader' });
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditForm({ role: u.role || 'department_leader', branch_id: u.branch_id || '', department_id: u.department_id || '', phone: u.phone || '' });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    await base44.entities.User.update(editingUser.id, editForm);
    setEditOpen(false); load();
    toast({ title: 'User updated' });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Users" description="Manage system users and roles">
        {canManage && <Button onClick={() => setInviteOpen(true)}><Plus className="w-4 h-4 mr-2" /> Invite User</Button>}
      </PageHeader>
      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" description="Invite users to start managing church finances" actionLabel={canManage ? "Invite User" : undefined} onAction={canManage ? () => setInviteOpen(true) : undefined} />
      ) : (
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>{canManage && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}</tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3 font-medium">{u.full_name || '—'}</td><td className="px-4 py-3 text-muted-foreground">{u.email}</td><td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{ROLE_LABELS[u.role] || u.role}</span></td><td className="px-4 py-3 text-muted-foreground">{branchName(u.branch_id)}</td>{canManage && <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUser(u)}><Pencil className="w-3 h-3" /></Button></td>}</tr>))}</tbody></table></div></Card>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Invite User</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><div><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} /></div><div><Label>Church Role</Label><Select value={inviteForm.churchRole} onValueChange={v => setInviteForm({ ...inviteForm, churchRole: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Invitation email will be sent</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button onClick={handleInvite} disabled={!inviteForm.email || inviting}>{inviting ? 'Sending...' : 'Send Invite'}</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Edit User</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><p className="text-sm font-medium">{editingUser?.full_name} ({editingUser?.email})</p><div><Label>Role</Label><Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div><Label>Branch</Label><Select value={editForm.branch_id || 'all'} onValueChange={v => setEditForm({ ...editForm, branch_id: v === 'all' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Church-wide</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave}>Save</Button></div></div></DialogContent>
      </Dialog>
    </div>
  );
}