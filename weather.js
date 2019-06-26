/**
 * Creates a service for various online weather APIs
 * 
 * @param {Object} options
 * @param {String} options.key - API Key
 * @param {'darksky'} options.provider - The weather provider to use
 * @param {Number} options.latitude - The latitude (darksky)
 * @param {Number} options.longitude - the longitude (darksky)
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
    this.feelsLike = null;
    this.sunrise = null;
    this.sunset = null;
    this.error = null;

    (function startup() {
        if (options.provider === 'darksky') {
            var err = null;
        if (typeof options.key !== 'string' ||
            typeof options.latitude !== 'number' ||
            typeof options.longitude !== 'number') {
                err = 'Invalid startup options.';
            }

            if (typeof callback === 'function') { callback(err); }
        }
    })();
    
    /******* PUBLIC FUNCTIONS *******************************************/

    /**
     * Updates the weather data
     * @param {Function} [callback]
     */
    this.update = function(callback) {
        var https = require('https');
        var url = '';
        if (options.provider === 'darksky') {
            url = 'https://api.darksky.net/forecast/[KEY]/[LAT],[LONG]?exclude=["minutely","flags","alerts"]';
        }
        url = url.replace('[KEY]',options.key)
                // @ts-ignore
                .replace('[LAT]', options.latitude)
                .replace('[LONG]', options.longitude);
        try {
            https.get(url, function(res){
                var body = '';
                res.on('data', function(chunk){ body += chunk; });
                res.on('end', function(){
                    try {
                        if (options.provider === 'darksky'){ parseDarkSky(body, callback); }   
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
            forecastTime: _self.forecastTime
        };

        return weather;
    };

    /******* END PUBLIC FUNCTIONS *******************************************/


    function parseDarkSky(weather, callback) {
        _self.lastUpdate = Date.now();
        try {
            weather = JSON.parse(weather);
            if (weather.error) {
                if (typeof callback === 'function') {callback(weather.error); }
            } else {
                _self.raw = weather;
                _self.temp = weather.currently.temperature;
                _self.feelsLike = weather.currently.apparentTemperature;
                _self.currentCondition = weather.currently.summary;
                _self.humidity = weather.currently.humidity;
                _self.forecastTime = new Date(weather.currently.time * 1000);
                _self.sunrise = new Date(weather.daily.data[0].sunriseTime * 1000);
                _self.sunset = new Date(weather.daily.data[0].sunsetTime * 1000);

                if (typeof callback === 'function') { callback(null); } 
            }
        } catch (err) {
            _self.error = err;
            if (typeof callback === 'function') { callback(err); }
        }        
    }
}

exports.service = service;