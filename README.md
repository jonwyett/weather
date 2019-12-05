# jw-weather
Module for reading weather data from various public APIs.

Currently supports:
- #### DarkSky 
- #### AccuWeather.

The goal is to create a weather module that returns a standardized weather object regardless of the API used.

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
- forecastTime (The actual forecast time for the the provider)
- temp
- feelsLike
- humidity
- currentCondition
- sunrise (DarkSky only)
- sunset (DarkSky only)

When using AccuWeather there is a helper function for looking up location keys since AccuWeather does not use latitude/longitude in it's API call.
Review demo.js for example use.

