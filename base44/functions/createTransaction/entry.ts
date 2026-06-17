import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function checkPermission(churchRole, action) {
  const permissions = {
    church_admin: { canRecord: true, canApprove: true, canVoid: true, canManageUsers: true },
    pastor: { canRecord: false, canApprove: true, canVoid: false, canManageUsers: false },
    treasurer: { canRecord: true, canApprove: true, canVoid: false, canManageUsers: false },
    department_leader: { canRecord: false, canApprove: true, canVoid: false, canManageUsers: false },
    auditor: { canRecord: false, canApprove: false, canVoid: false, canManageUsers: false },
  };
  const rolePerms = permissions[churchRole] || { canRecord: false, canApprove: false, canVoid: false };
  return !!rolePerms[action];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const churchRole = user.church_role;
    if (!churchRole) return Response.json({ error: 'KingdomFlow role not configured' }, { status: 403 });

    // Auditor: read-only — block all writes
    if (churchRole === 'auditor') {
      return Response.json({ error: 'Auditors have read-only access' }, { status: 403 });
    }

    if (!checkPermission(churchRole, 'canRecord')) {
      return Response.json({ error: 'You do not have permission to create transactions' }, { status: 403 });
    }

    const body = await req.json();

    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    if (!body.type || !body.date || !body.branch_id) {
      return Response.json({ error: 'Type, date, and branch are required' }, { status: 400 });
    }

    // Department Leader: can only create money requests, not direct transactions
    if (churchRole === 'department_leader') {
      return Response.json({ error: 'Department Leaders submit money requests instead of direct transactions' }, { status: 403 });
    }

    // Branch check: assigned_branch users can only record for their branch
    if (user.access_scope === 'assigned_branch' && user.branch_id && body.branch_id !== user.branch_id) {
      return Response.json({ error: 'You can only record transactions for your assigned branch' }, { status: 403 });
    }

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