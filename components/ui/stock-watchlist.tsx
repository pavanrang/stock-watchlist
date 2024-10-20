"use client"

import { useState, useEffect } from "react"
import { Search, Plus, X, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  volume?: number
  dayHigh?: number
  dayLow?: number
  previousClose?: number
  yearHigh?: number
  yearLow?: number
}

interface NewsItem {
  title: string
  snippet: string
  source: string
  link: string
}

export default function StockWatchlist() {
  const [watchlist, setWatchlist] = useState<Stock[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [stockToAdd, setStockToAdd] = useState<Stock | null>(null)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [recentNews, setRecentNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(false)
  const [newsAnalysis, setNewsAnalysis] = useState<string>("")
  const [newsSources, setNewsSources] = useState<NewsItem[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)


  useEffect(() => {
    const savedWatchlist = localStorage.getItem("watchlist")
    if (savedWatchlist) {
      try {
        setWatchlist(JSON.parse(savedWatchlist))
      } catch (e) {
        console.error("Error loading watchlist:", e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist))
  }, [watchlist])

  const fetchStockData = async (symbol: string): Promise<Stock | null> => {
    try {
      const response = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch stock data')
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching stock data:", error)
      setError(error instanceof Error ? error.message : 'Failed to fetch stock data')
      return null
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    
    setLoading(true)
    setError(null)
    
    const stock = await fetchStockData(searchTerm.toUpperCase())
    setLoading(false)
    
    if (stock) {
      if (watchlist.some(s => s.symbol === stock.symbol)) {
        setError("This stock is already in your watchlist")
        return
      }
      setStockToAdd(stock)
      setShowConfirmDialog(true)
    }
  }
  const fetchRecentNews = async (symbol: string) => {
    setLoadingNews(true)
    try {
      const response = await fetch(`/api/stocks/news?symbol=${encodeURIComponent(symbol)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent news')
      }
      const data = await response.json()
      setRecentNews(data.news)
    } catch (error) {
      console.error("Error fetching recent news:", error)
      setError("Failed to fetch recent news")
    } finally {
      setLoadingNews(false)
    }
  }

  const fetchNewsAnalysis = async (symbol: string) => {
    setLoadingAnalysis(true)
    try {
      const response = await fetch(`/api/stocks/news?symbol=${encodeURIComponent(symbol)}&analyze=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch news analysis.')
      }
      const data = await response.json()
      setNewsAnalysis(data.analysis)
      setNewsSources(data.sources)
    } catch (error) {
      console.error("Error fetching news analysis:", error)
      setError("Failed to fetch news analysis")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const showAnalysis = async (stock: Stock) => {
    setSelectedStock(stock)
    setShowAnalysisDialog(true)
    setLoadingNews(true)
    setLoadingAnalysis(true)
    setError(null)

    try {
      const [newsResponse, analysisResponse] = await Promise.all([
        fetch(`/api/stocks/news?symbol=${encodeURIComponent(stock.symbol)}`),
        fetch(`/api/stocks/news?symbol=${encodeURIComponent(stock.symbol)}&analyze=true`)
      ]);

      if (!newsResponse.ok) {
        throw new Error('Failed to fetch recent news')
      }
      if (!analysisResponse.ok) {
        throw new Error('Failed to fetch news analysis')
      }

      const newsData = await newsResponse.json()
      const analysisData = await analysisResponse.json()

      setRecentNews(newsData.news)
      setNewsAnalysis(analysisData.analysis)
      setNewsSources(analysisData.sources)
    } catch (error) {
      console.error("Error fetching news and analysis:", error)
      setError("Failed to fetch news and analysis")
    } finally {
      setLoadingNews(false)
      setLoadingAnalysis(false)
    }
  }

  const addToWatchlist = () => {
    if (stockToAdd && !watchlist.some((s) => s.symbol === stockToAdd.symbol)) {
      setWatchlist([...watchlist, stockToAdd])
    }
    setShowConfirmDialog(false)
    setSearchTerm("")
    setStockToAdd(null)
  }

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter((stock) => stock.symbol !== symbol))
  }

  const refreshWatchlist = async () => {
    if (refreshing || watchlist.length === 0) return
    
    setRefreshing(true)
    setError(null)

    try {
      const updatedStocks = await Promise.all(
        watchlist.map(async (stock) => {
          const updated = await fetchStockData(stock.symbol)
          return updated || stock
        })
      )
      setWatchlist(updatedStocks.filter((stock): stock is Stock => stock !== null))
    } catch (error) {
      setError("Failed to refresh watchlist")
    } finally {
      setRefreshing(false)
    }
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B'
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M'
    }
    return num.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stock Watchlist</h1>
          <p className="mt-2 text-gray-600">Track your favorite stocks in real-time</p>
        </div>
        
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter stock symbol (e.g., AAPL)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="flex-grow"
              maxLength={10}
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
          
          <div className="flex justify-between items-center">
            <div>
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={refreshWatchlist}
              disabled={refreshing || watchlist.length === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? "Refreshing..." : "Refresh All"}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="hidden md:table-cell">Volume</TableHead>
                <TableHead className="hidden md:table-cell">Day Range</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watchlist.map((stock) => (
                <TableRow key={stock.symbol}>
                  <TableCell className="font-medium">{stock.symbol}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={stock.name}>
                    {stock.name}
                  </TableCell>
                  <TableCell>${stock.price.toFixed(2)}</TableCell>
                  <TableCell
                    className={stock.change >= 0 ? "text-green-600" : "text-red-600"}
                  >
                    {stock.change >= 0 ? (
                      <TrendingUp className="inline h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="inline h-4 w-4 mr-1" />
                    )}
                    {stock.change.toFixed(2)}%
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {stock.volume ? formatLargeNumber(stock.volume) : 'N/A'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    ${stock.dayLow?.toFixed(2)} - ${stock.dayHigh?.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showAnalysis(stock)}
                      >
                        Analyze
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromWatchlist(stock.symbol)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {watchlist.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No stocks in watchlist. Use the search bar to add stocks.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
            <DialogDescription>
              Do you want to add {stockToAdd?.symbol} ({stockToAdd?.name}) to your watchlist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addToWatchlist}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analysis for {selectedStock?.symbol}</DialogTitle>
            <DialogDescription>
              {selectedStock?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-500">Current Price</h4>
                <p className="text-lg">${selectedStock?.price.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-500">Change</h4>
                <p className={`text-lg ${selectedStock?.change && selectedStock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {selectedStock?.change?.toFixed(2)}%
                  {selectedStock?.change && selectedStock.change >= 0 ? (
                    <TrendingUp className="inline h-4 w-4 ml-1" />
                  ) : (
                    <TrendingDown className="inline h-4 w-4 ml-1" />
                  )}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-500">Volume</h4>
                <p className="text-lg">
                  {selectedStock?.volume ? formatLargeNumber(selectedStock.volume) : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-500">Previous Close</h4>
                <p className="text-lg">${selectedStock?.previousClose?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-500">Day Range</h4>
                <p className="text-lg">
                  ${selectedStock?.dayLow?.toFixed(2)} - ${selectedStock?.dayHigh?.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-500">52-Week Range</h4>
                <p className="text-lg">
                  ${selectedStock?.yearLow?.toFixed(2)} - ${selectedStock?.yearHigh?.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="font-semibold text-lg mb-2">What happened with {selectedStock?.symbol} in the last 24 hours?</h4>
              {loadingAnalysis ? (
              <p>Analyzing recent news...</p>
            ) : newsAnalysis ? (
              <>
                <div className="prose max-w-none">
                  <p>{newsAnalysis}</p>
                </div>
                {/* <h5 className="font-semibold text-md mt-4 mb-2">Sources:</h5> */}
                <ul className="list-disc pl-5 space-y-2">
                  {newsSources.map((item, index) => (
                    <li key={index}>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {item.title}
                      </a>
                      <p className="text-xs text-gray-500">Source: {item.source}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No recent news analysis available.</p>
            )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAnalysisDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
