// 레시피 추천 엔진
class RecipeRecommendationEngine {
  constructor(dataManager, weatherService) {
    this.dataManager = dataManager;
    this.weatherService = weatherService;
  }

  async getRecommendations() {
    const data = this.dataManager.getData();
    const user = data.user;
    const ingredients = data.ingredients;
    const ratings = data.ratings;
    
    if (!user) {
      return { error: '사용자 정보가 없습니다. 먼저 설정을 완료해주세요.' };
    }

    // 날씨 정보 가져오기
    const weather = await this.weatherService.getWeather(user.city);
    const dateInfo = this.weatherService.getCurrentDate();

    // 모든 레시피 가져오기
    let recipes = [...data.recipes];

    // 1. 재료 기반 필터링
    recipes = recipes.filter(recipe => {
      const hasIngredients = recipe.ingredients.some(ing => 
        ingredients.some(ingredient => 
          ingredient.name.toLowerCase().includes(ing.toLowerCase()) ||
          ing.toLowerCase().includes(ingredient.name.toLowerCase())
        )
      );
      return hasIngredients;
    });

    // 2. 날씨 기반 필터링
    recipes = recipes.filter(recipe => {
      return !recipe.weather || recipe.weather.includes(weather.condition);
    });

    // 3. 사용자 선호도 기반 점수 계산
    recipes = recipes.map(recipe => {
      let score = 0;

      // 별점 기반 점수
      const recipeRatings = ratings.filter(r => r.recipeId === recipe.id);
      if (recipeRatings.length > 0) {
        const avgRating = recipeRatings.reduce((sum, r) => sum + r.rating, 0) / recipeRatings.length;
        score += avgRating * 10;
      }

      // 선호 맛 매칭
      if (user.preferences) {
        if (user.preferences.includes('매운맛') && recipe.tags?.includes('매운맛')) score += 5;
        if (user.preferences.includes('단맛') && recipe.tags?.includes('단맛')) score += 5;
        if (user.preferences.includes('비건') && recipe.tags?.includes('비건')) score += 5;
      }

      // 알레르기 필터링
      if (user.allergies) {
        const hasAllergy = recipe.ingredients.some(ing => 
          user.allergies.some(allergy => 
            ing.toLowerCase().includes(allergy.toLowerCase())
          )
        );
        if (hasAllergy) score = -100; // 알레르기 재료가 있으면 제외
      }

      // 재료 매칭률
      const matchedIngredients = recipe.ingredients.filter(ing => 
        ingredients.some(ingredient => 
          ingredient.name.toLowerCase().includes(ing.toLowerCase()) ||
          ing.toLowerCase().includes(ingredient.name.toLowerCase())
        )
      ).length;
      score += (matchedIngredients / recipe.ingredients.length) * 20;

      return { ...recipe, score };
    });

    // 알레르기 재료가 있는 레시피 제외
    recipes = recipes.filter(r => r.score >= 0);

    // 점수 순으로 정렬
    recipes.sort((a, b) => b.score - a.score);

    // 상위 2-3개 반환
    return recipes.slice(0, 3);
  }
}

export default RecipeRecommendationEngine;

