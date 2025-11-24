// 레시피 검색 API 서비스
class RecipeService {
  constructor(openAIService) {
    this.openAIService = openAIService;
    
    // TheMealDB API (무료, API 키 불필요, 백업용)
    this.themealdbURL = 'https://www.themealdb.com/api/json/v1/1';
    
    this.cache = new Map();
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24시간
  }

  // 재료로 레시피 검색
  async searchRecipesByIngredients(ingredientNames) {
    if (!ingredientNames || ingredientNames.length === 0) {
      return [];
    }

    const cacheKey = `search_${ingredientNames.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.log('캐시에서 레시피 검색 결과 가져오기');
      return cached.data;
    }

    try {
      let recipes = [];
      
      // 1. OpenAI API 사용 (API 키가 있으면 우선 사용)
      if (this.openAIService && this.openAIService.apiKey) {
        try {
          recipes = await this.searchOpenAIRecipes(ingredientNames);
          if (recipes.length > 0) {
            console.log(`OpenAI API에서 ${recipes.length}개의 레시피를 찾았습니다.`);
            this.cache.set(cacheKey, {
              data: recipes,
              timestamp: Date.now()
            });
            return recipes;
          }
        } catch (error) {
          console.warn('OpenAI API 검색 실패, TheMealDB로 전환:', error);
        }
      }
      
      // 2. TheMealDB API 사용 (백업)
      recipes = await this.searchTheMealDBRecipes(ingredientNames);
      
      if (recipes.length > 0) {
        this.cache.set(cacheKey, {
          data: recipes,
          timestamp: Date.now()
        });
        console.log(`TheMealDB API에서 ${recipes.length}개의 레시피를 찾았습니다.`);
      }
      
      return recipes;
    } catch (error) {
      console.error('레시피 검색 오류:', error);
      return [];
    }
  }

  // OpenAI API로 레시피 검색
  async searchOpenAIRecipes(ingredientNames) {
    if (!this.openAIService || !this.openAIService.apiKey) {
      return [];
    }

    try {
      const ingredients = ingredientNames.join(', ');
      
      const prompt = `다음 재료들을 사용하여 만들 수 있는 맛있는 요리 레시피 3개를 추천해주세요.

재료: ${ingredients}

한국인들이 선호하는 메뉴를 우선적으로 추천해주세요:
- 국물 요리: 김치찌개, 된장찌개, 순두부찌개, 부대찌개, 갈비탕, 설렁탕, 미역국 등
- 밥 요리: 비빔밥, 김치볶음밥, 볶음밥, 주먹밥 등
- 고기 요리: 불고기, 삼겹살, 갈비, 제육볶음 등
- 간단 요리: 계란말이, 계란후라이, 계란찜, 두부조림, 나물 등
- 면 요리: 라면, 짜장면, 비빔국수 등
- 간식: 떡볶이, 순대, 어묵 등

각 레시피에 대해 다음 형식의 JSON으로 응답해주세요:
{
  "recipes": [
    {
      "name": "요리 이름 (한국어)",
      "description": "간단한 설명 (50자 이내)",
      "cookingTime": 30,
      "difficulty": "쉬움|보통|어려움",
      "ingredients": ["재료1", "재료2", "재료3"],
      "steps": ["1단계 설명", "2단계 설명", "3단계 설명"]
    }
  ]
}

중요:
- 모든 내용은 한국어로 작성해주세요
- 한국인들이 자주 먹고 선호하는 메뉴를 우선 추천해주세요
- 실제로 제공된 재료를 사용할 수 있는 레시피만 추천해주세요
- 조리 방법은 단계별로 명확하게 작성해주세요
- 최대 3개의 레시피만 추천해주세요`;

      const response = await fetch(`${this.openAIService.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIService.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '당신은 요리 전문가입니다. 제공된 재료를 사용하여 실용적이고 맛있는 레시피를 추천합니다. 항상 유효한 JSON 형식으로 응답하세요.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API 요청 실패');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      // JSON 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const aiRecipes = result.recipes || [];
        
        // 레시피 형식 변환 및 이미지 추가
        const formattedRecipes = await Promise.all(
          aiRecipes.map(async (recipe, index) => {
            let imageUrl = null;
            
            // 이미지 서비스로 레시피 이미지 가져오기
            if (this.imageService) {
              try {
                imageUrl = await this.imageService.getRecipeImage(recipe.name);
              } catch (error) {
                console.warn(`레시피 이미지 가져오기 실패 (${recipe.name}):`, error);
              }
            }
            
            return {
              id: `openai_${Date.now()}_${index}`,
              name: recipe.name,
              image: imageUrl,
              cookingTime: recipe.cookingTime || 30,
              difficulty: recipe.difficulty || '보통',
              ingredients: recipe.ingredients || [],
              steps: recipe.steps || [],
              description: recipe.description || '',
              isAPI: true,
              isAI: true
            };
          })
        );
        
        return formattedRecipes;
      }
      
      return [];
    } catch (error) {
      console.error('OpenAI 레시피 검색 오류:', error);
      throw error;
    }
  }

  // TheMealDB API로 레시피 검색
  async searchTheMealDBRecipes(ingredientNames) {
    const allRecipes = [];
    
    // 각 재료별로 레시피 검색 (병렬 처리)
    const searchPromises = ingredientNames.slice(0, 5).map(async (ingredient) => {
      try {
        const response = await fetch(
          `${this.themealdbURL}/filter.php?i=${encodeURIComponent(ingredient)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!response.ok) {
          console.warn(`재료 "${ingredient}" 검색 실패`);
          return [];
        }
        
        const data = await response.json();
        return data.meals || [];
      } catch (error) {
        console.warn(`재료 "${ingredient}" 검색 오류:`, error);
        return [];
      }
    });

    const searchResults = await Promise.allSettled(searchPromises);
    
    // 모든 검색 결과를 합치고 중복 제거
    const recipeMap = new Map();
    searchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(meal => {
          if (!recipeMap.has(meal.idMeal)) {
            recipeMap.set(meal.idMeal, meal);
          }
        });
      }
    });

    // 레시피 상세 정보 가져오기 (병렬 처리, 최대 10개)
    const recipeDetails = Array.from(recipeMap.values()).slice(0, 10);
    const detailPromises = recipeDetails.map(meal => 
      this.getRecipeDetails(meal.idMeal)
    );

    const details = await Promise.allSettled(detailPromises);
    const validRecipes = details
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

    return validRecipes;
  }

  // TheMealDB 레시피 상세 정보 가져오기
  async getRecipeDetails(mealId) {
    const cacheKey = `detail_${mealId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.themealdbURL}/lookup.php?i=${mealId}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const meal = data.meals?.[0];
      
      if (!meal) {
        return null;
      }

      // 재료와 양 추출
      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
          ingredients.push(ingredient.trim());
        }
      }

      // 조리 방법 추출
      const instructions = meal.strInstructions 
        ? meal.strInstructions.split('\n').filter(step => step.trim())
        : [];

      const recipe = {
        id: `api_${meal.idMeal}`,
        name: meal.strMeal || 'Unknown',
        image: meal.strImage || meal.strMealThumb || null,
        cookingTime: this.estimateCookingTime(instructions.length, ingredients.length),
        difficulty: this.estimateDifficulty(instructions.length, ingredients.length),
        ingredients: ingredients,
        steps: instructions.length > 0 ? instructions : ['레시피 상세 정보를 확인해주세요.'],
        description: meal.strArea ? `${meal.strArea} 요리` : '',
        category: meal.strCategory || '',
        area: meal.strArea || '',
        source: meal.strSource || null,
        isAPI: true
      };

      // 캐시에 저장
      this.cache.set(cacheKey, {
        data: recipe,
        timestamp: Date.now()
      });

      return recipe;
    } catch (error) {
      console.warn(`레시피 상세 정보 가져오기 실패 (${mealId}):`, error);
      return null;
    }
  }

  // 조리 시간 추정
  estimateCookingTime(stepsCount, ingredientsCount) {
    const baseTime = 15;
    const stepTime = stepsCount * 2;
    const ingredientTime = ingredientsCount * 1;
    return Math.min(baseTime + stepTime + ingredientTime, 120);
  }

  // 난이도 추정
  estimateDifficulty(stepsCount, ingredientsCount) {
    const complexity = stepsCount + ingredientsCount;
    if (complexity <= 5) return '쉬움';
    if (complexity <= 10) return '보통';
    return '어려움';
  }

  // 재료 이름을 영어로 변환 (간단한 매핑)
  translateIngredientToEnglish(koreanName) {
    const translationMap = {
      '계란': 'egg',
      '달걀': 'egg',
      '감자': 'potato',
      '당근': 'carrot',
      '양파': 'onion',
      '마늘': 'garlic',
      '대파': 'green onion',
      '파': 'onion',
      '고추': 'pepper',
      '고춧가루': 'pepper',
      '된장': 'soybean paste',
      '고추장': 'chili paste',
      '김치': 'kimchi',
      '두부': 'tofu',
      '돼지고기': 'pork',
      '소고기': 'beef',
      '닭고기': 'chicken',
      '생선': 'fish',
      '밥': 'rice',
      '면': 'noodle',
      '파스타': 'pasta',
      '토마토': 'tomato',
      '치즈': 'cheese',
      '버터': 'butter',
      '우유': 'milk',
      '크림': 'cream',
      '올리브오일': 'olive oil',
      '식용유': 'cooking oil',
      '소금': 'salt',
      '후추': 'pepper',
      '설탕': 'sugar',
      '밀가루': 'flour',
      '빵': 'bread'
    };

    return translationMap[koreanName.toLowerCase()] || koreanName;
  }

  // HTML 태그 제거
  stripHtml(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  
  // ImageService 설정 (이미지 가져오기용)
  setImageService(imageService) {
    this.imageService = imageService;
  }
}

export default RecipeService;

