import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { useWeather } from '@/hooks/useWeather';

/**
 * WeatherWidget - Weather display with hourly forecast
 * Shows condition, feels-like temp, hourly bar chart, and location
 */
export function WeatherWidget() {
  const { data: weather, isLoading, error } = useWeather();

  // Loading skeleton
  if (isLoading && !weather) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex flex-col p-4 animate-pulse">
          <div className="h-5 bg-muted rounded w-24 mx-auto" />
          <div className="h-3 bg-muted rounded w-20 mx-auto mt-2" />
          <div className="flex-1 flex items-end gap-1 mt-3 mb-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 bg-muted rounded-sm" style={{ height: '50%' }} />
            ))}
          </div>
          <div className="h-3 bg-muted rounded w-full mt-2" />
        </CardContent>
      </Card>
    );
  }

  // Error state (still show cached data if available)
  if (!weather) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center p-4">
          <span className="text-xs text-muted-foreground">
            {error ?? 'Weather unavailable'}
          </span>
        </CardContent>
      </Card>
    );
  }

  // Parse sunrise/sunset times
  const sunriseDate = new Date(weather.sunrise);
  const sunsetDate = new Date(weather.sunset);
  const sunriseHour = sunriseDate.getHours();
  const sunsetHour = sunsetDate.getHours();

  // Format hour to 12h format
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  // Prepare chart data - every 2 hours
  // Use absolute temperature for bar height so negative temps still render upward
  const chartData = weather.hourlyForecast
    .filter((_, index) => index % 2 === 0)
    .map((hourData) => ({
      hour: hourData.hour,
      label: formatHour(hourData.hour),
      temperature: hourData.temperature,
      absTemperature: Math.abs(hourData.temperature),
      isDay: hourData.hour >= sunriseHour && hourData.hour < sunsetHour,
    }));

  // Condition display text (capitalize each word, replace hyphens with spaces)
  const conditionText = weather.condition
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Feels like temperature with unit and degree symbol
  const unit = weather.unit === 'celsius' ? 'C' : 'F';
  const feelsLikeText = `${weather.feelsLike}°${unit}`;

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col p-4">
        {/* Condition */}
        <div className="text-base font-medium-labels text-foreground text-center">
          {conditionText}
        </div>

        {/* Feels like */}
        <div className="text-xs text-muted-foreground mt-0.5 text-center">
          Feels like {feelsLikeText}
        </div>

        {/* Hourly bar chart */}
        <div className="flex-1 mt-2 mb-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-md px-2 py-1 text-xs shadow-md">
                      <span className="text-muted-foreground">{data.label}</span>
                      <span className="ml-2 font-medium">{data.temperature}°{unit}</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="absTemperature" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.hour}
                    fill={entry.isDay ? 'hsl(45 70% 65%)' : 'hsl(var(--muted-foreground) / 0.25)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sunrise/Sunset times */}
        <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
          <span>Sunrise {formatHour(sunriseHour)}</span>
          <span>Sunset {formatHour(sunsetHour)}</span>
        </div>

        {/* Location */}
        <div className="text-xs text-center text-muted-foreground">
          {weather.location.city}
        </div>
      </CardContent>
    </Card>
  );
}
