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
  if ((user.access_scope || 'assigned_branch') === 'assigned_branch' && !user.branch_id) {
    return { error: 'No branch assigned', status: 403 };
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
    const authError = authorize(user, []);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const body = await req.json();
    const { transaction_id, action, reason } = body;

    if (!transaction_id) return Response.json({ error: 'Transaction ID is required' }, { status: 400 });

    const txn = await base44.asServiceRole.entities.Transaction.get(transaction_id);
    if (!txn) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const branchError = checkBranchAccess(user, txn.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    if (txn.status !== 'pending') {
      return Response.json({ error: `Transaction status must be pending. Current: ${txn.status}` }, { status: 400 });
    }

    // Load approval rules sorted by order
    const rules = await base44.asServiceRole.entities.ApprovalRule.filter({ is_active: true }, 'approval_order', 50);

    const applicableRules = rules.filter(r => {
      if (r.transaction_type !== 'both' && r.transaction_type !== txn.type) return false;
      if (r.min_amount > 0 && txn.amount < r.min_amount) return false;
      if (r.max_amount && txn.amount > r.max_amount) return false;
      if (r.branch_id && r.branch_id !== txn.branch_id) return false;
      return true;
    }).sort((a, b) => (a.approval_order || 0) - (b.approval_order || 0));

    const currentStage = txn.approval_stage || 'none';
    const currentOrder = ROLE_ORDER[currentStage] || 0;

    if (action === 'approve') {
      // Self-approval check
      if (txn.created_by_id === user.id) {
        return Response.json({ error: 'You cannot approve your own transaction' }, { status: 403 });
      }

      // Find next stage
      let nextRule = null;
      for (const rule of applicableRules) {
        const ruleOrder = rule.approval_order || 0;
        if (ruleOrder > currentOrder) {
          nextRule = rule;
          break;
        }
      }

      if (!nextRule && applicableRules.length === 0 && user.church_role === 'church_admin') {
        // No rules configured, church_admin can final-approve
        await base44.asServiceRole.entities.Transaction.update(transaction_id, {
          status: 'approved',
          approval_stage: 'church_admin',
          approved_by_id: user.id,
          approved_date: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.ApprovalHistory.create({
          transaction_id,
          stage: 'church_admin',
          action: 'approved',
          approved_by_id: user.id,
          approved_by_name: user.full_name || user.email,
          approved_date: new Date().toISOString(),
          comment: reason || '',
        });

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'transaction_approved',
          entity_name: 'Transaction', entity_id: transaction_id,
          performed_by_id: user.id, performed_by_name: user.full_name || user.email,
          details: `Transaction ${txn.transaction_number} approved (final by church_admin)`,
          branch_id: txn.branch_id,
          metadata_json: JSON.stringify({ is_final: true, stage: 'church_admin' }),
        });

        return Response.json({ success: true, is_final: true, stage: 'church_admin' });
      }

      if (!nextRule) {
        return Response.json({ error: `Your role (${user.church_role}) is not the next required approver` }, { status: 403 });
      }

      if (nextRule.required_role !== user.church_role) {
        return Response.json({ error: `Next stage requires: ${nextRule.required_role}` }, { status: 403 });
      }

      // Check if this is the final stage
      let isFinal = true;
      for (const rule of applicableRules) {
        if ((rule.approval_order || 0) > (nextRule.approval_order || 0)) {
          isFinal = false;
          break;
        }
      }

      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        approval_stage: nextRule.required_role,
        status: isFinal ? 'approved' : 'pending',
        approved_by_id: user.id,
        approved_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.ApprovalHistory.create({
        transaction_id,
        stage: nextRule.required_role,
        action: 'approved',
        approved_by_id: user.id,
        approved_by_name: user.full_name || user.email,
        approved_date: new Date().toISOString(),
        comment: reason || '',
      });

      await base44.asServiceRole.entities.AuditLog.create({
        action: 'transaction_approved',
        entity_name: 'Transaction', entity_id: transaction_id,
        performed_by_id: user.id, performed_by_name: user.full_name || user.email,
        details: `Transaction ${txn.transaction_number} approved by ${user.church_role}${isFinal ? ' (final)' : ''}`,
        branch_id: txn.branch_id,
        metadata_json: JSON.stringify({ is_final: isFinal, stage: nextRule.required_role }),
      });

      return Response.json({ success: true, is_final: isFinal, stage: nextRule.required_role, status: isFinal ? 'approved' : 'pending' });
    }

    if (action === 'reject') {
      if (!reason || reason.trim() === '') {
        return Response.json({ error: 'Rejection reason is required' }, { status: 400 });
      }

      if (txn.created_by_id === user.id) {
        return Response.json({ error: 'You cannot reject your own transaction' }, { status: 403 });
      }

      // Find the next approver that matches current user
      let matchedRule = null;
      for (const rule of applicableRules) {
        if ((rule.approval_order || 0) > currentOrder && rule.required_role === user.church_role) {
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule && user.church_role !== 'church_admin') {
        return Response.json({ error: `Your role (${user.church_role}) is not the current required approver` }, { status: 403 });
      }

      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        status: 'rejected',
        rejection_reason: reason,
        approved_by_id: user.id,
        approved_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.ApprovalHistory.create({
        transaction_id,
        stage: user.church_role,
        action: 'rejected',
        approved_by_id: user.id,
        approved_by_name: user.full_name || user.email,
        approved_date: new Date().toISOString(),
        comment: reason,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        action: 'transaction_rejected',
        entity_name: 'Transaction', entity_id: transaction_id,
        performed_by_id: user.id, performed_by_name: user.full_name || user.email,
        details: `Transaction ${txn.transaction_number} rejected by ${user.church_role}: ${reason}`,
        branch_id: txn.branch_id,
      });

      return Response.json({ success: true, status: 'rejected' });
    }

    return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});