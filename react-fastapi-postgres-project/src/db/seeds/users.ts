import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';

async function main() {
    const saltRounds = 10;
    const basePassword = 'password123';
    const hashedPassword = await bcrypt.hash(basePassword, saltRounds);

    const sampleUsers = [
        // TechFlow Solutions (Company 1) - 6 users
        {
            email: 'sarah.chen@techflow.com',
            password: hashedPassword,
            name: 'Sarah Chen',
            role: 'admin',
            companyId: 1,
            managerId: null,
            isManagerApprover: false,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            email: 'michael.rodriguez@techflow.com',
            password: hashedPassword,
            name: 'Michael Rodriguez',
            role: 'manager',
            companyId: 1,
            managerId: null,
            isManagerApprover: true,
            createdAt: new Date('2024-01-16').toISOString(),
        },
        {
            email: 'jennifer.thompson@techflow.com',
            password: hashedPassword,
            name: 'Jennifer Thompson',
            role: 'manager',
            companyId: 1,
            managerId: null,
            isManagerApprover: false,
            createdAt: new Date('2024-01-17').toISOString(),
        },
        {
            email: 'david.kim@techflow.com',
            password: hashedPassword,
            name: 'David Kim',
            role: 'employee',
            companyId: 1,
            managerId: 2,
            isManagerApprover: false,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            email: 'emily.watson@techflow.com',
            password: hashedPassword,
            name: 'Emily Watson',
            role: 'employee',
            companyId: 1,
            managerId: 2,
            isManagerApprover: false,
            createdAt: new Date('2024-01-19').toISOString(),
        },
        {
            email: 'alex.nguyen@techflow.com',
            password: hashedPassword,
            name: 'Alex Nguyen',
            role: 'employee',
            companyId: 1,
            managerId: 3,
            isManagerApprover: false,
            createdAt: new Date('2024-01-20').toISOString(),
        },

        // BritCorp Industries (Company 2) - 5 users
        {
            email: 'james.williams@britcorp.co.uk',
            password: hashedPassword,
            name: 'James Williams',
            role: 'admin',
            companyId: 2,
            managerId: null,
            isManagerApprover: false,
            createdAt: new Date('2024-01-21').toISOString(),
        },
        {
            email: 'olivia.brown@britcorp.co.uk',
            password: hashedPassword,
            name: 'Olivia Brown',
            role: 'manager',
            companyId: 2,
            managerId: null,
            isManagerApprover: true,
            createdAt: new Date('2024-01-22').toISOString(),
        },
        {
            email: 'thomas.davies@britcorp.co.uk',
            password: hashedPassword,
            name: 'Thomas Davies',
            role: 'manager',
            companyId: 2,
            managerId: null,
            isManagerApprover: false,
            createdAt: new Date('2024-01-23').toISOString(),
        },
        {
            email: 'charlotte.smith@britcorp.co.uk',
            password: hashedPassword,
            name: 'Charlotte Smith',
            role: 'employee',
            companyId: 2,
            managerId: 8,
            isManagerApprover: false,
            createdAt: new Date('2024-01-24').toISOString(),
        },
        {
            email: 'george.taylor@britcorp.co.uk',
            password: hashedPassword,
            name: 'George Taylor',
            role: 'employee',
            companyId: 2,
            managerId: 9,
            isManagerApprover: false,
            createdAt: new Date('2024-01-25').toISOString(),
        },

        // Mumbai Digital Services (Company 3) - 4 users
        {
            email: 'priya.sharma@mumbaidigital.in',
            password: hashedPassword,
            name: 'Priya Sharma',
            role: 'admin',
            companyId: 3,
            managerId: null,
            isManagerApprover: false,
            createdAt: new Date('2024-01-26').toISOString(),
        },
        {
            email: 'rajesh.patel@mumbaidigital.in',
            password: hashedPassword,
            name: 'Rajesh Patel',
            role: 'manager',
            companyId: 3,
            managerId: null,
            isManagerApprover: true,
            createdAt: new Date('2024-01-27').toISOString(),
        },
        {
            email: 'anita.gupta@mumbaidigital.in',
            password: hashedPassword,
            name: 'Anita Gupta',
            role: 'employee',
            companyId: 3,
            managerId: 13,
            isManagerApprover: false,
            createdAt: new Date('2024-01-28').toISOString(),
        },
        {
            email: 'vikram.singh@mumbaidigital.in',
            password: hashedPassword,
            name: 'Vikram Singh',
            role: 'employee',
            companyId: 3,
            managerId: 13,
            isManagerApprover: false,
            createdAt: new Date('2024-01-29').toISOString(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});