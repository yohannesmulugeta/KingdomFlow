import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!body.purpose || !body.branch_id) {
      return Response.json({ error: 'Purpose and branch are required' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const existing = await base44.asServiceRole.entities.MoneyRequest.filter({
      request_number: { $regex: `^REQ-${year}-` }
    }, '-request_number', 1);

    let seq = 1;
    if (existing.length > 0 && existing[0].request_number) {
      const parts = existing[0].request_number.split('-');
      seq = parseInt(parts[2]) + 1;
    }
    const requestNumber = `REQ-${year}-${String(seq).padStart(5, '0')}`;

    const requestData = {
      ...body,
      request_number: requestNumber,
      amount,
      requested_by_id: user.id,
      requested_by_name: user.full_name || user.email,
      status: 'submitted',
    };

    const created = await base44.asServiceRole.entities.MoneyRequest.create(requestData);

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'money_request_created',
      entity_name: 'MoneyRequest',
      entity_id: created.id,
      performed_by_id: user.id,
      performed_by_name: user.full_name || user.email,
      details: `Money request ${requestNumber} for ${amount} created: ${body.purpose}`,
      branch_id: body.branch_id,
    });

    return Response.json({ success: true, request: created, request_number: requestNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});