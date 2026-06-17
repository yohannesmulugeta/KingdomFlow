import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const s = base44.asServiceRole;
    const existing = await s.entities.Branch.filter({});
    if (existing.length > 0) {
      return Response.json({ error: 'Demo data already exists. Reset first.', status: 'exists' });
    }

    // Branches
    const mainBranch = await s.entities.Branch.create({ name: 'Main Branch', code: 'MAIN', city: 'Addis Ababa', address: 'Bole Road', phone: '+251-11-123-4567', manager_name: 'Demo Admin', is_active: true });
    const eastBranch = await s.entities.Branch.create({ name: 'East Branch', code: 'EAST', city: 'Addis Ababa', address: 'CMC Area', phone: '+251-11-234-5678', manager_name: 'Demo Leader', is_active: true });
    const westBranch = await s.entities.Branch.create({ name: 'West Branch', code: 'WEST', city: 'Addis Ababa', address: 'Lideta Area', phone: '+251-11-345-6789', manager_name: 'Demo Leader', is_active: true });

    // Departments
    const childrenDept = await s.entities.Department.create({ name: 'Children Ministry', code: 'CHILD', branch_id: mainBranch.id, description: 'Ministry for children ages 3-12', is_active: true });
    const youthDept = await s.entities.Department.create({ name: 'Youth Ministry', code: 'YOUTH', branch_id: mainBranch.id, description: 'Ministry for youth ages 13-24', is_active: true });
    const worshipDept = await s.entities.Department.create({ name: 'Worship Ministry', code: 'WORSHIP', branch_id: mainBranch.id, description: 'Worship and praise team', is_active: true });
    const evangelismDept = await s.entities.Department.create({ name: 'Evangelism', code: 'EVANG', branch_id: mainBranch.id, description: 'Outreach and evangelism', is_active: true });
    const adminDept = await s.entities.Department.create({ name: 'Administration', code: 'ADMIN', branch_id: mainBranch.id, description: 'Church administration', is_active: true });

    // Funds
    const generalFund = await s.entities.Fund.create({ name: 'General Fund', code: 'GEN', description: 'General church operations', opening_balance: 50000, target_amount: 0, is_active: true });
    const titheFund = await s.entities.Fund.create({ name: 'Tithe Fund', code: 'TITHE', description: 'Tithe contributions', opening_balance: 120000, target_amount: 0, is_active: true });
    const buildingFund = await s.entities.Fund.create({ name: 'Building Fund', code: 'BUILD', description: 'Building construction and maintenance', opening_balance: 200000, target_amount: 500000, is_active: true });
    const missionFund = await s.entities.Fund.create({ name: 'Mission Fund', code: 'MISS', description: 'Mission and outreach support', opening_balance: 35000, target_amount: 100000, is_active: true });
    const charityFund = await s.entities.Fund.create({ name: 'Charity Fund', code: 'CHAR', description: 'Charity and community support', opening_balance: 25000, target_amount: 0, is_active: true });

    // Income Categories
    const icTithe = await s.entities.IncomeCategory.create({ name: 'Tithe', code: 'TITHE', description: 'Regular tithe', is_active: true });
    const icOffering = await s.entities.IncomeCategory.create({ name: 'Offering', code: 'OFFER', description: 'Sunday offering', is_active: true });
    const icSpecial = await s.entities.IncomeCategory.create({ name: 'Special Offering', code: 'SPOFF', description: 'Special occasion offerings', is_active: true });
    const icBuilding = await s.entities.IncomeCategory.create({ name: 'Building Contribution', code: 'BUILD', description: 'Building fund contributions', is_active: true });
    const icMission = await s.entities.IncomeCategory.create({ name: 'Mission Contribution', code: 'MISS', description: 'Mission contributions', is_active: true });
    const icDonation = await s.entities.IncomeCategory.create({ name: 'Donation', code: 'DON', description: 'General donations', is_active: true });

    // Expense Categories
    const ecMinistry = await s.entities.ExpenseCategory.create({ name: 'Ministry Expense', code: 'MIN', description: 'Ministry related expenses', is_active: true });
    const ecUtilities = await s.entities.ExpenseCategory.create({ name: 'Utilities', code: 'UTIL', description: 'Electricity, water, internet', is_active: true });
    const ecRent = await s.entities.ExpenseCategory.create({ name: 'Rent', code: 'RENT', description: 'Building rent', is_active: true });
    const ecTransport = await s.entities.ExpenseCategory.create({ name: 'Transportation', code: 'TRAN', description: 'Transportation costs', is_active: true });
    const ecEquipment = await s.entities.ExpenseCategory.create({ name: 'Equipment', code: 'EQUIP', description: 'Equipment purchase and maintenance', is_active: true });
    const ecCharity = await s.entities.ExpenseCategory.create({ name: 'Charity Support', code: 'CHAR', description: 'Charity and assistance', is_active: true });
    const ecMissionExp = await s.entities.ExpenseCategory.create({ name: 'Mission Support', code: 'MISSE', description: 'Mission trip and outreach expenses', is_active: true });
    const ecMaintenance = await s.entities.ExpenseCategory.create({ name: 'Maintenance', code: 'MAINT', description: 'Building and equipment maintenance', is_active: true });

    // Sample Income Transactions (approved, last 5 months)
    const now = new Date();
    const months = [
      `${now.getFullYear()}-${String(now.getMonth() - 4).padStart(2, '0')}-15`,
      `${now.getFullYear()}-${String(now.getMonth() - 3).padStart(2, '0')}-10`,
      `${now.getFullYear()}-${String(now.getMonth() - 2).padStart(2, '0')}-20`,
      `${now.getFullYear()}-${String(now.getMonth() - 1).padStart(2, '0')}-05`,
      now.toISOString().split('T')[0],
    ];

    const incomeRecords = [
      { amount: 120000, donor: 'Anonymous Donor', cat: icTithe, fund: titheFund, desc: 'Monthly tithe collection' },
      { amount: 45000, donor: 'Anonymous Donor', cat: icOffering, fund: generalFund, desc: 'Sunday worship offering' },
      { amount: 80000, donor: 'Anonymous Donor', cat: icBuilding, fund: buildingFund, desc: 'Building fund contribution' },
      { amount: 25000, donor: 'Anonymous Donor', cat: icMission, fund: missionFund, desc: 'Mission support contribution' },
      { amount: 15000, donor: 'Anonymous Donor', cat: icDonation, fund: charityFund, desc: 'Charity donation' },
    ];

    for (const income of incomeRecords) {
      const monthIdx = incomeRecords.indexOf(income);
      const date = months[Math.min(monthIdx, months.length - 1)];
      await s.entities.Transaction.create({
        type: 'income', amount: income.amount, date,
        description: income.desc, branch_id: mainBranch.id,
        category_id: income.cat.id, category_name: income.cat.name,
        fund_id: income.fund.id, donor_name: income.donor,
        payment_method: 'cash', status: 'approved',
        transaction_number: `INC-${date.slice(0, 4)}-${String(incomeRecords.indexOf(income) + 1).padStart(5, '0')}`,
      });
    }

    // Additional monthly income records for chart
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

    // Sample Expense Transactions (approved)
    const expenseRecords = [
      { amount: 35000, vendor: 'Sample Vendor', cat: ecRent, fund: generalFund, desc: 'Monthly church building rent' },
      { amount: 8500, vendor: 'Demo Supplier', cat: ecUtilities, fund: generalFund, desc: 'Electricity and water bill' },
      { amount: 12000, vendor: 'Demo Supplier', cat: ecMinistry, fund: generalFund, desc: 'Children ministry materials and supplies' },
      { amount: 15000, vendor: 'Sample Vendor', cat: ecCharity, fund: charityFund, desc: 'Community charity support program' },
      { amount: 10000, vendor: 'Sample Vendor', cat: ecMissionExp, fund: missionFund, desc: 'Mission outreach support' },
      { amount: 5000, vendor: 'Demo Supplier', cat: ecTransport, fund: generalFund, desc: 'Staff transportation allowance' },
      { amount: 7000, vendor: 'Demo Supplier', cat: ecEquipment, fund: generalFund, desc: 'Sound equipment maintenance' },
    ];

    for (const expense of expenseRecords) {
      const idx = expenseRecords.indexOf(expense);
      const date = months[Math.min(idx, months.length - 1)];
      await s.entities.Transaction.create({
        type: 'expense', amount: expense.amount, date,
        description: expense.desc, branch_id: mainBranch.id,
        category_id: expense.cat.id, category_name: expense.cat.name,
        fund_id: expense.fund.id, vendor_payee: expense.vendor,
        payment_method: 'bank_transfer', status: 'approved',
        transaction_number: `EXP-${date.slice(0, 4)}-${String(idx + 1).padStart(5, '0')}`,
      });
    }

    // Approval Rules
    await s.entities.ApprovalRule.create({ name: 'Department Leader Review', transaction_type: 'both', min_amount: 0, max_amount: 10000, approval_order: 1, required_role: 'department_leader', is_active: true });
    await s.entities.ApprovalRule.create({ name: 'Treasurer Review', transaction_type: 'both', min_amount: 0, max_amount: 50000, approval_order: 2, required_role: 'treasurer', is_active: true });
    await s.entities.ApprovalRule.create({ name: 'Pastor Approval', transaction_type: 'both', min_amount: 10000, approval_order: 3, required_role: 'pastor', is_active: true });

    // Budgets
    await s.entities.Budget.create({ name: 'General Fund Budget', year: now.getFullYear(), type: 'expense', planned_amount: 300000, spent_amount: 92500, committed_amount: 0, branch_id: mainBranch.id, fund_id: generalFund.id, is_active: true });
    await s.entities.Budget.create({ name: 'Building Fund Budget', year: now.getFullYear(), type: 'income', planned_amount: 500000, spent_amount: 0, committed_amount: 0, branch_id: mainBranch.id, fund_id: buildingFund.id, is_active: true });

    // Church Profile
    await s.entities.ChurchProfile.create({
      name: 'Kingdom Life Church', tagline: 'Building the Kingdom, One Life at a Time',
      address: 'Bole Road', city: 'Addis Ababa', phone: '+251-11-123-4567',
      email: 'info@kingdomlife.church', currency: 'ETB', fiscal_year_start: 'January',
      preferred_calendar: 'gregorian', setup_completed: true,
    });

    // Pending Invitation for demo user
    await s.entities.PendingInvitation.create({
      email: 'demo@kingdomflow.app', church_role: 'church_admin',
      access_scope: 'all_branches', status: 'pending',
      invited_by_id: user.id, invited_by_name: user.full_name || 'System',
      invited_at: new Date().toISOString(),
    });

    // Audit log
    await s.entities.AuditLog.create({
      action: 'demo_data_seeded', entity_name: 'System',
      performed_by_id: user.id, performed_by_name: user.full_name || 'Admin',
      details: 'Demo data seeded with sample church, branches, departments, funds, categories, and transactions',
    });

    return Response.json({
      success: true,
      message: 'Demo data seeded successfully',
      demo_email: 'demo@kingdomflow.app',
      church: 'Kingdom Life Church',
      counts: {
        branches: 3, departments: 5, funds: 5,
        income_categories: 6, expense_categories: 8,
        income_transactions: 9, expense_transactions: 7,
        approval_rules: 3, budgets: 2,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});