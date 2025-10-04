import { db } from '@/db';
import { approvalSteps } from '@/db/schema';

async function main() {
    const sampleApprovalSteps = [
        // Workflow 1 (Single Manager) - ID 1
        {
            workflowId: 1,
            approverId: 2, // Manager from Tech Corp
            stepOrder: 1,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        
        // Workflow 2 (Two-Step) - ID 2
        {
            workflowId: 2,
            approverId: 3, // Manager from Global Industries
            stepOrder: 1,
            createdAt: new Date('2024-01-16').toISOString(),
        },
        {
            workflowId: 2,
            approverId: 1, // Admin from Global Industries
            stepOrder: 2,
            createdAt: new Date('2024-01-16').toISOString(),
        },
        
        // Workflow 3 (Department Head) - ID 3
        {
            workflowId: 3,
            approverId: 5, // Direct manager from StartupCo
            stepOrder: 1,
            createdAt: new Date('2024-01-17').toISOString(),
        },
        {
            workflowId: 3,
            approverId: 6, // Department head manager from StartupCo
            stepOrder: 2,
            createdAt: new Date('2024-01-17').toISOString(),
        },
        {
            workflowId: 3,
            approverId: 4, // Admin from StartupCo
            stepOrder: 3,
            createdAt: new Date('2024-01-17').toISOString(),
        },
    ];

    await db.insert(approvalSteps).values(sampleApprovalSteps);
    
    console.log('✅ Approval steps seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});