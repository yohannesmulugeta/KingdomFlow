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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const authError = authorize(user, ['church_admin']);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const body = await req.json();
    const { section, data } = body;

    if (!section) return Response.json({ error: 'Settings section is required' }, { status: 400 });

    const churchProfile = await base44.asServiceRole.entities.ChurchProfile.list();
    let profile = churchProfile.length > 0 ? churchProfile[0] : null;

    switch (section) {
      case 'general': {
        if (!profile) {
          profile = await base44.asServiceRole.entities.ChurchProfile.create({
            name: data.name || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            logo_url: data.logo_url || '',
            pastor_name: data.pastor_name || '',
            description: data.description || '',
            currency: data.currency || 'ETB',
            fiscal_year_start: data.fiscal_year_start || 'January',
            tagline: data.tagline || '',
          });
        } else {
          await base44.asServiceRole.entities.ChurchProfile.update(profile.id, {
            name: data.name !== undefined ? data.name : profile.name,
            address: data.address !== undefined ? data.address : profile.address,
            city: data.city !== undefined ? data.city : profile.city,
            state: data.state !== undefined ? data.state : profile.state,
            phone: data.phone !== undefined ? data.phone : profile.phone,
            email: data.email !== undefined ? data.email : profile.email,
            website: data.website !== undefined ? data.website : profile.website,
            logo_url: data.logo_url !== undefined ? data.logo_url : profile.logo_url,
            pastor_name: data.pastor_name !== undefined ? data.pastor_name : profile.pastor_name,
            description: data.description !== undefined ? data.description : profile.description,
            tagline: data.tagline !== undefined ? data.tagline : profile.tagline,
          });
        }

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'settings_changed',
          entity_name: 'ChurchProfile',
          entity_id: profile?.id || 'new',
          performed_by_id: user.id,
          performed_by_name: user.full_name || user.email,
          details: `General settings updated`,
          metadata_json: JSON.stringify({ section: 'general' }),
        });

        break;
      }
      case 'financial': {
        if (profile) {
          await base44.asServiceRole.entities.ChurchProfile.update(profile.id, {
            currency: data.currency || profile.currency,
            fiscal_year_start: data.fiscal_year_start || profile.fiscal_year_start,
          });
        }

        await base44.asServiceRole.entities.AuditLog.create({
          action: 'settings_changed',
          entity_name: 'ChurchProfile',
          entity_id: profile?.id || '',
          performed_by_id: user.id,
          performed_by_name: user.full_name || user.email,
          details: `Financial settings updated`,
          metadata_json: JSON.stringify({ section: 'financial', currency: data.currency }),
        });

        break;
      }
      case 'user_preferences': {
        await base44.asServiceRole.entities.User.update(user.id, {
          preferred_calendar: data.preferred_calendar || user.preferred_calendar,
        });

        break;
      }
      default:
        return Response.json({ error: `Unknown settings section: ${section}` }, { status: 400 });
    }

    return Response.json({ success: true, section });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});