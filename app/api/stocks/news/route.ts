// app/api/stocks/news-analysis/route.ts
import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const SERPER_API_KEY = process.env.SERPER_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY

const client = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: GROQ_API_KEY,
})

const _rag_query_text = `
You are a large language AI assistant built by Pavan. You are given a user question, and please write a clean, concise and accurate answer to the question. You will be given a set of related contexts to the question. Please use the context.

Your answer must be correct, accurate and written by an expert using an unbiased and professional tone. Please limit to 1024 tokens. Do not give any information that is not related to the question, and do not repeat. Say "information is missing on" followed by the related topic, if the given context do not provide sufficient information.

Here are the set of contexts:

{context}

Remember, don't blindly repeat the contexts. And here is the user question:
`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const analyze = searchParams.get('analyze') === 'true'

  if (!symbol) {
    return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 })
  }

  try {
    // Fetch news from Serper API
    const serperResponse = await fetch('https://google.serper.dev/search', {
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

    if (!serperResponse.ok) {
      throw new Error('Failed to fetch news from Serper API')
    }

    const serperData = await serperResponse.json()
    const news = serperData.organic.map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      source: item.source,
      link: item.link,
    }))

    if (!analyze) {
      return NextResponse.json({ news })
    }

    // Prepare context for Groq LLM
    const context = news.map((item: any, index: number) => 
      `[[citation:${index + 1}]] ${item.title} - ${item.snippet}`
    ).join('\n\n')

    // Query Groq LLM
    const query = `What happened with ${symbol} stock in the last 24 hours?`
    const prompt = _rag_query_text.replace('{context}', context) + query

    const groqResponse = await client.chat.completions.create({
      model: "llama-3.2-3b-preview",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: query }
      ],
      temperature: 0.5,
      max_tokens: 1024,
      top_p: 1,
    })

    const analysis = groqResponse.choices[0].message.content

    return NextResponse.json({ analysis, sources: news })
  } catch (error) {
    console.error('Error processing stock news:', error)
    return NextResponse.json({ error: 'Failed to process stock news' }, { status: 500 })
  }
}
