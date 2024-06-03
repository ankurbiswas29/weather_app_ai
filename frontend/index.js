document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const search = document.querySelector('.search-box button');
    const searchInput = document.querySelector('.search-box input');
    const weatherBox = document.querySelector('.weather-box');
    const weatherDetails = document.querySelector('.weather-details');
    const error404 = document.querySelector('.not-found');
    const forecastSection = document.querySelector('.forecast');
    const forecastTitle = document.querySelector('.forecast h2');
    const forecastDetails = document.querySelector('.forecast-details');
    const toggleMapBtn = document.querySelector('.toggle-map-btn');
    const weatherMap = document.querySelector('.weather-map');
    const mapContainer = document.querySelector('.map-container');
    const hourlyForecastBtn = document.getElementById('hourly-forecast-btn');
    const hourlyForecastModal = document.getElementById('hourly-forecast-modal');
    const closeHourlyForecastModal = document.querySelector('.close');
    const hourlyDetails = document.querySelector('.hourly-details');
    const form = document.querySelector('form');
    const chatForm = document.querySelector('.chat-form');
    const chatInput = chatForm.querySelector('input[name="chatbot"]');
    const chatResponse = document.querySelector('.chat-response');
    const chatbotContainer = document.querySelector('.chat-container');

    const APIKey = 'e6e25c2cecd2759cff082b91f149e349';

    let searchResultsDisplayed = false;
    const defaultContainerHeight = container.style.height; // Store the initial height of the container
    const defaultHourlyForecastBtnDisplay = hourlyForecastBtn.style.display; // Store the initial display value of the hourly forecast button

    search.addEventListener('click', () => {
        const city = searchInput.value.trim();
        if (city === '') return;
        fetchWeather(city);
        searchInput.value = '';
        searchResultsDisplayed = true;
        chatbotContainer.style.display = 'none';
        container.style.height = '590px'; // Set the container height when search results are displayed
        hourlyForecastBtn.style.display = 'flex'; // Show the hourly forecast button
    });

    document.addEventListener('click', (event) => {
        const isClickOutsideSearchBox = !searchInput.parentElement.contains(event.target);
        const isClickOutsidehourlyBox = !hourlyForecastBtn.parentElement.contains(event.target);
        const isClickOutsideWeatherBox = !weatherBox.contains(event.target) && !weatherDetails.contains(event.target);

        if (isClickOutsideSearchBox && isClickOutsideWeatherBox && isClickOutsidehourlyBox) {
            if (searchResultsDisplayed) {
                searchInput.value = '';
                searchResultsDisplayed = false;
                chatbotContainer.style.display = 'block';
                container.style.height = defaultContainerHeight; // Reset the container height to its default
                hourlyForecastBtn.style.display = defaultHourlyForecastBtnDisplay; // Reset the hourly forecast button display
            } else {
                searchInput.value = '';
            }
        }
    });

    document.getElementById('toggle-map-btn').addEventListener('click', function() {
        window.location.href = 'map.html'; 
    });

    document.addEventListener('click', (event) => {
        const isClickInsideChat = chatForm.contains(event.target);
        const isClickInsideChatbot = chatbotContainer.contains(event.target);
        if (!isClickInsideChat&&!isClickInsideChatbot) {
            // Clear the chat response area
            chatResponse.textContent = '';
        }
    });
    
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) {
            chatResponse.textContent = 'Please enter a valid query.';
            return;
        }
    
        try {
            const response = await fetch('https://weater-ai.netlify.app/api/ai/weather', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userInput }),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                chatResponse.textContent = errorData.error || 'An error occurred while processing the query.';
                return;
            }
    
            const data = await response.json();
            console.log(data)
            chatResponse.textContent = data.response;
        } catch (error) {
            console.error('Error:', error);
            chatResponse.textContent = 'Network error occurred while processing the query.';
        }
    
        chatInput.value = '';
    });
    
    hourlyForecastBtn.onclick = function() {
        hourlyForecastModal.style.display = 'block';
    };

    closeHourlyForecastModal.onclick = function() {
        hourlyForecastModal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == hourlyForecastModal) {
            hourlyForecastModal.style.display = 'none';
        }
    };

    async function fetchWeather(city) {
        try {
            const weatherData = await fetchWeatherData(city);
            if (weatherData.cod === '404') {
                showError();
                return;
            }
    
            displayWeather(weatherData);
            const hourlyData = await fetchHourlyForecast(weatherData.coord.lat, weatherData.coord.lon);
            displayHourlyForecast(hourlyData);
            const fiveDayData = await fetchFiveDayForecast(city);
            if (fiveDayData) {
                displayFiveDayForecast(fiveDayData);
            } else {
                // Handle the case when fetchFiveDayForecast returns null (or handle the error in a different way)
                forecastTitle.textContent = 'Unable to fetch 5-day forecast';
                forecastDetails.innerHTML = '';
            }
        } catch (error) {
            console.error('Error fetching weather data:', error);
        }
    }

    
    function showError() {
        container.style.height = '400px';
        weatherBox.style.display = 'none';
        weatherDetails.style.display = 'none';
        error404.style.display = 'block';
        error404.classList.add('fadeIn');
        forecastSection.style.display = 'none';
        forecastTitle.style.display = 'none';

        const hourlyForecastBtn = document.getElementById('hourly-forecast-btn');
        hourlyForecastBtn.style.display = 'none';
    }

    function displayWeather(data) {
        error404.style.display = 'none';
        error404.classList.remove('fadeIn');

        const image = document.querySelector('.weather-box img');
        const temperature = document.querySelector('.weather-box .temperature');
        const description = document.querySelector('.weather-box .description');
        const humidity = document.querySelector('.weather-details .humidity span');
        const wind = document.querySelector('.weather-details .wind span');
        const pressure = document.querySelector('.weather-details .pressure span');
        const uvIndex = document.querySelector('.weather-details .uv-index span');
        const visibility = document.querySelector('.weather-details .visibility span');
        const hourlyForecastBtn = document.getElementById('hourly-forecast-btn');

        switch (data.weather[0].main) {
            case 'Clear':
                image.src = 'images/clear.png';
                break;
            case 'Rain':
                image.src = 'images/rain.png';
                break;
            case 'Snow':
                image.src = 'images/snow.png';
                break;
            case 'Clouds':
                image.src = 'images/cloud.png';
                break;
            case 'Haze':
            case 'Mist':
                image.src = 'images/mist.png';
                break;
            default:
                image.src = '';
        }

        temperature.innerHTML = `${parseInt(data.main.temp)}<span>°C</span>`;
        description.innerHTML = `${data.weather[0].description}`;
        humidity.innerHTML = `${data.main.humidity}%`;
        wind.innerHTML = `${parseInt(data.wind.speed)}Km/h`;
        pressure.innerHTML = `${data.main.pressure}hPa`;

        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        const currentTime = new Date();

        if (currentTime > sunrise && currentTime < sunset) {
            fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${APIKey}`)
                .then(response => response.json())
                .then(uvData => {
                    uvIndex.innerHTML = `${uvData.value}`;
                })
                .catch(error => {
                    console.error('Error fetching UV data:', error);
                    uvIndex.innerHTML = 'N/A';
                });
        } else {
            uvIndex.innerHTML = 'Night time';
        }

        visibility.innerHTML = `${data.visibility / 1000}km`;

        weatherBox.style.display = '';
        weatherDetails.style.display = '';
        weatherBox.classList.add('fadeIn');
        weatherDetails.classList.add('fadeIn');
        container.style.height = '590px';
        hourlyForecastBtn.style.display = 'flex';
    }

    async function fetchHourlyForecast(latitude, longitude) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation&timezone=${timezone}`);
        return response.json();
    }

    function displayHourlyForecast(data) {
        hourlyDetails.innerHTML = '';

        const next24HoursData = data.hourly.time.slice(0, 24);

        next24HoursData.forEach((time, index) => {
            const forecastCard = document.createElement('div');
            forecastCard.classList.add('hourly-card');
        
            const date = new Date(time);
            const temperature = data.hourly.temperature_2m[index];
            const precipitation = data.hourly.precipitation[index];
        
            forecastCard.innerHTML = `
                <p>${date.toLocaleString()}</p>
                <p class="temperature">${temperature}°C</p>
                <p class="precipitation">${precipitation}mm</p>
            `;
        
            hourlyDetails.appendChild(forecastCard);
        });

        const hourlyForecastSection = document.querySelector('.hourly-forecast');
        hourlyForecastSection.style.display = 'block';
    }

    async function fetchFiveDayForecast(city) {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${APIKey}`);
            if (!response.ok) {
                throw new Error(`Error fetching 5-day forecast: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error fetching 5-day forecast:', error);
            return null; // Return null or handle the error in a different way
        }
    }

    function displayFiveDayForecast(data) {
        if (!data || !data.list || data.list.length === 0) {
            // Handle the case when the API response is invalid or missing data
            forecastTitle.textContent = 'Unable to fetch 5-day forecast';
            forecastDetails.innerHTML = '';
            return;
        }
    
        forecastTitle.textContent = '5-Day Forecast';
        forecastDetails.innerHTML = '';
    
        const nextFiveDaysData = data.list.filter(item => item.dt_txt.includes('12:00:00'));
    
        nextFiveDaysData.forEach(dayData => {
            const date = new Date(dayData.dt * 1000);
            const forecastCard = document.createElement('div');
            forecastCard.classList.add('forecast-card');
    
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            const temp = `${parseInt(dayData.main.temp)}°C`;
            const weatherDescription = dayData.weather[0].description;
    
            forecastCard.innerHTML = `
                <p>${day}</p>
                <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}.png" alt="${weatherDescription}">
                <p>${weatherDescription}</p>
                <p>${temp}</p>
            `;
    
            forecastDetails.appendChild(forecastCard);
        });
    }

    async function fetchWeatherData(location) {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${APIKey}`);
            return response.json();
        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw error;
        }
    }

    async function handleWeatherQuery(userInput) {
        const location = userInput.trim();
    
        if (!location) {
            return "Please provide a location to get weather information.";
        }
    
        try {
            const openWeatherData = await fetchWeatherData(location);
            if (openWeatherData.cod === 200) {
                const weatherDescription = openWeatherData.weather[0].description;
                const temperature = `${parseInt(openWeatherData.main.temp)}°C`;
                return `The weather in ${location} is ${weatherDescription} with a temperature of ${temperature}.`;
            }
    
            const openMeteoData = await fetchWeatherDataOpenMeteo(location);
            if (openMeteoData && openMeteoData.hourly && openMeteoData.hourly.temperature_2m) {
                const temperature = openMeteoData.hourly.temperature_2m[0];
                return `The temperature in ${location} is ${temperature}°C according to Open-Meteo data.`;
            }
    
            return `Sorry, I couldn't find weather data for ${location}.`;
        } catch (error) {
            console.error('Error in handleWeatherQuery:', error);
            return 'An error occurred while processing the weather query.';
        }
    }

    async function fetchWeatherDataOpenMeteo(location) {
        const geocodeResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${APIKey}`);
        const geocodeData = await geocodeResponse.json();
        const latitude = geocodeData.coord.lat;
        const longitude = geocodeData.coord.lon;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation&timezone=${timezone}`);
        return response.json();
    }
});
