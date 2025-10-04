import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { approvalSteps, approvalWorkflows, users } from '@/db/schema';
import { eq, and, desc, max } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const workflowId = searchParams.get('workflowId');

    // Single step by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const step = await db.select()
        .from(approvalSteps)
        .where(eq(approvalSteps.id, parseInt(id)))
        .limit(1);

      if (step.length === 0) {
        return NextResponse.json({ error: 'Approval step not found' }, { status: 404 });
      }

      return NextResponse.json(step[0]);
    }

    // List steps by workflowId (required)
    if (!workflowId) {
      return NextResponse.json({ 
        error: "workflowId parameter is required",
        code: "MISSING_WORKFLOW_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(workflowId))) {
      return NextResponse.json({ 
        error: "Valid workflowId is required",
        code: "INVALID_WORKFLOW_ID" 
      }, { status: 400 });
    }

    // Verify workflow exists
    const workflow = await db.select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, parseInt(workflowId)))
      .limit(1);

    if (workflow.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const steps = await db.select()
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, parseInt(workflowId)))
      .orderBy(approvalSteps.stepOrder);

    return NextResponse.json(steps);

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
    const { workflowId, approverId, stepOrder } = requestBody;

    // Validate required fields
    if (!workflowId) {
      return NextResponse.json({ 
        error: "workflowId is required",
        code: "MISSING_WORKFLOW_ID" 
      }, { status: 400 });
    }

    if (!approverId) {
      return NextResponse.json({ 
        error: "approverId is required",
        code: "MISSING_APPROVER_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(workflowId))) {
      return NextResponse.json({ 
        error: "Valid workflowId is required",
        code: "INVALID_WORKFLOW_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(approverId))) {
      return NextResponse.json({ 
        error: "Valid approverId is required",
        code: "INVALID_APPROVER_ID" 
      }, { status: 400 });
    }

    // Verify workflow exists
    const workflow = await db.select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, parseInt(workflowId)))
      .limit(1);

    if (workflow.length === 0) {
      return NextResponse.json({ 
        error: "Workflow not found",
        code: "WORKFLOW_NOT_FOUND" 
      }, { status: 404 });
    }

    // Verify approver exists and has appropriate role
    const approver = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(approverId)))
      .limit(1);

    if (approver.length === 0) {
      return NextResponse.json({ 
        error: "Approver not found",
        code: "APPROVER_NOT_FOUND" 
      }, { status: 404 });
    }

    if (!['admin', 'manager'].includes(approver[0].role)) {
      return NextResponse.json({ 
        error: "Approver must have admin or manager role",
        code: "INVALID_APPROVER_ROLE" 
      }, { status: 400 });
    }

    // Auto-assign stepOrder if not provided
    let finalStepOrder = stepOrder;
    if (!stepOrder) {
      const maxStepResult = await db.select({ maxStep: max(approvalSteps.stepOrder) })
        .from(approvalSteps)
        .where(eq(approvalSteps.workflowId, parseInt(workflowId)));
      
      finalStepOrder = (maxStepResult[0]?.maxStep || 0) + 1;
    } else {
      if (isNaN(parseInt(stepOrder)) || parseInt(stepOrder) <= 0) {
        return NextResponse.json({ 
          error: "stepOrder must be a positive integer",
          code: "INVALID_STEP_ORDER" 
        }, { status: 400 });
      }
      finalStepOrder = parseInt(stepOrder);

      // Check if stepOrder already exists for this workflow
      const existingStep = await db.select()
        .from(approvalSteps)
        .where(and(
          eq(approvalSteps.workflowId, parseInt(workflowId)),
          eq(approvalSteps.stepOrder, finalStepOrder)
        ))
        .limit(1);

      if (existingStep.length > 0) {
        return NextResponse.json({ 
          error: "Step order already exists for this workflow",
          code: "DUPLICATE_STEP_ORDER" 
        }, { status: 400 });
      }
    }

    const newStep = await db.insert(approvalSteps)
      .values({
        workflowId: parseInt(workflowId),
        approverId: parseInt(approverId),
        stepOrder: finalStepOrder,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newStep[0], { status: 201 });

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
    const { stepOrder, approverId } = requestBody;

    // Check if record exists
    const existingStep = await db.select()
      .from(approvalSteps)
      .where(eq(approvalSteps.id, parseInt(id)))
      .limit(1);

    if (existingStep.length === 0) {
      return NextResponse.json({ error: 'Approval step not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate approverId if provided
    if (approverId !== undefined) {
      if (isNaN(parseInt(approverId))) {
        return NextResponse.json({ 
          error: "Valid approverId is required",
          code: "INVALID_APPROVER_ID" 
        }, { status: 400 });
      }

      const approver = await db.select()
        .from(users)
        .where(eq(users.id, parseInt(approverId)))
        .limit(1);

      if (approver.length === 0) {
        return NextResponse.json({ 
          error: "Approver not found",
          code: "APPROVER_NOT_FOUND" 
        }, { status: 404 });
      }

      if (!['admin', 'manager'].includes(approver[0].role)) {
        return NextResponse.json({ 
          error: "Approver must have admin or manager role",
          code: "INVALID_APPROVER_ROLE" 
        }, { status: 400 });
      }

      updates.approverId = parseInt(approverId);
    }

    // Validate stepOrder if provided
    if (stepOrder !== undefined) {
      if (isNaN(parseInt(stepOrder)) || parseInt(stepOrder) <= 0) {
        return NextResponse.json({ 
          error: "stepOrder must be a positive integer",
          code: "INVALID_STEP_ORDER" 
        }, { status: 400 });
      }

      // Check if stepOrder already exists for this workflow (excluding current step)
      const duplicateStep = await db.select()
        .from(approvalSteps)
        .where(and(
          eq(approvalSteps.workflowId, existingStep[0].workflowId),
          eq(approvalSteps.stepOrder, parseInt(stepOrder)),
          eq(approvalSteps.id, parseInt(id))
        ))
        .limit(1);

      if (duplicateStep.length === 0) {
        const existingOrderStep = await db.select()
          .from(approvalSteps)
          .where(and(
            eq(approvalSteps.workflowId, existingStep[0].workflowId),
            eq(approvalSteps.stepOrder, parseInt(stepOrder))
          ))
          .limit(1);

        if (existingOrderStep.length > 0) {
          return NextResponse.json({ 
            error: "Step order already exists for this workflow",
            code: "DUPLICATE_STEP_ORDER" 
          }, { status: 400 });
        }
      }

      updates.stepOrder = parseInt(stepOrder);
    }

    const updated = await db.update(approvalSteps)
      .set(updates)
      .where(eq(approvalSteps.id, parseInt(id)))
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
    const existingStep = await db.select()
      .from(approvalSteps)
      .where(eq(approvalSteps.id, parseInt(id)))
      .limit(1);

    if (existingStep.length === 0) {
      return NextResponse.json({ error: 'Approval step not found' }, { status: 404 });
    }

    const deleted = await db.delete(approvalSteps)
      .where(eq(approvalSteps.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Approval step deleted successfully',
      deletedStep: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}