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
  const { churchRole, can, userId } = useCurrentUser();
  const canManage = can('canManageUsers');
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', churchRole: 'department_leader', access_scope: 'all_branches', branch_id: '', department_id: '' });
  const [editForm, setEditForm] = useState({ church_role: 'department_leader', access_scope: 'assigned_branch', branch_id: '', department_id: '', status: 'active' });
  const [inviting, setInviting] = useState(false);

  const load = () => {
    Promise.all([base44.entities.User.list(), base44.entities.Branch.list(), base44.entities.Department.list()]).then(([u, b, d]) => { setUsers(u); setBranches(b); setDepartments(d); setLoading(false); });
  };
  useEffect(load, []);

  const branchName = (id) => branches.find(b => b.id === id)?.name || 'Church-wide';
  const deptName = (id) => departments.find(d => d.id === id)?.name || '';

  const handleInvite = async () => {
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteForm.email, 'user');

      const auditData = {
        action: 'user_invited',
        entity_name: 'User',
        performed_by_id: userId,
        performed_by_name: '',
        details: `Invited ${inviteForm.email} with church role ${ROLE_LABELS[inviteForm.churchRole]}`,
        metadata_json: JSON.stringify({
          church_role: inviteForm.churchRole,
          access_scope: inviteForm.access_scope,
          branch_id: inviteForm.branch_id,
          department_id: inviteForm.department_id,
        })
      };

      await base44.entities.AuditLog.create(auditData);

      // Poll for the new user and update their church_role
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const allUsers = await base44.entities.User.list();
        const newUser = allUsers.find(u => u.email === inviteForm.email);
        if (newUser) {
          clearInterval(pollInterval);
          await base44.entities.User.update(newUser.id, {
            church_role: inviteForm.churchRole,
            access_scope: inviteForm.access_scope,
            branch_id: inviteForm.branch_id || '',
            department_id: inviteForm.department_id || '',
            status: 'active',
          });
          await base44.entities.AuditLog.create({
            action: 'role_assigned',
            entity_name: 'User',
            entity_id: newUser.id,
            performed_by_id: userId,
            performed_by_name: '',
            details: `Church role set to ${ROLE_LABELS[inviteForm.churchRole]} for ${inviteForm.email}`,
            metadata_json: JSON.stringify({ church_role: inviteForm.churchRole, access_scope: inviteForm.access_scope })
          });
          load();
        } else if (attempts > 8) {
          clearInterval(pollInterval);
        }
      }, 1500);

      toast({ title: 'Invitation sent' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
    setInviteOpen(false);
    setInviteForm({ email: '', churchRole: 'department_leader', access_scope: 'all_branches', branch_id: '', department_id: '' });
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
    if (prev.church_role !== editForm.church_role) changes.push(`church_role: ${ROLE_LABELS[prev.church_role]} → ${ROLE_LABELS[editForm.church_role]}`);
    if (prev.access_scope !== editForm.access_scope) changes.push(`access_scope: ${prev.access_scope} → ${editForm.access_scope}`);
    if (prev.status !== editForm.status) changes.push(`status: ${prev.status} → ${editForm.status}`);

    if (prev.church_role !== editForm.church_role || prev.status !== editForm.status || prev.access_scope !== editForm.access_scope) {
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

  const canEditSelf = (u) => u.id === userId;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Users" description="Manage system users and roles">
        {canManage && <Button onClick={() => setInviteOpen(true)}><Plus className="w-4 h-4 mr-2" /> Invite User</Button>}
      </PageHeader>
      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" description="Invite users to start managing church finances" actionLabel={canManage ? "Invite User" : undefined} onAction={canManage ? () => setInviteOpen(true) : undefined} />
      ) : (
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>{canManage && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}</tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3 font-medium">{u.full_name || '—'}</td><td className="px-4 py-3 text-muted-foreground">{u.email}</td><td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{ROLE_LABELS[u.church_role] || u.church_role || 'Not set'}</span></td><td className="px-4 py-3 text-muted-foreground">{branchName(u.branch_id)}</td><td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : u.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{u.status || '—'}</span></td>{canManage && <td className="px-4 py-3 text-right">{canEditSelf(u) ? <span className="text-xs text-muted-foreground italic">You</span> : <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUser(u)}><Pencil className="w-3 h-3" /></Button>}</td>}</tr>))}</tbody></table></div></Card>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Invite User</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><div><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} /></div><div><Label>Church Role</Label><Select value={inviteForm.churchRole} onValueChange={v => setInviteForm({ ...inviteForm, churchRole: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>Access Scope</Label><Select value={inviteForm.access_scope} onValueChange={v => setInviteForm({ ...inviteForm, access_scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_branches">All Branches</SelectItem><SelectItem value="assigned_branch">Assigned Branch</SelectItem></SelectContent></Select></div><div><Label>Branch</Label><Select value={inviteForm.branch_id || 'none'} onValueChange={v => setInviteForm({ ...inviteForm, branch_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Department</Label><Select value={inviteForm.department_id || 'none'} onValueChange={v => setInviteForm({ ...inviteForm, department_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Invitation email will be sent</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button onClick={handleInvite} disabled={!inviteForm.email || inviting}>{inviting ? 'Sending...' : 'Send Invite'}</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Edit User</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><p className="text-sm font-medium">{editingUser?.full_name} ({editingUser?.email})</p><div><Label>Church Role</Label><Select value={editForm.church_role} onValueChange={v => setEditForm({ ...editForm, church_role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>Access Scope</Label><Select value={editForm.access_scope} onValueChange={v => setEditForm({ ...editForm, access_scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_branches">All Branches</SelectItem><SelectItem value="assigned_branch">Assigned Branch</SelectItem></SelectContent></Select></div><div><Label>Status</Label><Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Branch</Label><Select value={editForm.branch_id || 'none'} onValueChange={v => setEditForm({ ...editForm, branch_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Department</Label><Select value={editForm.department_id || 'none'} onValueChange={v => setEditForm({ ...editForm, department_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave}>Save</Button></div></div></DialogContent>
      </Dialog>
    </div>
  );
}