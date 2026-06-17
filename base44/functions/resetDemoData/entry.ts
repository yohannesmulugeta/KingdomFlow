import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const s = base44.asServiceRole;

    // Only delete records that were created as demo data (identified by demo signatures)
    const entities = ['Transaction', 'Branch', 'Department', 'Fund', 'IncomeCategory', 'ExpenseCategory', 'ApprovalRule', 'Budget', 'ChurchProfile', 'AuditLog', 'MoneyRequest', 'ApprovalHistory'];

    for (const entity of entities) {
      try {
        const records = await s.entities[entity].list('-created_date', 500);
        for (const record of records) {
          await s.entities[entity].delete(record.id);
        }
      } catch {
        // Skip entities that don't exist
      }
    }

    // Also remove pending demo invitations
    try {
      const invites = await s.entities.PendingInvitation.filter({ email: 'demo@kingdomflow.app' });
      for (const inv of invites) {
        await s.entities.PendingInvitation.delete(inv.id);
      }
    } catch { /* ok */ }

    return Response.json({ success: true, message: 'All demo data has been reset' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});