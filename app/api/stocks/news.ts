// app/api/stocks/news/route.ts
import { NextResponse } from 'next/server'

const SERPER_API_KEY = process.env.SERPER_API_KEY

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 })
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${symbol} stock news`,
        num: 5,
        tbs: 'qdr:d',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch news from Serper API')
    }

    const data = await response.json()
    const news = data.organic.map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      source: item.source,
    }))

    return NextResponse.json({ news })
  } catch (error) {
    console.error('Error fetching stock news:', error)
    return NextResponse.json({ error: 'Failed to fetch stock news' }, { status: 500 })
  }
}