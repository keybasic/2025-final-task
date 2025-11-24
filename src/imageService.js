// 이미지 검색 서비스
class ImageService {
  constructor(openAIService) {
    // 이미지 캐시
    this.imageCache = {};
    this.openAIService = openAIService;
    
    // 로컬 이미지 매핑 (레시피 이름 -> 파일명)
    this.localRecipeImages = {
      '계란말이': '/img/계란말이.jpg',
      '김치볶음밥': '/img/김치볶음밥.jpg'
    };
    
    // 로컬 이미지 매핑 (재료 이름 -> 파일명)
    this.localIngredientImages = {
      '감자': '/img/감자.jpg',
      '계란': '/img/계란.jpg',
      '당근': '/img/당근.jpg'
    };
    
    // 이미지 파일명에서 이름 추출 (예: "계란말이.jpg" -> "계란말이")
    this.imageNameMap = {
      '계란말이.jpg': '계란말이',
      '김치볶음밥.jpg': '김치볶음밥',
      '감자.jpg': '감자',
      '계란.jpg': '계란',
      '당근.jpg': '당근'
    };
  }
  
  // 로컬 이미지 파일이 있는지 확인
  getLocalImage(name, type = 'recipe') {
    const mapping = type === 'recipe' ? this.localRecipeImages : this.localIngredientImages;
    
    // 정확한 매칭
    if (mapping[name]) {
      return mapping[name];
    }
    
    // 부분 매칭 (예: "계란말이" -> "계란말이.jpg")
    for (const [key, value] of Object.entries(mapping)) {
      if (name.includes(key) || key.includes(name)) {
        return value;
      }
    }
    
    return null;
  }

  async getRecipeImage(recipeName) {
    try {
      // 캐시 확인
      if (this.imageCache[recipeName]) {
        console.log(`캐시에서 이미지 가져오기: ${recipeName}`);
        return this.imageCache[recipeName];
      }

      console.log(`새 이미지 검색 시작: ${recipeName}`);
      
      // 방법 0: 로컬 이미지 파일 확인 (최우선)
      const localImage = this.getLocalImage(recipeName, 'recipe');
      if (localImage) {
        console.log(`로컬 이미지 사용: ${recipeName} -> ${localImage}`);
        this.imageCache[recipeName] = localImage;
        return localImage;
      }
      
      // 방법 1: DALL-E API를 사용하여 이미지 생성 (OpenAI API 키가 있으면)
      if (this.openAIService && this.openAIService.apiKey) {
        try {
          const prompt = this.openAIService.generateRecipeImagePrompt(recipeName);
          console.log(`DALL-E 이미지 생성 시작: ${recipeName}`);
          const dallEImageUrl = await this.openAIService.generateImage(prompt, '1024x1024');
          if (dallEImageUrl) {
            console.log(`DALL-E 이미지 생성 성공: ${recipeName} -> ${dallEImageUrl}`);
            this.imageCache[recipeName] = dallEImageUrl;
            return dallEImageUrl;
          }
        } catch (e) {
          console.warn('DALL-E 이미지 생성 실패, 다른 방법 시도:', e);
        }
      }
      
      const searchQuery = encodeURIComponent(recipeName + ' food korean 요리');
      
      // 방법 2: Unsplash API (Access Key가 있으면 사용)
      const unsplashAccessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
      if (unsplashAccessKey) {
        try {
          const unsplashResponse = await fetch(
            `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape&client_id=${unsplashAccessKey}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (unsplashResponse.ok) {
            const unsplashData = await unsplashResponse.json();
            if (unsplashData.results && unsplashData.results.length > 0) {
              const imageUrl = unsplashData.results[0].urls.regular;
              this.imageCache[recipeName] = imageUrl;
              return imageUrl;
            }
          }
        } catch (e) {
          console.warn('Unsplash API 실패:', e);
        }
      }
      
      // 방법 3: Foodish API - 한국 요리 카테고리 (실제 요리 이미지)
      try {
        const hash = this.simpleHash(recipeName);
        const categories = ['korean', 'rice', 'pasta', 'pizza', 'burger'];
        const category = categories[hash % categories.length];
        
        console.log(`Foodish API 요청: ${recipeName} -> 카테고리: ${category}`);
        const foodishResponse = await fetch(`https://foodish-api.com/api/images/${category}`, {
          signal: AbortSignal.timeout(3000)
        });
        
        if (foodishResponse.ok) {
          const foodishData = await foodishResponse.json();
          if (foodishData.image) {
            console.log(`Foodish 이미지 URL: ${foodishData.image}`);
            this.imageCache[recipeName] = foodishData.image;
            return foodishData.image;
          }
        }
      } catch (e) {
        console.warn('Foodish API 실패:', e);
      }
      
      // 방법 4: DummyImage.com - 안정적인 placeholder 이미지 (항상 작동)
      // 레시피 이름 기반으로 고유한 색상과 텍스트 생성
      const seed = this.simpleHash(recipeName);
      const colors = [
        '4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff', 
        '9C27B0/ffffff', 'F44336/ffffff', '00BCD4/ffffff'
      ];
      const color = colors[seed % colors.length];
      const dummyImageUrl = `https://dummyimage.com/400x300/${color}&text=${encodeURIComponent(recipeName)}`;
      
      // 방법 5: Lorem Picsum with seed (백업)
      const picsumUrl = `https://picsum.photos/seed/${seed}/400/300`;
      
      // DummyImage를 먼저 시도하고, 실패하면 Picsum 사용
      const testResult = await this.testImageUrl(dummyImageUrl);
      if (testResult) {
        this.imageCache[recipeName] = dummyImageUrl;
        return dummyImageUrl;
      }
      
      // Picsum도 테스트
      const picsumTest = await this.testImageUrl(picsumUrl);
      if (picsumTest) {
        this.imageCache[recipeName] = picsumUrl;
        return picsumUrl;
      }
      
      // 최종 fallback: via.placeholder.com
      const fallbackUrl = `https://via.placeholder.com/400x300/4CAF50/ffffff?text=${encodeURIComponent(recipeName)}`;
      this.imageCache[recipeName] = fallbackUrl;
      return fallbackUrl;
      
    } catch (error) {
      console.warn('이미지 검색 실패:', error);
      // 실패 시 placeholder 이미지 반환
      const fallbackUrl = `https://via.placeholder.com/400x300/4CAF50/ffffff?text=${encodeURIComponent(recipeName)}`;
      this.imageCache[recipeName] = fallbackUrl;
      return fallbackUrl;
    }
  }

  // 간단한 해시 함수 (문자열을 숫자로 변환)
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash);
  }

  // 이미지 URL이 유효한지 테스트
  async testImageUrl(url) {
    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;
      
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      };
      
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      };
      
      img.src = url;
      // 2초 후 타임아웃 (더 빠른 응답)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 2000);
    });
  }

  // 여러 레시피의 이미지를 병렬로 가져오기
  async getRecipeImages(recipeNames) {
    const imagePromises = recipeNames.map(name => this.getRecipeImage(name));
    try {
      const images = await Promise.allSettled(imagePromises);
      return images.map((result, index) => ({
        name: recipeNames[index],
        image: result.status === 'fulfilled' ? result.value : `https://via.placeholder.com/400/300?text=${encodeURIComponent(recipeNames[index])}`
      }));
    } catch (error) {
      console.warn('일괄 이미지 검색 실패:', error);
      return recipeNames.map(name => ({
        name,
        image: `https://via.placeholder.com/400/300?text=${encodeURIComponent(name)}`
      }));
    }
  }

  // Pixabay API를 사용하여 재료 이미지 가져오기
  async getIngredientImage(ingredientName) {
    try {
      const cacheKey = `ingredient_${ingredientName}`;
      if (this.imageCache[cacheKey]) {
        return this.imageCache[cacheKey];
      }

      // 방법 0: 로컬 이미지 파일 확인 (최우선)
      const localImage = this.getLocalImage(ingredientName, 'ingredient');
      if (localImage) {
        console.log(`로컬 재료 이미지 사용: ${ingredientName} -> ${localImage}`);
        this.imageCache[cacheKey] = localImage;
        return localImage;
      }

      // 방법 1: DALL-E API를 사용하여 이미지 생성 (OpenAI API 키가 있으면)
      // 주의: DALL-E는 비용이 발생하므로 선택적으로 사용
      if (this.openAIService && this.openAIService.apiKey) {
        try {
          const prompt = this.openAIService.generateIngredientImagePrompt(ingredientName);
          console.log(`DALL-E 재료 이미지 생성 시작: ${ingredientName}`);
          const dallEImageUrl = await this.openAIService.generateImage(prompt, '1024x1024');
          if (dallEImageUrl) {
            console.log(`DALL-E 재료 이미지 생성 성공: ${ingredientName} -> ${dallEImageUrl}`);
            this.imageCache[cacheKey] = dallEImageUrl;
            return dallEImageUrl;
          }
        } catch (e) {
          // DALL-E 실패 시 다른 방법으로 자동 전환
          console.warn('DALL-E 재료 이미지 생성 실패, 다른 방법 시도:', e.message || e);
        }
      }

      const pixabayKey = import.meta.env.VITE_PIXABAY_API_KEY;
      const searchQuery = encodeURIComponent(ingredientName + ' food ingredient');
      
      // 방법 2: Pixabay API 사용 (API 키가 있으면)
      if (pixabayKey) {
        try {
          const pixabayResponse = await fetch(
            `https://pixabay.com/api/?key=${pixabayKey}&q=${searchQuery}&image_type=photo&category=food&per_page=3&safesearch=true`,
            { signal: AbortSignal.timeout(5000) }
          );
          
          if (pixabayResponse.ok) {
            const pixabayData = await pixabayResponse.json();
            if (pixabayData.hits && pixabayData.hits.length > 0) {
              const imageUrl = pixabayData.hits[0].webformatURL || pixabayData.hits[0].previewURL;
              this.imageCache[cacheKey] = imageUrl;
              console.log(`Pixabay 이미지 가져오기 성공: ${ingredientName} -> ${imageUrl}`);
              return imageUrl;
            }
          }
        } catch (e) {
          console.warn('Pixabay API 실패:', e);
        }
      }
      
      // 방법 3: DummyImage.com - 안정적인 placeholder 이미지
      const seed = this.simpleHash(ingredientName);
      const colors = [
        '4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff', 
        '9C27B0/ffffff', 'F44336/ffffff', '00BCD4/ffffff'
      ];
      const color = colors[seed % colors.length];
      const dummyImageUrl = `https://dummyimage.com/200x200/${color}&text=${encodeURIComponent(ingredientName)}`;
      
      // 방법 4: Lorem Picsum (백업)
      const picsumUrl = `https://picsum.photos/seed/${seed}/200/200`;
      
      // DummyImage를 먼저 시도
      const testResult = await this.testImageUrl(dummyImageUrl);
      if (testResult) {
        this.imageCache[cacheKey] = dummyImageUrl;
        return dummyImageUrl;
      }
      
      // Picsum도 테스트
      const picsumTest = await this.testImageUrl(picsumUrl);
      if (picsumTest) {
        this.imageCache[cacheKey] = picsumUrl;
        return picsumUrl;
      }
      
      // 최종 fallback: via.placeholder.com
      const fallbackUrl = `https://via.placeholder.com/200x200/4CAF50/ffffff?text=${encodeURIComponent(ingredientName)}`;
      this.imageCache[cacheKey] = fallbackUrl;
      return fallbackUrl;
      
    } catch (error) {
      console.warn('재료 이미지 검색 실패:', error);
      // 실패 시 안정적인 placeholder 반환
      const seed = this.simpleHash(ingredientName);
      const colors = ['4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff'];
      const color = colors[seed % colors.length];
      return `https://dummyimage.com/200x200/${color}&text=${encodeURIComponent(ingredientName)}`;
    }
  }
}

export default ImageService;

