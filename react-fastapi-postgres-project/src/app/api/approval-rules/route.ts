import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { approvalRules, companies, users } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');
    const ruleType = searchParams.get('ruleType');
    const isActive = searchParams.get('isActive');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(approvalRules)
        .where(eq(approvalRules.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Approval rule not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filtering
    let query = db.select().from(approvalRules);
    let conditions = [];

    if (companyId) {
      if (isNaN(parseInt(companyId))) {
        return NextResponse.json({ 
          error: "Valid company ID is required",
          code: "INVALID_COMPANY_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(approvalRules.companyId, parseInt(companyId)));
    }

    if (ruleType) {
      if (!['percentage', 'specific_approver', 'hybrid'].includes(ruleType)) {
        return NextResponse.json({ 
          error: "Invalid rule type. Must be 'percentage', 'specific_approver', or 'hybrid'",
          code: "INVALID_RULE_TYPE" 
        }, { status: 400 });
      }
      conditions.push(eq(approvalRules.ruleType, ruleType));
    }

    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === 'true';
      conditions.push(eq(approvalRules.isActive, isActiveBool));
    }

    if (search) {
      const searchCondition = or(
        like(approvalRules.ruleType, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = sort === 'createdAt' ? approvalRules.createdAt : 
                      sort === 'ruleType' ? approvalRules.ruleType :
                      sort === 'percentageThreshold' ? approvalRules.percentageThreshold :
                      approvalRules.createdAt;

    if (order === 'asc') {
      query = query.orderBy(asc(sortColumn));
    } else {
      query = query.orderBy(desc(sortColumn));
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
    const { companyId, ruleType, percentageThreshold, specificApproverId, isActive } = requestBody;

    // Validate required fields
    if (!companyId) {
      return NextResponse.json({ 
        error: "Company ID is required",
        code: "MISSING_COMPANY_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(companyId))) {
      return NextResponse.json({ 
        error: "Valid company ID is required",
        code: "INVALID_COMPANY_ID" 
      }, { status: 400 });
    }

    if (!ruleType) {
      return NextResponse.json({ 
        error: "Rule type is required",
        code: "MISSING_RULE_TYPE" 
      }, { status: 400 });
    }

    if (!['percentage', 'specific_approver', 'hybrid'].includes(ruleType)) {
      return NextResponse.json({ 
        error: "Invalid rule type. Must be 'percentage', 'specific_approver', or 'hybrid'",
        code: "INVALID_RULE_TYPE" 
      }, { status: 400 });
    }

    // Validate company exists
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

    // Rule type specific validations
    if (ruleType === 'percentage') {
      if (!percentageThreshold) {
        return NextResponse.json({ 
          error: "Percentage threshold is required for percentage rule type",
          code: "MISSING_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }

      if (isNaN(parseInt(percentageThreshold)) || percentageThreshold < 1 || percentageThreshold > 100) {
        return NextResponse.json({ 
          error: "Percentage threshold must be between 1 and 100",
          code: "INVALID_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }

      if (specificApproverId !== null && specificApproverId !== undefined) {
        return NextResponse.json({ 
          error: "Specific approver ID must be null for percentage rule type",
          code: "INVALID_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }
    } else if (ruleType === 'specific_approver') {
      if (!specificApproverId) {
        return NextResponse.json({ 
          error: "Specific approver ID is required for specific_approver rule type",
          code: "MISSING_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }

      if (isNaN(parseInt(specificApproverId))) {
        return NextResponse.json({ 
          error: "Valid specific approver ID is required",
          code: "INVALID_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }

      if (percentageThreshold !== null && percentageThreshold !== undefined) {
        return NextResponse.json({ 
          error: "Percentage threshold must be null for specific_approver rule type",
          code: "INVALID_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }

      // Validate specific approver exists
      const approver = await db.select()
        .from(users)
        .where(eq(users.id, parseInt(specificApproverId)))
        .limit(1);

      if (approver.length === 0) {
        return NextResponse.json({ 
          error: "Specific approver not found",
          code: "APPROVER_NOT_FOUND" 
        }, { status: 400 });
      }
    } else if (ruleType === 'hybrid') {
      if (!percentageThreshold) {
        return NextResponse.json({ 
          error: "Percentage threshold is required for hybrid rule type",
          code: "MISSING_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }

      if (!specificApproverId) {
        return NextResponse.json({ 
          error: "Specific approver ID is required for hybrid rule type",
          code: "MISSING_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }

      if (isNaN(parseInt(percentageThreshold)) || percentageThreshold < 1 || percentageThreshold > 100) {
        return NextResponse.json({ 
          error: "Percentage threshold must be between 1 and 100",
          code: "INVALID_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }

      if (isNaN(parseInt(specificApproverId))) {
        return NextResponse.json({ 
          error: "Valid specific approver ID is required",
          code: "INVALID_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }

      // Validate specific approver exists
      const approver = await db.select()
        .from(users)
        .where(eq(users.id, parseInt(specificApproverId)))
        .limit(1);

      if (approver.length === 0) {
        return NextResponse.json({ 
          error: "Specific approver not found",
          code: "APPROVER_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    const insertData = {
      companyId: parseInt(companyId),
      ruleType,
      percentageThreshold: percentageThreshold ? parseInt(percentageThreshold) : null,
      specificApproverId: specificApproverId ? parseInt(specificApproverId) : null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString()
    };

    const newRecord = await db.insert(approvalRules)
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
    const { ruleType, percentageThreshold, specificApproverId, isActive } = requestBody;

    // Check if record exists
    const existingRecord = await db.select()
      .from(approvalRules)
      .where(eq(approvalRules.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Approval rule not found' }, { status: 404 });
    }

    let updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (ruleType !== undefined) {
      if (!['percentage', 'specific_approver', 'hybrid'].includes(ruleType)) {
        return NextResponse.json({ 
          error: "Invalid rule type. Must be 'percentage', 'specific_approver', or 'hybrid'",
          code: "INVALID_RULE_TYPE" 
        }, { status: 400 });
      }
      updates.ruleType = ruleType;
    }

    if (percentageThreshold !== undefined) {
      if (percentageThreshold !== null) {
        if (isNaN(parseInt(percentageThreshold)) || percentageThreshold < 1 || percentageThreshold > 100) {
          return NextResponse.json({ 
            error: "Percentage threshold must be between 1 and 100",
            code: "INVALID_PERCENTAGE_THRESHOLD" 
          }, { status: 400 });
        }
        updates.percentageThreshold = parseInt(percentageThreshold);
      } else {
        updates.percentageThreshold = null;
      }
    }

    if (specificApproverId !== undefined) {
      if (specificApproverId !== null) {
        if (isNaN(parseInt(specificApproverId))) {
          return NextResponse.json({ 
            error: "Valid specific approver ID is required",
            code: "INVALID_SPECIFIC_APPROVER" 
          }, { status: 400 });
        }

        // Validate specific approver exists
        const approver = await db.select()
          .from(users)
          .where(eq(users.id, parseInt(specificApproverId)))
          .limit(1);

        if (approver.length === 0) {
          return NextResponse.json({ 
            error: "Specific approver not found",
            code: "APPROVER_NOT_FOUND" 
          }, { status: 400 });
        }

        updates.specificApproverId = parseInt(specificApproverId);
      } else {
        updates.specificApproverId = null;
      }
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Rule type specific validations for updates
    const finalRuleType = updates.ruleType || existingRecord[0].ruleType;
    const finalPercentageThreshold = updates.percentageThreshold !== undefined ? updates.percentageThreshold : existingRecord[0].percentageThreshold;
    const finalSpecificApproverId = updates.specificApproverId !== undefined ? updates.specificApproverId : existingRecord[0].specificApproverId;

    if (finalRuleType === 'percentage') {
      if (!finalPercentageThreshold) {
        return NextResponse.json({ 
          error: "Percentage threshold is required for percentage rule type",
          code: "MISSING_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }
      if (finalSpecificApproverId !== null) {
        return NextResponse.json({ 
          error: "Specific approver ID must be null for percentage rule type",
          code: "INVALID_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }
    } else if (finalRuleType === 'specific_approver') {
      if (!finalSpecificApproverId) {
        return NextResponse.json({ 
          error: "Specific approver ID is required for specific_approver rule type",
          code: "MISSING_SPECIFIC_APPROVER" 
        }, { status: 400 });
      }
      if (finalPercentageThreshold !== null) {
        return NextResponse.json({ 
          error: "Percentage threshold must be null for specific_approver rule type",
          code: "INVALID_PERCENTAGE_THRESHOLD" 
        }, { status: 400 });
      }
    } else if (finalRuleType === 'hybrid') {
      if (!finalPercentageThreshold || !finalSpecificApproverId) {
        return NextResponse.json({ 
          error: "Both percentage threshold and specific approver ID are required for hybrid rule type",
          code: "MISSING_HYBRID_FIELDS" 
        }, { status: 400 });
      }
    }

    const updated = await db.update(approvalRules)
      .set(updates)
      .where(eq(approvalRules.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Approval rule not found' }, { status: 404 });
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

    // Check if record exists
    const existingRecord = await db.select()
      .from(approvalRules)
      .where(eq(approvalRules.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Approval rule not found' }, { status: 404 });
    }

    const deleted = await db.delete(approvalRules)
      .where(eq(approvalRules.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Approval rule deleted successfully',
      deletedRecord: deleted[0] 
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}