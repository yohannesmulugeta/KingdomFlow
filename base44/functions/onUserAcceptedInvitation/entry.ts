import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is triggered by entity automation when a new user record is created
    // (i.e., user accepted invitation)
    const body = await req.json();
    const { event, data } = body;

    // Only process create events
    if (event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    const newUser = data;
    if (!newUser?.email) {
      return Response.json({ skipped: true, reason: 'no email' });
    }

    const normalizedEmail = newUser.email.toLowerCase().trim();

    // Find matching pending invitation
    const pendingInvites = await base44.asServiceRole.entities.PendingInvitation.filter({
      email: normalizedEmail,
      status: 'pending',
    });

    if (pendingInvites.length === 0) {
      return Response.json({ skipped: true, reason: 'no pending invitation found' });
    }

    const invite = pendingInvites[0];

    // Apply church role and access from invitation
    await base44.asServiceRole.entities.User.update(newUser.id, {
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
      entity_id: newUser.id,
      performed_by_id: newUser.id,
      performed_by_name: newUser.full_name || newUser.email,
      details: `Accepted invitation with church role: ${invite.church_role}`,
      metadata_json: JSON.stringify({
        church_role: invite.church_role,
        access_scope: invite.access_scope,
        branch_id: invite.branch_id,
        department_id: invite.department_id,
      }),
    });

    return Response.json({ success: true, church_role: invite.church_role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});