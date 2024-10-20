import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 }
      );
    }

    const result = await yahooFinance.quote(symbol, {
      fields: [
        "symbol",
        "shortName",
        "longName",
        "regularMarketPrice",
        "regularMarketChangePercent",
        "regularMarketVolume",
        "regularMarketDayHigh",
        "regularMarketDayLow",
        "regularMarketPreviousClose",
        "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow"
      ]
    });

    const stockData = {
      symbol: result.symbol,
      name: result.longName || result.shortName || result.symbol,
      price: result.regularMarketPrice,
      change: result.regularMarketChangePercent,
      volume: result.regularMarketVolume,
      dayHigh: result.regularMarketDayHigh,
      dayLow: result.regularMarketDayLow,
      previousClose: result.regularMarketPreviousClose,
      yearHigh: result.fiftyTwoWeekHigh,
      yearLow: result.fiftyTwoWeekLow
    };

    return NextResponse.json(stockData, { status: 200 });
  } catch (error: any) {
    if (error instanceof yahooFinance.errors.FailedYahooValidationError) {
      return NextResponse.json(
        { error: 'Invalid stock data received' },
        { status: 400 }
      );
    } else if (error instanceof yahooFinance.errors.HTTPError) {
      const { searchParams } = new URL(request.url);
      return NextResponse.json(
        { error: `Failed to fetch data for ${searchParams.get('symbol')}: ${error.message}` },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: `Unexpected error: ${error.message}` },
        { status: 500 }
      );
    }
  }
}