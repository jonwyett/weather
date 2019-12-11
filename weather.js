/*
ver 1.0.2
    -includes celsius option    
*/

/**
 * Creates a service for various online weather APIs
 * 
 * @param {Object} options
 * @param {String} options.key - API Key
 * @param {'darksky'|'accuweather'} options.provider - The weather provider to use
 * @param {Number} [options.latitude] - The latitude (Darksky)
 * @param {Number} [options.longitude] - the longitude (Darksky)
 * @param {String} [options.locationKey] - the location key (Accuweather)
 * @param {boolean} [options.celsius] - Temperature in celsius
 * 
 * @param {Function} [callback]
 */
function service(options, callback) {
    var _self = this;

    // weather information
    this.raw = {}; //this is the raw API response from the provider
    this.lastUpdate = null;
    this.forecastTime = null;
    this.temp = null;
    this.humidity = null;
    this.currentCondition = null;
    this.icon = null;
    this.feelsLike = null;
    this.sunrise = null;
    this.sunset = null;
    this.error = null;
    this.forecast = [];

    (function startup() {
        var err = null;
        if (options.provider == 'darksky') {
            if (typeof options.key !== 'string' ||
                typeof options.latitude !== 'number' ||
                typeof options.longitude !== 'number') {
                    err = 'Invalid startup options.';
            }
        } else if (options.provider == 'accuweather') {
            if (typeof options.key !== 'string' || typeof options.locationKey === 'undefined') {
                err = 'Invalid startup options.';
            }
        }

        if (typeof callback === 'function') { callback(err); }
    })();
    
    /******* PUBLIC FUNCTIONS *******************************************/

    /**
     * Updates the weather data
     * @param {Function} [callback]
     */
    this.update = function(callback) {
        var https = require('https');
        var url = '';
        if (options.provider == 'darksky') { //case insensitive
            url = 'https://api.darksky.net/forecast/[KEY]/[LAT],[LONG]?exclude=["minutely","flags","alerts"]';
        } else if (options.provider == 'accuweather') { //case insensitive
            url = 'https://dataservice.accuweather.com/currentconditions/v1/[LOCATION]?apikey=[KEY]&details=true';
        }
        url = url.replace('[KEY]',options.key)
                .replace('[LAT]', options.latitude)
                .replace('[LONG]', options.longitude)
                .replace('[LOCATION]', options.locationKey);
        
       try {
        https.get(url, function(res){
            var body = '';
            res.on('data', function(chunk){ body += chunk; });
            res.on('end', function(){
                try {
                    if (options.provider == 'darksky'){ parseDarkSky(body, callback); }   
                    else if (options.provider == 'accuweather'){ parseAccuweather(body, callback); }   
                } catch (err) {
                    if (typeof callback === 'function') { callback(err); }
                }
            });
        }).on('error', function(err) { if (typeof callback === 'function') { callback(err); } });
        } catch (err) {
            if (typeof callback === 'function') { callback(err); }    
        }

    };

    /**
     * @returns {Object} - an object representing the top-level vars
     */
    this.fullWeather = function() {
        console.log('returning full weather');
        var weather = {
            lastUpdate: _self.lastUpdate,
            temp: _self.temp,
            humidity: _self.humidity,
            currentCondition: _self.currentCondition,
            feelsLike: _self.feelsLike,
            sunrise: _self.sunrise,
            sunset: _self.sunset,
            forecastTime: _self.forecastTime,
            forecast: _self.forecast,
            icon: _self.icon
        };

        return weather;
    };

    /******* END PUBLIC FUNCTIONS *******************************************/


    function parseDarkSky(weather, callback) {
        _self.lastUpdate = new Date().toString();
        try {
            weather = JSON.parse(weather);
            if (weather.error) {
                if (typeof callback === 'function') {callback(weather.error); }
            } else {
                _self.raw = weather;
                _self.temp = weather.currently.temperature.toFixed(2);
                _self.feelsLike = weather.currently.apparentTemperature.toFixed(2);
                _self.currentCondition = weather.currently.summary;
                _self.humidity = weather.currently.humidity.toFixed(2);
                _self.forecastTime = new Date(weather.currently.time * 1000);
                _self.sunrise = new Date(weather.daily.data[0].sunriseTime * 1000);
                _self.sunset = new Date(weather.daily.data[0].sunsetTime * 1000);
                _self.icon = weather.currently.icon;

                //set celsius if desired
                if (options.celsius) {
                    _self.temp = toCelsius(_self.temp);
                    _self.feelsLike = toCelsius(_self.feelsLike);
                }

                //create the forecast

                for (var i=0; i<5; i++) {
                    var day = getDailyObject();
                    day.condition = weather.daily.data[i].summary;
                    day.feelsLikeHigh = weather.daily.data[i].apparentTemperatureHigh.toFixed(2);
                    day.feelsLikeLow = weather.daily.data[i].apparentTemperatureLow.toFixed(2);
                    day.humidity = weather.daily.data[i].humidity;
                    day.icon = weather.daily.data[i].icon;
                    day.sunrise = new Date(weather.daily.data[i].sunriseTime * 1000);
                    day.sunset = new Date(weather.daily.data[i].sunsetTime * 1000);
                    day.tempHigh = weather.daily.data[i].temperatureHigh.toFixed(2);
                    day.tempLow = weather.daily.data[i].temperatureLow.toFixed(2);
                    if (options.celsius) {
                        day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                        day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                        day.tempHigh = toCelsius(day.tempHigh);
                        day.tempLow = toCelsius(day.tempLow);
                    }
                    _self.forecast.push(day);
                }

                if (typeof callback === 'function') { callback(null); } 
            }
        } catch (err) {
            _self.error = err;
            if (typeof callback === 'function') { callback(err); }
        }        
    }

    function parseAccuweather(weather, callback) {
        _self.lastUpdate = new Date().toString();
        try {
            weather = JSON.parse(weather);
            weather = weather[0]; //break it out of the array

            _self.raw = weather;

            _self.temp = weather.Temperature.Imperial.Value.toFixed(2);
            _self.feelsLike = weather.RealFeelTemperature.Imperial.Value.toFixed(2);
            _self.currentCondition = weather.WeatherText;
            _self.humidity = (weather.RelativeHumidity/100).toFixed(2);
            _self.forecastTime = new Date(weather.LocalObservationDateTime);
            _self.sunrise = null;
            _self.sunset = null;
            _self.icon = weather.WeatherIcon;

            //set celsius if desired
            if (options.celsius) {
                _self.temp = toCelsius(_self.temp);
                _self.feelsLike = toCelsius(_self.feelsLike);
            }

            if (typeof callback === 'function') { callback(null); } 
            
        } catch (err) {
            _self.error = err;
            if (typeof callback === 'function') { callback(err); }
        }    

    }
}

/**
 * Looks up the location key needed for Accuweather
 * 
 * @param {object} options 
 * @param {String} options.key - API Key
 * @param {number|string} [options.latitude] - The latitude 
 * @param {number|string} [options.longitude] - the longitude 
 * @param {number|string} [options.zipcode] - the zipcode
 * @param {function} callback 
 */
function accuweatherLocationLookup(options, callback) {
    var err = null;

    if (typeof options.key !== 'string') {
            err = 'Invalid startup options.';

        if (typeof callback === 'function') { callback(err); }
        return null;
    }

    var https = require('https');
    var url = '';
    var mode = null;
    if (options.zipcode) {
        mode = 'zipcode';
        url = 'https://dataservice.accuweather.com/locations/v1/postalcodes/search?apikey=[KEY]&q=[ZIPCODE]';
    } else if (options.latitude && options.longitude) {
        mode = 'lat/long';
        url = 'https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=[KEY]&q=[LAT],[LONG]';
    } else {
        err = 'Invalid location information';
        if (typeof callback === 'function') { callback(err); }
        return null;    
    }
    
    
    url = url.replace('[KEY]',options.key)
            .replace('[LAT]', options.latitude)
            .replace('[LONG]', options.longitude)
            .replace('[ZIPCODE]', options.zipcode);
    try {
        https.get(url, function(res){
            var body = '';
            res.on('data', function(chunk){ body += chunk; });
            res.on('end', function(){
                try {
                    var res = JSON.parse(body);
                    var locationKey = '';
                    if (mode === 'zipcode') {
                        locationKey = res[0].Key;
                    } else if (mode === 'lat/long') {
                        locationKey = res.Key;
                    }
                    if (typeof callback === 'function') { callback(null, locationKey); }    
                } catch (err) {
                    if (typeof callback === 'function') { callback(err); }
                }
            });
        }).on('error', function(err) { if (typeof callback === 'function') { callback(err); } });
    } catch (err) {
        if (typeof callback === 'function') { callback(err); }    
    }
}


function toCelsius(temp) {
    return ((temp-32)*(5/9)).toFixed(2);       
}

function getDailyObject() {
    var daily = {
        tempHigh: null,
        tempLow: null,
        humidity: null,
        condition: null,
        feelsLikeHigh: null,
        feelsLikeLow: null,
        sunrise: null,
        sunset: null,
        icon: null
    };

    return daily;
}

exports.service = service;
exports.accuweatherLocationLookup = accuweatherLocationLookup;