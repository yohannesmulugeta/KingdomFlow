import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Church, ArrowRight, Mail, Key, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEMO_EMAIL = 'demo@kingdomflow.com';
const DEMO_PASSWORD = 'password';

export default function DemoLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);

  const handleFillCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
    setNeedsSetup(false);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setNeedsSetup(false);
    setLoading(true);

    try {
      // Call backend to validate + seed data + prepare demo account
      const res = await base44.functions.invoke('demoLogin', { email, password });

      if (res.data?.needs_setup) {
        setError(res.data.error);
        setNeedsSetup(true);
        setLoading(false);
        return;
      }

      if (res.data?.error) {
        setError(res.data.error);
        setLoading(false);
        return;
      }

      // Login with demo credentials
      await base44.auth.loginViaEmailPassword(DEMO_EMAIL, DEMO_PASSWORD);
      localStorage.setItem('kingdomflow_demo_mode', 'true');
      window.location.href = '/';
    } catch (err) {
      const msg = err?.message || 'Login failed';

      if (msg.includes('not found') || msg.includes('invalid') || msg.includes('credentials')) {
        setError(
          'The demo account has not been created yet. ' +
          'An invitation was sent to demo@kingdomflow.com. ' +
          'Please accept the invitation in the Base44 Authentication dashboard, then try again.'
        );
        setNeedsSetup(true);
      } else {
        setError(msg);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Church className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold">KingdomFlow Demo</h1>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            Explore how your church can manage income, expenses, funds, requests, approvals, and reports.
          </p>
        </div>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-center font-heading">Demo Login</CardTitle>
            <CardDescription className="text-center">
              This is a demonstration account containing fake data only.
              <br />Do not use this password in production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credentials display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Demo Email:</span>
                <span className="font-mono font-semibold text-sm">{DEMO_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Demo Password:</span>
                <span className="font-mono font-semibold text-sm">{DEMO_PASSWORD}</span>
              </div>
            </div>

            {error && (
              <div className={`text-sm rounded-lg p-3 ${needsSetup ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            {/* Fill Demo Credentials button */}
            <Button
              onClick={handleFillCredentials}
              variant="outline"
              className="w-full"
              type="button"
            >
              Fill Demo Credentials
            </Button>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="demo-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="demo-email"
                    type="email"
                    autoComplete="email"
                    placeholder={DEMO_EMAIL}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-password">Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="demo-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={DEMO_PASSWORD}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Log in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            Demo Mode — Sample data only. Not connected to any real church.
          </p>
          <Link to="/login" className="text-xs text-primary hover:underline">
            Go to production login
          </Link>
        </div>
      </div>
    </div>
  );
}