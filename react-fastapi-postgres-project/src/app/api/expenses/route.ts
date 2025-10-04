import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, users, companies, expenseApprovals } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get single expense by ID
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const expense = await db.select()
        .from(expenses)
        .where(eq(expenses.id, parseInt(id)))
        .limit(1);

      if (expense.length === 0) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }

      return NextResponse.json(expense[0]);
    } else {
      // List expenses with filtering and pagination
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const search = searchParams.get('search');
      const employeeId = searchParams.get('employeeId');
      const companyId = searchParams.get('companyId');
      const status = searchParams.get('status');
      const category = searchParams.get('category');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      const sort = searchParams.get('sort') || 'createdAt';
      const order = searchParams.get('order') || 'desc';

      let query = db.select().from(expenses);
      const conditions = [];

      // Apply filters
      if (employeeId) {
        conditions.push(eq(expenses.employeeId, parseInt(employeeId)));
      }

      if (companyId) {
        conditions.push(eq(expenses.companyId, parseInt(companyId)));
      }

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

      if (search) {
        conditions.push(
          or(
            like(expenses.description, `%${search}%`),
            like(expenses.category, `%${search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const sortDirection = order === 'asc' ? asc : desc;
      if (sort === 'createdAt') {
        query = query.orderBy(sortDirection(expenses.createdAt));
      } else if (sort === 'amount') {
        query = query.orderBy(sortDirection(expenses.amount));
      } else if (sort === 'expenseDate') {
        query = query.orderBy(sortDirection(expenses.expenseDate));
      } else {
        query = query.orderBy(desc(expenses.createdAt));
      }

      const results = await query.limit(limit).offset(offset);

      return NextResponse.json(results);
    }
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
    const { 
      employeeId, 
      companyId, 
      amount, 
      currency, 
      convertedAmount, 
      category, 
      description, 
      expenseDate,
      receiptUrl,
      ocrData 
    } = requestBody;

    // Validate required fields
    if (!employeeId) {
      return NextResponse.json({ 
        error: "Employee ID is required",
        code: "MISSING_EMPLOYEE_ID" 
      }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ 
        error: "Company ID is required",
        code: "MISSING_COMPANY_ID" 
      }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: "Amount must be a positive number",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    if (!currency || currency.length !== 3) {
      return NextResponse.json({ 
        error: "Currency must be a 3-character currency code",
        code: "INVALID_CURRENCY" 
      }, { status: 400 });
    }

    if (!convertedAmount || convertedAmount <= 0) {
      return NextResponse.json({ 
        error: "Converted amount must be a positive number",
        code: "INVALID_CONVERTED_AMOUNT" 
      }, { status: 400 });
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ 
        error: "Category is required",
        code: "MISSING_CATEGORY" 
      }, { status: 400 });
    }

    if (!expenseDate) {
      return NextResponse.json({ 
        error: "Expense date is required",
        code: "MISSING_EXPENSE_DATE" 
      }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!dateRegex.test(expenseDate)) {
      return NextResponse.json({ 
        error: "Expense date must be a valid ISO date string",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate foreign keys exist
    const employee = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(employeeId)))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json({ 
        error: "Employee not found",
        code: "EMPLOYEE_NOT_FOUND" 
      }, { status: 400 });
    }

    const company = await db.select()
      .from(companies)
      .where(eq(companies.id, parseInt(companyId)))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json({ 
        error: "Company not found",
        code: "COMPANY_NOT_FOUND" 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedCategory = category.trim();
    const sanitizedDescription = description ? description.trim() : null;

    const newExpense = await db.insert(expenses)
      .values({
        employeeId: parseInt(employeeId),
        companyId: parseInt(companyId),
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        convertedAmount: parseFloat(convertedAmount),
        category: sanitizedCategory,
        description: sanitizedDescription,
        expenseDate,
        status: 'pending',
        currentApprovalStep: 0,
        receiptUrl: receiptUrl || null,
        ocrData: ocrData || null,
        createdAt: new Date().toISOString()
      })
      .returning();

    const createdExpense = newExpense[0];

    // Create approval record if employee has a manager who is an approver
    const employeeData = employee[0];
    if (employeeData.managerId) {
      // Fetch the manager to check if they are an approver
      const manager = await db.select()
        .from(users)
        .where(eq(users.id, employeeData.managerId))
        .limit(1);
      
      if (manager.length > 0 && manager[0].isManagerApprover) {
        await db.insert(expenseApprovals)
          .values({
            expenseId: createdExpense.id,
            approverId: employeeData.managerId,
            stepOrder: 1,
            status: 'pending',
            comments: null,
            approvedAt: null,
            createdAt: new Date().toISOString()
          });
        
        // Update expense with current approver info
        await db.update(expenses)
          .set({
            currentApproverId: employeeData.managerId,
            currentApprovalStep: 1
          })
          .where(eq(expenses.id, createdExpense.id));
      }
    }

    return NextResponse.json(createdExpense, { status: 201 });

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
    const { 
      amount, 
      currency, 
      convertedAmount, 
      category, 
      description, 
      expenseDate, 
      status, 
      currentApproverId, 
      currentApprovalStep, 
      receiptUrl, 
      ocrData 
    } = requestBody;

    // Check if expense exists
    const existingExpense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Validate fields if provided
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json({ 
        error: "Amount must be a positive number",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    if (currency && currency.length !== 3) {
      return NextResponse.json({ 
        error: "Currency must be a 3-character currency code",
        code: "INVALID_CURRENCY" 
      }, { status: 400 });
    }

    if (convertedAmount !== undefined && convertedAmount <= 0) {
      return NextResponse.json({ 
        error: "Converted amount must be a positive number",
        code: "INVALID_CONVERTED_AMOUNT" 
      }, { status: 400 });
    }

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: "Status must be one of: pending, approved, rejected",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    if (expenseDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!dateRegex.test(expenseDate)) {
        return NextResponse.json({ 
          error: "Expense date must be a valid ISO date string",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (currency) updates.currency = currency.toUpperCase();
    if (convertedAmount !== undefined) updates.convertedAmount = parseFloat(convertedAmount);
    if (category) updates.category = category.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (expenseDate) updates.expenseDate = expenseDate;
    if (status) updates.status = status;
    if (currentApproverId !== undefined) updates.currentApproverId = currentApproverId ? parseInt(currentApproverId) : null;
    if (currentApprovalStep !== undefined) updates.currentApprovalStep = parseInt(currentApprovalStep);
    if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl || null;
    if (ocrData !== undefined) updates.ocrData = ocrData || null;

    const updated = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

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

    // Check if expense exists before deleting
    const existingExpense = await db.select()
      .from(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .limit(1);

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const deleted = await db.delete(expenses)
      .where(eq(expenses.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Expense deleted successfully',
      expense: deleted[0] 
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}