import { db } from '@/db';
import { expenseApprovals } from '@/db/schema';

async function main() {
    const sampleExpenseApprovals = [
        // Fully approved expense chain (expense 1)
        {
            expenseId: 1,
            approverId: 2,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - valid business expense with proper receipt',
            approvedAt: new Date('2024-01-16T10:30:00Z').toISOString(),
            createdAt: new Date('2024-01-15T14:20:00Z').toISOString(),
        },
        {
            expenseId: 1,
            approverId: 3,
            stepOrder: 2,
            status: 'approved',
            comments: 'Final approval - expense within policy limits',
            approvedAt: new Date('2024-01-17T09:15:00Z').toISOString(),
            createdAt: new Date('2024-01-16T10:30:00Z').toISOString(),
        },
        
        // Multi-step pending approval (expense 2)
        {
            expenseId: 2,
            approverId: 4,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved by direct manager',
            approvedAt: new Date('2024-01-18T11:45:00Z').toISOString(),
            createdAt: new Date('2024-01-17T16:30:00Z').toISOString(),
        },
        {
            expenseId: 2,
            approverId: 2,
            stepOrder: 2,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-18T11:45:00Z').toISOString(),
        },
        
        // Rejected expense (expense 3)
        {
            expenseId: 3,
            approverId: 5,
            stepOrder: 1,
            status: 'rejected',
            comments: 'Rejected - no receipt provided and exceeds daily meal allowance',
            approvedAt: new Date('2024-01-19T13:20:00Z').toISOString(),
            createdAt: new Date('2024-01-18T09:15:00Z').toISOString(),
        },
        
        // Fully approved expense chain (expense 4)
        {
            expenseId: 4,
            approverId: 2,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - conference attendance expense',
            approvedAt: new Date('2024-01-20T10:00:00Z').toISOString(),
            createdAt: new Date('2024-01-19T14:45:00Z').toISOString(),
        },
        {
            expenseId: 4,
            approverId: 6,
            stepOrder: 2,
            status: 'approved',
            comments: 'Final approval - training expense approved',
            approvedAt: new Date('2024-01-21T08:30:00Z').toISOString(),
            createdAt: new Date('2024-01-20T10:00:00Z').toISOString(),
        },
        
        // Pending first approval (expense 5)
        {
            expenseId: 5,
            approverId: 3,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-20T16:20:00Z').toISOString(),
        },
        
        // Multi-step with pending second approval (expense 6)
        {
            expenseId: 6,
            approverId: 4,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved pending receipt submission',
            approvedAt: new Date('2024-01-21T14:15:00Z').toISOString(),
            createdAt: new Date('2024-01-20T11:30:00Z').toISOString(),
        },
        {
            expenseId: 6,
            approverId: 3,
            stepOrder: 2,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-21T14:15:00Z').toISOString(),
        },
        
        // Rejected at second step (expense 7)
        {
            expenseId: 7,
            approverId: 2,
            stepOrder: 1,
            status: 'approved',
            comments: 'Initial approval - valid business purpose',
            approvedAt: new Date('2024-01-22T09:45:00Z').toISOString(),
            createdAt: new Date('2024-01-21T15:20:00Z').toISOString(),
        },
        {
            expenseId: 7,
            approverId: 5,
            stepOrder: 2,
            status: 'rejected',
            comments: 'Rejected - exceeds policy limits for entertainment expenses',
            approvedAt: new Date('2024-01-23T10:30:00Z').toISOString(),
            createdAt: new Date('2024-01-22T09:45:00Z').toISOString(),
        },
        
        // Pending first approval (expense 8)
        {
            expenseId: 8,
            approverId: 6,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-22T13:40:00Z').toISOString(),
        },
        
        // Fully approved single step (expense 9)
        {
            expenseId: 9,
            approverId: 3,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - office supplies within budget',
            approvedAt: new Date('2024-01-23T11:20:00Z').toISOString(),
            createdAt: new Date('2024-01-22T16:15:00Z').toISOString(),
        },
        
        // Pending multi-step (expense 10)
        {
            expenseId: 10,
            approverId: 4,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - travel expense with receipts',
            approvedAt: new Date('2024-01-24T08:15:00Z').toISOString(),
            createdAt: new Date('2024-01-23T14:30:00Z').toISOString(),
        },
        {
            expenseId: 10,
            approverId: 2,
            stepOrder: 2,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-24T08:15:00Z').toISOString(),
        },
        
        // Rejected first step (expense 11)
        {
            expenseId: 11,
            approverId: 5,
            stepOrder: 1,
            status: 'rejected',
            comments: 'Rejected - personal expense not business related',
            approvedAt: new Date('2024-01-24T15:45:00Z').toISOString(),
            createdAt: new Date('2024-01-24T09:20:00Z').toISOString(),
        },
        
        // Pending first approval (expense 12)
        {
            expenseId: 12,
            approverId: 2,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-24T17:10:00Z').toISOString(),
        },
        
        // Approved with conditions (expense 13)
        {
            expenseId: 13,
            approverId: 6,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - hotel expense for client meeting',
            approvedAt: new Date('2024-01-25T10:20:00Z').toISOString(),
            createdAt: new Date('2024-01-24T12:45:00Z').toISOString(),
        },
        {
            expenseId: 13,
            approverId: 3,
            stepOrder: 2,
            status: 'approved',
            comments: 'Final approval - client entertainment approved',
            approvedAt: new Date('2024-01-25T14:30:00Z').toISOString(),
            createdAt: new Date('2024-01-25T10:20:00Z').toISOString(),
        },
        
        // Pending approval chain (expense 14)
        {
            expenseId: 14,
            approverId: 4,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-25T11:30:00Z').toISOString(),
        },
        
        // Multi-step pending at third level (expense 15)
        {
            expenseId: 15,
            approverId: 3,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - equipment purchase justified',
            approvedAt: new Date('2024-01-25T16:15:00Z').toISOString(),
            createdAt: new Date('2024-01-25T13:20:00Z').toISOString(),
        },
        {
            expenseId: 15,
            approverId: 2,
            stepOrder: 2,
            status: 'approved',
            comments: 'Approved - within department budget',
            approvedAt: new Date('2024-01-26T09:30:00Z').toISOString(),
            createdAt: new Date('2024-01-25T16:15:00Z').toISOString(),
        },
        {
            expenseId: 15,
            approverId: 5,
            stepOrder: 3,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-26T09:30:00Z').toISOString(),
        },
        
        // Rejected with detailed reason (expense 16)
        {
            expenseId: 16,
            approverId: 6,
            stepOrder: 1,
            status: 'rejected',
            comments: 'Rejected - duplicate expense submission detected',
            approvedAt: new Date('2024-01-26T11:45:00Z').toISOString(),
            createdAt: new Date('2024-01-26T08:20:00Z').toISOString(),
        },
        
        // Pending single approval (expense 17)
        {
            expenseId: 17,
            approverId: 2,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-26T14:50:00Z').toISOString(),
        },
        
        // Three-step approval chain (expense 18)
        {
            expenseId: 18,
            approverId: 4,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - software license expense',
            approvedAt: new Date('2024-01-26T15:20:00Z').toISOString(),
            createdAt: new Date('2024-01-26T12:15:00Z').toISOString(),
        },
        {
            expenseId: 18,
            approverId: 3,
            stepOrder: 2,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-26T15:20:00Z').toISOString(),
        },
        
        // Pending approval (expense 19)
        {
            expenseId: 19,
            approverId: 5,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-26T16:40:00Z').toISOString(),
        },
        
        // Approved meal expense (expense 20)
        {
            expenseId: 20,
            approverId: 2,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - client lunch meeting expense',
            approvedAt: new Date('2024-01-27T09:10:00Z').toISOString(),
            createdAt: new Date('2024-01-26T18:25:00Z').toISOString(),
        },
        
        // Pending two-step approval (expense 21)
        {
            expenseId: 21,
            approverId: 6,
            stepOrder: 1,
            status: 'approved',
            comments: 'Approved - marketing campaign expense',
            approvedAt: new Date('2024-01-27T10:35:00Z').toISOString(),
            createdAt: new Date('2024-01-27T08:15:00Z').toISOString(),
        },
        {
            expenseId: 21,
            approverId: 3,
            stepOrder: 2,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date('2024-01-27T10:35:00Z').toISOString(),
        }
    ];

    await db.insert(expenseApprovals).values(sampleExpenseApprovals);
    
    console.log('✅ Expense approvals seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});