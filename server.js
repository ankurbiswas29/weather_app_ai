require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5500;

app.use(express.static('./frontend'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// console.log(process.env) 
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
// console.log(OPENWEATHER_API_KEY)

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
   if ('OPTIONS' === req.method) {
       res.sendStatus(200);
   } else {
       next();
   }
});

const parseUserInput = async (input) => {
   try {
       const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
       const result = await model.generateContent({
           contents: [
               {
                   parts: [
                       {
                           text: `Parse the following query to identify the location and the weather-related intent: "${input}". Return the result as a JSON object with "location" and "intent".`
                       }
                   ]
               }
           ]
       });

    //    console.log('Gemini API response for parsing:', JSON.stringify(result, null, 2));

       const jsonData = result.response.candidates[0].content.parts[0].text.match(/\{.*\}/s)[0];
       const parsedResponse = JSON.parse(jsonData);
       const { location, intent } = parsedResponse;
       return { location, intent };
   } catch (geminiError) {
       console.error('Error processing Gemini API:', geminiError);
       throw geminiError;
   }
};

const getGeocodingData = async (location) => {
    try {
        const response = await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${OPENWEATHER_API_KEY}`);
        if (response.data.length > 0) {
            const { lat, lon } = response.data[0];
            return { lat, lon };
        } else {
            throw new Error(`No geocoding data found for location: ${location}`);
        }
    } catch (error) {
        console.error('Error fetching geocoding data:', error);
        throw error;
    }
};

const getWeatherData = async (location) => {
   try {
       const { lat, lon } = await getGeocodingData(location);

       const weatherResponse = await axios.get(
           'http://api.openweathermap.org/data/2.5/weather',
           {
               params: {
                   lat,
                   lon,
                   appid: OPENWEATHER_API_KEY,
                   units: 'metric',
               },
           }
       );

       const uvResponse = await axios.get(
           `https://api.openweathermap.org/data/2.5/uvi`,
           {
               params: {
                   lat,
                   lon,
                   appid: OPENWEATHER_API_KEY,
               },
           }
       );

       const weatherData = {
           ...weatherResponse.data,
           uv: uvResponse.data.value,
       };

       console.log('OpenWeatherMap API response:', weatherData);
       return weatherData;
   } catch (error) {
       console.error('Error fetching weather data:', error);
       throw error;
   }
};

const fetchHourlyForecast = async (latitude, longitude) => {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,weathercode,windspeed_10m&timezone=${timezone}`
        );
        console.log('Open-Meteo Hourly Forecast:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching hourly forecast:', error);
        throw error;
    }
};

const fetch7DayForecast = async (latitude, longitude) => {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,weathercode&timezone=${timezone}`
        );
        console.log('Open-Meteo 7-day Forecast:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching 7-day forecast:', error);
        throw error;
    }
};

const sendWeatherToGemini = async (weatherData, location, intent) => {
   const temperature = weatherData.main.temp;
   const feels_like = weatherData.main.feels_like;
   const humidity = weatherData.main.humidity;
   const pressure = weatherData.main.pressure;
   const cloudiness = weatherData.clouds.all;
   const wind_speed = weatherData.wind.speed;
   const wind_deg = weatherData.wind.deg;
   const description = weatherData.weather?.[0]?.description || 'N/A';
   const precipitation = weatherData.rain ? (weatherData.rain['1h'] || weatherData.rain['3h'] || '0 mm') : '0 mm';
   const uv = weatherData.uv;

   const { lat, lon } = weatherData.coord;
   const hourlyForecast = await fetchHourlyForecast(lat, lon);
    const sevenDayForecast = await fetch7DayForecast(lat, lon);

    let promptText;

    if (intent === "rain_forecast") {
        promptText = `The user wants to know if it will rain tomorrow in ${location}. The current weather is ${description} with a temperature of ${temperature}°C, feels like ${feels_like}°C, ${humidity}% humidity, ${pressure} hPa pressure, ${cloudiness}% cloudiness, wind speed ${wind_speed} m/s at ${wind_deg} degrees, UV index of ${uv}, and ${precipitation} of rain. The hourly forecast includes weather codes ${hourlyForecast.hourly.weathercode.join(', ')} and wind speeds ${hourlyForecast.hourly.windspeed_10m.join(', ')} m/s. The 7-day forecast includes weather codes ${sevenDayForecast.daily.weathercode.join(', ')}, precipitation hours ${sevenDayForecast.daily.precipitation_hours.join(', ')}, and precipitation sums ${sevenDayForecast.daily.precipitation_sum.join(', ')} mm. Based on this information, will it rain tomorrow in ${location}?`;
    } else if (intent === "current_rain") {
        promptText = `The user wants to know if it is currently raining in ${location}. The current weather is ${description} with a temperature of ${temperature}°C, feels like ${feels_like}°C, ${humidity}% humidity, ${pressure} hPa pressure, ${cloudiness}% cloudiness, wind speed ${wind_speed} m/s at ${wind_deg} degrees, UV index of ${uv}, and ${precipitation} of rain. The hourly forecast includes weather codes ${hourlyForecast.hourly.weathercode.join(', ')} and wind speeds ${hourlyForecast.hourly.windspeed_10m.join(', ')} m/s. The 7-day forecast includes weather codes ${sevenDayForecast.daily.weathercode.join(', ')}, precipitation hours ${sevenDayForecast.daily.precipitation_hours.join(', ')}, and precipitation sums ${sevenDayForecast.daily.precipitation_sum.join(', ')} mm. Is it currently raining in ${location}?`;
    } else {
        promptText = `The user has asked about the weather in ${location} with intent "${intent}". The current weather is ${description} with a temperature of ${temperature}°C, feels like ${feels_like}°C, ${humidity}% humidity, ${pressure} hPa pressure, ${cloudiness}% cloudiness, wind speed ${wind_speed} m/s at ${wind_deg} degrees, UV index of ${uv}, and ${precipitation} of rain. The hourly forecast includes weather codes ${hourlyForecast.hourly.weathercode.join(', ')} and wind speeds ${hourlyForecast.hourly.windspeed_10m.join(', ')} m/s. The 7-day forecast includes weather codes ${sevenDayForecast.daily.weathercode.join(', ')}, precipitation hours ${sevenDayForecast.daily.precipitation_hours.join(', ')}, and precipitation sums ${sevenDayForecast.daily.precipitation_sum.join(', ')} mm. How should I respond to the user's query?`;
    }

   try {
       const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
       const result = await model.generateContent({
           contents: [
               {
                   parts: [
                       {
                           text: promptText
                       }
                   ]
               }
           ]
       });

       console.log('Gemini API response for weather query:', JSON.stringify(result, null, 2));

       if (result && result.response && result.response.candidates && result.response.candidates[0] && result.response.candidates[0].content.parts[0].text) {
           const finalResponse = result.response.candidates[0].content.parts[0].text;
           
           // Define patterns for unnecessary information
           const patternsToRemove = [
            /Here are some options for responding:[\s\S]*/, // Remove example response or suggestions
            /You could say something like:[\s\S]*/, // Remove example prompts
            /\*\*To provide a more comprehensive answer[\s\S]*\*\*/, // Remove comprehensive answer prompts
            /If you want to be more specific, you could mention that\./, // Remove further specific suggestion
            /^Here's a response to the user's query about the weather[\s\S]*/, // Remove introductory line
            /\*\*Option \d+:[\s\S]*\*\*/, // Remove option descriptions
            /\*\*Important Considerations:\*\*[\s\S]*/, // Remove important considerations section
            /\*[\s\S]*\*/, // Remove bullet points and their content
            /Here's how you can respond to the user's query about the[\s\S]*/, // Remove introductory line
            /Remember to always provide accurate and up-to-date information\./, // Remove closing reminder
            /You could also suggest[\s\S]*$/ // Remove "You could also suggest" section
        ];
       
           // Apply each pattern to remove unnecessary info
           let filteredResponse = finalResponse;
           patternsToRemove.forEach(pattern => {
               filteredResponse = filteredResponse.replace(pattern, '');
           });
       
           /*console.log('Final filtered response:', filteredResponse); // Optional log for debugging*/
           
           return filteredResponse; // This is the filtered response that will be sent to the user
       }
} catch (geminiError) {
    console.error('Error processing Gemini API:', geminiError);
    throw geminiError;
}
};

const generateResponse = async (userInput) => {
try {
    const { location, intent } = await parseUserInput(userInput);

    if (!location) {
        // Let Gemini API handle general queries
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
            contents: [
                {
                    parts: [
                        {
                            text: `Please provide a specific location and weather-related intent in your query. For example, you can ask about the weather forecast for a particular city or inquire if it's currently raining in a specific location.`
                        }
                    ]
                }
            ]
        });

        return result.response.candidates[0].content.parts[0].text;
    }

    const weatherData = await getWeatherData(location);
    const geminiResponse = await sendWeatherToGemini(weatherData, location, intent);

    return geminiResponse;
} catch (error) {
    console.error('Error processing user input:', error);
    return 'Sorry, something went wrong while processing your query.';
}
};


app.post('/api/ai/weather', async (req, res) => {
const userInput = req.body.userInput?.trim();

if (!userInput) {
    return res.status(400).json({ error: 'Invalid input' });
}

try {
    const responseText = await generateResponse(userInput);
    res.json({ response: responseText });
} catch (error) {
    console.error('Error processing weather query:', error);
    res.status(500).json({ error: 'Internal server error' });
}
});

app.listen(port, () => {
console.log(`Server running on port ${port}`);
});