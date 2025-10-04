import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, companies } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
const bcrypt = require('bcrypt');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const companyId = searchParams.get('companyId');
    const role = searchParams.get('role');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const user = await db.select({
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
      .where(eq(users.id, parseInt(id)))
      .limit(1);

      if (user.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json(user[0]);
    }

    let query = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      companyId: users.companyId,
      managerId: users.managerId,
      isManagerApprover: users.isManagerApprover,
      createdAt: users.createdAt
    }).from(users);

    const conditions = [];

    if (search) {
      conditions.push(or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      ));
    }

    if (companyId) {
      conditions.push(eq(users.companyId, parseInt(companyId)));
    }

    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (sort === 'name') {
      query = order === 'desc' ? query.orderBy(desc(users.name)) : query.orderBy(asc(users.name));
    } else if (sort === 'email') {
      query = order === 'desc' ? query.orderBy(desc(users.email)) : query.orderBy(asc(users.email));
    } else if (sort === 'role') {
      query = order === 'desc' ? query.orderBy(desc(users.role)) : query.orderBy(asc(users.role));
    } else {
      query = order === 'desc' ? query.orderBy(desc(users.createdAt)) : query.orderBy(asc(users.createdAt));
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
    const { email, password, name, role, companyId, managerId, isManagerApprover } = await request.json();

    if (!email || !password || !name || !role || !companyId) {
      return NextResponse.json({ 
        error: "Email, password, name, role, and companyId are required",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long",
        code: "WEAK_PASSWORD" 
      }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json({ 
        error: "Name must be at least 2 characters long",
        code: "INVALID_NAME" 
      }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'employee'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: "Role must be one of: admin, manager, employee",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    const company = await db.select()
      .from(companies)
      .where(eq(companies.id, parseInt(companyId)))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json({ 
        error: "Invalid company ID",
        code: "INVALID_COMPANY" 
      }, { status: 400 });
    }

    if (managerId) {
      const manager = await db.select()
        .from(users)
        .where(eq(users.id, parseInt(managerId)))
        .limit(1);

      if (manager.length === 0) {
        return NextResponse.json({ 
          error: "Invalid manager ID",
          code: "INVALID_MANAGER" 
        }, { status: 400 });
      }
    }

    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_EXISTS" 
      }, { status: 409 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: trimmedName,
      role,
      companyId: parseInt(companyId),
      managerId: managerId ? parseInt(managerId) : null,
      isManagerApprover: isManagerApprover || false,
      createdAt: new Date().toISOString()
    };

    const newUser = await db.insert(users)
      .values(insertData)
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        companyId: users.companyId,
        managerId: users.managerId,
        isManagerApprover: users.isManagerApprover,
        createdAt: users.createdAt
      });

    return NextResponse.json(newUser[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_EXISTS" 
      }, { status: 409 });
    }
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

    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { email, password, name, role, companyId, managerId, isManagerApprover } = await request.json();

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ 
          error: "Invalid email format",
          code: "INVALID_EMAIL" 
        }, { status: 400 });
      }

      if (email.toLowerCase() !== existingUser[0].email) {
        const existingEmail = await db.select()
          .from(users)
          .where(and(
            eq(users.email, email.toLowerCase()),
            eq(users.id, parseInt(id))
          ))
          .limit(1);

        if (existingEmail.length > 0 && existingEmail[0].id !== parseInt(id)) {
          return NextResponse.json({ 
            error: "Email already exists",
            code: "EMAIL_EXISTS" 
          }, { status: 409 });
        }
      }

      updates.email = email.toLowerCase();
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ 
          error: "Password must be at least 6 characters long",
          code: "WEAK_PASSWORD" 
        }, { status: 400 });
      }
      updates.password = bcrypt.hashSync(password, 10);
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json({ 
          error: "Name must be at least 2 characters long",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updates.name = trimmedName;
    }

    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'employee'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ 
          error: "Role must be one of: admin, manager, employee",
          code: "INVALID_ROLE" 
        }, { status: 400 });
      }
      updates.role = role;
    }

    if (companyId !== undefined) {
      const company = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(companyId)))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json({ 
          error: "Invalid company ID",
          code: "INVALID_COMPANY" 
        }, { status: 400 });
      }
      updates.companyId = parseInt(companyId);
    }

    if (managerId !== undefined) {
      if (managerId !== null) {
        const manager = await db.select()
          .from(users)
          .where(eq(users.id, parseInt(managerId)))
          .limit(1);

        if (manager.length === 0) {
          return NextResponse.json({ 
            error: "Invalid manager ID",
            code: "INVALID_MANAGER" 
          }, { status: 400 });
        }
      }
      updates.managerId = managerId ? parseInt(managerId) : null;
    }

    if (isManagerApprover !== undefined) {
      updates.isManagerApprover = isManagerApprover;
    }

    const updated = await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        companyId: users.companyId,
        managerId: users.managerId,
        isManagerApprover: users.isManagerApprover,
        createdAt: users.createdAt
      });

    if (updated.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_EXISTS" 
      }, { status: 409 });
    }
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}