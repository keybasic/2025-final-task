import './style.css'
import DataManager from './dataManager.js'
import WeatherService from './weatherService.js'
import RecipeRecommendationEngine from './recommendationEngine.js'
import AppUI from './appUI.js'

// 앱 초기화
const dataManager = new DataManager();
const weatherService = new WeatherService();
const recommendationEngine = new RecipeRecommendationEngine(dataManager, weatherService);
const app = new AppUI(dataManager, weatherService, recommendationEngine);

// 전역에서 접근 가능하도록
window.app = app;

// 앱 시작
app.init();
