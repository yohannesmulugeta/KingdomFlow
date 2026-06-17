import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { transaction_id, reason } = body;

    if (!transaction_id) {
      return Response.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const transaction = await base44.asServiceRole.entities.Transaction.get(transaction_id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Only pending or approved transactions can be voided (not already voided/rejected)
    if (transaction.status === 'voided') {
      return Response.json({ error: 'Transaction is already voided' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      status: 'voided',
      voided_by_id: user.id,
      voided_date: new Date().toISOString(),
      void_reason: reason || ''
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'transaction_voided',
      entity_name: 'Transaction',
      entity_id: transaction_id,
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: `Transaction ${transaction.transaction_number || transaction_id} voided: ${reason || ''}`,
      branch_id: transaction.branch_id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});