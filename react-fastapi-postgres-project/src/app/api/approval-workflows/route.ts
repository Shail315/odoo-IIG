import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { approvalWorkflows, companies } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(approvalWorkflows)
        .where(eq(approvalWorkflows.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Approval workflow not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const companyId = searchParams.get('companyId');
    const isActive = searchParams.get('isActive');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(approvalWorkflows);

    // Build conditions
    const conditions = [];

    // Filter by company ID
    if (companyId) {
      const companyIdInt = parseInt(companyId);
      if (!isNaN(companyIdInt)) {
        conditions.push(eq(approvalWorkflows.companyId, companyIdInt));
      }
    }

    // Filter by isActive status
    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === 'true';
      conditions.push(eq(approvalWorkflows.isActive, isActiveBool));
    }

    // Search by name
    if (search) {
      conditions.push(like(approvalWorkflows.name, `%${search}%`));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderDirection = order === 'asc' ? asc : desc;
    if (sort === 'name') {
      query = query.orderBy(orderDirection(approvalWorkflows.name));
    } else if (sort === 'companyId') {
      query = query.orderBy(orderDirection(approvalWorkflows.companyId));
    } else if (sort === 'isActive') {
      query = query.orderBy(orderDirection(approvalWorkflows.isActive));
    } else {
      query = query.orderBy(orderDirection(approvalWorkflows.createdAt));
    }

    const results = await query.limit(limit).offset(offset);
    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { companyId, name, isActive } = requestBody;

    // Validate required fields
    if (!companyId) {
      return NextResponse.json({ 
        error: "Company ID is required",
        code: "MISSING_COMPANY_ID" 
      }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    // Validate companyId is valid integer
    const companyIdInt = parseInt(companyId);
    if (isNaN(companyIdInt)) {
      return NextResponse.json({ 
        error: "Company ID must be a valid number",
        code: "INVALID_COMPANY_ID" 
      }, { status: 400 });
    }

    // Validate company exists
    const existingCompany = await db.select()
      .from(companies)
      .where(eq(companies.id, companyIdInt))
      .limit(1);

    if (existingCompany.length === 0) {
      return NextResponse.json({ 
        error: "Company not found",
        code: "COMPANY_NOT_FOUND" 
      }, { status: 400 });
    }

    // Validate and sanitize name
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return NextResponse.json({ 
        error: "Name must be at least 3 characters long",
        code: "NAME_TOO_SHORT" 
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData = {
      companyId: companyIdInt,
      name: trimmedName,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date().toISOString()
    };

    const newRecord = await db.insert(approvalWorkflows)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Check if record exists
    const existingRecord = await db.select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Approval workflow not found' }, { status: 404 });
    }

    // Prepare update data
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and update name if provided
    if (requestBody.name !== undefined) {
      const trimmedName = requestBody.name.trim();
      if (trimmedName.length < 3) {
        return NextResponse.json({ 
          error: "Name must be at least 3 characters long",
          code: "NAME_TOO_SHORT" 
        }, { status: 400 });
      }
      updates.name = trimmedName;
    }

    // Update isActive if provided
    if (requestBody.isActive !== undefined) {
      updates.isActive = Boolean(requestBody.isActive);
    }

    const updated = await db.update(approvalWorkflows)
      .set(updates)
      .where(eq(approvalWorkflows.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Approval workflow not found' }, { status: 404 });
    }

    const deleted = await db.delete(approvalWorkflows)
      .where(eq(approvalWorkflows.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Approval workflow deleted successfully',
      deletedRecord: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}