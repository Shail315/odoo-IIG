import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      }, { status: 400 });
    }
    
    // Find user by email
    const userResults = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (userResults.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      }, { status: 401 });
    }
    
    const user = userResults[0];
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      }, { status: 401 });
    }
    
    // Get company information
    const companyResults = await db.select()
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1);
    
    const company = companyResults[0];
    
    // Return user data (excluding password)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        managerId: user.managerId,
        isManagerApprover: user.isManagerApprover
      },
      company: company || null
    }, { status: 200 });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}