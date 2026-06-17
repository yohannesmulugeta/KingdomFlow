import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Church, ArrowRight, Key, User, Sparkles } from 'lucide-react';

export default function DemoLogin() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const handleEnterDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setError('Please log in first as a church admin, then try the demo.');
        setLoading(false);
        return;
      }
      // Seed demo data
      const res = await base44.functions.invoke('seedDemoData', {});
      if (res.data?.error) {
        if (res.data.status === 'exists') {
          setStatus('Demo data already exists. Entering demo mode...');
          localStorage.setItem('kingdomflow_demo_mode', 'true');
          setTimeout(() => { window.location.href = '/'; }, 800);
        } else {
          setError(res.data.error);
        }
      } else {
        setStatus('Demo ready! Entering...');
        localStorage.setItem('kingdomflow_demo_mode', 'true');
        setTimeout(() => { window.location.href = '/'; }, 1000);
      }
    } catch (e) {
      setError('Failed to set up demo. Please try again.');
      setStatus('Please log in as a church admin, then click "Enter Demo".');
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
          <p className="text-muted-foreground mt-1">Experience church financial management</p>
        </div>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-center font-heading">Try the Demo</CardTitle>
            <CardDescription className="text-center">
              Explore KingdomFlow with pre-loaded sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Credentials display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Demo Credentials</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Username:</span>
                <span className="font-mono font-semibold">demo@kingdomflow.app</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Password:</span>
                <span className="font-mono font-semibold">KingdomFlow1!</span>
              </div>
            </div>

            {status && (
              <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-3 text-center">
                <Sparkles className="w-4 h-4 inline mr-1" />
                {status}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <Button
              onClick={handleEnterDemo}
              disabled={loading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {loading ? 'Setting up demo...' : 'Enter Demo'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Log in with the demo credentials above, then click Enter Demo to load sample data.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Demo Mode — This application contains sample data only.
        </p>
      </div>
    </div>
  );
}