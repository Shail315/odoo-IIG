import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
    
    if (!response.ok) {
      throw new Error('Failed to fetch countries data');
    }
    
    const data = await response.json();
    
    // Transform data to a more usable format
    const countries = data.map((country: any) => {
      const currencies = country.currencies ? Object.keys(country.currencies).map((code) => ({
        code,
        name: country.currencies[code].name,
        symbol: country.currencies[code].symbol || ''
      })) : [];
      
      return {
        name: country.name.common,
        officialName: country.name.official,
        currencies
      };
    }).filter((country: any) => country.currencies.length > 0);
    
    // Sort alphabetically by country name
    countries.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    return NextResponse.json(countries);
  } catch (error) {
    console.error('Countries API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch countries data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}