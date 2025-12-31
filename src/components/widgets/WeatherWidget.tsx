import { Card, CardContent } from '@/components/ui/card';
import { getMockWeatherData } from '@/config/weather';

/**
 * WeatherWidget - Weather display with hourly forecast
 * Shows condition, feels-like temp, hourly bar chart, and location
 */
export function WeatherWidget() {
  const weather = getMockWeatherData();

  // Parse sunrise/sunset times
  const sunriseDate = new Date(weather.sunrise);
  const sunsetDate = new Date(weather.sunset);
  const sunriseHour = sunriseDate.getHours();
  const sunsetHour = sunsetDate.getHours();

  // Format sunrise/sunset for display
  const formatHour = (date: Date) => {
    const hour = date.getHours();
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  // Get min/max temperatures for scaling
  const temps = weather.hourlyForecast.map((h) => h.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  // Condition display text (capitalize each word, replace hyphens with spaces)
  const conditionText = weather.condition
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Feels like temperature with unit and degree symbol
  const feelsLikeText = `${weather.feelsLike}°${weather.unit === 'celsius' ? 'C' : 'F'}`;

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
        <div className="flex-1 flex items-end gap-[1px] mt-3 mb-1.5 min-h-0">
          {weather.hourlyForecast.map((hourData) => {
            const isDay = hourData.hour >= sunriseHour && hourData.hour < sunsetHour;
            const heightPercent =
              ((hourData.temperature - minTemp) / tempRange) * 60 + 25; // 25-85% range

            return (
              <div
                key={hourData.hour}
                className="flex-1 rounded-sm transition-colors"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: isDay ? 'hsl(45 70% 65%)' : 'hsl(var(--muted-foreground) / 0.25)'
                }}
                title={`${hourData.hour}:00 - ${hourData.temperature}°${weather.unit === 'celsius' ? 'C' : 'F'}`}
              />
            );
          })}
        </div>

        {/* Sunrise/Sunset markers */}
        <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
          <span>{formatHour(sunriseDate)}</span>
          <span>{formatHour(sunsetDate)}</span>
        </div>

        {/* Location */}
        <div className="text-xs text-center text-muted-foreground">
          {weather.location.city}
        </div>
      </CardContent>
    </Card>
  );
}
