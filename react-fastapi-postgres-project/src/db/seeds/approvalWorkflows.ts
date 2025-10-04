import { db } from '@/db';
import { approvalWorkflows } from '@/db/schema';

async function main() {
    const sampleApprovalWorkflows = [
        {
            companyId: 1,
            name: 'Single Manager Approval',
            isActive: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            companyId: 2,
            name: 'Two-Step Approval Process',
            isActive: true,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            companyId: 3,
            name: 'Department Head Approval Chain',
            isActive: true,
            createdAt: new Date('2024-01-22').toISOString(),
        }
    ];

    await db.insert(approvalWorkflows).values(sampleApprovalWorkflows);
    
    console.log('✅ Approval workflows seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});