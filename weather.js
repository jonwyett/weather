/*
ver 2.1.3 
    - Refactored to use async/await and Promises, removing callback complexity.
    - Replaced custom emitter with Node.js's built-in EventEmitter.
    - Centralized provider configurations for improved maintainability.
    - Removed 'jw-gate' dependency.
    - Implemented https.Agent with keepAlive for performance.
    - Added API key redaction from error messages for security.
    - Fixed bug: WeatherBit provider used hard-coded coordinates.
    - Fixed bug: OpenWeatherMap parser had incorrect temperature assignments.
    - Corrected data types: Temperatures and humidity are now numbers, not strings.
ver 2.1.2
    -minor bugfix
ver 2.1.1
    -remove hard-coded key to weatherbit
ver 2.1.0
    -Add OpenWetherMap support
    -Add WeatherBit support
    -Complete rewrite
    -require jw-gate
ver 1.0.2
    -includes celsius option
*/

// Node.js built-in modules
const https = require('https');
const { EventEmitter } = require('events');

// Use a single agent for all requests to enable connection reuse, improving performance.
const keepAliveAgent = new https.Agent({ keepAlive: true });

/**
 * Converts a temperature from Fahrenheit to Celsius.
 * @param {number} tempFahrenheit - Temperature in Fahrenheit.
 * @returns {number} Temperature in Celsius.
 */
function toCelsius(tempFahrenheit) {
    return (tempFahrenheit - 32) * (5 / 9);
}

/**
 * Creates a standard daily forecast object.
 * @returns {object} A daily forecast object with null properties.
 */
function getDailyObject() {
    return {
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
}

/**
 * Fetches data from a URL and returns it as a promise.
 * @param {string} url - The URL to fetch.
 * @param {string} apiKey - The API key to redact from potential errors.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON body.
 */
function getAPIData(url, apiKey) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { agent: keepAliveAgent }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Request Failed. Status Code: ${res.statusCode}`));
            }

            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(new Error('Failed to parse API response.'));
                }
            });
        });

        request.on('error', (err) => {
            // Sanitize the error message to avoid logging the API key
            const sanitizedError = new Error(err.message.replace(apiKey, '[REDACTED_KEY]'));
            sanitizedError.stack = err.stack;
            reject(sanitizedError);
        });
    });
}


// --- Provider-specific Parsing Logic ---
// Note: These functions now accept `apiData` as an argument and assume `this` is the `service` instance.

function parseDarkSky(apiData) {
    try {
        const weather = apiData.Forecast;
        if (weather.error) {
            throw new Error(weather.error);
        }

        this.raw = weather;
        this.temp = weather.currently.temperature;
        this.feelsLike = weather.currently.apparentTemperature;
        this.currentCondition = weather.currently.summary;
        this.humidity = weather.currently.humidity;
        this.forecastTime = new Date(weather.currently.time * 1000);
        this.sunrise = new Date(weather.daily.data[0].sunriseTime * 1000);
        this.sunset = new Date(weather.daily.data[0].sunsetTime * 1000);
        this.icon = weather.currently.icon;

        if (this.options.celsius) {
            this.temp = toCelsius(this.temp);
            this.feelsLike = toCelsius(this.feelsLike);
        }

        this.forecast = [];
        for (let i = 0; i < 5; i++) {
            const dayData = weather.daily.data[i];
            const day = getDailyObject();
            day.condition = dayData.summary;
            day.feelsLikeHigh = dayData.apparentTemperatureHigh;
            day.feelsLikeLow = dayData.apparentTemperatureLow;
            day.humidity = dayData.humidity;
            day.icon = dayData.icon;
            day.sunrise = new Date(dayData.sunriseTime * 1000);
            day.sunset = new Date(dayData.sunsetTime * 1000);
            day.tempHigh = dayData.temperatureHigh;
            day.tempLow = dayData.temperatureLow;
            
            if (this.options.celsius) {
                day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                day.tempHigh = toCelsius(day.tempHigh);
                day.tempLow = toCelsius(day.tempLow);
            }
            this.forecast.push(day);
        }
    } catch (err) {
        this.error = err;
        throw err; // Re-throw to be caught by the calling async function
    }
}

function parseAccuweather(apiData) {
    try {
        const CurrentConditions = apiData.CurrentConditions[0];
        const Forecast = apiData.Forecast;

        this.raw = apiData;
        this.temp = CurrentConditions.Temperature.Imperial.Value;
        this.feelsLike = CurrentConditions.RealFeelTemperature.Imperial.Value;
        this.currentCondition = CurrentConditions.WeatherText;
        this.humidity = CurrentConditions.RelativeHumidity / 100;
        this.forecastTime = new Date(CurrentConditions.LocalObservationDateTime);
        this.sunrise = new Date(Forecast.DailyForecasts[0].Sun.Rise);
        this.sunset = new Date(Forecast.DailyForecasts[0].Sun.Set);
        this.icon = CurrentConditions.WeatherIcon;

        if (this.options.celsius) {
            this.temp = toCelsius(this.temp);
            this.feelsLike = toCelsius(this.feelsLike);
        }

        this.forecast = [];
        for (let i = 0; i < 5; i++) {
            const dayData = Forecast.DailyForecasts[i];
            const day = getDailyObject();
            day.condition = dayData.Day.ShortPhrase;
            day.feelsLikeHigh = dayData.RealFeelTemperature.Maximum.Value;
            day.feelsLikeLow = dayData.RealFeelTemperature.Minimum.Value;
            day.humidity = null; // AccuWeather does not provide this in the 5-day forecast
            day.icon = dayData.Day.Icon;
            day.sunrise = new Date(dayData.Sun.Rise);
            day.sunset = new Date(dayData.Sun.Set);
            day.tempHigh = dayData.Temperature.Maximum.Value;
            day.tempLow = dayData.Temperature.Minimum.Value;

            if (this.options.celsius) {
                day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                day.tempHigh = toCelsius(day.tempHigh);
                day.tempLow = toCelsius(day.tempLow);
            }
            this.forecast.push(day);
        }
    } catch (err) {
        this.error = err;
        throw err;
    }
}

function parseOpenWeatherMap(apiData) {
    try {
        const CurrentConditions = apiData.CurrentConditions;
        const Forecast = apiData.Forecast;

        this.raw = apiData;
        this.temp = CurrentConditions.main.temp;
        this.feelsLike = CurrentConditions.main.feels_like;
        this.currentCondition = CurrentConditions.weather[0].description;
        this.humidity = CurrentConditions.main.humidity / 100;
        this.forecastTime = new Date(CurrentConditions.dt * 1000);
        this.sunrise = new Date(CurrentConditions.sys.sunrise * 1000);
        this.sunset = new Date(CurrentConditions.sys.sunset * 1000);
        this.icon = CurrentConditions.weather[0].icon;

        if (this.options.celsius) {
            this.temp = toCelsius(this.temp);
            this.feelsLike = toCelsius(this.feelsLike);
        }

        this.forecast = [];
        // NOTE: OpenWeatherMap free tier returns a 3-hour forecast. The original
        // code took the first 5 entries (a 15-hour forecast). This behavior is
        // preserved to avoid a breaking change.
        for (let i = 0; i < 5; i++) {
            const forecastItem = Forecast.list[i];
            const day = getDailyObject();
            day.condition = forecastItem.weather[0].description;
            day.tempHigh = forecastItem.main.temp_max;
            day.tempLow = forecastItem.main.temp_min;
            day.feelsLikeHigh = day.tempHigh; // Fallback, `feels_like` not provided per temp in forecast
            day.feelsLikeLow = day.tempLow;   // Fallback
            day.humidity = forecastItem.main.humidity / 100;
            day.icon = forecastItem.weather[0].icon;

            if (this.options.celsius) {
                day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                day.tempHigh = toCelsius(day.tempHigh);
                day.tempLow = toCelsius(day.tempLow);
            }
            this.forecast.push(day);
        }
    } catch (err) {
        this.error = err;
        throw err;
    }
}

function parseWeatherBit(apiData) {
    try {
        const CurrentConditions = apiData.CurrentConditions.data[0];
        const Forecast = apiData.Forecast.data;

        this.raw = apiData;
        this.temp = CurrentConditions.temp;
        this.feelsLike = CurrentConditions.app_temp;
        this.currentCondition = CurrentConditions.weather.description;
        this.humidity = CurrentConditions.rh / 100;
        this.forecastTime = new Date(CurrentConditions.ts * 1000);
        this.sunrise = new Date(Forecast[0].sunrise_ts * 1000);
        this.sunset = new Date(Forecast[0].sunset_ts * 1000);
        this.icon = CurrentConditions.weather.icon;

        if (this.options.celsius) {
            this.temp = toCelsius(this.temp);
            this.feelsLike = toCelsius(this.feelsLike);
        }
        
        this.forecast = [];
        for (let i = 0; i < 5; i++) {
            const dayData = Forecast[i];
            const day = getDailyObject();
            day.condition = dayData.weather.description;
            day.feelsLikeHigh = dayData.app_max_temp;
            day.feelsLikeLow = dayData.app_min_temp;
            day.humidity = dayData.rh / 100;
            day.icon = dayData.weather.icon;
            day.sunrise = new Date(dayData.sunrise_ts * 1000);
            day.sunset = new Date(dayData.sunset_ts * 1000);
            day.tempHigh = dayData.max_temp;
            day.tempLow = dayData.low_temp;

            if (this.options.celsius) {
                day.feelsLikeHigh = toCelsius(day.feelsLikeHigh);
                day.feelsLikeLow = toCelsius(day.feelsLikeLow);
                day.tempHigh = toCelsius(day.tempHigh);
                day.tempLow = toCelsius(day.tempLow);
            }
            this.forecast.push(day);
        }
    } catch (err) {
        this.error = err;
        throw err;
    }
}


// --- Central Provider Configuration ---
const PROVIDER_CONFIG = {
    'darksky': {
        urls: {
            Forecast: 'https://api.darksky.net/forecast/[KEY]/[LAT],[LONG]?exclude=["minutely","flags","alerts"]'
        },
        parser: parseDarkSky,
        requiresLocationLookup: false,
    },
    'accuweather': {
        urls: {
            CurrentConditions: 'https://dataservice.accuweather.com/currentconditions/v1/[LOCATION]?apikey=[KEY]&details=true',
            Forecast: 'https://dataservice.accuweather.com/forecasts/v1/daily/5day/[LOCATION]?apikey=[KEY]&details=true'
        },
        parser: parseAccuweather,
        requiresLocationLookup: true,
    },
    'openweathermap': {
        urls: {
            CurrentConditions: 'https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=[LAT]&lon=[LONG]&appid=[KEY]',
            Forecast: 'https://api.openweathermap.org/data/2.5/forecast?units=imperial&lat=[LAT]&lon=[LONG]&appid=[KEY]'
        },
        parser: parseOpenWeatherMap,
        requiresLocationLookup: false,
    },
    'weatherbit': {
        urls: {
            // BUG FIX: Corrected hard-coded lat/lon with placeholders
            CurrentConditions: 'https://api.weatherbit.io/v2.0/current?lat=[LAT]&lon=[LONG]&units=I&key=[KEY]',
            Forecast: 'https://api.weatherbit.io/v2.0/forecast/daily?lat=[LAT]&lon=[LONG]&days=5&units=I&key=[KEY]',
        },
        parser: parseWeatherBit,
        requiresLocationLookup: false,
    }
};

/**
 * Creates a service for various online weather APIs
 * 
 * @param {Object} options
 * @param {String} options.key - API Key
 * @param {'darksky'|'accuweather'|'openweathermap'|'weatherbit'} options.provider - The weather provider to use
 * @param {Number} options.latitude - The latitude 
 * @param {Number} options.longitude - the longitude 
 * @param {boolean} [options.celsius=false] - Temperature in celsius
 */
class service extends EventEmitter {
    constructor(options) {
        super();

        this.raw = {};
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

        this.options = options;
        this.locationKey = null; // For AccuWeather
        this.ready = false;
        
        // A promise that resolves when startup tasks are complete.
        // This replaces the complex `runUpdateWhenReady` logic.
        this._readyPromise = this._startup();
    }

    /**
     * @private
     */
    async _startup() {
        try {
            if (!this.options || typeof this.options.key !== 'string' ||
                typeof this.options.latitude !== 'number' || typeof this.options.longitude !== 'number') {
                throw new Error('Invalid startup options. Must provide key, latitude, and longitude.');
            }

            this.options.provider = this.options.provider.toLowerCase();
            const providerConfig = PROVIDER_CONFIG[this.options.provider];

            if (!providerConfig) {
                throw new Error(`Unsupported provider: ${this.options.provider}`);
            }

            if (providerConfig.requiresLocationLookup) {
                this.locationKey = await this._accuweatherLocationLookup();
            }

            this.ready = true;
            // Use setImmediate to ensure 'ready' event fires after the constructor has finished.
            setImmediate(() => this.emit('ready'));

        } catch (err) {
            this.error = err;
            setImmediate(() => this.emit('error', err.message));
        }
    }

    /**
     * @private
     * @returns {Promise<string>} A promise that resolves with the location key.
     */
    async _accuweatherLocationLookup() {
        const { key, latitude, longitude } = this.options;
        const url = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${key}&q=${latitude},${longitude}`;
        
        const res = await getAPIData(url, key);
        if (!res || !res.Key) {
            throw new Error('AccuWeather location lookup failed to return a valid Key.');
        }
        return res.Key;
    }

    /**
     * Updates the weather data by fetching from the configured provider.
     * @param {Function} [callback] - Optional: A callback(err) to be executed upon completion.
     */
    async update(callback) {
        try {
            await this._readyPromise;
            if (!this.ready) {
                throw new Error('Service is not ready. Startup may have failed.');
            }

            const providerConfig = PROVIDER_CONFIG[this.options.provider];
            
            const apiPromises = Object.entries(providerConfig.urls).map(([name, urlTemplate]) => {
                const url = urlTemplate.replace('[KEY]', this.options.key)
                                       .replace('[LAT]', this.options.latitude)
                                       .replace('[LONG]', this.options.longitude)
                                       .replace('[LOCATION]', this.locationKey);
                return getAPIData(url, this.options.key).then(data => ({ name, data }));
            });

            const results = await Promise.all(apiPromises);

            const apiData = results.reduce((acc, { name, data }) => {
                acc[name] = data;
                return acc;
            }, {});

            // Run the parser, binding `this` to the service instance
            providerConfig.parser.call(this, apiData);
            
            this.lastUpdate = new Date().toString();
            this.error = null; // Clear previous errors on success

            if (typeof callback === 'function') {
                callback(null);
            }
        } catch (err) {
            this.error = err;
            this.emit('error', err.message);
            if (typeof callback === 'function') {
                callback(err);
            }
        }
    }

    /**
     * @returns {Object} The complete weather data object.
     */
    fullWeather() {
        return {
            lastUpdate: this.lastUpdate,
            forecastTime: this.forecastTime,
            temp: this.temp,
            feelsLike: this.feelsLike,
            humidity: this.humidity,
            currentCondition: this.currentCondition,
            icon: this.icon,
            sunrise: this.sunrise,
            sunset: this.sunset,
            forecast: this.forecast
        };
    }
}

exports.service = service;