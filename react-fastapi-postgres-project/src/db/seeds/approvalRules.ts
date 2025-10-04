import { db } from '@/db';
import { approvalRules } from '@/db/schema';

async function main() {
    const sampleApprovalRules = [
        {
            companyId: 1,
            ruleType: 'percentage',
            percentageThreshold: 50,
            specificApproverId: null,
            isActive: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            companyId: 1,
            ruleType: 'specific_approver',
            percentageThreshold: null,
            specificApproverId: 2,
            isActive: true,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            companyId: 2,
            ruleType: 'hybrid',
            percentageThreshold: 75,
            specificApproverId: 5,
            isActive: true,
            createdAt: new Date('2024-02-01').toISOString(),
        },
        {
            companyId: 3,
            ruleType: 'percentage',
            percentageThreshold: 25,
            specificApproverId: null,
            isActive: true,
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            companyId: 2,
            ruleType: 'specific_approver',
            percentageThreshold: null,
            specificApproverId: 8,
            isActive: true,
            createdAt: new Date('2024-02-10').toISOString(),
        }
    ];

    await db.insert(approvalRules).values(sampleApprovalRules);
    
    console.log('✅ Approval rules seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});