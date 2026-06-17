import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Shared backend authorization helper
function authorize(user, requiredAction, requiredRoles) {
  if (!user) return { error: 'Unauthorized', status: 401 };

  const churchRole = user.church_role;
  if (!churchRole) return { error: 'KingdomFlow role not configured', status: 403 };

  const userStatus = user.status || 'active';
  if (userStatus === 'suspended') return { error: 'Account is suspended', status: 403 };
  if (userStatus === 'pending') return { error: 'Account is pending activation', status: 403 };

  if (user.must_change_password === true) {
    return { error: 'Password change required', status: 403 };
  }

  if (churchRole === 'auditor') {
    return { error: 'Auditors have read-only access', status: 403 };
  }

  if (requiredRoles && !requiredRoles.includes(churchRole)) {
    return { error: `Action requires one of: ${requiredRoles.join(', ')}`, status: 403 };
  }

  const accessScope = user.access_scope || 'assigned_branch';
  if (accessScope === 'assigned_branch' && !user.branch_id) {
    return { error: 'No branch assigned', status: 403 };
  }

  return null; // authorized
}

function checkBranchAccess(user, targetBranchId) {
  if (user.access_scope === 'all_branches') return null;
  if (!user.branch_id) return { error: 'No branch assigned', status: 403 };
  if (targetBranchId && user.branch_id !== targetBranchId) {
    return { error: 'Cannot access records from another branch', status: 403 };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const authError = authorize(user, null, []);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const body = await req.json();

    // Validate required fields
    if (!body.type || !body.date || !body.branch_id) {
      return Response.json({ error: 'Type, date, and branch are required' }, { status: 400 });
    }

    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    if (!['income', 'expense'].includes(body.type)) {
      return Response.json({ error: 'Type must be income or expense' }, { status: 400 });
    }

    // Branch access check
    const branchError = checkBranchAccess(user, body.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    // Department Leader cannot create direct transactions
    if (user.church_role === 'department_leader') {
      return Response.json({ error: 'Department Leaders must submit money requests instead of direct transactions' }, { status: 403 });
    }

    // Treasurer/church_admin can create income/expense
    if (!['church_admin', 'treasurer'].includes(user.church_role)) {
      return Response.json({ error: 'You do not have permission to create transactions' }, { status: 403 });
    }

    // Generate transaction number
    const year = new Date().getFullYear();
    const prefix = body.type === 'income' ? 'INC' : 'EXP';

    // Get max sequence for this type+year using a safe approach
    const existing = await base44.asServiceRole.entities.Transaction.filter({
      transaction_number: { $regex: `^${prefix}-${year}-` }
    }, '-transaction_number', 1);

    let seq = 1;
    if (existing.length > 0 && existing[0].transaction_number) {
      const parts = existing[0].transaction_number.split('-');
      seq = parseInt(parts[2], 10) + 1;
    }
    const transactionNumber = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;

    const transactionData = {
      type: body.type,
      amount,
      date: body.date,
      description: body.description || '',
      branch_id: body.branch_id,
      department_id: body.department_id || '',
      fund_id: body.fund_id || '',
      category_id: body.category_id || '',
      category_name: body.category_name || '',
      payment_method: body.payment_method || 'cash',
      donor_name: body.donor_name || null,
      is_anonymous_donor: body.is_anonymous_donor || false,
      vendor_payee: body.vendor_payee || '',
      ethiopian_date: body.ethiopian_date || null,
      receipt_needed: body.receipt_needed || false,
      notes: body.notes || '',
      transaction_number: transactionNumber,
      status: body.status || 'draft',
      approval_stage: 'none',
    };

    const created = await base44.asServiceRole.entities.Transaction.create(transactionData);

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'transaction_created',
      entity_name: 'Transaction',
      entity_id: created.id,
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: `${body.type} transaction ${transactionNumber} for ${amount}`,
      branch_id: body.branch_id,
      metadata_json: JSON.stringify({
        transaction_number: transactionNumber,
        amount,
        type: body.type,
        status: transactionData.status,
      }),
    });

    return Response.json({ success: true, transaction: created, transaction_number: transactionNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});