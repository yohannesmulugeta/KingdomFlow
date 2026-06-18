import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEMO_EMAIL = 'demo@kingdomflow.com';
const DEMO_PASSWORD = 'password';
const DEMO_DISPLAY_NAME = 'Demo Admin';
const DEMO_CHURCH_ROLE = 'church_admin';
const DEMO_ACCESS_SCOPE = 'all_branches';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      return Response.json({ error: 'Invalid demo credentials' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const s = base44.asServiceRole;

    // ── Seed demo data if empty ──────────────────────────────────────
    const existingBranches = await s.entities.Branch.filter({});
    if (existingBranches.length === 0) {
      const mainBranch = await s.entities.Branch.create({ name: 'Main Branch', code: 'MAIN', city: 'Addis Ababa', address: 'Bole Road', phone: '+251-11-123-4567', manager_name: 'Demo Admin', is_active: true });
      const eastBranch = await s.entities.Branch.create({ name: 'East Branch', code: 'EAST', city: 'Addis Ababa', address: 'CMC Area', phone: '+251-11-234-5678', manager_name: 'Demo Leader', is_active: true });
      const westBranch = await s.entities.Branch.create({ name: 'West Branch', code: 'WEST', city: 'Addis Ababa', address: 'Lideta Area', phone: '+251-11-345-6789', manager_name: 'Demo Leader', is_active: true });

      const childrenDept = await s.entities.Department.create({ name: 'Children Ministry', code: 'CHILD', branch_id: mainBranch.id, description: 'Children ages 3-12', is_active: true });
      const youthDept = await s.entities.Department.create({ name: 'Youth Ministry', code: 'YOUTH', branch_id: mainBranch.id, description: 'Youth ages 13-24', is_active: true });
      const worshipDept = await s.entities.Department.create({ name: 'Worship Ministry', code: 'WORSHIP', branch_id: mainBranch.id, description: 'Worship team', is_active: true });
      const evangelismDept = await s.entities.Department.create({ name: 'Evangelism', code: 'EVANG', branch_id: mainBranch.id, description: 'Outreach', is_active: true });
      const adminDept = await s.entities.Department.create({ name: 'Administration', code: 'ADMIN', branch_id: mainBranch.id, description: 'Administration', is_active: true });

      const generalFund = await s.entities.Fund.create({ name: 'General Fund', code: 'GEN', description: 'General operations', opening_balance: 50000, is_active: true });
      const titheFund = await s.entities.Fund.create({ name: 'Tithe Fund', code: 'TITHE', description: 'Tithes', opening_balance: 120000, is_active: true });
      const buildingFund = await s.entities.Fund.create({ name: 'Building Fund', code: 'BUILD', description: 'Building projects', opening_balance: 200000, target_amount: 500000, is_active: true });
      const missionFund = await s.entities.Fund.create({ name: 'Mission Fund', code: 'MISS', description: 'Missions', opening_balance: 35000, target_amount: 100000, is_active: true });
      const charityFund = await s.entities.Fund.create({ name: 'Charity Fund', code: 'CHAR', description: 'Charity', opening_balance: 25000, is_active: true });

      const icTithe = await s.entities.IncomeCategory.create({ name: 'Tithe', code: 'TITHE', is_active: true });
      const icOffering = await s.entities.IncomeCategory.create({ name: 'Offering', code: 'OFFER', is_active: true });
      const icSpecial = await s.entities.IncomeCategory.create({ name: 'Special Offering', code: 'SPOFF', is_active: true });
      const icBuilding = await s.entities.IncomeCategory.create({ name: 'Building Contribution', code: 'BUILD', is_active: true });
      const icMission = await s.entities.IncomeCategory.create({ name: 'Mission Contribution', code: 'MISS', is_active: true });
      const icDonation = await s.entities.IncomeCategory.create({ name: 'Donation', code: 'DON', is_active: true });

      const ecMinistry = await s.entities.ExpenseCategory.create({ name: 'Ministry Expense', code: 'MIN', is_active: true });
      const ecUtilities = await s.entities.ExpenseCategory.create({ name: 'Utilities', code: 'UTIL', is_active: true });
      const ecRent = await s.entities.ExpenseCategory.create({ name: 'Rent', code: 'RENT', is_active: true });
      const ecTransport = await s.entities.ExpenseCategory.create({ name: 'Transportation', code: 'TRAN', is_active: true });
      const ecEquipment = await s.entities.ExpenseCategory.create({ name: 'Equipment', code: 'EQUIP', is_active: true });
      const ecCharity = await s.entities.ExpenseCategory.create({ name: 'Charity Support', code: 'CHAR', is_active: true });
      const ecMissionExp = await s.entities.ExpenseCategory.create({ name: 'Mission Support', code: 'MISSE', is_active: true });
      const ecMaintenance = await s.entities.ExpenseCategory.create({ name: 'Maintenance', code: 'MAINT', is_active: true });

      const now = new Date();
      const months = [
        `${now.getFullYear()}-${String(now.getMonth() - 4).padStart(2, '0')}-15`,
        `${now.getFullYear()}-${String(now.getMonth() - 3).padStart(2, '0')}-10`,
        `${now.getFullYear()}-${String(now.getMonth() - 2).padStart(2, '0')}-20`,
        `${now.getFullYear()}-${String(now.getMonth() - 1).padStart(2, '0')}-05`,
        now.toISOString().split('T')[0],
      ];

      const incomeRecords = [
        { amount: 120000, cat: icTithe, fund: titheFund, desc: 'Monthly tithe collection' },
        { amount: 45000, cat: icOffering, fund: generalFund, desc: 'Sunday worship offering' },
        { amount: 80000, cat: icBuilding, fund: buildingFund, desc: 'Building fund contribution' },
        { amount: 25000, cat: icMission, fund: missionFund, desc: 'Mission support' },
        { amount: 15000, cat: icDonation, fund: charityFund, desc: 'Charity donation' },
      ];

      for (let i = 0; i < incomeRecords.length; i++) {
        const r = incomeRecords[i];
        await s.entities.Transaction.create({
          type: 'income', amount: r.amount, date: months[i],
          description: r.desc, branch_id: mainBranch.id,
          category_id: r.cat.id, category_name: r.cat.name,
          fund_id: r.fund.id, donor_name: 'Anonymous Donor',
          payment_method: 'cash', status: 'approved',
          transaction_number: `INC-${months[i].slice(0, 4)}-${String(i + 1).padStart(5, '0')}`,
        });
      }

      for (let i = 0; i < 4; i++) {
        const m = now.getMonth() - 3 + i;
        const yr = now.getFullYear() + (m < 0 ? -1 : 0);
        const adjMonth = ((m % 12) + 12) % 12;
        const date = `${yr}-${String(adjMonth + 1).padStart(2, '0')}-01`;
        await s.entities.Transaction.create({
          type: 'income', amount: 30000 + (i * 5000), date,
          description: 'Monthly offering', branch_id: mainBranch.id,
          category_id: icOffering.id, category_name: icOffering.name,
          fund_id: generalFund.id, donor_name: 'Anonymous Donor',
          payment_method: 'cash', status: 'approved',
          transaction_number: `INC-${date.slice(0, 4)}-${String(6 + i).padStart(5, '0')}`,
        });
      }

      const expenseRecords = [
        { amount: 35000, vendor: 'Sample Vendor', cat: ecRent, fund: generalFund, desc: 'Monthly building rent' },
        { amount: 8500, vendor: 'Demo Supplier', cat: ecUtilities, fund: generalFund, desc: 'Electricity and water' },
        { amount: 12000, vendor: 'Demo Supplier', cat: ecMinistry, fund: generalFund, desc: 'Children ministry supplies' },
        { amount: 15000, vendor: 'Sample Vendor', cat: ecCharity, fund: charityFund, desc: 'Community charity support' },
        { amount: 10000, vendor: 'Sample Vendor', cat: ecMissionExp, fund: missionFund, desc: 'Mission outreach' },
        { amount: 5000, vendor: 'Demo Supplier', cat: ecTransport, fund: generalFund, desc: 'Staff transport' },
        { amount: 7000, vendor: 'Demo Supplier', cat: ecEquipment, fund: generalFund, desc: 'Sound equipment maintenance' },
      ];

      for (let i = 0; i < expenseRecords.length; i++) {
        const r = expenseRecords[i];
        await s.entities.Transaction.create({
          type: 'expense', amount: r.amount, date: months[Math.min(i, months.length - 1)],
          description: r.desc, branch_id: mainBranch.id,
          category_id: r.cat.id, category_name: r.cat.name,
          fund_id: r.fund.id, vendor_payee: r.vendor,
          payment_method: 'bank_transfer', status: 'approved',
          transaction_number: `EXP-${months[Math.min(i, months.length - 1)].slice(0, 4)}-${String(i + 1).padStart(5, '0')}`,
        });
      }

      await s.entities.ApprovalRule.create({ name: 'Department Leader Review', transaction_type: 'both', min_amount: 0, max_amount: 10000, approval_order: 1, required_role: 'department_leader', is_active: true });
      await s.entities.ApprovalRule.create({ name: 'Treasurer Review', transaction_type: 'both', min_amount: 0, max_amount: 50000, approval_order: 2, required_role: 'treasurer', is_active: true });
      await s.entities.ApprovalRule.create({ name: 'Pastor Approval', transaction_type: 'both', min_amount: 10000, approval_order: 3, required_role: 'pastor', is_active: true });

      await s.entities.Budget.create({ name: 'General Fund Budget', year: now.getFullYear(), type: 'expense', planned_amount: 300000, spent_amount: 92500, committed_amount: 0, branch_id: mainBranch.id, fund_id: generalFund.id, is_active: true });
      await s.entities.Budget.create({ name: 'Building Fund Budget', year: now.getFullYear(), type: 'income', planned_amount: 500000, spent_amount: 0, committed_amount: 0, branch_id: mainBranch.id, fund_id: buildingFund.id, is_active: true });

      await s.entities.ChurchProfile.create({
        name: 'Kingdom Life Church', tagline: 'Building the Kingdom, One Life at a Time',
        address: 'Bole Road', city: 'Addis Ababa', phone: '+251-11-123-4567',
        email: 'info@kingdomlife.church', currency: 'ETB', fiscal_year_start: 'January',
        preferred_calendar: 'gregorian', setup_completed: true,
      });

      await s.entities.AuditLog.create({
        action: 'demo_data_seeded', entity_name: 'System',
        performed_by_id: 'demo_system', performed_by_name: 'Demo System',
        details: 'Demo data seeded via demo login',
      });
    }

    // ── Ensure demo user exists and is properly configured ──────────
    const normalizedEmail = DEMO_EMAIL.toLowerCase().trim();

    // Check for existing user
    const existingUsers = await s.entities.User.filter({ email: normalizedEmail });

    if (existingUsers.length > 0) {
      const demoUser = existingUsers[0];

      // Ensure church_role, verification, and other fields are set
      await s.entities.User.update(demoUser.id, {
        church_role: DEMO_CHURCH_ROLE,
        access_scope: DEMO_ACCESS_SCOPE,
        status: 'active',
        must_change_password: false,
        invitation_pending: false,
        is_verified: true,
        force_password_reset: false,
      });

      return Response.json({ success: true, message: 'Demo account ready' });
    }

    // No user exists — try to invite
    const existingInvites = await s.entities.PendingInvitation.filter({
      email: normalizedEmail,
      status: 'pending',
    });

    if (existingInvites.length === 0) {
      await s.entities.PendingInvitation.create({
        email: normalizedEmail,
        church_role: DEMO_CHURCH_ROLE,
        access_scope: DEMO_ACCESS_SCOPE,
        branch_id: '',
        department_id: '',
        status: 'pending',
        invited_by_id: 'demo_system',
        invited_by_name: 'KingdomFlow Demo',
        invited_at: new Date().toISOString(),
      });

      try {
        await s.users.inviteUser(normalizedEmail, 'admin');
      } catch (inviteErr) {
        // Invitation might already exist at platform level
      }
    }

    // Run reconciliation to check if user was created
    try {
      await base44.functions.invoke('reconcileInvitations', {});
    } catch (_) {}

    // Check again after reconciliation
    const usersAfterRecon = await s.entities.User.filter({ email: normalizedEmail });

    if (usersAfterRecon.length === 0) {
      // User still doesn't exist — need manual acceptance
      return Response.json({
        success: false,
        needs_setup: true,
        error: 'Demo account invitation sent to demo@kingdomflow.com. It must be accepted once before login works. Please check the Base44 Authentication dashboard to accept the invitation, or create the user manually.',
        invitation_sent: true,
      });
    }

    // User exists — ensure fields are correct
    const demoUser = usersAfterRecon[0];
    await s.entities.User.update(demoUser.id, {
      church_role: DEMO_CHURCH_ROLE,
      access_scope: DEMO_ACCESS_SCOPE,
      status: 'active',
      must_change_password: false,
      invitation_pending: false,
      is_verified: true,
      force_password_reset: false,
    });

    return Response.json({ success: true, message: 'Demo account ready' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});