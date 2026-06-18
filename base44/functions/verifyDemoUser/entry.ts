import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const s = base44.asServiceRole;

    // Find demo user
    const users = await s.entities.User.filter({ email: 'demo@kingdomflow.com' });
    
    if (users.length === 0) {
      return Response.json({ success: false, message: 'Demo user not found' });
    }

    const user = users[0];

    // Set verification flags and ensure church fields
    await s.entities.User.update(user.id, {
      is_verified: true,
      force_password_reset: false,
      must_change_password: false,
      status: 'active',
      church_role: 'church_admin',
      access_scope: 'all_branches',
    });

    return Response.json({ 
      success: true, 
      message: 'Demo user verified and ready for login',
      user_id: user.id,
      email: user.email
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});