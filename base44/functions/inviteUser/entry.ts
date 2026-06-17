import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only church_admin can invite
    if (user.church_role !== 'church_admin') {
      return Response.json({ error: 'Only Church Admin can invite users' }, { status: 403 });
    }

    const body = await req.json();
    const { email, church_role, access_scope, branch_id, department_id, action } = body;

    if (action === 'cancel') {
      const invites = await base44.asServiceRole.entities.PendingInvitation.filter({
        email: email.toLowerCase().trim(),
        status: 'pending',
      });
      if (invites.length === 0) {
        return Response.json({ error: 'No pending invitation found' }, { status: 404 });
      }
      await base44.asServiceRole.entities.PendingInvitation.update(invites[0].id, {
        status: 'cancelled',
      });
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'invitation_cancelled',
        entity_name: 'PendingInvitation',
        entity_id: invites[0].id,
        performed_by_id: user.id,
        performed_by_name: user.full_name || user.email,
        details: `Cancelled invitation for ${email}`,
      });
      return Response.json({ success: true, message: 'Invitation cancelled' });
    }

    if (action === 'resend') {
      const invites = await base44.asServiceRole.entities.PendingInvitation.filter({
        email: email.toLowerCase().trim(),
        status: 'pending',
      });
      if (invites.length === 0) {
        return Response.json({ error: 'No pending invitation found' }, { status: 404 });
      }
      try {
        await base44.asServiceRole.users.inviteUser(email, 'user');
      } catch (e) {
        return Response.json({ error: `Resend failed: ${e.message}` }, { status: 500 });
      }
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'invitation_resent',
        entity_name: 'PendingInvitation',
        entity_id: invites[0].id,
        performed_by_id: user.id,
        performed_by_name: user.full_name || user.email,
        details: `Resent invitation to ${email}`,
      });
      return Response.json({ success: true, message: 'Invitation resent' });
    }

    // Create new invitation
    if (!email || !church_role) {
      return Response.json({ error: 'Email and church role are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing pending invitation
    const existing = await base44.asServiceRole.entities.PendingInvitation.filter({
      email: normalizedEmail,
      status: 'pending',
    });
    if (existing.length > 0) {
      return Response.json({ error: 'A pending invitation already exists for this email' }, { status: 409 });
    }

    // Check for existing active user with same email
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      email: normalizedEmail,
    });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Create PendingInvitation
    await base44.asServiceRole.entities.PendingInvitation.create({
      email: normalizedEmail,
      church_role,
      access_scope: access_scope || 'assigned_branch',
      branch_id: branch_id || '',
      department_id: department_id || '',
      status: 'pending',
      invited_by_id: user.id,
      invited_by_name: user.full_name || user.email,
      invited_at: new Date().toISOString(),
    });

    // Send invitation via Base44
    try {
      await base44.asServiceRole.users.inviteUser(email, 'user');
    } catch (e) {
      // Clean up
      const invites = await base44.asServiceRole.entities.PendingInvitation.filter({
        email: normalizedEmail,
        status: 'pending',
      });
      if (invites.length > 0) {
        await base44.asServiceRole.entities.PendingInvitation.update(invites[0].id, { status: 'cancelled' });
      }
      return Response.json({ error: `Invitation send failed: ${e.message}` }, { status: 500 });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'user_invited',
      entity_name: 'PendingInvitation',
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: `Invited ${email} with church role: ${church_role}`,
      metadata_json: JSON.stringify({ church_role, access_scope, branch_id, department_id }),
    });

    return Response.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});