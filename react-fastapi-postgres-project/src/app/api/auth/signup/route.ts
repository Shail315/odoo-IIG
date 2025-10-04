import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, companyName, country, currency } = await request.json();
    
    // Validate required fields
    if (!email || !password || !name || !companyName || !country || !currency) {
      return NextResponse.json({ 
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      }, { status: 400 });
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      }, { status: 409 });
    }
    
    // Create company first
    const newCompany = await db.insert(companies)
      .values({
        name: companyName.trim(),
        country: country.trim(),
        currency: currency.toUpperCase(),
        createdAt: new Date().toISOString()
      })
      .returning();
    
    const company = newCompany[0];
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin user
    const newUser = await db.insert(users)
      .values({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        role: 'admin',
        companyId: company.id,
        managerId: null,
        isManagerApprover: false,
        createdAt: new Date().toISOString()
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        companyId: users.companyId,
        managerId: users.managerId,
        isManagerApprover: users.isManagerApprover
      });
    
    return NextResponse.json({
      user: newUser[0],
      company
    }, { status: 201 });
    
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}