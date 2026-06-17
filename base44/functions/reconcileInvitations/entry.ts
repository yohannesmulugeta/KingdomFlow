import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Scheduled reconciliation function — runs every 5 minutes.
 * Matches PendingInvitation records to newly created User records
 * and applies church_role, access_scope, branch_id, department_id.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all pending invitations
    const pendingInvites = await base44.asServiceRole.entities.PendingInvitation.filter({
      status: 'pending',
    }, undefined, 100);

    if (pendingInvites.length === 0) {
      return Response.json({ reconciled: 0, message: 'No pending invitations' });
    }

    let reconciled = 0;

    for (const invite of pendingInvites) {
      // Find matching user by normalized email
      const matchingUsers = await base44.asServiceRole.entities.User.filter({
        email: invite.email,
      });

      if (matchingUsers.length === 0) continue;

      const user = matchingUsers[0];

      // Skip if user already has a church_role set
      if (user.church_role) continue;

      // Apply church role and access from invitation
      await base44.asServiceRole.entities.User.update(user.id, {
        church_role: invite.church_role,
        access_scope: invite.access_scope,
        branch_id: invite.branch_id || '',
        department_id: invite.department_id || '',
        status: 'active',
        must_change_password: invite.church_role === 'church_admin',
      });

      // Mark invitation as accepted
      await base44.asServiceRole.entities.PendingInvitation.update(invite.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

      // Create audit log
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'user_accepted_invitation',
        entity_name: 'User',
        entity_id: user.id,
        performed_by_id: user.id,
        performed_by_name: user.full_name || user.email,
        details: `Accepted invitation with church role: ${invite.church_role}`,
        metadata_json: JSON.stringify({
          church_role: invite.church_role,
          access_scope: invite.access_scope,
        }),
      });

      reconciled++;
    }

    return Response.json({ reconciled, message: `Reconciled ${reconciled} user(s)` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});