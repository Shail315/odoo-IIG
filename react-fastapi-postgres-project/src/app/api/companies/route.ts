import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companies } from '@/db/schema';
import { eq, like, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single company by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const company = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(id)))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json({ 
          error: 'Company not found' 
        }, { status: 404 });
      }

      return NextResponse.json(company[0]);
    }

    // List companies with pagination and search
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let query = db.select().from(companies).orderBy(desc(companies.createdAt));

    if (search) {
      query = query.where(like(companies.name, `%${search}%`));
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
    const body = await request.json();
    const { name, country, currency } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ 
        error: "Country is required",
        code: "MISSING_COUNTRY" 
      }, { status: 400 });
    }

    if (!currency) {
      return NextResponse.json({ 
        error: "Currency is required",
        code: "MISSING_CURRENCY" 
      }, { status: 400 });
    }

    // Sanitize inputs
    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const trimmedCurrency = currency.trim().toUpperCase();

    // Validate name length
    if (trimmedName.length < 2) {
      return NextResponse.json({ 
        error: "Name must be at least 2 characters long",
        code: "NAME_TOO_SHORT" 
      }, { status: 400 });
    }

    // Validate currency format (3-character code)
    if (!/^[A-Z]{3}$/.test(trimmedCurrency)) {
      return NextResponse.json({ 
        error: "Currency must be a 3-character code (e.g., USD, GBP, EUR)",
        code: "INVALID_CURRENCY_FORMAT" 
      }, { status: 400 });
    }

    // Create new company
    const newCompany = await db.insert(companies)
      .values({
        name: trimmedName,
        country: trimmedCountry,
        currency: trimmedCurrency,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newCompany[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}