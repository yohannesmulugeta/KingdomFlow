import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ROLE_ORDER = { department_leader: 1, treasurer: 2, pastor: 3, church_admin: 4 };

function roleToOrder(role) {
  return ROLE_ORDER[role] || 0;
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

    const canApprove = ['church_admin', 'pastor', 'treasurer', 'department_leader'].includes(churchRole);
    if (!canApprove) {
      return Response.json({ error: 'You do not have approval privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { transaction_id, action, reason } = body;

    const transaction = await base44.asServiceRole.entities.Transaction.get(transaction_id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    if (transaction.created_by_id === user.id) {
      return Response.json({ error: 'You cannot approve your own transaction' }, { status: 403 });
    }

    const rules = await base44.asServiceRole.entities.ApprovalRule.filter({
      is_active: true,
      transaction_type: { $in: [transaction.type, 'both'] }
    }, 'approval_order', 20);

    const applicableRules = rules.filter(r => {
      if (r.min_amount > 0 && transaction.amount < r.min_amount) return false;
      if (r.max_amount && transaction.amount > r.max_amount) return false;
      if (r.branch_id && r.branch_id !== transaction.branch_id) return false;
      return true;
    }).sort((a, b) => (a.approval_order || 0) - (b.approval_order || 0));

    const currentStage = transaction.approval_stage || 'none';

    if (action === 'approve') {
      let foundNextStage = false;
      let nextStageLabel = null;

      for (const rule of applicableRules) {
        const ruleOrder = roleToOrder(rule.required_role);
        if (currentStage === 'none' || ruleOrder > roleToOrder(currentStage)) {
          if (rule.required_role === churchRole) {
            foundNextStage = true;
            nextStageLabel = rule.required_role;
          }
          break;
        }
      }

      if (!foundNextStage && applicableRules.length === 0 && churchRole === 'church_admin') {
        foundNextStage = true;
        nextStageLabel = 'church_admin';
      }

      if (!foundNextStage) {
        return Response.json({
          error: `Your church role (${churchRole}) is not the current required approver.`
        }, { status: 403 });
      }

      let isFinalStage = true;
      for (const rule of applicableRules) {
        if (roleToOrder(rule.required_role) > roleToOrder(nextStageLabel)) {
          isFinalStage = false;
          break;
        }
      }

      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        approval_stage: nextStageLabel,
        status: isFinalStage ? 'approved' : 'pending',
        approved_by_id: user.id,
        approved_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.ApprovalHistory.create({
        transaction_id,
        stage: nextStageLabel,
        action: 'approved',
        approved_by_id: user.id,
        approved_by_name: user.full_name || user.email,
        approved_date: new Date().toISOString(),
        comment: reason || ''
      });

      await base44.asServiceRole.entities.AuditLog.create({
        action: 'transaction_approved',
        entity_name: 'Transaction',
        entity_id: transaction_id,
        performed_by_id: user.id,
        performed_by_name: user.full_name || user.email,
        details: `Transaction ${transaction.transaction_number || transaction_id} approved by ${churchRole}${isFinalStage ? ' (final)' : ' (stage ' + nextStageLabel + ')'}`,
        branch_id: transaction.branch_id,
        metadata_json: JSON.stringify({ is_final: isFinalStage, stage: nextStageLabel })
      });

      return Response.json({
        success: true,
        is_final: isFinalStage,
        stage: nextStageLabel,
        status: isFinalStage ? 'approved' : 'pending'
      });
    }

    if (action === 'reject') {
      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        status: 'rejected',
        rejection_reason: reason || '',
        approved_by_id: user.id,
        approved_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.ApprovalHistory.create({
        transaction_id,
        stage: churchRole,
        action: 'rejected',
        approved_by_id: user.id,
        approved_by_name: user.full_name || user.email,
        approved_date: new Date().toISOString(),
        comment: reason || ''
      });

      await base44.asServiceRole.entities.AuditLog.create({
        action: 'transaction_rejected',
        entity_name: 'Transaction',
        entity_id: transaction_id,
        performed_by_id: user.id,
        performed_by_name: user.full_name || user.email,
        details: `Transaction ${transaction.transaction_number || transaction_id} rejected by ${churchRole}: ${reason || ''}`,
        branch_id: transaction.branch_id,
      });

      return Response.json({ success: true, status: 'rejected' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});