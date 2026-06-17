import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, KeyRound, User, Building, DollarSign, Calendar, Tag, Shield, Receipt, Database } from 'lucide-react';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const { can, userId } = useCurrentUser();
  const canManage = can('can_manage_settings');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');

  // Password change
  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    base44.entities.ChurchProfile.list().then(p => { setProfile(p.length > 0 ? p[0] : {}); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('updateSettings', { section: tab, data: profile });
      if (res.data?.error) toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
      else toast({ title: 'Settings saved' });
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    if (pwForm.new_password.length < 4) { toast({ title: 'Password too short', variant: 'destructive' }); return; }
    setPwSaving(true);
    try {
      const res = await base44.functions.invoke('changePassword', { new_password: pwForm.new_password });
      if (res.data?.error) toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
      else { toast({ title: 'Password changed' }); setPwForm({ new_password: '', confirm_password: '' }); }
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
    setPwSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'account', label: 'Account', icon: KeyRound },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-semibold">Settings</h1><p className="text-sm text-muted-foreground">Manage church and account settings</p></div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-48 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${tab === t.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-lg">
          {tab === 'general' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Building className="w-4 h-4" /> Church Information</h3>
              <div><Label>Church Name</Label><Input value={profile?.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
              <div><Label>Tagline</Label><Input value={profile?.tagline || ''} onChange={e => setProfile({ ...profile, tagline: e.target.value })} /></div>
              <div><Label>Pastor / Leader</Label><Input value={profile?.pastor_name || ''} onChange={e => setProfile({ ...profile, pastor_name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={profile?.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={profile?.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={profile?.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>City</Label><Input value={profile?.city || ''} onChange={e => setProfile({ ...profile, city: e.target.value })} /></div><div><Label>State/Region</Label><Input value={profile?.state || ''} onChange={e => setProfile({ ...profile, state: e.target.value })} /></div></div>
              <div><Label>Description</Label><Input value={profile?.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })} /></div>
              <div className="flex justify-end"><Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}</Button></div>
            </Card>
          )}

          {tab === 'financial' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Financial Settings</h3>
              <div><Label>Currency</Label><Select value={profile?.currency || 'ETB'} onValueChange={v => setProfile({ ...profile, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem><SelectItem value="USD">USD - US Dollar</SelectItem><SelectItem value="EUR">EUR - Euro</SelectItem><SelectItem value="GBP">GBP - British Pound</SelectItem></SelectContent></Select></div>
              <div><Label>Fiscal Year Start</Label><Select value={profile?.fiscal_year_start || 'January'} onValueChange={v => setProfile({ ...profile, fiscal_year_start: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Preferred Calendar</Label><Select value={profile?.preferred_calendar || 'gregorian'} onValueChange={v => setProfile({ ...profile, preferred_calendar: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gregorian">Gregorian</SelectItem><SelectItem value="ethiopian">Ethiopian</SelectItem></SelectContent></Select></div>
              <div className="flex justify-end"><Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}</Button></div>
            </Card>
          )}

          {tab === 'account' && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change Password</h3>
              <div><Label>New Password</Label><Input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} /></div>
              <div><Label>Confirm Password</Label><Input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })} /></div>
              <div className="flex justify-end"><Button onClick={handleChangePassword} disabled={pwSaving}>{pwSaving ? 'Changing...' : 'Change Password'}</Button></div>
            </Card>
          )}

          {!canManage && tab !== 'account' && (
            <Card className="p-6"><p className="text-sm text-muted-foreground">Only Church Admin can change these settings.</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}