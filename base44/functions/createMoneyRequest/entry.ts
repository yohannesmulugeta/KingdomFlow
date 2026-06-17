import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function authorize(user, requiredRoles) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!user.church_role) return { error: 'KingdomFlow role not configured', status: 403 };
  if ((user.status || 'active') !== 'active') return { error: 'Account not active', status: 403 };
  if (user.must_change_password === true) return { error: 'Password change required', status: 403 };
  if (user.church_role === 'auditor') return { error: 'Auditors have read-only access', status: 403 };
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.church_role)) {
    return { error: `Requires: ${requiredRoles.join(', ')}`, status: 403 };
  }
  return null;
}

function checkBranchAccess(user, targetBranchId) {
  if (user.access_scope === 'all_branches') return null;
  if (!user.branch_id) return { error: 'No branch assigned', status: 403 };
  if (targetBranchId && user.branch_id !== targetBranchId) return { error: 'Cannot access other branch records', status: 403 };
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const authError = authorize(user, ['church_admin', 'treasurer', 'department_leader']);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const body = await req.json();

    if (!body.amount || parseFloat(body.amount) <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!body.purpose || !body.branch_id) {
      return Response.json({ error: 'Purpose and branch are required' }, { status: 400 });
    }

    const branchError = checkBranchAccess(user, body.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    // Department leaders use their own branch/department if not specified
    const branchId = body.branch_id || user.branch_id;
    const deptId = body.department_id || user.department_id;

    // Generate request number
    const year = new Date().getFullYear();
    const existing = await base44.asServiceRole.entities.MoneyRequest.filter({
      request_number: { $regex: `^REQ-${year}-` }
    }, '-request_number', 1);

    let seq = 1;
    if (existing.length > 0 && existing[0].request_number) {
      seq = parseInt(existing[0].request_number.split('-')[2], 10) + 1;
    }
    const requestNumber = `REQ-${year}-${String(seq).padStart(5, '0')}`;

    const requestData = {
      request_number: requestNumber,
      requested_by_id: user.id,
      requested_by_name: user.full_name || user.email,
      department_id: deptId || '',
      branch_id: branchId,
      amount: parseFloat(body.amount),
      purpose: body.purpose,
      fund_id: body.fund_id || '',
      category_id: body.category_id || '',
      category_name: body.category_name || '',
      vendor_payee: body.vendor_payee || '',
      date_needed: body.date_needed || new Date().toISOString().split('T')[0],
      status: body.status || 'submitted',
      notes: body.notes || '',
    };

    const created = await base44.asServiceRole.entities.MoneyRequest.create(requestData);

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'money_request_created',
      entity_name: 'MoneyRequest',
      entity_id: created.id,
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: `Money request ${requestNumber} for ${body.amount}: ${body.purpose}`,
      branch_id: branchId,
    });

    return Response.json({ success: true, request: created, request_number: requestNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});