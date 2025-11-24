// 날씨 API 모듈
class WeatherService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5/weather';
    this.cache = {}; // 날씨 정보 캐싱
    this.cacheDuration = 30 * 60 * 1000; // 30분 캐시
    
    // API 키가 없을 경우를 대비한 기본 데이터
    this.weatherData = {
      '서울': { temp: 15, condition: '맑음', icon: '☀️' },
      '부산': { temp: 18, condition: '흐림', icon: '☁️' },
      '대구': { temp: 16, condition: '맑음', icon: '☀️' },
      '인천': { temp: 14, condition: '비', icon: '🌧️' },
      '광주': { temp: 17, condition: '맑음', icon: '☀️' },
      '대전': { temp: 15, condition: '흐림', icon: '☁️' },
      '울산': { temp: 17, condition: '맑음', icon: '☀️' }
    };

    // 한국 도시명을 영문으로 변환
    this.cityMap = {
      '서울': 'Seoul',
      '부산': 'Busan',
      '대구': 'Daegu',
      '인천': 'Incheon',
      '광주': 'Gwangju',
      '대전': 'Daejeon',
      '울산': 'Ulsan'
    };
  }

  async getWeather(city) {
    // 캐시 확인
    const cacheKey = city;
    const cached = this.cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    // OpenWeatherMap API 키가 있으면 실제 API 사용
    if (this.apiKey) {
      try {
        const cityName = this.cityMap[city] || city;
        const url = `${this.baseURL}?q=${encodeURIComponent(cityName)},KR&appid=${this.apiKey}&units=metric&lang=kr`;
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const temp = Math.round(data.main.temp);
          const condition = this.translateWeatherCondition(data.weather[0].main);
          const icon = this.getWeatherIcon(data.weather[0].main);
          
          const weatherData = { temp, condition, icon };
          
          // 캐시에 저장
          this.cache[cacheKey] = {
            data: weatherData,
            timestamp: Date.now()
          };
          
          return weatherData;
        } else {
          console.warn('날씨 API 요청 실패, 기본 데이터 사용');
        }
      } catch (error) {
        console.warn('날씨 API 오류, 기본 데이터 사용:', error);
      }
    }
    
    // API 키가 없거나 오류 발생 시 기본 데이터 사용
    const weather = this.weatherData[city] || { temp: 15, condition: '맑음', icon: '☀️' };
    
    // 기본 데이터도 캐시에 저장 (짧은 시간)
    this.cache[cacheKey] = {
      data: weather,
      timestamp: Date.now()
    };
    
    return weather;
  }

  translateWeatherCondition(condition) {
    const translation = {
      'Clear': '맑음',
      'Clouds': '흐림',
      'Rain': '비',
      'Drizzle': '이슬비',
      'Thunderstorm': '천둥번개',
      'Snow': '눈',
      'Mist': '안개',
      'Fog': '안개',
      'Haze': '연무'
    };
    return translation[condition] || '맑음';
  }

  getWeatherIcon(condition) {
    const icons = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️'
    };
    return icons[condition] || '☀️';
  }

  getCurrentDate() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][now.getDay()],
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  }
}

export default WeatherService;

