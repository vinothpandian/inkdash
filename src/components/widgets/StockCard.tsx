import { Card } from '@/components/ui/card';
import type { StockData } from '@/types';

interface StockCardProps {
  stock: StockData;
}

/**
 * AreaChart - Elegant area chart with gradient fill
 * The chart is the hero element of the card
 */
function AreaChart({
  data,
  isPositive,
}: {
  data: number[];
  isPositive: boolean;
}) {
  if (!data || data.length < 2) return null;

  const width = 200;
  const height = 80;
  const paddingX = 0;
  const paddingTop = 8;
  const paddingBottom = 0;

  // Calculate min/max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path points
  const points = data.map((value, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
    const y = paddingTop + (1 - (value - min) / range) * (height - paddingTop - paddingBottom);
    return { x, y };
  });

  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  // Create area path (close the shape)
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  const gradientId = `gradient-${isPositive ? 'up' : 'down'}-${Math.random().toString(36).substr(2, 9)}`;

  // Colors based on performance
  const lineColor = isPositive ? 'hsl(var(--accent-warm))' : 'hsl(var(--muted-foreground))';
  const gradientStart = isPositive ? 'hsl(var(--accent-warm) / 0.3)' : 'hsl(var(--muted-foreground) / 0.15)';
  const gradientEnd = isPositive ? 'hsl(var(--accent-warm) / 0.02)' : 'hsl(var(--muted-foreground) / 0.02)';

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={lineColor}
      />
    </svg>
  );
}

/**
 * StockCard - Refined stock display with hero chart
 * The area chart dominates the card with data overlaid
 */
export function StockCard({ stock }: StockCardProps) {
  // Handle null, undefined, and NaN values
  const safeNumber = (val: number | null | undefined) =>
    val == null || Number.isNaN(val) ? 0 : val;

  const changePercent = safeNumber(stock.changePercent);
  const price = safeNumber(stock.price);
  const change = safeNumber(stock.change);
  const isPositive = changePercent >= 0;

  // Use priceHint for decimal places (default to 2)
  const decimals = stock.priceHint ?? 2;

  // Format percentage change with sign
  const changeText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;

  // Format price with currency using priceHint
  const priceText = `${stock.currency}${price.toFixed(decimals)}`;

  return (
    <Card className="h-full relative overflow-hidden">
      {/* Chart as background - the hero element */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full h-[60%]">
          <AreaChart data={stock.sparklineData} isPositive={isPositive} />
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative h-full flex flex-col p-4 z-10">
        {/* Top section: All info at top for visibility */}
        <div className="flex justify-between items-start">
          {/* Left: Ticker & Name */}
          <div>
            <div
              className="text-lg font-semibold text-foreground tracking-tight"
              style={{ textShadow: '0 1px 8px hsl(var(--card)), 0 0 20px hsl(var(--card))' }}
            >
              {stock.ticker}
            </div>
            <div
              className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[100px]"
              style={{ textShadow: '0 1px 6px hsl(var(--card))' }}
            >
              {stock.name}
            </div>
          </div>

          {/* Right: Price & Change */}
          <div className="text-right">
            <div
              className="text-2xl font-light-numbers text-foreground"
              style={{ textShadow: '0 2px 12px hsl(var(--card)), 0 0 30px hsl(var(--card))' }}
            >
              {priceText}
            </div>
            <div
              className={`text-sm font-medium-labels mt-0.5 ${isPositive ? 'text-accent-warm' : 'text-muted-foreground'}`}
              style={{ textShadow: '0 1px 8px hsl(var(--card))' }}
            >
              {changeText} <span className="text-xs">({isPositive ? '↑' : '↓'}{Math.abs(change).toFixed(decimals)})</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
