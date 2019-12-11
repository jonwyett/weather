var Weather = require('./weather');

/**
 * Darksky is simple to use
 * Simply create the weather service and then run the update function
*/
var DarkSky_Key = '0123456789abcdef9876543210fedcba'; //this is a fake key

var boston = new Weather.service({
    provider: 'darksky',
    key: DarkSky_Key,
    latitude: 42.3601,
    longitude: -71.0589,
    celsius: false
});

boston.update(function(err) {
    if (err) {
        console.log('ERROR: ' + err);
    } else {
        console.log('\r\n---Boston Weather (DarkSky)---');
        printWeather(boston);
    }
});


/**
 * AccuWeather requires a location Key, it can't run with
 * lat/long or zip codes directly.
 * If you know the code you can use it just like the DarkSky service.
 * 
 * If not you need to use the helper function accuweatherLocationLookup()
 * to find the key based on lat/long or zip code.
 * 
 * This example chains the creation of the service to the callback of the
 * location key lookup
 */

var AccuWeather_Key = '0123456789abcdef9876543210fedcba'; //this is a fake key

var AccuWeather_Houston; //create a reference outside the callback

//run the lookup
Weather.accuweatherLocationLookup({
    key: AccuWeather_Key,
    latitude: 29.7604,
    longitude: -95.3698,
    //zipcode: 77001 //you can use a zip code or lat/long
    }, function(err, locationKey) {
        if (err) {
            console.log('ERROR: ' + err);
        } else {
            //we have a valid location key now, so create the service
            AccuWeather_Houston = new Weather.service({
                provider: 'accuweather',
                key: AccuWeather_Key,
                locationKey: locationKey, 
                celsius: false
            });   
            //run an update and print the result
            AccuWeather_Houston.update(function(err) {
                if (err) {
                    console.log('ERROR: ' + err);
                } else {
                    console.log('---Houston Weather (AccuWeather)---');
                    printWeather(AccuWeather_Houston);
                }
            });  
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

