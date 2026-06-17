import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { KeyRound, ArrowRight } from 'lucide-react';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { userId, refresh, mustChangePassword } = useCurrentUser();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (pw) => {
    if (pw.length < 12) return 'Password must be at least 12 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain at least one symbol';
    if (pw === 'password') return 'This password is not allowed. Please choose a different one.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword) { setError('Current password is required'); return; }

    const pwError = validatePassword(form.newPassword);
    if (pwError) { setError(pwError); return; }

    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('changePassword', {
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        toast({ title: 'Password changed', description: 'Your password has been updated.' });
        await refresh();
        navigate('/');
      }
    } catch {
      setError('Failed to change password. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Change Password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mustChangePassword
              ? 'Your temporary password must be changed before continuing.'
              : 'Enter your current and new password.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} placeholder="Enter current password" autoFocus />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Enter new password" />
            <p className="text-[11px] text-muted-foreground mt-1">At least 12 characters: uppercase, lowercase, number, and symbol</p>
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm new password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Changing...' : <>Change Password <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
}