import './style.css'
import DataManager from './dataManager.js'
import WeatherService from './weatherService.js'
import RecipeRecommendationEngine from './recommendationEngine.js'
import AppUI from './appUI.js'
import OpenAIService from './openAIService.js'
import ImageService from './imageService.js'

// 앱 초기화
const dataManager = new DataManager();
const weatherService = new WeatherService();
const openAIService = new OpenAIService();
const imageService = new ImageService(openAIService); // OpenAIService 전달
const recommendationEngine = new RecipeRecommendationEngine(dataManager, weatherService, openAIService, imageService);
const app = new AppUI(dataManager, weatherService, recommendationEngine, openAIService, imageService);

// 전역에서 접근 가능하도록
window.app = app;

// 앱 시작
app.init();
