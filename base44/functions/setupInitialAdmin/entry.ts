import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only allow POST
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Check if any church_admin already exists
    const existingAdmins = await base44.asServiceRole.entities.User.filter(
      { church_role: 'church_admin', status: 'active' }
    );

    if (existingAdmins.length > 0) {
      return Response.json({
        error: 'Initial administrator already exists. This setup function is no longer available.',
        already_setup: true,
      }, { status: 403 });
    }

    const body = await req.json();
    const { setup_key, email, display_name } = body;

    // Require a setup key for basic protection
    if (setup_key !== 'kingdomflow-setup-2026') {
      return Response.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check for existing pending invitation for this email
    const existingInvites = await base44.asServiceRole.entities.PendingInvitation.filter({
      email: email.toLowerCase().trim(),
      status: 'pending',
    });

    if (existingInvites.length > 0) {
      return Response.json({ error: 'An invitation for this email is already pending' }, { status: 409 });
    }

    // Create PendingInvitation record
    await base44.asServiceRole.entities.PendingInvitation.create({
      email: email.toLowerCase().trim(),
      church_role: 'church_admin',
      access_scope: 'all_branches',
      branch_id: '',
      department_id: '',
      status: 'pending',
      invited_by_id: 'system_setup',
      invited_by_name: 'KingdomFlow Setup',
      invited_at: new Date().toISOString(),
    });

    // Send invitation via Base44
    try {
      await base44.asServiceRole.users.inviteUser(email, 'admin');
    } catch (inviteErr) {
      // Clean up pending invitation on invite failure
      const invite = await base44.asServiceRole.entities.PendingInvitation.filter({
        email: email.toLowerCase().trim(),
        status: 'pending',
      });
      if (invite.length > 0) {
        await base44.asServiceRole.entities.PendingInvitation.update(invite[0].id, { status: 'cancelled' });
      }
      return Response.json({ error: `Invitation failed: ${inviteErr.message}` }, { status: 500 });
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'initial_admin_setup',
      entity_name: 'User',
      performed_by_id: 'system_setup',
      performed_by_name: 'KingdomFlow Setup',
      details: `Initial administrator invitation sent to ${email}`,
    });

    return Response.json({
      success: true,
      message: `Invitation sent to ${email}. The administrator will set their password upon accepting the invitation.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});