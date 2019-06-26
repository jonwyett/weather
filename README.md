# weather
Module for reading weather data from various public APIs

Currently only supports DarkSky, but AccuWeather is planned.

Originally designed to use WeatherUnderground but they seem to have removed public access to their API

### Sample use in Node.js:
```
var Weather = require('./weather');

var weather = new Weather.service({
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

