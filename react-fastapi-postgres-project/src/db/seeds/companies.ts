import { db } from '@/db';
import { companies } from '@/db/schema';

async function main() {
    const sampleCompanies = [
        {
            name: 'TechFlow Solutions',
            country: 'United States',
            currency: 'USD',
            createdAt: new Date('2024-08-15').toISOString(),
        },
        {
            name: 'BritCorp Industries',
            country: 'United Kingdom',
            currency: 'GBP',
            createdAt: new Date('2024-09-22').toISOString(),
        },
        {
            name: 'Mumbai Digital Services',
            country: 'India',
            currency: 'INR',
            createdAt: new Date('2024-10-05').toISOString(),
        }
    ];

    await db.insert(companies).values(sampleCompanies);
    
    console.log('✅ Companies seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});