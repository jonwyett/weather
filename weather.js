/*

ver 2.1.0
    -Add OpenWetherMap support
    -Add WeatherBit support
    -Complete rewrite
    -require jw-gate
ver 1.0.2
    -includes celsius option    
*/

var jwGate = require('jw-gate');

/**
 * Creates a service for various online weather APIs
 * 
 * @param {Object} options
 * @param {String} options.key - API Key
 * @param {'darksky'|'accuweather'|'openweathermap'|weatherbit} options.provider - The weather provider to use
 * @param {Number} [options.latitude] - The latitude 
 * @param {Number} [options.longitude] - the longitude 
 * @param {boolean} [options.celsius] - Temperature in celsius
 * 
 */
function service(options) {
    var _self = this;

    // weather information
    this.raw = {}; //this is the raw API response from the provider

    //an object to hold the various data elements and urls to retrieve the data
    this.weatherData = {};

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
        options.provider = options.provider.toLowerCase();
        // TODO: Actually test that darksky is working before ready? Maybe just ping the service?
        if (options.provider === 'darksky' || 
            options.provider === 'openweathermap' || 
            options.provider === 'weatherbit') {
            
            _self.ready = true;
            if (_self.runUpdateWhenReady) {
                _self.update(_self.updateWhenReadyFunc);
            }
            setTimeout(function() {
                emit('ready', null);
            }, 100);
            

        } else if (options.provider === 'accuweather') {
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
            getWeatherData(callback);
        } else {
            _self.runUpdateWhenReady = true;
            _self.updateWhenReadyFunc = callback;
        }
    };


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


    function getWeatherData(callback) {
        /*
            This function is perhaps to clever for it's own good. This is bad. I will attempt to explain the design:
            Each weather provider has 1 or more different API calls that are required to retrieve the standard data.
            1) Create a weather object with all of the urls needed.
            2) Create a jw-gate object using the weather object's keys as lock names
                jw-gate is a simple class for running sync events. When all the "locks" on the gate become unlocked
                the gate itself becomes unlocked and whatever needs to happen after all of the sync events are completed
                happens.
            3) Iterate through the weather object and get the data. This step is the confusing one because after the 
               data is retrieved the url in the weather object will be replaced with the data itself, so in simple terms:
                    weather {
                        Forecast: 'https://API.com'
                    }
                    becomes:
                    weather {
                        ForeCast: {
                            temp: 25.45,
                            humidity: 48
                        }
                    }
            4) Parse the weather data using a unique parser for that API
            5) Run the callback function

        */
        
        //will be null if the parser is successful or will contain an error
        var err = null;
        
        //fill the weatherData object with the needed API calls
        if (options.provider === 'openweathermap') {
            weatherData = {
                CurrentConditions: 'https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=[LAT]&lon=[LONG]&appid=[KEY]',
                Forecast: 'https://api.openweathermap.org/data/2.5/forecast?units=imperial&lat=[LAT]&lon=[LONG]&appid=[KEY]'
            };
        } else if (options.provider === 'accuweather') {
            weatherData = {
                CurrentConditions: 'https://dataservice.accuweather.com/currentconditions/v1/[LOCATION]?apikey=[KEY]&details=true',
                Forecast: 'https://dataservice.accuweather.com/forecasts/v1/daily/5day/[LOCATION]?apikey=[KEY]&details=true'
            };
        } else if (options.provider === 'darksky') {
            weatherData = {
                Forecast: 'https://api.darksky.net/forecast/[KEY]/[LAT],[LONG]?exclude=["minutely","flags","alerts"]'
            };
        } else if (options.provider === 'weatherbit') {
            weatherData = {
                Forecast: 'https://api.weatherbit.io/v2.0/forecast/daily?lat=[LAT]&lon=[LONG]&days=5&units=I&key=[KEY]',
                CurrentConditions: 'https://api.weatherbit.io/v2.0/current?lat=40.758556&lon=-73.765434&units=I&key=bd2295d6056e46a0adb4f2ff43569e03'
            };
        }

        //get an array holding the weatherData keys
        var apiCalls = Object.keys(weatherData);

        //create a gate to allow for simultaneous API calls using the keys
        var apiGate = new jwGate.Gate(apiCalls, true);
        //this will fire when all the API calls are complete
        apiGate.on('unlocked', function() {
            if (options.provider === 'openweathermap') {
                err = parseOpenWeatherMap();
            } else if (options.provider === 'accuweather') {
                err = parseAccuweather();
            } else if (options.provider === 'darksky') {
                err = parseDarkSky();
            } else if (options.provider === 'weatherbit') {
                err = parseWeatherBit();
            }
            //emit the error if it has been set
            if (err) { emit('error', err); }

            //run the callback function
            if (typeof callback === 'function') { callback(err); }
        });

        //replace the values in the url and get the data
        apiCalls.forEach(function(url) {
            weatherData[url] = weatherData[url].replace('[KEY]',options.key)
                                                .replace('[LAT]', options.latitude.toString())
                                                .replace('[LONG]', options.longitude.toString())
                                                .replace('[LOCATION]', _self.locationKey);
            
            //console.log(weatherData[url]);
            getAPIData(weatherData[url], function(err, weather) {
                if (err) {
                    callback(err);
                } else {
                    //this replaces the url with the weather data retrieved from the API
                    weatherData[url] = weather; 
                    apiGate.lock(url, false);   
                }
            });
        });        

    }

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

    function parseDarkSky() {
        _self.lastUpdate = new Date().toString();
        try {
            var weather = weatherData.Forecast;
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

                return null;
            }
        } catch (err) {
            _self.error = err;
            return err;
        }        
    }

    function parseAccuweather() {
        _self.lastUpdate = new Date().toString();
        _self.raw = weatherData;
        try {
            var CurrentConditions = weatherData.CurrentConditions[0]; //break it out of the array
            var Forecast = weatherData.Forecast;

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

            return null;
            
        } catch (err) {
            _self.error = err;
            return err;
        }    

    }

    function parseOpenWeatherMap() {
        _self.lastUpdate = new Date().toString();
        try {
            var CurrentConditions = weatherData.CurrentConditions;
            var Forecast = weatherData.Forecast;

             _self.raw = weatherData;
             _self.temp = CurrentConditions.main.temp.toFixed(2);
            _self.feelsLike = CurrentConditions.main.feels_like.toFixed(2);
            _self.currentCondition = CurrentConditions.weather[0].description;
            _self.humidity = CurrentConditions.main.humidity.toFixed(2);
            //_self.forecastTime = new Date(CurrentConditions * 1000);
            _self.sunrise = new Date(CurrentConditions.sys.sunrise * 1000);
            _self.sunset = new Date(CurrentConditions.sys.sunset * 1000);
            _self.icon = CurrentConditions.weather[0].icon;

            //set celsius if desired
            if (options.celsius) {
                _self.temp = toCelsius(_self.temp);
                _self.feelsLike = toCelsius(_self.feelsLike);
            }


            //create the forecast

            for (var i=0; i<5; i++) {
                var day = getDailyObject();
                day.condition = Forecast.list[i].weather[0].description;
                
                day.feelsLikeHigh = Forecast.list[i].main.temp_max.toFixed(2);
                day.feelsLikeLow = Forecast.list[i].main.temp_min.toFixed(2);
                day.humidity = Forecast.list[i].main.humidity.toFixed(2);
                day.icon = null;
                day.sunrise = null;
                day.sunset = null;
                day.tempHigh = day.feelsLikeHigh;
                day.tempLow =day.feelsLikeLow;
                if (options.celsius) {
                    day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                    day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                    day.tempHigh = toCelsius(day.tempHigh);
                    day.tempLow = toCelsius(day.tempLow);
                }
                
                _self.forecast.push(day);
            }

            return null;
        } catch (err) {
            _self.error = err;
            return err;
        }   
    }

    function parseWeatherBit() {
        _self.lastUpdate = new Date().toString();
        try {
            
            _self.raw = weatherData;

            var CurrentConditions = weatherData.CurrentConditions.data[0];

            var Forecast = weatherData.Forecast;

            _self.temp = CurrentConditions.temp.toFixed(2);
            _self.feelsLike = CurrentConditions.app_temp.toFixed(2);
            _self.currentCondition = CurrentConditions.weather.description;
            _self.humidity = CurrentConditions.rh.toFixed(2);
            _self.forecastTime = new Date(CurrentConditions.ts * 1000);
            _self.sunrise = new Date(Forecast.data[0].sunrise_ts * 1000);
            _self.sunset = new Date(Forecast.data[0].sunset_ts * 1000);
            _self.icon = CurrentConditions.weather.icon;

            //set celsius if desired
            if (options.celsius) {
                _self.temp = toCelsius(_self.temp);
                _self.feelsLike = toCelsius(_self.feelsLike);
            }

            //create the forecast

            for (var i=0; i<5; i++) {
                var day = getDailyObject();
                day.condition = Forecast.data[i].weather.description;
                day.feelsLikeHigh = Forecast.data[i].app_max_temp.toFixed(2);
                day.feelsLikeLow = Forecast.data[i].app_min_temp.toFixed(2);
                day.humidity = Forecast.data[i].rh.toFixed(2);
                day.icon = Forecast.data[i].weather.icon;
                day.sunrise = new Date(Forecast.data[i].sunrise_ts * 1000);
                day.sunset = new Date(Forecast.data[i].sunset_ts * 1000);
                day.tempHigh = Forecast.data[i].max_temp.toFixed(2);
                day.tempLow = Forecast.data[i].low_temp.toFixed(2);
                if (options.celsius) {
                    day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                    day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                    day.tempHigh = toCelsius(day.tempHigh);
                    day.tempLow = toCelsius(day.tempLow);
                }
                _self.forecast.push(day);
            }

            return null;
            
        } catch (err) {
            _self.error = err;
            return err;
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
