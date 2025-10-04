import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenseApprovals, expenses, users } from '@/db/schema';
import { eq, and, desc, like } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { approverId: string } }
) {
  try {
    const { approverId } = params;
    const { searchParams } = new URL(request.url);
    
    // Validate approverId
    const approverIdNum = parseInt(approverId);
    if (!approverId || isNaN(approverIdNum)) {
      return NextResponse.json({ 
        error: "Valid approver ID is required",
        code: "INVALID_APPROVER_ID" 
      }, { status: 400 });
    }

    // Validate approver exists and has approval permissions
    const approver = await db.select()
      .from(users)
      .where(eq(users.id, approverIdNum))
      .limit(1);

    if (approver.length === 0) {
      return NextResponse.json({ 
        error: "Approver not found",
        code: "APPROVER_NOT_FOUND" 
      }, { status: 404 });
    }

    const approverUser = approver[0];
    if (approverUser.role !== 'manager' && approverUser.role !== 'admin') {
      return NextResponse.json({ 
        error: "User does not have approval permissions",
        code: "NO_APPROVAL_PERMISSIONS" 
      }, { status: 404 });
    }

    // Get query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const expenseCategory = searchParams.get('expenseCategory');

    // Build query for pending approvals
    let query = db.select({
      approvalId: expenseApprovals.id,
      expenseId: expenseApprovals.expenseId,
      stepOrder: expenseApprovals.stepOrder,
      status: expenseApprovals.status,
      comments: expenseApprovals.comments,
      approvalCreatedAt: expenseApprovals.createdAt,
      expense: {
        id: expenses.id,
        employeeId: expenses.employeeId,
        companyId: expenses.companyId,
        amount: expenses.amount,
        currency: expenses.currency,
        convertedAmount: expenses.convertedAmount,
        category: expenses.category,
        description: expenses.description,
        expenseDate: expenses.expenseDate,
        status: expenses.status,
        currentApproverId: expenses.currentApproverId,
        currentApprovalStep: expenses.currentApprovalStep,
        receiptUrl: expenses.receiptUrl,
        ocrData: expenses.ocrData,
        createdAt: expenses.createdAt
      }
    })
    .from(expenseApprovals)
    .innerJoin(expenses, eq(expenseApprovals.expenseId, expenses.id))
    .where(
      and(
        eq(expenseApprovals.approverId, approverIdNum),
        eq(expenseApprovals.status, 'pending')
      )
    )
    .orderBy(desc(expenses.createdAt));

    // Add expense category filter if provided
    if (expenseCategory) {
      query = db.select({
        approvalId: expenseApprovals.id,
        expenseId: expenseApprovals.expenseId,
        stepOrder: expenseApprovals.stepOrder,
        status: expenseApprovals.status,
        comments: expenseApprovals.comments,
        approvalCreatedAt: expenseApprovals.createdAt,
        expense: {
          id: expenses.id,
          employeeId: expenses.employeeId,
          companyId: expenses.companyId,
          amount: expenses.amount,
          currency: expenses.currency,
          convertedAmount: expenses.convertedAmount,
          category: expenses.category,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
          status: expenses.status,
          currentApproverId: expenses.currentApproverId,
          currentApprovalStep: expenses.currentApprovalStep,
          receiptUrl: expenses.receiptUrl,
          ocrData: expenses.ocrData,
          createdAt: expenses.createdAt
        }
      })
      .from(expenseApprovals)
      .innerJoin(expenses, eq(expenseApprovals.expenseId, expenses.id))
      .where(
        and(
          eq(expenseApprovals.approverId, approverIdNum),
          eq(expenseApprovals.status, 'pending'),
          like(expenses.category, `%${expenseCategory}%`)
        )
      )
      .orderBy(desc(expenses.createdAt));
    }

    // Execute query with pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET pending approvals error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}