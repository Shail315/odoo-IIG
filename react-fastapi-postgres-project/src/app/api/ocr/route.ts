import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Use OCR.space free API
    const ocrFormData = new FormData();
    ocrFormData.append('base64Image', `data:${file.type};base64,${base64}`);
    ocrFormData.append('language', 'eng');
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('detectOrientation', 'true');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': 'K87899142388957', // Free API key from OCR.space
      },
      body: ocrFormData,
    });

    const ocrResult = await ocrResponse.json();

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults?.[0]) {
      const extractedText = ocrResult.ParsedResults[0].ParsedText;
      
      // Parse the extracted text to identify expense details
      const parsedData = parseReceiptText(extractedText);

      return NextResponse.json({
        success: true,
        text: extractedText,
        parsed: parsedData,
      });
    } else {
      return NextResponse.json(
        { error: 'OCR processing failed', details: ocrResult.ErrorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: 'Failed to process receipt', details: error.message },
      { status: 500 }
    );
  }
}

function parseReceiptText(text: string) {
  const result: {
    amount?: number;
    currency?: string;
    date?: string;
    description?: string;
    merchantName?: string;
    category?: string;
  } = {};

  // Extract amount (look for currency symbols and numbers)
  const amountPatterns = [
    /(?:total|amount|sum|grand total|subtotal)[:\s]*[$€£¥₹]?\s*(\d+[.,]\d{2})/i,
    /[$€£¥₹]\s*(\d+[.,]\d{2})/,
    /(\d+[.,]\d{2})\s*(?:usd|eur|gbp|inr|jpy)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.amount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }

  // Extract currency
  const currencyMap: { [key: string]: string } = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
  };

  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (text.includes(symbol)) {
      result.currency = code;
      break;
    }
  }

  // Check for currency codes in text
  const currencyMatch = text.match(/\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/i);
  if (currencyMatch && !result.currency) {
    result.currency = currencyMatch[1].toUpperCase();
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    /(?:date|dated)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          result.date = date.toISOString().split('T')[0];
          break;
        }
      } catch (e) {
        // Try parsing with different formats
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [first, second, third] = parts;
          // Try different date formats
          const formats = [
            new Date(`${third}-${first}-${second}`), // MM/DD/YYYY
            new Date(`${third}-${second}-${first}`), // DD/MM/YYYY
            new Date(`${first}-${second}-${third}`), // YYYY/MM/DD
          ];
          
          for (const date of formats) {
            if (!isNaN(date.getTime())) {
              result.date = date.toISOString().split('T')[0];
              break;
            }
          }
        }
      }
    }
  }

  // Extract merchant name (usually at the top of receipt)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    // Take first non-empty line as potential merchant name
    result.merchantName = lines[0].trim().slice(0, 100);
  }

  // Guess category based on keywords
  const categoryKeywords: { [key: string]: string[] } = {
    meals: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast'],
    travel: ['airline', 'flight', 'train', 'bus', 'taxi', 'uber', 'lyft', 'ticket'],
    accommodation: ['hotel', 'motel', 'inn', 'lodge', 'resort', 'accommodation'],
    transportation: ['gas', 'fuel', 'parking', 'toll', 'metro', 'subway'],
    'office-supplies': ['office', 'supplies', 'stationery', 'paper', 'pen'],
  };

  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      result.category = category;
      break;
    }
  }

  // Create description from merchant name and amount
  if (result.merchantName) {
    result.description = `Expense at ${result.merchantName}`;
  }

  return result;
}