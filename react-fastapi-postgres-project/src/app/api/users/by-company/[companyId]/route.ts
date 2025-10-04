import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, companies } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;
    const { searchParams } = new URL(request.url);
    
    // Validate companyId
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json({ 
        error: "Valid company ID is required",
        code: "INVALID_COMPANY_ID" 
      }, { status: 400 });
    }

    const parsedCompanyId = parseInt(companyId);

    // Check if company exists
    const company = await db.select()
      .from(companies)
      .where(eq(companies.id, parsedCompanyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json({ 
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND' 
      }, { status: 404 });
    }

    // Extract query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const role = searchParams.get('role');

    // Validate role filter if provided
    if (role && !['admin', 'manager', 'employee'].includes(role)) {
      return NextResponse.json({ 
        error: "Invalid role. Must be 'admin', 'manager', or 'employee'",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    // Build query conditions
    let conditions = [eq(users.companyId, parsedCompanyId)];

    // Add role filter
    if (role) {
      conditions.push(eq(users.role, role));
    }

    // Add search filter
    if (search) {
      const searchCondition = or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Execute query with pagination, excluding password field
    const results = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      companyId: users.companyId,
      managerId: users.managerId,
      isManagerApprover: users.isManagerApprover,
      createdAt: users.createdAt
    })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET users by company error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}