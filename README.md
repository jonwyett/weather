# jw-weather

A Node.js module for fetching weather data from multiple public APIs with a standardized interface.

## Supported Weather Providers

- **AccuWeather** ✅
- **OpenWeatherMap** ✅  
- **WeatherBit** ✅
- ~~DarkSky~~ ⚠️ *(Deprecated - Apple shut down the API in 2023)*
- ~~Weather Underground~~ ❌ *(API deprecated)*

## Why Use This Module?

This module provides a **standardized weather object** regardless of which API you use. This approach offers several key benefits:

1. **Future-proof your app** - Seamlessly switch providers when APIs get deprecated (like DarkSky and Weather Underground)
2. **Cost optimization** - Switch providers based on pricing or feature changes
3. **Increased reliability** - Use multiple providers simultaneously to work around rate limits
4. **Consistent interface** - Same code works with any supported provider

## Quick Start

### Installation
```bash
npm install jw-weather
```

### Basic Usage
```javascript
const weather = require('jw-weather');

const boston = new weather.service({
    provider: 'openweathermap',
    key: 'your-api-key-here',
    latitude: 42.3601,
    longitude: -71.0589,
    celsius: false  // optional, defaults to Fahrenheit
});

// Wait for the service to be ready
boston.on('ready', async () => {
    try {
        await boston.update();
        console.log(`Current temperature: ${boston.temp}°F`);
        console.log(`Conditions: ${boston.currentCondition}`);
    } catch (error) {
        console.error('Failed to get weather:', error);
    }
});

// Handle errors
boston.on('error', (error) => {
    console.error('Weather service error:', error);
});
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `provider` | string | Yes | Weather service: `'accuweather'`, `'openweathermap'`, `'weatherbit'` |
| `key` | string | Yes | API key from your chosen provider |
| `latitude` | number | Yes | Location latitude |
| `longitude` | number | Yes | Location longitude |
| `celsius` | boolean | No | Temperature unit (default: `false` for Fahrenheit) |

## Weather Object Properties

After calling `update()`, the following properties are available:

### Current Weather
- `temp` - Current temperature
- `feelsLike` - "Feels like" temperature
- `humidity` - Humidity percentage (0-1)
- `currentCondition` - Text description of current conditions
- `icon` - Icon identifier from the provider
- `sunrise` - Sunrise time (Date object)
- `sunset` - Sunset time (Date object)

### Metadata
- `lastUpdate` - When the data was last fetched locally
- `forecastTime` - Actual forecast time from the provider
- `raw` - Complete raw response from the provider

### 5-Day Forecast
- `forecast` - Array of daily forecast objects

Each forecast day includes:
- `tempHigh` / `tempLow` - High/low temperatures
- `feelsLikeHigh` / `feelsLikeLow` - "Feels like" temperatures
- `humidity` - Humidity (Note: AccuWeather doesn't provide this for forecasts)
- `condition` - Weather condition description
- `icon` - Weather icon identifier
- `sunrise` / `sunset` - Sun times

## API Methods

### `update([callback])`
Fetches the latest weather data from your configured provider.

```javascript
// Using async/await (recommended)
try {
    await boston.update();
    console.log('Weather updated successfully');
} catch (error) {
    console.error('Update failed:', error);
}

// Using callback
boston.update((error) => {
    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log('Weather updated successfully');
    }
});
```

### `fullWeather()`
Returns a complete weather data object with all available information.

```javascript
const completeWeather = boston.fullWeather();
console.log(JSON.stringify(completeWeather, null, 2));
```

## Complete Example

```javascript
const weather = require('jw-weather');

const myLocation = new weather.service({
    provider: 'openweathermap',
    key: 'your-api-key-here',
    latitude: 40.7128,
    longitude: -74.0060,
    celsius: true
});

myLocation.on('ready', async () => {
    try {
        await myLocation.update();
        
        // Current conditions
        console.log(`Temperature: ${myLocation.temp}°C`);
        console.log(`Feels like: ${myLocation.feelsLike}°C`);
        console.log(`Humidity: ${Math.round(myLocation.humidity * 100)}%`);
        console.log(`Conditions: ${myLocation.currentCondition}`);
        
        // 5-day forecast
        console.log('\n5-Day Forecast:');
        myLocation.forecast.forEach((day, index) => {
            console.log(`Day ${index + 1}: ${day.tempHigh}°/${day.tempLow}° - ${day.condition}`);
        });
        
    } catch (error) {
        console.error('Weather update failed:', error);
    }
});

myLocation.on('error', (error) => {
    console.error('Service error:', error);
});
```

## Getting API Keys

- **OpenWeatherMap**: [Sign up here](https://openweathermap.org/api) (free tier available)
- **AccuWeather**: [Register here](https://developer.accuweather.com/) (free tier available)  
- **WeatherBit**: [Get API key here](https://www.weatherbit.io/api) (free tier available)

## Notes

- **Location format**: All providers use latitude/longitude coordinates for consistency, even though some support other formats natively
- **Rate limits**: Each provider has different rate limits - check their documentation
- **Forecast accuracy**: OpenWeatherMap's free tier provides 3-hour forecasts, while others provide daily forecasts

For more examples, see `demo.js` in this repository.

