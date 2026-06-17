import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users as UsersIcon, Plus, Pencil, Mail, XCircle, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser, CHURCH_ROLES } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

export default function Users() {
  const { churchRole, can, userId } = useCurrentUser();
  const canManage = can('can_manage_users');
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', churchRole: 'department_leader', access_scope: 'assigned_branch', branch_id: '', department_id: '' });
  const [editForm, setEditForm] = useState({ church_role: 'department_leader', access_scope: 'assigned_branch', branch_id: '', department_id: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.PendingInvitation.list(),
      base44.entities.Branch.list(),
      base44.entities.Department.list()
    ]).then(([u, inv, b, d]) => {
      setUsers(u);
      setInvitations(inv);
      setBranches(b);
      setDepartments(d);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const branchName = (id) => id ? branches.find(b => b.id === id)?.name || '—' : 'Church-wide';
  const deptName = (id) => id ? departments.find(d => d.id === id)?.name || '—' : '—';

  const handleInvite = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('inviteUser', {
        email: inviteForm.email,
        church_role: inviteForm.churchRole,
        access_scope: inviteForm.access_scope,
        branch_id: inviteForm.branch_id || '',
        department_id: inviteForm.department_id || '',
      });
      if (res.data?.error) {
        toast({ title: 'Invitation failed', description: res.data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Invitation sent', description: res.data.message });
        setInviteOpen(false);
        setInviteForm({ email: '', churchRole: 'department_leader', access_scope: 'assigned_branch', branch_id: '', department_id: '' });
        load();
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleResend = async (email) => {
    try {
      const res = await base44.functions.invoke('inviteUser', { email, action: 'resend' });
      if (res.data?.error) toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
      else toast({ title: 'Invitation resent' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancelInvite = async (email) => {
    try {
      const res = await base44.functions.invoke('inviteUser', { email, action: 'cancel' });
      if (res.data?.error) toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
      else { toast({ title: 'Invitation cancelled' }); load(); }
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditForm({
      church_role: u.church_role || 'department_leader',
      access_scope: u.access_scope || 'assigned_branch',
      branch_id: u.branch_id || '',
      department_id: u.department_id || '',
      status: u.status || 'active'
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const prev = editingUser;
    const changes = [];
    if (prev.church_role !== editForm.church_role) changes.push(`church_role: ${CHURCH_ROLES[prev.church_role] || prev.church_role} → ${CHURCH_ROLES[editForm.church_role] || editForm.church_role}`);
    if (prev.access_scope !== editForm.access_scope) changes.push(`access_scope: ${prev.access_scope} → ${editForm.access_scope}`);
    if (prev.status !== editForm.status) changes.push(`status: ${prev.status} → ${editForm.status}`);

    if (changes.length > 0) {
      await base44.entities.AuditLog.create({
        action: 'role_changed',
        entity_name: 'User',
        entity_id: editingUser.id,
        performed_by_id: userId,
        performed_by_name: '',
        details: `User ${editingUser.full_name || editingUser.email} updated: ${changes.join(', ')}`,
        metadata_json: JSON.stringify({ previous: { church_role: prev.church_role, access_scope: prev.access_scope, status: prev.status }, new: editForm })
      });
    }

    await base44.entities.User.update(editingUser.id, editForm);
    setEditOpen(false); load();
    toast({ title: 'User updated' });
  };

  const pendingInvites = invitations.filter(i => i.status === 'pending');

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Users" description="Manage system users and roles">
        {canManage && <Button onClick={() => setInviteOpen(true)}><Plus className="w-4 h-4 mr-2" /> Invite User</Button>}
      </PageHeader>

      {pendingInvites.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="text-sm font-medium mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{inv.email}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{CHURCH_ROLES[inv.church_role] || inv.church_role}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleResend(inv.email)}><RefreshCw className="w-3 h-3 mr-1" /> Resend</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleCancelInvite(inv.email)}><XCircle className="w-3 h-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {users.length === 0 && pendingInvites.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" description="Invite users to start managing church finances" actionLabel={canManage ? "Invite User" : undefined} onAction={canManage ? () => setInviteOpen(true) : undefined} />
      ) : users.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>{canManage && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}</tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{CHURCH_ROLES[u.church_role] || u.church_role || 'Not set'}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{branchName(u.branch_id)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : u.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{u.status || '—'}</span></td>
                    {canManage && <td className="px-4 py-3 text-right">{u.id === userId ? <span className="text-xs text-muted-foreground italic">You</span> : <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUser(u)}><Pencil className="w-3 h-3" /></Button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Invite User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
            <div><Label>Church Role</Label><Select value={inviteForm.churchRole} onValueChange={v => setInviteForm({ ...inviteForm, churchRole: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CHURCH_ROLES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Access Scope</Label><Select value={inviteForm.access_scope} onValueChange={v => setInviteForm({ ...inviteForm, access_scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_branches">All Branches</SelectItem><SelectItem value="assigned_branch">Assigned Branch</SelectItem></SelectContent></Select></div>
              <div><Label>Branch</Label><Select value={inviteForm.branch_id || 'none'} onValueChange={v => setInviteForm({ ...inviteForm, branch_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Department</Label><Select value={inviteForm.department_id || 'none'} onValueChange={v => setInviteForm({ ...inviteForm, department_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> An invitation email will be sent. The user sets their own password.</p>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button onClick={handleInvite} disabled={!inviteForm.email || saving}>{saving ? 'Sending...' : 'Send Invite'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm font-medium">{editingUser?.full_name} ({editingUser?.email})</p>
            <div><Label>Church Role</Label><Select value={editForm.church_role} onValueChange={v => setEditForm({ ...editForm, church_role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CHURCH_ROLES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Access Scope</Label><Select value={editForm.access_scope} onValueChange={v => setEditForm({ ...editForm, access_scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_branches">All Branches</SelectItem><SelectItem value="assigned_branch">Assigned Branch</SelectItem></SelectContent></Select></div>
              <div><Label>Status</Label><Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}