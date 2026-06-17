import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Validate amount
    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    // Validate required fields
    if (!body.type || !body.date || !body.branch_id) {
      return Response.json({ error: 'Type, date, and branch are required' }, { status: 400 });
    }

    // Generate transaction number
    const year = new Date().getFullYear();
    const prefix = body.type === 'income' ? 'INC' : 'EXP';
    const existing = await base44.asServiceRole.entities.Transaction.filter({
      type: body.type,
      transaction_number: { $regex: `^${prefix}-${year}-` }
    }, '-transaction_number', 1);

    let seq = 1;
    if (existing.length > 0 && existing[0].transaction_number) {
      const parts = existing[0].transaction_number.split('-');
      seq = parseInt(parts[2]) + 1;
    }
    const transactionNumber = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;

    const transactionData = {
      ...body,
      transaction_number: transactionNumber,
      amount,
      status: 'pending',
      created_by_id: user.id,
    };

    const created = await base44.asServiceRole.entities.Transaction.create(transactionData);

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'transaction_created',
      entity_name: 'Transaction',
      entity_id: created.id,
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: `${body.type} transaction ${transactionNumber} for ${amount} created`,
      branch_id: body.branch_id,
      metadata_json: JSON.stringify({ transaction_number: transactionNumber, amount, type: body.type })
    });

    return Response.json({ success: true, transaction: created, transaction_number: transactionNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});