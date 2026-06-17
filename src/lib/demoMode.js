export function isDemoMode() {
  return localStorage.getItem('kingdomflow_demo_mode') === 'true';
}

export function getDemoMode() {
  return {
    isDemo: isDemoMode(),
    resetDemoData: async () => {
      try {
        const { base44 } = await import('@/api/base44Client');
        await base44.functions.invoke('resetDemoData', {});
        localStorage.removeItem('kingdomflow_demo_mode');
        localStorage.removeItem('kingdomflow_demo_steps');
        window.location.href = '/demo-login';
      } catch (e) {
        console.error('Reset failed:', e);
      }
    },
    exitDemo: () => {
      localStorage.removeItem('kingdomflow_demo_mode');
      localStorage.removeItem('kingdomflow_demo_steps');
      window.location.reload();
    },
  };
}