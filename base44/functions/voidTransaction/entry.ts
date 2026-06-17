import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Backend auth helper
function authorize(user, requiredRoles) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const churchRole = user.church_role;
  if (!churchRole) return { error: 'KingdomFlow role not configured', status: 403 };
  if ((user.status || 'active') !== 'active') return { error: 'Account is not active', status: 403 };
  if (user.must_change_password === true) return { error: 'Password change required', status: 403 };
  if (churchRole === 'auditor') return { error: 'Auditors have read-only access', status: 403 };
  if (requiredRoles.length > 0 && !requiredRoles.includes(churchRole)) {
    return { error: `Action requires one of: ${requiredRoles.join(', ')}`, status: 403 };
  }
  const accessScope = user.access_scope || 'assigned_branch';
  if (accessScope === 'assigned_branch' && !user.branch_id) return { error: 'No branch assigned', status: 403 };
  return null;
}

function checkBranchAccess(user, targetBranchId) {
  if (user.access_scope === 'all_branches') return null;
  if (!user.branch_id) return { error: 'No branch assigned', status: 403 };
  if (targetBranchId && user.branch_id !== targetBranchId) {
    return { error: 'Cannot access records from another branch', status: 403 };
  }
  return null;
}

const VALID_TRANSITIONS = {
  draft: ['pending'],
  pending: ['approved', 'rejected', 'voided'],
  approved: ['paid', 'voided', 'archived'],
  paid: ['receipt_needed', 'completed', 'voided'],
  receipt_needed: ['completed', 'voided'],
  completed: ['voided', 'archived'],
  rejected: ['draft'],
  voided: [],
  archived: [],
};

const ALLOWED_EDIT_STATUSES = ['draft', 'pending'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const authError = authorize(user, ['church_admin', 'treasurer']);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const body = await req.json();
    const { transaction_id, action, reason, new_amount, previous_values } = body;

    if (!transaction_id) {
      return Response.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const txn = await base44.asServiceRole.entities.Transaction.get(transaction_id);
    if (!txn) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Branch check
    const branchError = checkBranchAccess(user, txn.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    switch (action) {
      case 'void': {
        if (!reason || reason.trim() === '') {
          return Response.json({ error: 'Void reason is required' }, { status: 400 });
        }
        if (!VALID_TRANSITIONS[txn.status]?.includes('voided')) {
          return Response.json({ error: `Cannot void a transaction with status: ${txn.status}` }, { status: 400 });
        }

        await base44.asServiceRole.entities.Transaction.update(transaction_id, {
          status: 'voided',
          voided_by_id: user.id,
          voided_date: new Date().toISOString(),
          void_reason: reason,
        });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'transaction_voided',
          entity_name: 'Transaction',
          entity_id: transaction_id,
          performed_by_id: user.id,
          performed_by_name: user.full_name || user.email,
          details: `Transaction ${txn.transaction_number} voided: ${reason}`,
          branch_id: txn.branch_id,
          metadata_json: JSON.stringify({ previous_status: txn.status }),
        });

        return Response.json({ success: true, status: 'voided' });
      }

      case 'amend': {
        if (!ALLOWED_EDIT_STATUSES.includes(txn.status)) {
          return Response.json({ error: `Only draft or pending transactions can be amended. Current: ${txn.status}` }, { status: 400 });
        }
        if (!reason || reason.trim() === '') {
          return Response.json({ error: 'Amendment reason is required' }, { status: 400 });
        }

        const updates = {};
        if (body.description !== undefined) updates.description = body.description;
        if (body.category_id !== undefined) updates.category_id = body.category_id;
        if (body.fund_id !== undefined) updates.fund_id = body.fund_id;
        if (body.payment_method !== undefined) updates.payment_method = body.payment_method;
        if (body.donor_name !== undefined) updates.donor_name = body.donor_name;
        if (body.vendor_payee !== undefined) updates.vendor_payee = body.vendor_payee;

        if (new_amount !== undefined && new_amount !== null) {
          if (parseFloat(new_amount) <= 0) {
            return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
          }
          updates.amount = parseFloat(new_amount);
          updates.status = 'draft'; // Reset to draft on amount change
        }

        await base44.asServiceRole.entities.Transaction.update(transaction_id, updates);

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'transaction_amended',
          entity_name: 'Transaction',
          entity_id: transaction_id,
          performed_by_id: user.id,
          performed_by_name: user.full_name || user.email,
          details: `Transaction ${txn.transaction_number} amended: ${reason}`,
          branch_id: txn.branch_id,
          metadata_json: JSON.stringify({ previous: previous_values, updates }),
        });

        return Response.json({ success: true });
      }

      case 'submit': {
        if (txn.status !== 'draft') {
          return Response.json({ error: 'Only draft transactions can be submitted' }, { status: 400 });
        }
        await base44.asServiceRole.entities.Transaction.update(transaction_id, { status: 'pending' });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'transaction_submitted',
          entity_name: 'Transaction',
          entity_id: transaction_id,
          performed_by_id: user.id,
          performed_by_name: user.full_name || user.email,
          details: `Transaction ${txn.transaction_number} submitted for approval`,
          branch_id: txn.branch_id,
        });

        return Response.json({ success: true, status: 'pending' });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});