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
 * @param {Number} [options.latitude] - The latitude 
 * @param {Number} [options.longitude] - the longitude 
 * @param {boolean} [options.celsius] - Temperature in celsius
 * 
 */
function service(options) {
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
    
    this.ready = false; //this is for weather services that need to do lookups
    this.runUpdateWhenReady = false; //this is in case the user requests an update before the weather object is ready
    this.updateWhenReadyFunc = null; //will hold the callback for the early update request

    this.locationKey = null; //this is for accuweather

    /*******************   Custom Emitter Code  **************************************************/
    //this is for future browser compatibility
    var _events = {};
    this.on = function(event, callback) {
        //attaches a callback function to an event
        _events[event] = callback;    
    };
    function emit(event, msg) {
        if (typeof _events[event] === 'function') { //the client has registered the event
            _events[event](msg); //run the event function provided            
        }   
    }
    /*******************************************************************************************/


    (function startup() {
        if (typeof options.key !== 'string' ||
            typeof options.latitude !== 'number' ||
            typeof options.longitude !== 'number') {
                setTimeout(function() {
                    emit('error', 'Invalid startup options.'); 
                }, 100);           
        }
        
        // TODO: Actually test that darksky is working before ready? Maybe just ping the service?
        if (options.provider == 'darksky') {
            
            _self.ready = true;
            if (_self.runUpdateWhenReady) {
                _self.update(_self.updateWhenReadyFunc);
            }
            setTimeout(function() {
                emit('ready', null);
            }, 100);
            

        } else if (options.provider == 'accuweather') {
            accuweatherLocationLookup(options, function(err, locationKey) {
                _self.locationKey = locationKey;
                _self.ready = true;
                if (_self.runUpdateWhenReady) {
                    _self.update(_self.updateWhenReadyFunc);
                }
                setTimeout(function() {
                    emit('ready', null);
                }, 100);
            });       
        }
    })();
    
    /******* PUBLIC FUNCTIONS *******************************************/

    /**
     * Updates the weather data
     * @param {Function} [callback]
     */
    this.update = function(callback) {
        if (_self.ready) {
            if (options.provider == 'darksky') { //case insensitive
                getDarkSkyData(callback);
            } else if (options.provider == 'accuweather') { //case insensitive
                getAccuWeatherData(callback);
            }
        } else {
            _self.runUpdateWhenReady = true;
            _self.updateWhenReadyFunc = callback;
        }
    };

    function getDarkSkyData(callback) {
        var url = 'https://api.darksky.net/forecast/[KEY]/[LAT],[LONG]?exclude=["minutely","flags","alerts"]';
        url = url.replace('[KEY]',options.key)
                    .replace('[LAT]', options.latitude.toString())
                    .replace('[LONG]', options.longitude.toString());
        getAPIData(url, function(err, weather) {
            if (err) {
                callback(err);
            } else {
                parseDarkSky(weather, callback);      
            }
        });
    }

    function getAccuWeatherData(callback) {
        var url = '';
        //accuweather needs multiple calls, so we'll store them in an object
        var accuWeatherData = {
            CurrentConditions : {},
            Forecast: {}
        };

        getAccuWeatherCurrentConditions(accuWeatherData, function(accuWeatherData) {
            getAccuWeatherForecast(accuWeatherData, function(accuWeatherData) {
                parseAccuweather(accuWeatherData, callback); 
            });
               
        });
        
    }

    function getAccuWeatherCurrentConditions(accuWeatherData, callback) {
        url = 'https://dataservice.accuweather.com/currentconditions/v1/[LOCATION]?apikey=[KEY]&details=true';
        url = url.replace('[KEY]',options.key)
                .replace('[LOCATION]', _self.locationKey);
        getAPIData(url, function(err, weather) {
            if (err) {
                callback(err);
            } else {
                accuWeatherData.CurrentConditions = weather;
                callback(accuWeatherData);      
            }
        });
    }

    function getAccuWeatherForecast(accuWeatherData, callback) {
        url = 'https://dataservice.accuweather.com/forecasts/v1/daily/5day/[LOCATION]?apikey=[KEY]&details=true';
        url = url.replace('[KEY]',options.key)
                .replace('[LOCATION]', _self.locationKey);
        getAPIData(url, function(err, weather) {
            if (err) {
                callback(err);
            } else {
                accuWeatherData.Forecast = weather;
                callback(accuWeatherData);      
            }
        });
    }

    /**
     * @returns {Object} - an object representing the top-level vars
     */
    this.fullWeather = function() {
        //console.log('returning full weather');
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

    function getAPIData(url, callback) {
        var https = require('https');
        try {
            https.get(url, function(res){
                var body = '';
                res.on('data', function(chunk){ body += chunk; });
                res.on('end', function(){
                    try {
                        body = JSON.parse(body);
                        if (typeof callback === 'function') { callback(null, body); }
                    } catch (err) {
                        if (typeof callback === 'function') { callback(err); }
                    }
                });
            }).on('error', function(err) { if (typeof callback === 'function') { callback(err); } });
        } catch (err) {
            if (typeof callback === 'function') { callback(err); }    
        }
    }

    function parseDarkSky(weather, callback) {
        _self.lastUpdate = new Date().toString();
        try {
            //weather = JSON.parse(weather);
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

    function parseAccuweather(accuWeatherData, callback) {
        _self.lastUpdate = new Date().toString();
        _self.raw = accuWeatherData;
        try {
            var CurrentConditions = accuWeatherData.CurrentConditions[0]; //break it out of the array
            var Forecast = accuWeatherData.Forecast;

            _self.temp = CurrentConditions.Temperature.Imperial.Value.toFixed(2);
            _self.feelsLike = CurrentConditions.RealFeelTemperature.Imperial.Value.toFixed(2);
            _self.currentCondition = CurrentConditions.WeatherText;
            _self.humidity = (CurrentConditions.RelativeHumidity/100).toFixed(2);
            _self.forecastTime = new Date(CurrentConditions.LocalObservationDateTime);
            _self.sunrise = new Date(Forecast.DailyForecasts[0].Sun.Rise);
            _self.sunset = new Date(Forecast.DailyForecasts[0].Sun.Set);
            _self.icon = CurrentConditions.WeatherIcon;

            //set celsius if desired
            if (options.celsius) {
                _self.temp = toCelsius(_self.temp);
                _self.feelsLike = toCelsius(_self.feelsLike);
            }


            //create the forecast

            for (var i=0; i<5; i++) {
                var day = getDailyObject();
                day.condition = Forecast.DailyForecasts[i].Day.ShortPhrase;
                day.feelsLikeHigh = Forecast.DailyForecasts[i].RealFeelTemperature.Maximum.Value.toFixed(2);
                day.feelsLikeLow = Forecast.DailyForecasts[i].RealFeelTemperature.Minimum.Value.toFixed(2);
                day.humidity = null;
                day.icon = Forecast.DailyForecasts[i].Day.Icon;
                day.sunrise = new Date(Forecast.DailyForecasts[i].Sun.Rise);
                day.sunset = new Date(Forecast.DailyForecasts[i].Sun.Set);
                day.tempHigh = Forecast.DailyForecasts[i].Temperature.Maximum.Value.toFixed(2);
                day.tempLow = Forecast.DailyForecasts[i].Temperature.Minimum.Value.toFixed(2);
                if (options.celsius) {
                    day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                    day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                    day.tempHigh = toCelsius(day.tempHigh);
                    day.tempLow = toCelsius(day.tempLow);
                }
                _self.forecast.push(day);
            }

            if (typeof callback === 'function') { callback(null); } 
            
        } catch (err) {
            _self.error = err;
            if (typeof callback === 'function') { callback(err); }
        }    

    }
} ///END OF service object

/**
 * Looks up the location key needed for Accuweather
 * 
 * @param {object} options 
 * @param {String} options.key - API Key
 * @param {number|string} [options.latitude] - The latitude 
 * @param {number|string} [options.longitude] - the longitude 
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
    if (options.latitude && options.longitude) {
        url = 'https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=[KEY]&q=[LAT],[LONG]';
    } else {
        err = 'Invalid location information';
        if (typeof callback === 'function') { callback(err); }
        return null;    
    }
    
    
    url = url.replace('[KEY]',options.key)
            .replace('[LAT]', options.latitude)
            .replace('[LONG]', options.longitude);
    try {
        https.get(url, function(res){
            var body = '';
            res.on('data', function(chunk){ body += chunk; });
            res.on('end', function(){
                try {
                    var res = JSON.parse(body);
                    var locationKey = '';
                    locationKey = res.Key;
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
