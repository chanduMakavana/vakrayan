import { useState, useMemo } from "react"
import { motion } from "framer-motion"
function AdminAnalytics({ orders = [], products = [] }) {
  const [timeRange, setTimeRange] = useState("7") // "7" or "30"

  // 1. Sales Trend calculations (Daily Revenue)
  const salesTrend = useMemo(() => {
    const days = parseInt(timeRange, 10)
    const result = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      
      const dayOrders = orders.filter(o => {
        if (o.status === "CANCELLED") return false
        const oDate = new Date(o.$createdAt || o.createdAt)
        return oDate.toISOString().split("T")[0] === dateStr
      })
      
      const totalRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
      const label = date.toLocaleDateString("en-US", { day: "numeric", month: "short" })
      
      result.push({ dateStr, label, revenue: totalRevenue })
    }
    return result
  }, [orders, timeRange])

  // Chart Peak & Total calculations
  const maxRevenue = useMemo(() => {
    const peak = Math.max(...salesTrend.map(d => d.revenue), 1000)
    return Math.ceil(peak / 500) * 500
  }, [salesTrend])

  const totalPeriodRevenue = useMemo(() => {
    return salesTrend.reduce((sum, d) => sum + d.revenue, 0)
  }, [salesTrend])

  // 2. Order Status distribution calculations (Donut Chart)
  const statusStats = useMemo(() => {
    const counts = {
      DELIVERED: 0,
      PENDING: 0,
      SHIPPED: 0,
      CANCELLED: 0,
      RETURN_REQUESTED: 0,
    }
    
    orders.forEach(o => {
      const status = o.status || "PENDING"
      if (counts[status] !== undefined) {
        counts[status]++
      } else {
        counts[status] = (counts[status] || 0) + 1
      }
    })

    const total = orders.length || 1
    const colorMap = {
      DELIVERED: "#10B981", // Emerald
      PENDING: "#FBBF24", // Yellow
      SHIPPED: "#3B82F6", // Blue
      CANCELLED: "#EF4444", // Red
      RETURN_REQUESTED: "#8B5CF6", // Purple
    }

    return Object.keys(counts).map(key => ({
      name: key.replace("_", " "),
      count: counts[key],
      percentage: Math.round((counts[key] / total) * 100),
      color: colorMap[key] || "#9CA3AF"
    })).filter(s => s.count > 0)
  }, [orders])

  // 3. Best Selling Products calculations
  const bestSellers = useMemo(() => {
    const salesMap = {}
    
    orders.forEach(o => {
      if (o.status === "CANCELLED") return
      let items
      try {
        items = typeof o.items === "string" ? JSON.parse(o.items) : o.items || []
      } catch {
        items = []
      }
      
      items.forEach(item => {
        if (!item.name) return
        if (!salesMap[item.name]) {
          salesMap[item.name] = { name: item.name, quantity: 0, revenue: 0 }
        }
        salesMap[item.name].quantity += Number(item.quantity || 1)
        salesMap[item.name].revenue += Number(item.price || 0) * Number(item.quantity || 1)
      })
    })

    return Object.values(salesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }, [orders])

  // Donut SVG path helper
  let cumulativePercent = 0
  const donutSlices = statusStats.map(stat => {
    const startPercent = cumulativePercent
    cumulativePercent += (stat.count / (orders.length || 1))
    
    // Convert percentage to circle stroke offset
    const strokeDasharray = `${stat.percentage} ${100 - stat.percentage}`
    const strokeDashoffset = 100 - startPercent * 100 + 25 // +25 rotation to start at 12 o'clock
    
    return {
      ...stat,
      dashArray: strokeDasharray,
      dashOffset: strokeDashoffset
    }
  })

  // SVG Line Path calculation
  const svgWidth = 500
  const svgHeight = 160
  const paddingLeft = 50
  const paddingRight = 30
  const paddingTop = 20
  const paddingBottom = 30

  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom

  const trendPoints = salesTrend.map((d, i) => {
    const x = paddingLeft + (i / (salesTrend.length - 1 || 1)) * chartWidth
    const y = paddingTop + chartHeight - (d.revenue / maxRevenue) * chartHeight
    return { ...d, x, y }
  })

  const polylinePoints = trendPoints.map(p => `${p.x},${p.y}`).join(" ")
  const areaPoints = `${paddingLeft},${paddingTop + chartHeight} ${polylinePoints} ${paddingLeft + chartWidth},${paddingTop + chartHeight}`

  return (
    <div className="space-y-6">
      {/* Time range controller */}
      <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xs font-black tracking-[0.4em] text-[var(--color-accent)] uppercase">Analytics Overview</h2>
          <p className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase">HQ sales Performance & Metrics</p>
        </div>
        <div className="flex bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-xl overflow-hidden p-0.5">
          <button
            onClick={() => setTimeRange("7")}
            className={`text-[9px] font-mono font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              timeRange === "7" ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange("30")}
            className={`text-[9px] font-mono font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              timeRange === "30" ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-5 rounded-xl flex flex-col gap-1 shadow-2xs">
          <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">Total Sales (Period)</span>
          <span className="text-2xl font-black text-[var(--color-text)]">
            ₹{totalPeriodRevenue.toLocaleString("en-IN")}
          </span>
          <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Active revenue stream</span>
        </div>
        <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-5 rounded-xl flex flex-col gap-1 shadow-2xs">
          <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">Average Order Value</span>
          <span className="text-2xl font-black text-[var(--color-text)]">
            ₹{orders.length > 0 ? Math.round(totalPeriodRevenue / (orders.length || 1)).toLocaleString("en-IN") : "0"}
          </span>
          <span className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Per order basket value</span>
        </div>
        <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-5 rounded-xl flex flex-col gap-1 shadow-2xs">
          <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">Total Orders (Period)</span>
          <span className="text-2xl font-black text-[var(--color-text)]">
            {orders.length}
          </span>
          <span className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Overall orders count</span>
        </div>
      </div>

      {/* Main Charts Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Revenue Area Trend (2 Cols on desktop) */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]/40">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black tracking-[0.2em] text-[var(--color-text)] uppercase">📈 Revenue Performance</h3>
              <p className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase">Sales trajectory</p>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase">PEAK DAILY VALUE</span>
              <span className="text-xs font-mono font-black text-[var(--color-text)]">
                ₹{Math.max(...salesTrend.map(d => d.revenue), 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="relative pt-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 sm:h-52 overflow-visible">
              <defs>
                <linearGradient id="analyticsChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1={paddingLeft} y1={paddingTop} x2={svgWidth - paddingRight} y2={paddingTop} stroke="var(--color-border)" strokeWidth="0.8" />
              <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={svgWidth - paddingRight} y2={paddingTop + chartHeight / 2} stroke="var(--color-border)" strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={svgWidth - paddingRight} y2={paddingTop + chartHeight} stroke="var(--color-border-hard)" strokeWidth="1.2" />
              
              {/* Y-Axis Labels */}
              <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end" className="text-[8px] font-mono font-bold fill-[var(--color-muted)]">₹{maxRevenue.toLocaleString("en-IN")}</text>
              <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 3} textAnchor="end" className="text-[8px] font-mono font-bold fill-[var(--color-muted)]">₹{Math.round(maxRevenue / 2).toLocaleString("en-IN")}</text>
              <text x={paddingLeft - 8} y={paddingTop + chartHeight + 3} textAnchor="end" className="text-[8px] font-mono font-bold fill-[var(--color-muted)]">₹0</text>
              
              {/* Area under line */}
              <polygon points={areaPoints} fill="url(#analyticsChartGrad)" />
              
              {/* Trend Line path */}
              <polyline 
                points={polylinePoints} 
                fill="none" 
                stroke="var(--color-accent)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              
              {/* Circles & Labels */}
              {trendPoints.map((p, i) => {
                // Skip rendering too many circles if 30 days is selected
                if (timeRange === "30" && i % 3 !== 0) return null
                return (
                  <g key={i} className="group cursor-pointer">
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r="4" 
                      className="fill-[var(--color-surface)] stroke-[var(--color-accent)] stroke-2 hover:r-5 hover:fill-[var(--color-accent)] transition-all duration-150"
                    />
                    {/* Tooltip on Hover */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      <rect 
                        x={p.x - 35} 
                        y={p.y - 28} 
                        width="70" 
                        height="20" 
                        rx="4"
                        className="fill-neutral-900 stroke-neutral-950 border"
                      />
                      <text 
                        x={p.x} 
                        y={p.y - 15} 
                        textAnchor="middle" 
                        className="text-[8px] font-mono font-black fill-white"
                      >
                        ₹{p.revenue}
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* X-Axis labels */}
              {trendPoints.map((p, i) => {
                if (timeRange === "7") {
                  return (
                    <text key={i} x={p.x} y={paddingTop + chartHeight + 16} textAnchor="middle" className="text-[8px] font-mono font-bold fill-[var(--color-muted)]">
                      {p.label}
                    </text>
                  )
                } else if (timeRange === "30" && i % 5 === 0) {
                  return (
                    <text key={i} x={p.x} y={paddingTop + chartHeight + 16} textAnchor="middle" className="text-[8px] font-mono font-bold fill-[var(--color-muted)]">
                      {p.label}
                    </text>
                  )
                }
                return null
              })}
            </svg>
          </div>
        </div>

        {/* Order Status Breakdown Donut */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl space-y-4 shadow-sm flex flex-col">
          <div className="pb-2 border-b border-[var(--color-border)]/40">
            <h3 className="text-xs font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Fulfillment ratio</h3>
            <p className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase">Order status distribution</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center gap-4">
            {orders.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase">No Order Data Available</span>
              </div>
            ) : (
              <>
                <div className="relative w-36 h-36">
                  {/* SVG circular donut chart */}
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--color-subtle)" strokeWidth="4" />
                    {donutSlices.map((slice, i) => (
                      <circle
                        key={i}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="4"
                        strokeDasharray={slice.dashArray}
                        strokeDashoffset={slice.dashOffset}
                        className="transition-all duration-500 hover:stroke-[5]"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center">
                    <span className="text-2xl font-black text-[var(--color-text)] leading-none">{orders.length}</span>
                    <span className="text-[8px] font-mono text-[var(--color-muted)] tracking-widest uppercase mt-1">Orders</span>
                  </div>
                </div>

                {/* Legends */}
                <div className="w-full grid grid-cols-2 gap-2 text-[9px] font-mono font-bold uppercase text-[var(--color-text)]">
                  {statusStats.map(stat => (
                    <div key={stat.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ background: stat.color }}></span>
                      <span className="truncate flex-1 text-[var(--color-muted)]">{stat.name}</span>
                      <span className="font-black shrink-0">{stat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="lg:col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl space-y-4 shadow-sm">
          <div className="pb-2 border-b border-[var(--color-border)]/40">
            <h3 className="text-xs font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Best Selling Products</h3>
            <p className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase">Top items by quantity sold</p>
          </div>

          <div className="space-y-4 pt-2">
            {bestSellers.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase">No Sales Data Logged Yet</span>
              </div>
            ) : (
              bestSellers.map((item, idx) => {
                const maxQty = bestSellers[0].quantity || 1
                const barWidth = `${(item.quantity / maxQty) * 100}%`
                
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-baseline text-[10px] font-mono uppercase">
                      <span className="font-black text-[var(--color-text)] truncate max-w-md">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-black text-[var(--color-accent)] shrink-0">
                        {item.quantity} SOLD (₹{item.revenue.toLocaleString("en-IN")})
                      </span>
                    </div>
                    {/* Bar background */}
                    <div className="w-full h-3 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: barWidth }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-[var(--color-accent)] rounded-full"
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default AdminAnalytics

