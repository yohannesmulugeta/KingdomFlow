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

const ROLE_ORDER = { department_leader: 1, treasurer: 2, pastor: 3, church_admin: 4 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const authError = authorize(user, ['church_admin', 'pastor', 'treasurer', 'department_leader']);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const body = await req.json();
    const { request_id, action, reason, partial_amount } = body;

    if (!request_id) return Response.json({ error: 'Request ID is required' }, { status: 400 });

    const moneyReq = await base44.asServiceRole.entities.MoneyRequest.get(request_id);
    if (!moneyReq) return Response.json({ error: 'Money request not found' }, { status: 404 });

    const branchError = checkBranchAccess(user, moneyReq.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    // Self-action prevention
    if (moneyReq.requested_by_id === user.id && action !== 'submit' && action !== 'cancel') {
      return Response.json({ error: 'You cannot approve or reject your own request' }, { status: 403 });
    }

    switch (action) {
      case 'submit': {
        if (moneyReq.status !== 'draft') {
          return Response.json({ error: 'Only draft requests can be submitted' }, { status: 400 });
        }
        await base44.asServiceRole.entities.MoneyRequest.update(request_id, { status: 'submitted' });
        await base44.asServiceRole.entities.AuditLog.create({
          action: 'money_request_submitted', entity_name: 'MoneyRequest', entity_id: request_id,
          performed_by_id: user.id, performed_by_name: user.full_name || user.email,
          details: `Request ${moneyReq.request_number} submitted`, branch_id: moneyReq.branch_id,
        });
        return Response.json({ success: true, status: 'submitted' });
      }

      case 'approve': {
        if (!['submitted', 'pending_approval'].includes(moneyReq.status)) {
          return Response.json({ error: `Cannot approve request with status: ${moneyReq.status}` }, { status: 400 });
        }

        // Load approval rules
        const rules = await base44.asServiceRole.entities.ApprovalRule.filter({ is_active: true, transaction_type: { $in: ['expense', 'both'] } }, 'approval_order', 50);
        const applicable = rules.filter(r => {
          if (r.min_amount > 0 && moneyReq.amount < r.min_amount) return false;
          if (r.max_amount && moneyReq.amount > r.max_amount) return false;
          return true;
        }).sort((a, b) => (a.approval_order || 0) - (b.approval_order || 0));

        // If no rules and church_admin, approve directly
        if (applicable.length === 0 && user.church_role === 'church_admin') {
          await base44.asServiceRole.entities.MoneyRequest.update(request_id, {
            status: 'approved', approved_by_id: user.id, approved_date: new Date().toISOString(),
          });
          await base44.asServiceRole.entities.ApprovalHistory.create({
            money_request_id: request_id, stage: 'church_admin', action: 'approved',
            approved_by_id: user.id, approved_by_name: user.full_name || user.email,
            approved_date: new Date().toISOString(), comment: reason || '',
          });
          return Response.json({ success: true, status: 'approved' });
        }

        // Find matching rule for current user's role
        const currentStage = moneyReq.status === 'submitted' ? 'none' : moneyReq.approval_stage || 'none';
        const currentOrder = { none: 0, department_leader: 1, treasurer: 2, pastor: 3, church_admin: 4 }[currentStage] || 0;

        let matched = null;
        for (const rule of applicable) {
          if ((rule.approval_order || 0) > currentOrder && rule.required_role === user.church_role) {
            matched = rule;
            break;
          }
        }

        if (!matched) {
          return Response.json({ error: `Your role is not the next required approver for this request` }, { status: 403 });
        }

        const isFinal = !applicable.some(r => (r.approval_order || 0) > (matched.approval_order || 0));

        await base44.asServiceRole.entities.MoneyRequest.update(request_id, {
          status: isFinal ? 'approved' : 'pending_approval',
          approved_by_id: user.id,
          approved_date: new Date().toISOString(),
          approval_stage: matched.required_role,
        });

        await base44.asServiceRole.entities.ApprovalHistory.create({
          money_request_id: request_id, stage: matched.required_role, action: 'approved',
          approved_by_id: user.id, approved_by_name: user.full_name || user.email,
          approved_date: new Date().toISOString(), comment: reason || '',
        });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'money_request_approved', entity_name: 'MoneyRequest', entity_id: request_id,
          performed_by_id: user.id, performed_by_name: user.full_name || user.email,
          details: `Request ${moneyReq.request_number} approved by ${user.church_role}${isFinal ? ' (final)' : ''}`,
          branch_id: moneyReq.branch_id,
          metadata_json: JSON.stringify({ is_final: isFinal, stage: matched.required_role }),
        });

        return Response.json({ success: true, status: isFinal ? 'approved' : 'pending_approval', is_final: isFinal });
      }

      case 'reject': {
        if (!reason || reason.trim() === '') {
          return Response.json({ error: 'Rejection reason is required' }, { status: 400 });
        }
        if (!['submitted', 'pending_approval'].includes(moneyReq.status)) {
          return Response.json({ error: `Cannot reject request with status: ${moneyReq.status}` }, { status: 400 });
        }

        await base44.asServiceRole.entities.MoneyRequest.update(request_id, {
          status: 'rejected', rejection_reason: reason,
          approved_by_id: user.id, approved_date: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.ApprovalHistory.create({
          money_request_id: request_id, stage: user.church_role, action: 'rejected',
          approved_by_id: user.id, approved_by_name: user.full_name || user.email,
          approved_date: new Date().toISOString(), comment: reason,
        });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'money_request_rejected', entity_name: 'MoneyRequest', entity_id: request_id,
          performed_by_id: user.id, performed_by_name: user.full_name || user.email,
          details: `Request ${moneyReq.request_number} rejected: ${reason}`, branch_id: moneyReq.branch_id,
        });

        return Response.json({ success: true, status: 'rejected' });
      }

      case 'cancel': {
        if (!['draft', 'submitted'].includes(moneyReq.status)) {
          return Response.json({ error: `Cannot cancel request with status: ${moneyReq.status}` }, { status: 400 });
        }
        if (moneyReq.requested_by_id !== user.id && user.church_role !== 'church_admin') {
          return Response.json({ error: 'Only the requester or Church Admin can cancel' }, { status: 403 });
        }

        await base44.asServiceRole.entities.MoneyRequest.update(request_id, { status: 'cancelled' });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'money_request_cancelled', entity_name: 'MoneyRequest', entity_id: request_id,
          performed_by_id: user.id, performed_by_name: user.full_name || user.email,
          details: `Request ${moneyReq.request_number} cancelled`, branch_id: moneyReq.branch_id,
        });

        return Response.json({ success: true, status: 'cancelled' });
      }

      case 'convert': {
        if (!['church_admin', 'treasurer'].includes(user.church_role)) {
          return Response.json({ error: 'Only Church Admin or Treasurer can convert requests' }, { status: 403 });
        }
        if (moneyReq.status !== 'approved') {
          return Response.json({ error: 'Only approved requests can be converted' }, { status: 400 });
        }

        // Check for duplicate conversion
        const existing = await base44.asServiceRole.entities.Transaction.filter({ money_request_id: request_id });
        if (existing.length > 0) {
          return Response.json({ error: 'This request has already been converted to an expense' }, { status: 400 });
        }

        // Generate expense number
        const year = new Date().getFullYear();
        const existingTxns = await base44.asServiceRole.entities.Transaction.filter({
          transaction_number: { $regex: `^EXP-${year}-` }
        }, '-transaction_number', 1);

        let seq = 1;
        if (existingTxns.length > 0 && existingTxns[0].transaction_number) {
          seq = parseInt(existingTxns[0].transaction_number.split('-')[2], 10) + 1;
        }
        const expenseNumber = `EXP-${year}-${String(seq).padStart(5, '0')}`;

        const expense = await base44.asServiceRole.entities.Transaction.create({
          transaction_number: expenseNumber,
          type: 'expense',
          amount: partial_amount || moneyReq.amount,
          date: new Date().toISOString().split('T')[0],
          description: moneyReq.purpose,
          branch_id: moneyReq.branch_id,
          department_id: moneyReq.department_id,
          fund_id: moneyReq.fund_id,
          category_id: moneyReq.category_id,
          category_name: moneyReq.category_name,
          vendor_payee: moneyReq.vendor_payee,
          status: 'pending',
          approval_stage: 'none',
          money_request_id: request_id,
          notes: moneyReq.notes || '',
        });

        // Create an amendment audit entry showing original request amount vs expense
        if (partial_amount && partial_amount !== moneyReq.amount) {
          const note = `Partially approved: requested ${moneyReq.amount}, approved ${partial_amount}`;
          await base44.asServiceRole.entities.AuditLog.create({
            action: 'expense_overridden',
            entity_name: 'Transaction',
            entity_id: expense.id,
            performed_by_id: user.id,
            performed_by_name: user.full_name || user.email,
            details: `Expense ${expenseNumber} created from request ${moneyReq.request_number}: ${note}`,
            branch_id: moneyReq.branch_id,
            metadata_json: JSON.stringify({ requested: moneyReq.amount, approved: partial_amount }),
          });
        }

        await base44.asServiceRole.entities.MoneyRequest.update(request_id, { status: 'fulfilled' });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'request_converted_to_expense', entity_name: 'MoneyRequest', entity_id: request_id,
          performed_by_id: user.id, performed_by_name: user.full_name || user.email,
          details: `Request ${moneyReq.request_number} converted to expense ${expenseNumber}`,
          branch_id: moneyReq.branch_id,
          metadata_json: JSON.stringify({ expense_id: expense.id, expense_number: expenseNumber }),
        });

        return Response.json({ success: true, expense, expense_number: expenseNumber });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});