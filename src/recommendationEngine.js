// 레시피 추천 엔진
class RecipeRecommendationEngine {
  constructor(dataManager, weatherService, openAIService, imageService) {
    this.dataManager = dataManager;
    this.weatherService = weatherService;
    this.openAIService = openAIService;
    this.imageService = imageService;
  }

  async getRecommendations(useAI = true) {
    const data = this.dataManager.getData();
    const user = data.user;
    const ingredients = data.ingredients;
    const ratings = data.ratings;
    
    if (!user) {
      return { error: '사용자 정보가 없습니다. 먼저 설정을 완료해주세요.' };
    }

    // 날씨 정보 가져오기 (캐시 사용)
    const weather = await this.weatherService.getWeather(user.city);
    const dateInfo = this.weatherService.getCurrentDate();

    // 모든 레시피 가져오기
    let recipes = [...data.recipes];
    
    // 기본 레시피에 이미지가 없으면 이미지 서비스로 가져오기 (병렬 처리)
    // 필터링 전에 이미지를 먼저 가져와야 함
    if (this.imageService) {
      // 로컬 이미지가 있는 레시피는 먼저 설정
      recipes.forEach(recipe => {
        // 이미지가 null이거나 빈 문자열인 경우 로컬 이미지 확인
        if (!recipe.image || recipe.image === null || recipe.image.trim() === '') {
          const localImage = this.imageService.getLocalImage(recipe.name, 'recipe');
          if (localImage) {
            // 로컬 이미지 경로를 절대 경로로 설정 (Netlify 배포 시 정상 작동)
            recipe.image = localImage.startsWith('/') ? localImage : `/${localImage}`;
            console.log(`로컬 레시피 이미지 설정: ${recipe.name} -> ${recipe.image}`);
          }
        } else if (recipe.image && recipe.image.startsWith('/img/')) {
          // 이미 로컬 경로인 경우 절대 경로로 보장
          recipe.image = recipe.image.startsWith('/') ? recipe.image : `/${recipe.image}`;
        }
      });
      
      const recipesNeedingImages = recipes.filter(r => !r.image || r.image === null);
      if (recipesNeedingImages.length > 0) {
        console.log(`${recipesNeedingImages.length}개의 레시피 이미지를 가져오는 중...`);
        
        // 이미지 가져오기를 병렬로 처리하되, Promise.allSettled로 일부 실패해도 계속 진행
        const imagePromises = recipesNeedingImages.map(async (recipe) => {
          try {
            console.log(`이미지 가져오기 시작: ${recipe.name}`);
            const image = await this.imageService.getRecipeImage(recipe.name);
            console.log(`이미지 가져오기 성공: ${recipe.name} -> ${image}`);
            return { id: recipe.id, image };
          } catch (error) {
            console.warn(`이미지 가져오기 실패 (${recipe.name}):`, error);
            return { id: recipe.id, image: `https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(recipe.name)}` };
          }
        });
        
        // 이미지 가져오기를 완료할 때까지 대기
        const imageUpdates = await Promise.allSettled(imagePromises);
        
        // 이미지 업데이트를 recipes 배열에 반영
        imageUpdates.forEach((result, index) => {
          const recipe = recipesNeedingImages[index];
          if (result.status === 'fulfilled') {
            const recipeIndex = recipes.findIndex(r => r.id === recipe.id);
            if (recipeIndex >= 0) {
              // 이미지 URL이 유효한지 확인하고 설정
              const imageUrl = result.value.image;
              if (imageUrl && imageUrl.trim() !== '') {
                recipes[recipeIndex].image = imageUrl;
                console.log(`레시피 이미지 업데이트: ${recipes[recipeIndex].name} -> ${imageUrl}`);
              } else {
                // 이미지 URL이 없으면 placeholder 사용
                recipes[recipeIndex].image = `https://via.placeholder.com/400/300?text=${encodeURIComponent(recipes[recipeIndex].name)}`;
                console.warn(`이미지 URL이 비어있음: ${recipes[recipeIndex].name}, placeholder 사용`);
              }
            }
          } else {
            // 실패한 경우 placeholder 이미지 설정
            const recipeIndex = recipes.findIndex(r => r.id === recipe.id);
            if (recipeIndex >= 0) {
              recipes[recipeIndex].image = `https://via.placeholder.com/400/300?text=${encodeURIComponent(recipe.name)}`;
              console.warn(`이미지 가져오기 실패, placeholder 사용: ${recipe.name}`);
            }
            console.error('이미지 가져오기 실패:', result.reason);
          }
        });
      }
    } else {
      console.warn('ImageService가 없습니다. 이미지를 가져올 수 없습니다.');
    }

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

    // 기본 레시피 먼저 반환 (로딩 속도 개선)
    const topRecipes = recipes.slice(0, 3);
    
    // 이미지가 없는 레시피에 대해 즉시 사용 가능한 이미지 설정
    topRecipes.forEach(recipe => {
      if (!recipe.image || recipe.image === null || recipe.image.trim() === '') {
        // DummyImage.com 사용 - 항상 작동하는 안정적인 이미지
        const seed = recipe.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = ['4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff', '9C27B0/ffffff', 'F44336/ffffff'];
        const color = colors[seed % colors.length];
        recipe.image = `https://dummyimage.com/400x300/${color}&text=${encodeURIComponent(recipe.name)}`;
        console.log(`즉시 사용 가능한 이미지 설정: ${recipe.name} -> ${recipe.image}`);
      }
    });
    
    console.log('최종 추천 레시피:', topRecipes.map(r => ({ name: r.name, image: r.image })));
    
    // AI 추천은 비동기로 처리 (선택적, 로딩 속도 개선을 위해)
    if (useAI && this.openAIService && ingredients.length > 0) {
      // AI 추천은 백그라운드에서 처리하고 나중에 추가
      this.getAIRecommendationsAsync(ingredients, user, weather).catch(error => {
        console.log('AI 레시피 추천 실패:', error);
      });
    }

    return topRecipes;
  }

  async getAIRecommendationsAsync(ingredients, user, weather) {
    try {
      const aiSuggestions = await this.openAIService.generateRecipeSuggestion(
        ingredients.map(ing => ing.name),
        user.preferences || [],
        weather
      );
      
      if (aiSuggestions && aiSuggestions.length > 0) {
        // 이미지 가져오기
        const aiRecipes = await Promise.all(
          aiSuggestions.slice(0, 1).map(async (aiRecipe, idx) => {
            let imageUrl = `https://via.placeholder.com/400/300?text=${encodeURIComponent(aiRecipe.name)}`;
            if (this.imageService) {
              try {
                imageUrl = await this.imageService.getRecipeImage(aiRecipe.name);
              } catch (e) {
                console.warn('AI 레시피 이미지 가져오기 실패:', e);
              }
            }
            
            return {
              id: 1000 + idx,
              name: aiRecipe.name,
              image: imageUrl,
              cookingTime: aiRecipe.cookingTime || 30,
              difficulty: aiRecipe.difficulty || '보통',
              ingredients: aiRecipe.ingredients || [],
              steps: aiRecipe.steps || [],
              season: '연중',
              weather: [weather.condition],
              tags: user.preferences || [],
              description: aiRecipe.description,
              isAI: true
            };
          })
        );
        
        // AI 레시피를 이벤트로 전달하여 UI에 추가
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('aiRecipesReady', { detail: aiRecipes }));
        }
        
        return aiRecipes;
      }
    } catch (error) {
      console.log('OpenAI 레시피 추천 실패:', error);
      return [];
    }
  }
}

export default RecipeRecommendationEngine;

