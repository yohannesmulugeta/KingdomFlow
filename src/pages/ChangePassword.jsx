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
  const { userId, refresh } = useCurrentUser();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.newPassword) { setError('New password is required'); return; }
    if (form.newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('changePassword', { new_password: form.newPassword });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        toast({ title: 'Password changed', description: 'Your password has been updated.' });
        navigate('/');
        refresh();
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
            Your temporary password must be changed before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Enter new password" />
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