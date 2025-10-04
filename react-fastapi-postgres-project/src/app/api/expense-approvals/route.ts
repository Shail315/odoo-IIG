import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenseApprovals, expenses, users } from '@/db/schema';
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
      
      const approval = await db.select()
        .from(expenseApprovals)
        .where(eq(expenseApprovals.id, parseInt(id)))
        .limit(1);
      
      if (approval.length === 0) {
        return NextResponse.json({ error: 'Expense approval not found' }, { status: 404 });
      }
      
      return NextResponse.json(approval[0]);
    }
    
    // List with filters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const expenseId = searchParams.get('expenseId');
    const approverId = searchParams.get('approverId');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    
    let query = db.select().from(expenseApprovals);
    let whereConditions = [];
    
    if (expenseId) {
      whereConditions.push(eq(expenseApprovals.expenseId, parseInt(expenseId)));
    }
    
    if (approverId) {
      whereConditions.push(eq(expenseApprovals.approverId, parseInt(approverId)));
    }
    
    if (status) {
      whereConditions.push(eq(expenseApprovals.status, status));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // Apply sorting
    const sortColumn = expenseApprovals[sort as keyof typeof expenseApprovals] || expenseApprovals.createdAt;
    query = order === 'asc' ? query.orderBy(asc(sortColumn)) : query.orderBy(desc(sortColumn));
    
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
    const { expenseId, approverId, stepOrder, status = 'pending', comments } = requestBody;
    
    // Validate required fields
    if (!expenseId) {
      return NextResponse.json({ 
        error: "Expense ID is required",
        code: "MISSING_EXPENSE_ID" 
      }, { status: 400 });
    }
    
    if (!approverId) {
      return NextResponse.json({ 
        error: "Approver ID is required",
        code: "MISSING_APPROVER_ID" 
      }, { status: 400 });
    }
    
    if (!stepOrder) {
      return NextResponse.json({ 
        error: "Step order is required",
        code: "MISSING_STEP_ORDER" 
      }, { status: 400 });
    }
    
    // Validate expense ID
    if (isNaN(parseInt(expenseId))) {
      return NextResponse.json({ 
        error: "Valid expense ID is required",
        code: "INVALID_EXPENSE_ID" 
      }, { status: 400 });
    }
    
    // Validate approver ID
    if (isNaN(parseInt(approverId))) {
      return NextResponse.json({ 
        error: "Valid approver ID is required",
        code: "INVALID_APPROVER_ID" 
      }, { status: 400 });
    }
    
    // Validate step order
    if (isNaN(parseInt(stepOrder)) || parseInt(stepOrder) <= 0) {
      return NextResponse.json({ 
        error: "Step order must be a positive integer",
        code: "INVALID_STEP_ORDER" 
      }, { status: 400 });
    }
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: "Status must be one of: pending, approved, rejected",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }
    
    // Validate expense exists
    const expense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(expenseId)))
      .limit(1);
    
    if (expense.length === 0) {
      return NextResponse.json({ 
        error: "Expense not found",
        code: "EXPENSE_NOT_FOUND" 
      }, { status: 400 });
    }
    
    // Validate approver exists
    const approver = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(approverId)))
      .limit(1);
    
    if (approver.length === 0) {
      return NextResponse.json({ 
        error: "Approver not found",
        code: "APPROVER_NOT_FOUND" 
      }, { status: 400 });
    }
    
    // Prepare insert data
    const insertData = {
      expenseId: parseInt(expenseId),
      approverId: parseInt(approverId),
      stepOrder: parseInt(stepOrder),
      status: status || 'pending',
      comments: comments || null,
      approvedAt: (status === 'approved' || status === 'rejected') ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    };
    
    const newApproval = await db.insert(expenseApprovals)
      .values(insertData)
      .returning();
    
    return NextResponse.json(newApproval[0], { status: 201 });
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
    const { status, comments, approverId, stepOrder } = requestBody;
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "Status must be one of: pending, approved, rejected",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
    }
    
    // Validate approver ID if provided
    if (approverId && (isNaN(parseInt(approverId)))) {
      return NextResponse.json({ 
        error: "Valid approver ID is required",
        code: "INVALID_APPROVER_ID" 
      }, { status: 400 });
    }
    
    // Validate step order if provided
    if (stepOrder && (isNaN(parseInt(stepOrder)) || parseInt(stepOrder) <= 0)) {
      return NextResponse.json({ 
        error: "Step order must be a positive integer",
        code: "INVALID_STEP_ORDER" 
      }, { status: 400 });
    }
    
    // Check if approval exists
    const existingApproval = await db.select()
      .from(expenseApprovals)
      .where(eq(expenseApprovals.id, parseInt(id)))
      .limit(1);
    
    if (existingApproval.length === 0) {
      return NextResponse.json({ error: 'Expense approval not found' }, { status: 404 });
    }
    
    // If approver ID is being updated, validate the user exists
    if (approverId) {
      const approver = await db.select()
        .from(users)
        .where(eq(users.id, parseInt(approverId)))
        .limit(1);
      
      if (approver.length === 0) {
        return NextResponse.json({ 
          error: "Approver not found",
          code: "APPROVER_NOT_FOUND" 
        }, { status: 400 });
      }
    }
    
    // Prepare update data
    const updates: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (status !== undefined) {
      updates.status = status;
      // Auto-set approvedAt when status changes to approved or rejected
      if (status === 'approved' || status === 'rejected') {
        updates.approvedAt = new Date().toISOString();
      } else if (status === 'pending') {
        updates.approvedAt = null;
      }
    }
    
    if (comments !== undefined) {
      updates.comments = comments;
    }
    
    if (approverId !== undefined) {
      updates.approverId = parseInt(approverId);
    }
    
    if (stepOrder !== undefined) {
      updates.stepOrder = parseInt(stepOrder);
    }
    
    const updatedApproval = await db.update(expenseApprovals)
      .set(updates)
      .where(eq(expenseApprovals.id, parseInt(id)))
      .returning();
    
    if (updatedApproval.length === 0) {
      return NextResponse.json({ error: 'Failed to update expense approval' }, { status: 404 });
    }
    
    return NextResponse.json(updatedApproval[0]);
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
    
    // Check if approval exists
    const existingApproval = await db.select()
      .from(expenseApprovals)
      .where(eq(expenseApprovals.id, parseInt(id)))
      .limit(1);
    
    if (existingApproval.length === 0) {
      return NextResponse.json({ error: 'Expense approval not found' }, { status: 404 });
    }
    
    const deletedApproval = await db.delete(expenseApprovals)
      .where(eq(expenseApprovals.id, parseInt(id)))
      .returning();
    
    if (deletedApproval.length === 0) {
      return NextResponse.json({ error: 'Failed to delete expense approval' }, { status: 404 });
    }
    
    return NextResponse.json({
      message: 'Expense approval deleted successfully',
      deletedApproval: deletedApproval[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}