import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { new_password } = body;

    if (!new_password || new_password.length < 4) {
      return Response.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    await base44.auth.updatePassword(new_password);

    // Clear must_change_password flag
    await base44.asServiceRole.entities.User.update(user.id, { must_change_password: false });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});