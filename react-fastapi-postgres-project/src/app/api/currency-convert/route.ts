import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = searchParams.get('base');
    const targetCurrency = searchParams.get('target');
    const amount = searchParams.get('amount');
    
    if (!baseCurrency) {
      return NextResponse.json({ 
        error: 'Base currency is required',
        code: 'MISSING_BASE_CURRENCY'
      }, { status: 400 });
    }
    
    // Fetch exchange rates
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency.toUpperCase()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    
    // If target currency is specified, return specific conversion
    if (targetCurrency) {
      const rate = data.rates[targetCurrency.toUpperCase()];
      
      if (!rate) {
        return NextResponse.json({ 
          error: 'Target currency not found',
          code: 'INVALID_TARGET_CURRENCY'
        }, { status: 400 });
      }
      
      const result: any = {
        base: baseCurrency.toUpperCase(),
        target: targetCurrency.toUpperCase(),
        rate,
        date: data.date
      };
      
      // If amount is provided, calculate converted amount
      if (amount) {
        const amountNum = parseFloat(amount);
        if (!isNaN(amountNum)) {
          result.amount = amountNum;
          result.convertedAmount = amountNum * rate;
        }
      }
      
      return NextResponse.json(result);
    }
    
    // Return all rates if no target specified
    return NextResponse.json({
      base: baseCurrency.toUpperCase(),
      date: data.date,
      rates: data.rates
    });
    
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json({ 
      error: 'Failed to convert currency',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}