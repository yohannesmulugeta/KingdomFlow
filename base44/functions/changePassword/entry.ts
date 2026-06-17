import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { current_password, new_password } = body;

    if (!current_password) {
      return Response.json({ error: 'Current password is required' }, { status: 400 });
    }
    if (!new_password) {
      return Response.json({ error: 'New password is required' }, { status: 400 });
    }

    // Production password requirements
    if (new_password.length < 12) {
      return Response.json({ error: 'Password must be at least 12 characters' }, { status: 400 });
    }
    if (!/[A-Z]/.test(new_password)) {
      return Response.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
    }
    if (!/[a-z]/.test(new_password)) {
      return Response.json({ error: 'Password must contain at least one lowercase letter' }, { status: 400 });
    }
    if (!/[0-9]/.test(new_password)) {
      return Response.json({ error: 'Password must contain at least one number' }, { status: 400 });
    }
    if (!/[^A-Za-z0-9]/.test(new_password)) {
      return Response.json({ error: 'Password must contain at least one symbol' }, { status: 400 });
    }

    // Prevent reused temporary password
    if (new_password === 'password') {
      return Response.json({ error: 'This password is not allowed. Please choose a different one.' }, { status: 400 });
    }

    try {
      await base44.auth.updatePassword(new_password, current_password);
    } catch (e) {
      if (e.message?.includes('incorrect') || e.message?.includes('invalid') || e.message?.includes('current')) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      return Response.json({ error: e.message || 'Password change failed' }, { status: 400 });
    }

    // Clear must_change_password flag and create audit log
    await base44.asServiceRole.entities.User.update(user.id, { must_change_password: false });
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'password_changed',
      entity_name: 'User',
      entity_id: user.id,
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: 'Password changed successfully',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});