# weather
Module for reading weather data from various public APIs.

Currently only supports DarkSky, but AccuWeather is planned.

Originally designed to use WeatherUnderground but they seem to have removed public access to their API.

The goal is to create a weather module that returns a standardized weather object regardless of the API used.

### Sample use in Node.js:
```
var jw-weather = require('jw-weather');

var weather = new jw-weather.service({
    provider: 'darksky',
    key: '0123456789abcdef9876543210fedcba', //this is a fake key
    latitude: 42.3601,
    longitude: -71.0589
});

weather.update(function(err) {
    if (err) {
        console.log('ERROR: ' + err);
    } else {
        console.log('Temp: ' + weather.temp);
    }     
});
```

The weather object currently includes:

- lastUpdate
- temp
- feelsLike
- humidity
- currentCondition
- sunrise
- sunset
- forecastTime

