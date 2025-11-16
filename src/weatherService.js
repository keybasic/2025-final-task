// 날씨 API 모듈 (Mock 데이터 사용)
class WeatherService {
  constructor() {
    this.weatherData = {
      '서울': { temp: 15, condition: '맑음', icon: '☀️' },
      '부산': { temp: 18, condition: '흐림', icon: '☁️' },
      '대구': { temp: 16, condition: '맑음', icon: '☀️' },
      '인천': { temp: 14, condition: '비', icon: '🌧️' },
      '광주': { temp: 17, condition: '맑음', icon: '☀️' },
      '대전': { temp: 15, condition: '흐림', icon: '☁️' },
      '울산': { temp: 17, condition: '맑음', icon: '☀️' }
    };
  }

  async getWeather(city) {
    // 실제 환경에서는 OpenWeatherMap API 등을 사용
    return new Promise((resolve) => {
      setTimeout(() => {
        const weather = this.weatherData[city] || { temp: 15, condition: '맑음', icon: '☀️' };
        resolve(weather);
      }, 300);
    });
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

