# jw-weather
Module for reading weather data from various public APIs.

Currently supports:
- **DarkSky**
- **AccuWeather**

The goal is to create a weather module that returns a standardized weather object regardless of the API used. This serves a few purposes: 
1. Being able to seamlessly transition to another service in case the API is depreciated. (Which is why this project was started).
2. Being able to switch to another service if costs or needs change.
3. Being able to use more then one service simultaneously to increase the frequency that you are able to query the APIs since the providers limit allowed queries for a given license.

Because reason #1 is the main purpose of this module certain features that are nice to have but differ between services have been omitted. For example AccuWeather allows you to specify a zipcode for your location but DarkSky doesn't, so even though using the zipcode might be preferable vs. the latitude/longitude, that capability has been removed because it would make the usage incompatible between services.

### Sample use in Node.js:
```
var jw-weather = require('jw-weather');

var boston = new jw-weather.service({
    provider: 'darksky',
    key: '0123456789abcdef9876543210fedcba', //this is a fake key
    latitude: 42.3601,
    longitude: -71.0589
});

boston.update(function(err) {
    if (err) {
        console.log('ERROR: ' + err);
    } else {
        console.log('Temp: ' + boston.temp);
    }     
});
```

The weather object currently includes:

- lastUpdate (When the update was run locally)
- forecastTime (The actual forecast time from the the provider)
- temp
- feelsLike
- humidity
- currentCondition
- An icon name/number
- sunrise 
- sunset
- A 5-day forecast (Accuweather does not forecast humidity)

## Startup options:

- provider: string, 'darksky' || 'accuweather'
- key: string, provided by weather service
- latitude: number
- longitude: number
- celsius: boolean (default=false, i.e. fahrenheit)

## List of Functions:
- ### update(callback(err))

   Updates the weather object with the latest forecast.
   Returns an error message or null when the update is complete.

- ### fullWeather()

    Returns an object representing the full standardized weather data

## List of Properties:
- raw: The raw API response from the provider
- lastUpdate: The last time the weather object was updated
- forecastTime: The time of the forecast 
- temp: The current temperature
- humidity: The current humidity
- currentCondition: A text description of the current condition
- icon: An icon number
- feelsLike: The "Real Feel" temperature
- sunrise: Sunrise time
- sunset: Sunset time
- forecast: A 5-day forecast

Review demo.js for example use.

