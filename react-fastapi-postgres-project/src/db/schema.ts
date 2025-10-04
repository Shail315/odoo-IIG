import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  country: text('country').notNull(),
  currency: text('currency').notNull(),
  createdAt: text('created_at').notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'admin', 'manager', 'employee'
  companyId: integer('company_id').notNull().references(() => companies.id),
  managerId: integer('manager_id').references(() => users.id),
  isManagerApprover: integer('is_manager_approver', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  companyId: integer('company_id').notNull().references(() => companies.id),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  convertedAmount: real('converted_amount').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  expenseDate: text('expense_date').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  currentApproverId: integer('current_approver_id').references(() => users.id),
  currentApprovalStep: integer('current_approval_step').default(0),
  receiptUrl: text('receipt_url'),
  ocrData: text('ocr_data', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const approvalWorkflows = sqliteTable('approval_workflows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
});

export const approvalSteps = sqliteTable('approval_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workflowId: integer('workflow_id').notNull().references(() => approvalWorkflows.id),
  approverId: integer('approver_id').notNull().references(() => users.id),
  stepOrder: integer('step_order').notNull(),
  createdAt: text('created_at').notNull(),
});

export const approvalRules = sqliteTable('approval_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  ruleType: text('rule_type').notNull(), // 'percentage', 'specific_approver', 'hybrid'
  percentageThreshold: integer('percentage_threshold'),
  specificApproverId: integer('specific_approver_id').references(() => users.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
});

export const expenseApprovals = sqliteTable('expense_approvals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expenseId: integer('expense_id').notNull().references(() => expenses.id),
  approverId: integer('approver_id').notNull().references(() => users.id),
  stepOrder: integer('step_order').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  comments: text('comments'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
});