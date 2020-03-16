var Weather = require('./weather');

var DarkSky_Key = '0123456789abcdef9876543210fedcba'; //this is a fake key

var boston = new Weather.service({
    provider: 'darksky',
    key: DarkSky_Key,
    latitude: 42.3601,
    longitude: -71.0589,
    celsius: false
});

//In this example we're going to wait for the 'ready' event before running the first update.
boston.on('ready', function() {
    boston.update(function(err) {
        if (err) {
            console.log('ERROR: ' + err);
        } else {
            console.log('\r\n---Boston Weather (DarkSky)---');
            printWeather(boston);
        }
    });
});

boston.on('error', function(err) {
    console.log('ERROR with Boston weather lookup: ' + err);
});

var AccuWeather_Key = '0123456789abcdef9876543210fedcba'; //this is a fake key

var houston = new Weather.service({
    provider: 'accuweather',
    key: AccuWeather_Key,
    latitude: 29.7604,
    longitude: -95.3698, 
    celsius: false
});

//if you call the update function before the weather service has loaded it will store
//a reference to the callback and automatically run it when the service is loaded
//so even though we're calling the update() function before the ready event was fired
//this will still work.
houston.update(function(err) {
    if (err) {
        console.log('ERROR: ' + err);
    } else {
        console.log('---Houston Weather (AccuWeather)---');
        printWeather(houston);
    }
});  


//This is just a simple function to print some information from a weather service
function printWeather(weather) {
    console.log('Last Update: ' + weather.lastUpdate);
    console.log('forecastTime: ' + weather.forecastTime);
    console.log('Temp: ' + weather.temp);
    console.log('Feels like: ' + weather.feelsLike);
    console.log('Current Condition: ' + weather.currentCondition);
    console.log('Humidity: ' + weather.humidity);
    console.log('Sunrise: ' + weather.sunrise);
    console.log('Sunset: ' + weather.sunset);  
    console.log('\r\n');    
}

