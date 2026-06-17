import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings, Save, KeyRound, Building, DollarSign, Calendar, Tag,
  Shield, Receipt, Database, Hash, LogOut
} from 'lucide-react';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

const CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const FILE_TYPES = ['pdf','jpg','jpeg','png','webp'];

export default function SettingsPage() {
  const { can, userId, churchRole } = useCurrentUser();
  const canManage = churchRole === 'church_admin';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');

  // Password change
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    base44.entities.ChurchProfile.list().then(p => {
      const prof = p.length > 0 ? p[0] : {};
      // Ensure all settings fields have defaults
      setProfile({
        name: '', tagline: '', pastor_name: '', phone: '', email: '', website: '',
        address: '', city: '', state: '', description: '',
        currency: 'ETB', fiscal_year_start: 'January', preferred_calendar: 'gregorian',
        date_format: 'MM/DD/YYYY', negative_balance_policy: 'block',
        fund_override_policy: 'block', budget_override_policy: 'block',
        default_receipt_rule: false, receipt_threshold: '0',
        income_prefix: 'INC', expense_prefix: 'EXP', request_prefix: 'REQ',
        sequence_length: 5, year_format: 'YYYY',
        approval_workflow_enabled: true, prevent_self_approval: true,
        require_rejection_reason: true, require_override_reason: true,
        receipt_required_default: false, receipt_threshold_amount: '0',
        allowed_attachment_types: 'pdf,jpg,jpeg,png', max_upload_size_mb: '10',
        ...prof,
      });
      setLoading(false);
    });
  }, []);

  const saveSettings = async (section) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('updateSettings', { section, data: profile });
      if (res.data?.error) toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
      else toast({ title: 'Settings saved' });
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return; }
    if (pwForm.new_password.length < 12) { setPwError('At least 12 characters required'); return; }
    if (!/[A-Z]/.test(pwForm.new_password)) { setPwError('Uppercase letter required'); return; }
    if (!/[a-z]/.test(pwForm.new_password)) { setPwError('Lowercase letter required'); return; }
    if (!/[0-9]/.test(pwForm.new_password)) { setPwError('Number required'); return; }
    if (!/[^A-Za-z0-9]/.test(pwForm.new_password)) { setPwError('Symbol required'); return; }
    setPwSaving(true);
    try {
      const res = await base44.functions.invoke('changePassword', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      if (res.data?.error) setPwError(res.data.error);
      else { toast({ title: 'Password changed' }); setPwForm({ current_password: '', new_password: '', confirm_password: '' }); setPwError(''); }
    } catch { setPwError('Failed to change password'); }
    setPwSaving(false);
  };

  const handleLogout = () => { base44.auth.logout('/login'); };

  const tabs = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'numbering', label: 'Numbering', icon: Hash },
    { id: 'approvals', label: 'Approvals', icon: Shield },
    { id: 'receipts', label: 'Receipts', icon: Receipt },
    { id: 'account', label: 'Account', icon: KeyRound },
    { id: 'export', label: 'Export', icon: Database },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const InputField = ({ field, label, type = 'text', ...props }) => (
    <div><Label>{label}</Label><Input type={type} value={profile?.[field] || ''} onChange={e => setProfile({ ...profile, [field]: e.target.value })} disabled={!canManage} {...props} /></div>
  );

  const SelectField = ({ field, label, options, valueMap }) => (
    <div><Label>{label}</Label><Select value={profile?.[field] || options[0]} onValueChange={v => setProfile({ ...profile, [field]: v })} disabled={!canManage}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{(valueMap || options).map(o => <SelectItem key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</SelectItem>)}</SelectContent>
    </Select></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-semibold">Settings</h1><p className="text-sm text-muted-foreground">Manage church and account settings</p></div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-48 space-y-1 shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${tab === t.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-2xl">
          {!canManage && tab !== 'account' && tab !== 'export' && (
            <Card className="p-6"><p className="text-sm text-muted-foreground">Only Church Admin can change these settings.</p></Card>
          )}

          {/* GENERAL */}
          {tab === 'general' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Building className="w-4 h-4" /> Church Information</h3>
              <InputField field="name" label="Church Name *" />
              <InputField field="tagline" label="Tagline" />
              <InputField field="pastor_name" label="Pastor / Leader" />
              <InputField field="phone" label="Phone" />
              <InputField field="email" label="Email" type="email" />
              <InputField field="website" label="Website" />
              <InputField field="address" label="Address" />
              <div className="grid grid-cols-2 gap-3"><InputField field="city" label="City" /><InputField field="state" label="State / Region" /></div>
              <InputField field="description" label="Description" />
              <div className="flex justify-end"><Button onClick={() => saveSettings('general')} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}</Button></div>
            </Card>
          )}

          {/* FINANCIAL */}
          {tab === 'financial' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Financial Settings</h3>
              <SelectField field="currency" label="Default Currency" options={CURRENCIES} valueMap={CURRENCIES.map(c => ({ value: c, label: c }))} />
              <SelectField field="fiscal_year_start" label="Fiscal Year Start" options={MONTHS} valueMap={MONTHS.map(m => ({ value: m, label: m }))} />
              <SelectField field="negative_balance_policy" label="Negative Balance Policy" options={['block','warn','allow']} valueMap={[{value:'block',label:'Block transactions'},{value:'warn',label:'Warn only'},{value:'allow',label:'Allow'}]} />
              <SelectField field="fund_override_policy" label="Fund Override Policy" options={['block','warn','allow']} valueMap={[{value:'block',label:'Block overrides'},{value:'warn',label:'Warn only'},{value:'allow',label:'Allow'}]} />
              <SelectField field="budget_override_policy" label="Budget Override Policy" options={['block','warn','allow']} valueMap={[{value:'block',label:'Block overrides'},{value:'warn',label:'Warn only'},{value:'allow',label:'Allow'}]} />
              <div className="flex justify-end"><Button onClick={() => saveSettings('financial')} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save</Button></div>
            </Card>
          )}

          {/* CALENDAR */}
          {tab === 'calendar' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Calendar Settings</h3>
              <SelectField field="preferred_calendar" label="Preferred Calendar" options={['gregorian','ethiopian']} valueMap={[{value:'gregorian',label:'Gregorian'},{value:'ethiopian',label:'Ethiopian'}]} />
              <SelectField field="date_format" label="Date Display Format" options={DATE_FORMATS} valueMap={DATE_FORMATS.map(f => ({ value: f, label: f }))} />
              <Card className="p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Preview (current date)</p>
                <p className="text-sm font-mono">
                  {profile?.preferred_calendar === 'ethiopian' ? 'Meskerem 7, 2017' : new Date().toLocaleDateString()}
                </p>
              </Card>
              <div className="flex justify-end"><Button onClick={() => saveSettings('calendar')} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save</Button></div>
            </Card>
          )}

          {/* TRANSACTION NUMBERING */}
          {tab === 'numbering' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Hash className="w-4 h-4" /> Transaction Numbering</h3>
              <InputField field="income_prefix" label="Income Prefix" placeholder="INC" />
              <InputField field="expense_prefix" label="Expense Prefix" placeholder="EXP" />
              <InputField field="request_prefix" label="Request Prefix" placeholder="REQ" />
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Sequence Length</Label><Input type="number" min={3} max={8} value={profile?.sequence_length || 5} onChange={e => setProfile({ ...profile, sequence_length: parseInt(e.target.value) || 5 })} disabled={!canManage} /></div>
                <SelectField field="year_format" label="Year Format" options={['YYYY','YY']} valueMap={[{value:'YYYY',label:'Full (2026)'},{value:'YY',label:'Short (26)'}]} />
              </div>
              <Card className="p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <p className="text-sm font-mono">
                  {profile?.income_prefix || 'INC'}-{profile?.year_format === 'YY' ? '26' : '2026'}-{'0'.repeat(profile?.sequence_length || 5 - 1)}1
                </p>
              </Card>
              <div className="flex justify-end"><Button onClick={() => saveSettings('numbering')} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save</Button></div>
            </Card>
          )}

          {/* APPROVALS */}
          {tab === 'approvals' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Approval Settings</h3>
              <div className="flex items-center justify-between"><Label>Enable Approval Workflow</Label><Switch checked={profile?.approval_workflow_enabled !== false} onCheckedChange={v => setProfile({ ...profile, approval_workflow_enabled: v })} /></div>
              <div className="flex items-center justify-between"><Label>Prevent Self-Approval</Label><Switch checked={profile?.prevent_self_approval !== false} onCheckedChange={v => setProfile({ ...profile, prevent_self_approval: v })} /></div>
              <div className="flex items-center justify-between"><Label>Require Rejection Reason</Label><Switch checked={profile?.require_rejection_reason !== false} onCheckedChange={v => setProfile({ ...profile, require_rejection_reason: v })} /></div>
              <div className="flex items-center justify-between"><Label>Require Override Reason</Label><Switch checked={profile?.require_override_reason !== false} onCheckedChange={v => setProfile({ ...profile, require_override_reason: v })} /></div>
              <div className="flex justify-end"><Button onClick={() => saveSettings('approvals')} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save</Button></div>
            </Card>
          )}

          {/* RECEIPTS */}
          {tab === 'receipts' && canManage && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Receipt className="w-4 h-4" /> Receipt Settings</h3>
              <div className="flex items-center justify-between"><Label>Receipt Required by Default</Label><Switch checked={profile?.receipt_required_default === true} onCheckedChange={v => setProfile({ ...profile, receipt_required_default: v })} /></div>
              <InputField field="receipt_threshold_amount" label="Receipt Amount Threshold" type="number" placeholder="0" />
              <SelectField field="allowed_attachment_types" label="Allowed Attachment Types" options={FILE_TYPES} valueMap={FILE_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))} />
              <InputField field="max_upload_size_mb" label="Maximum Upload Size (MB)" type="number" placeholder="10" />
              <div className="flex justify-end"><Button onClick={() => saveSettings('receipts')} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save</Button></div>
            </Card>
          )}

          {/* ACCOUNT AND SECURITY */}
          {tab === 'account' && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><KeyRound className="w-4 h-4" /> Account & Security</h3>
              <div className="space-y-4">
                <div><Label>Current Password</Label><Input type="password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} /></div>
                <div><Label>New Password</Label><Input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground mt-1">At least 12 chars: uppercase, lowercase, number, symbol</p>
                </div>
                <div><Label>Confirm Password</Label><Input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })} /></div>
                {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                <Button onClick={handleChangePassword} disabled={pwSaving}>{pwSaving ? 'Changing...' : 'Change Password'}</Button>
              </div>
              <div className="border-t pt-4 mt-4">
                <Button variant="outline" className="text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </Button>
              </div>
            </Card>
          )}

          {/* DATA EXPORT */}
          {tab === 'export' && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Database className="w-4 h-4" /> Data Export</h3>
              <p className="text-sm text-muted-foreground">Export your church data as CSV files. Exports respect your access scope.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => toast({ title: 'CSV export coming soon' })}>Transactions</Button>
                <Button variant="outline" onClick={() => toast({ title: 'CSV export coming soon' })}>Funds</Button>
                <Button variant="outline" onClick={() => toast({ title: 'CSV export coming soon' })}>Budgets</Button>
                <Button variant="outline" onClick={() => toast({ title: 'CSV export coming soon' })}>Users (no passwords)</Button>
                <Button variant="outline" onClick={() => toast({ title: 'CSV export coming soon' })}>Audit Logs</Button>
                <Button variant="outline" onClick={() => toast({ title: 'CSV export coming soon' })}>Reports</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}