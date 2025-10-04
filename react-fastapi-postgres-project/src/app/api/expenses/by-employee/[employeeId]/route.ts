import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, users } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const { searchParams } = new URL(request.url);

    // Validate employeeId
    if (!employeeId || isNaN(parseInt(employeeId))) {
      return NextResponse.json({ 
        error: "Valid employee ID is required",
        code: "INVALID_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    const employeeIdInt = parseInt(employeeId);

    // Check if employee exists
    const employee = await db.select()
      .from(users)
      .where(eq(users.id, employeeIdInt))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json({ 
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND' 
      }, { status: 404 });
    }

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate status parameter
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be one of: pending, approved, rejected",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate date parameters
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return NextResponse.json({ 
        error: "Invalid dateFrom format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FROM" 
      }, { status: 400 });
    }

    if (dateTo && isNaN(Date.parse(dateTo))) {
      return NextResponse.json({ 
        error: "Invalid dateTo format. Use YYYY-MM-DD",
        code: "INVALID_DATE_TO" 
      }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(expenses.employeeId, employeeIdInt)];

    if (status) {
      conditions.push(eq(expenses.status, status));
    }

    if (category) {
      conditions.push(eq(expenses.category, category));
    }

    if (dateFrom) {
      conditions.push(gte(expenses.expenseDate, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(expenses.expenseDate, dateTo));
    }

    // Execute query
    const results = await db.select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}