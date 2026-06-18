import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Church, ArrowRight, Key, User, Sparkles, Loader2, LogIn } from 'lucide-react';
export default function DemoLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      // Step 1: Validate demo credentials via backend
      const res = await base44.functions.invoke('demoLogin', { username, password });

      if (res.data?.error) {
        setError(res.data.error);
        setLoading(false);
        return;
      }

      if (!res.data?.success) {
        setError('Demo authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Authenticate with internal demo account
      setStatus('Signing in to demo...');

      try {
        await base44.auth.loginViaEmailPassword(res.data.demo_email, res.data.demo_password);
        localStorage.setItem('kingdomflow_demo_mode', 'true');
        window.location.href = '/';
      } catch (authErr) {
        const msg = authErr.message || 'Authentication failed';
        if (msg.includes('not found') || msg.includes('invalid') || msg.includes('credentials')) {
          setError(
            'Demo account not yet set up. A church administrator must first accept the demo invitation sent to ' +
              res.data.demo_email +
              '. Once the account is created, demo login will work.'
          );
        } else {
          setError(msg);
        }
      }
    } catch {
      setError('Unable to connect to demo server. Please try again.');
    }

    setLoading(false);
  };

  const handleEnterDemo = () => {
    setUsername('admin');
    setPassword('password');
    // Submit after a tick so state updates
    setTimeout(() => {
      handleLogin();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Church className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold">KingdomFlow Demo</h1>
          <p className="text-muted-foreground mt-1">Experience church financial management</p>
        </div>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-center font-heading">Try the Demo</CardTitle>
            <CardDescription className="text-center">
              Explore KingdomFlow with pre-loaded sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credentials display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Demo Credentials</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Username:</span>
                <span className="font-mono font-semibold">admin</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Password:</span>
                <span className="font-mono font-semibold">password</span>
              </div>
            </div>

            {status && (
              <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-3 text-center">
                <Sparkles className="w-4 h-4 inline mr-1" />
                {status}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Quick Enter Demo button */}
            <Button
              onClick={handleEnterDemo}
              disabled={loading}
              variant="default"
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Entering Demo...
                </>
              ) : (
                <>
                  Enter Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or sign in manually</span>
              </div>
            </div>

            {/* Manual login form */}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="demo-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="demo-username"
                    type="text"
                    autoComplete="username"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !username || !password}
                variant="outline"
                className="w-full h-11"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Demo Mode — Sample data only. Not connected to any real church.
        </p>
      </div>
    </div>
  );
}