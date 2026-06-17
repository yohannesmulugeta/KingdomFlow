import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Church, Save } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/hooks/useCurrentUser';

const CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ChurchProfile() {
  const { isAdmin } = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ChurchProfile.list().then(data => {
      if (data.length > 0) {
        setProfile(data[0]);
        setForm(data[0]);
      } else {
        setForm({ name: '', address: '', city: '', state: '', phone: '', email: '', website: '', pastor_name: '', description: '', currency: 'ETB', fiscal_year_start: 'January' });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (profile) {
      await base44.entities.ChurchProfile.update(profile.id, { ...form, setup_completed: true });
    } else {
      await base44.entities.ChurchProfile.create({ ...form, setup_completed: true });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Church Profile" description="Your church organization details" />

      <Card className="max-w-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Church className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold">{form.name || 'Church Name'}</h2>
            <p className="text-xs text-muted-foreground">Complete your profile to get started</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Church Name *</Label>
            <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Pastor / Leader Name</Label>
            <Input value={form.pastor_name || ''} onChange={e => setForm({ ...form, pastor_name: e.target.value })} disabled={!isAdmin} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Address</Label><Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} disabled={!isAdmin} /></div>
            <div><Label>City</Label><Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} disabled={!isAdmin} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={!isAdmin} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!isAdmin} /></div>
          </div>
          <div><Label>Website</Label><Input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} disabled={!isAdmin} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Select value={form.currency || 'ETB'} onValueChange={v => setForm({ ...form, currency: v })} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fiscal Year Start</Label>
              <Select value={form.fiscal_year_start || 'January'} onValueChange={v => setForm({ ...form, fiscal_year_start: v })} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} disabled={!isAdmin} />
          </div>

          {isAdmin && (
            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving || !form.name}>
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}