// UI 컴포넌트 관리
class AppUI {
  constructor(dataManager, weatherService, recommendationEngine, openAIService, imageService) {
    this.dataManager = dataManager;
    this.weatherService = weatherService;
    this.recommendationEngine = recommendationEngine;
    this.openAIService = openAIService;
    this.imageService = imageService;
    this.currentView = 'home';
    this.currentRecipe = null;
    this.alarmInterval = null;
    this.setupAIRecipeListener();
  }

  setupAIRecipeListener() {
    // AI 레시피가 준비되면 UI에 추가
    window.addEventListener('aiRecipesReady', (event) => {
      if (this.currentView === 'home') {
        const aiRecipes = event.detail;
        this.addAIRecipesToHome(aiRecipes);
      }
    });
  }

  addAIRecipesToHome(aiRecipes) {
    const recipeGrid = document.querySelector('.recipe-grid');
    if (!recipeGrid) return;

    // 기존 AI 레시피 제거 (중복 방지)
    const existingAICards = recipeGrid.querySelectorAll('[data-is-ai="true"]');
    existingAICards.forEach(card => card.remove());

    // 새로운 AI 레시피 추가
    aiRecipes.forEach(recipe => {
      const recipeCard = document.createElement('div');
      recipeCard.className = 'recipe-card';
      recipeCard.setAttribute('data-recipe-id', recipe.id);
      recipeCard.setAttribute('data-is-ai', 'true');
      // AI 레시피 이미지 경로 처리
      let aiImageUrl = recipe.image || '';
      if (aiImageUrl && aiImageUrl.startsWith('/img/')) {
        aiImageUrl = aiImageUrl;
      } else if (aiImageUrl && !aiImageUrl.startsWith('http') && !aiImageUrl.startsWith('//')) {
        aiImageUrl = aiImageUrl.startsWith('/') ? aiImageUrl : `/${aiImageUrl}`;
      } else if (!aiImageUrl || aiImageUrl.trim() === '') {
        aiImageUrl = `https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(recipe.name)}`;
      }
      
      recipeCard.innerHTML = `
        <img src="${aiImageUrl}" 
             alt="${recipe.name}" 
             style="cursor: pointer;"
             onclick="app.showRecipeDetail(${recipe.id})"
             onerror="this.onerror=null; this.src='https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(recipe.name)}';">
        <div class="recipe-info">
          <h3>${recipe.name}</h3>
          <div class="recipe-meta">
            <span>⏱️ ${recipe.cookingTime}분</span>
            <span>📊 ${recipe.difficulty}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.showRecipeDetail(${recipe.id})">레시피 보기</button>
        </div>
      `;
      
      // 애니메이션 효과와 함께 추가
      recipeCard.style.opacity = '0';
      recipeCard.style.transform = 'translateY(20px)';
      recipeGrid.appendChild(recipeCard);
      
      // 페이드 인 애니메이션
      setTimeout(() => {
        recipeCard.style.transition = 'opacity 0.5s, transform 0.5s';
        recipeCard.style.opacity = '1';
        recipeCard.style.transform = 'translateY(0)';
      }, 50);

      // lastRecommendations에 추가
      if (!this.lastRecommendations) {
        this.lastRecommendations = [];
      }
      if (!this.lastRecommendations.find(r => r.id === recipe.id)) {
        this.lastRecommendations.push(recipe);
      }
    });
  }

  init() {
    const data = this.dataManager.getData();
    if (!data.user) {
      this.showUserSetup();
    } else {
      this.showHome();
    }
    this.setupAlarm();
  }

  showUserSetup() {
    const app = document.querySelector('#app');
    app.innerHTML = `
      <div class="user-setup-container">
        <div class="setup-card">
          <h1>냉장고를 부탁해!! 🧊</h1>
          <p class="subtitle">처음이시군요! 몇 가지 설정을 해주세요.</p>
          
          <form id="userSetupForm" class="setup-form">
            <div class="form-group">
              <label>거주 도시</label>
              <select id="city" required>
                <option value="">선택하세요</option>
                <option value="서울">서울</option>
                <option value="부산">부산</option>
                <option value="대구">대구</option>
                <option value="인천">인천</option>
                <option value="광주">광주</option>
                <option value="대전">대전</option>
                <option value="울산">울산</option>
              </select>
            </div>

            <div class="form-group">
              <label>가족 형태</label>
              <select id="familyType" required>
                <option value="">선택하세요</option>
                <option value="1인">1인 가구</option>
                <option value="2인">2인 가구</option>
                <option value="3-4인">3-4인 가구</option>
                <option value="5인 이상">5인 이상 가구</option>
              </select>
            </div>

            <div class="form-group">
              <label>알레르기 음식 (복수 선택 가능)</label>
              <div class="checkbox-group">
                <label><input type="checkbox" name="allergies" value="갑각류"> 갑각류</label>
                <label><input type="checkbox" name="allergies" value="견과류"> 견과류</label>
                <label><input type="checkbox" name="allergies" value="우유"> 우유</label>
                <label><input type="checkbox" name="allergies" value="달걀"> 달걀</label>
                <label><input type="checkbox" name="allergies" value="밀"> 밀</label>
                <label><input type="checkbox" name="allergies" value="생선"> 생선</label>
                <label><input type="checkbox" name="allergies" value="없음"> 없음</label>
              </div>
            </div>

            <div class="form-group">
              <label>선호하는 맛 (복수 선택 가능)</label>
              <div class="checkbox-group">
                <label><input type="checkbox" name="preferences" value="매운맛"> 매운맛 🌶️</label>
                <label><input type="checkbox" name="preferences" value="단맛"> 단맛 🍯</label>
                <label><input type="checkbox" name="preferences" value="비건"> 비건 🌱</label>
                <label><input type="checkbox" name="preferences" value="담백한맛"> 담백한맛</label>
              </div>
            </div>

            <button type="submit" class="btn btn-primary">설정 완료</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('userSetupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const allergies = Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(cb => cb.value);
      const preferences = Array.from(document.querySelectorAll('input[name="preferences"]:checked')).map(cb => cb.value);
      
      const user = {
        city: document.getElementById('city').value,
        familyType: document.getElementById('familyType').value,
        allergies: allergies.filter(a => a !== '없음'),
        preferences: preferences
      };

      this.dataManager.updateData('user', user);
      this.showHome();
    });
  }

  showHome() {
    this.currentView = 'home';
    this.renderNavigation();
    this.renderHome();
  }

  renderNavigation() {
    const nav = document.querySelector('.main-nav') || document.createElement('nav');
    nav.className = 'main-nav';
    nav.innerHTML = `
      <div class="nav-container">
        <h2 class="logo">냉장고를 부탁해!! 🧊</h2>
        <ul class="nav-menu">
          <li><a href="#" class="nav-link" data-view="home">홈</a></li>
          <li><a href="#" class="nav-link" data-view="fridge">웹 냉장고</a></li>
          <li><a href="#" class="nav-link" data-view="shopping">장바구니</a></li>
          <li><a href="#" class="nav-link" data-view="alarm">알람 설정</a></li>
          <li><a href="#" class="nav-link" data-view="settings">설정</a></li>
        </ul>
      </div>
    `;

    if (!document.querySelector('.main-nav')) {
      document.querySelector('#app').prepend(nav);
    } else {
      document.querySelector('.main-nav').replaceWith(nav);
    }

    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.target.dataset.view;
        this.navigate(view);
      });
    });
  }

  async renderHome() {
    const data = this.dataManager.getData();
    const user = data.user;
    const dateInfo = this.weatherService.getCurrentDate();
    
    // 먼저 기본 레이아웃 렌더링 (빠른 초기 로딩)
    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="home-container">
        <div class="weather-card">
          <h3>오늘의 날씨</h3>
          <div class="weather-info">
            <span class="weather-icon">⏳</span>
            <div>
              <p class="city">${user.city}</p>
              <p class="temp">로딩 중...</p>
            </div>
          </div>
          <p class="date-info">${dateInfo.year}년 ${dateInfo.month}월 ${dateInfo.day}일 ${dateInfo.dayOfWeek}요일</p>
        </div>

        <div class="recommendations-section">
          <h2>오늘의 요리 추천 🍳</h2>
          <div class="loading-recipes">
            <div class="loading-spinner"></div>
            <p>레시피를 준비하고 있습니다...</p>
          </div>
        </div>
      </div>
    `;

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
    }

    // 병렬로 날씨와 레시피 추천 가져오기 (로딩 속도 개선)
    const [weather, recommendations] = await Promise.all([
      this.weatherService.getWeather(user.city),
      this.recommendationEngine.getRecommendations(true) // AI 추천 활성화
    ]);
    
    // AI 레시피를 추적하기 위해 저장
    this.lastRecommendations = recommendations;

    // 날씨 정보 업데이트
    const weatherCard = main.querySelector('.weather-card');
    if (weatherCard) {
      weatherCard.innerHTML = `
        <h3>오늘의 날씨</h3>
        <div class="weather-info">
          <span class="weather-icon">${weather.icon}</span>
          <div>
            <p class="city">${user.city}</p>
            <p class="temp">${weather.temp}°C ${weather.condition}</p>
          </div>
        </div>
        <p class="date-info">${dateInfo.year}년 ${dateInfo.month}월 ${dateInfo.day}일 ${dateInfo.dayOfWeek}요일</p>
      `;
    }

    // 레시피 추천 업데이트
    const recommendationsSection = main.querySelector('.recommendations-section');
    if (recommendationsSection) {
      if (recommendations.error) {
        recommendationsSection.innerHTML = `
          <h2>오늘의 요리 추천 🍳</h2>
          <div class="alert alert-info">${recommendations.error}</div>
        `;
      } else if (recommendations.length === 0) {
        recommendationsSection.innerHTML = `
          <h2>오늘의 요리 추천 🍳</h2>
          <div class="alert alert-info">보유한 재료로 만들 수 있는 요리가 없습니다. 재료를 추가해주세요!</div>
        `;
      } else {
        recommendationsSection.innerHTML = `
          <h2>오늘의 요리 추천 🍳</h2>
          <div class="recipe-grid">
            ${recommendations.map(recipe => {
              // 이미지 URL이 유효한지 확인
              let imageUrl = recipe.image && recipe.image.trim() !== '' 
                ? recipe.image 
                : `https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(recipe.name)}`;
              
              // 이미지가 null이거나 placeholder인 경우 더 나은 이미지 생성
              if (!recipe.image || recipe.image === null || recipe.image.includes('placeholder')) {
                const seed = recipe.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const colors = ['4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff', '9C27B0/ffffff'];
                const color = colors[seed % colors.length];
                imageUrl = `https://dummyimage.com/400x300/${color}&text=${encodeURIComponent(recipe.name)}`;
              }
              
              // 로컬 이미지 경로 처리 (Netlify 배포 시 절대 경로로 변환)
              let finalImageUrl = imageUrl;
              if (imageUrl && imageUrl.startsWith('/img/')) {
                // 이미 절대 경로이므로 그대로 사용
                finalImageUrl = imageUrl;
              } else if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('//')) {
                // 상대 경로인 경우 절대 경로로 변환
                finalImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
              }
              
              return `
              <div class="recipe-card" data-recipe-id="${recipe.id}" data-is-ai="${recipe.isAI || false}">
                <img src="${finalImageUrl}" 
                     alt="${recipe.name}" 
                     loading="lazy" 
                     style="cursor: pointer;"
                     onclick="app.showRecipeDetail(${recipe.id})"
                     onerror="this.onerror=null; this.src='https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(recipe.name)}';">
                <div class="recipe-info">
                  <h3>${recipe.name}</h3>
                  <div class="recipe-meta">
                    <span>⏱️ ${recipe.cookingTime}분</span>
                    <span>📊 ${recipe.difficulty}</span>
                  </div>
                  <button class="btn btn-primary btn-sm" onclick="app.showRecipeDetail(${recipe.id})">레시피 보기</button>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        `;
      }
    }
  }

  showFridge() {
    this.currentView = 'fridge';
    this.renderNavigation();
    this.renderFridge();
  }

  renderFridge() {
    const data = this.dataManager.getData();
    const ingredients = data.ingredients;
    const dateInfo = this.weatherService.getCurrentDate();
    const seasonalIngredients = this.dataManager.getSeasonalIngredients(dateInfo.month);

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="fridge-container">
        <h2>웹 냉장고 🧊</h2>
        
        <div class="add-ingredient-section">
          <h3>재료 추가하기</h3>
          <div class="add-methods">
            <div class="add-method-card">
              <h4>수동 입력</h4>
              <form id="manualIngredientForm" class="ingredient-form">
                <input type="text" id="ingredientName" placeholder="재료 이름" required>
                <input type="text" id="ingredientImage" placeholder="이미지 URL (선택)">
                <button type="submit" class="btn btn-primary">추가</button>
              </form>
            </div>
            <div class="add-method-card">
              <h4>영수증 사진 업로드</h4>
              <div class="upload-area" id="uploadArea">
                <input type="file" id="receiptFile" accept="image/*" style="display: none;">
                <p>📷 사진을 클릭하여 업로드</p>
                <small>영수증 이미지를 업로드하면 재료를 자동으로 추출합니다</small>
              </div>
              <div id="uploadProgress" style="display: none; margin-top: 1rem;">
                <div class="loading-spinner"></div>
                <p>영수증을 분석 중입니다...</p>
              </div>
            </div>
          </div>
        </div>

        <div class="fridge-content">
          <h3>보유 재료</h3>
          ${ingredients.length === 0 
            ? '<div class="alert alert-info">냉장고가 비어있습니다. 재료를 추가해주세요!</div>'
            : `<div class="ingredients-grid">
                ${ingredients.map(ing => {
                  // 이미지가 없거나 placeholder인 경우 확인
                  const hasValidImage = ing.image && 
                    !ing.image.includes('placeholder') && 
                    ing.image.trim() !== '';
                  
                  // 즉시 사용 가능한 이미지 URL 생성
                  let ingredientImageUrl = hasValidImage ? ing.image : '';
                  if (!ingredientImageUrl || ingredientImageUrl.includes('placeholder')) {
                    const seed = ing.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const colors = ['4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff', '9C27B0/ffffff'];
                    const color = colors[seed % colors.length];
                    ingredientImageUrl = `https://dummyimage.com/200x200/${color}&text=${encodeURIComponent(ing.name)}`;
                  }
                  
                  return `
                  <div class="ingredient-item">
                    <img src="${ingredientImageUrl}" 
                         alt="${ing.name}" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://dummyimage.com/200x200/4CAF50/ffffff&text=${encodeURIComponent(ing.name)}';"
                         data-ingredient-name="${ing.name}"
                         data-ingredient-id="${ing.id}">
                    <p>${ing.name}</p>
                    <button class="btn-remove" onclick="app.removeIngredient('${ing.id}')">삭제</button>
                  </div>
                `;
                }).join('')}
              </div>`
          }
        </div>

        <div class="seasonal-section">
          <h3>${dateInfo.month}월 제철 재료 🌱</h3>
          <div class="seasonal-ingredients">
            ${seasonalIngredients.map(ing => {
              const hasIngredient = ingredients.some(i => i.name === ing);
              return `<span class="seasonal-item ${hasIngredient ? 'has-ingredient' : ''}">${ing}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
    }

    // 재료 이미지가 없거나 dummyimage인 경우 로컬 이미지 먼저 확인 후 백그라운드에서 가져오기
    if (this.imageService && ingredients.length > 0) {
      // 먼저 로컬 이미지 확인
      ingredients.forEach(ing => {
        if (!ing.image || ing.image.includes('placeholder') || ing.image.includes('dummyimage')) {
          const localImage = this.imageService.getLocalImage(ing.name, 'ingredient');
          if (localImage) {
            ing.image = localImage;
            // 데이터도 업데이트
            const data = this.dataManager.getData();
            const ingredientIndex = data.ingredients.findIndex(i => i.id === ing.id);
            if (ingredientIndex >= 0) {
              data.ingredients[ingredientIndex].image = localImage;
              this.dataManager.updateData('ingredients', data.ingredients);
            }
            // UI도 즉시 업데이트
            const imgElement = document.querySelector(`img[data-ingredient-id="${ing.id}"]`);
            if (imgElement) {
              imgElement.src = localImage;
            }
          }
        }
      });
      
      // 로컬 이미지가 없는 경우에만 백그라운드에서 가져오기
      ingredients.forEach(async (ing) => {
        if (!ing.image || ing.image.includes('placeholder') || ing.image.includes('dummyimage')) {
          try {
            const imageUrl = await this.imageService.getIngredientImage(ing.name);
            // 이미지 요소 찾아서 업데이트
            const imgElement = document.querySelector(`img[data-ingredient-id="${ing.id}"]`);
            if (imgElement && imageUrl && !imageUrl.includes('dummyimage') && !imageUrl.startsWith('/img/')) {
              // 실제 이미지로 업데이트 (페이드 효과)
              imgElement.style.opacity = '0.7';
              imgElement.src = imageUrl;
              imgElement.onload = () => {
                imgElement.style.transition = 'opacity 0.3s';
                imgElement.style.opacity = '1';
              };
              
              // 데이터도 업데이트
              const data = this.dataManager.getData();
              const ingredientIndex = data.ingredients.findIndex(i => i.id === ing.id);
              if (ingredientIndex >= 0) {
                data.ingredients[ingredientIndex].image = imageUrl;
                this.dataManager.updateData('ingredients', data.ingredients);
              }
            }
          } catch (error) {
            console.warn(`재료 이미지 가져오기 실패 (${ing.name}):`, error);
          }
        }
      });
    }

    // 수동 입력 폼
    document.getElementById('manualIngredientForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('ingredientName').value.trim();
      const imageInput = document.getElementById('ingredientImage').value.trim();
      
      if (name) {
        let imageUrl = imageInput;
        
        // 이미지 URL이 입력되지 않았으면 Pixabay에서 검색
        if (!imageUrl && this.imageService) {
          try {
            const loadingBtn = e.target.querySelector('button[type="submit"]');
            const originalText = loadingBtn.textContent;
            loadingBtn.textContent = '이미지 검색 중...';
            loadingBtn.disabled = true;
            
            imageUrl = await this.imageService.getIngredientImage(name);
            
            loadingBtn.textContent = originalText;
            loadingBtn.disabled = false;
          } catch (error) {
            console.warn('재료 이미지 검색 실패:', error);
            imageUrl = `https://via.placeholder.com/200x200?text=${encodeURIComponent(name)}`;
          }
        } else if (!imageUrl) {
          imageUrl = `https://via.placeholder.com/200x200?text=${encodeURIComponent(name)}`;
        }
        
        const newIngredient = {
          id: Date.now().toString(),
          name: name,
          image: imageUrl
        };
        
        const data = this.dataManager.getData();
        data.ingredients.push(newIngredient);
        this.dataManager.updateData('ingredients', data.ingredients);
        
        document.getElementById('ingredientName').value = '';
        document.getElementById('ingredientImage').value = '';
        this.renderFridge();
      }
    });

    // 영수증 업로드
    document.getElementById('uploadArea').addEventListener('click', () => {
      document.getElementById('receiptFile').click();
    });

    document.getElementById('receiptFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.processReceiptImage(file);
      }
    });
  }

  removeIngredient(id) {
    const data = this.dataManager.getData();
    data.ingredients = data.ingredients.filter(ing => ing.id !== id);
    this.dataManager.updateData('ingredients', data.ingredients);
    this.renderFridge();
  }

  showShopping() {
    this.currentView = 'shopping';
    this.renderNavigation();
    this.renderShopping();
  }

  renderShopping() {
    const data = this.dataManager.getData();
    const ingredients = data.ingredients;
    const ratings = data.ratings;
    const dateInfo = this.weatherService.getCurrentDate();
    const seasonalIngredients = this.dataManager.getSeasonalIngredients(dateInfo.month);

    // 자주 사용하는 재료 계산 (레시피 평가 기반)
    const frequentlyUsed = this.getFrequentlyUsedIngredients(ratings, data.recipes);
    const missingIngredients = this.getMissingIngredients(frequentlyUsed, ingredients);

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="shopping-container">
        <h2>장바구니 추천 🛒</h2>
        
        <div class="shopping-section">
          <h3>자주 사용하는 재료</h3>
          ${missingIngredients.length === 0 
            ? '<div class="alert alert-success">자주 사용하는 재료를 모두 보유하고 있습니다!</div>'
            : `<div class="recommended-items">
                ${missingIngredients.map(ing => `
                  <div class="shopping-item">
                    <span>${ing}</span>
                    <button class="btn btn-primary btn-sm" onclick="app.addToFridge('${ing}')">냉장고에 추가</button>
                  </div>
                `).join('')}
              </div>`
          }
        </div>

        <div class="shopping-section">
          <h3>제철 재료 추천 (${dateInfo.month}월)</h3>
          <div class="recommended-items">
            ${seasonalIngredients.map(ing => {
              const hasIngredient = ingredients.some(i => i.name === ing);
              return `
                <div class="shopping-item ${hasIngredient ? 'has-item' : ''}">
                  <span>${ing} ${hasIngredient ? '✅' : ''}</span>
                  ${!hasIngredient ? `<button class="btn btn-primary btn-sm" onclick="app.addToFridge('${ing}')">냉장고에 추가</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="shopping-section">
          <h3>현재 장바구니</h3>
          ${data.shoppingCart.length === 0 
            ? '<div class="alert alert-info">장바구니가 비어있습니다.</div>'
            : `<ul class="cart-list">
                ${data.shoppingCart.map((item, idx) => `
                  <li>
                    <span>${item}</span>
                    <button class="btn-remove" onclick="app.removeFromCart(${idx})">삭제</button>
                  </li>
                `).join('')}
              </ul>`
          }
        </div>
      </div>
    `;

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
    }
  }

  async addToFridge(name) {
    let imageUrl = `https://via.placeholder.com/200x200?text=${encodeURIComponent(name)}`;
    
    // Pixabay에서 이미지 가져오기
    if (this.imageService) {
      try {
        imageUrl = await this.imageService.getIngredientImage(name);
      } catch (error) {
        console.warn(`재료 이미지 가져오기 실패 (${name}):`, error);
      }
    }
    
    const newIngredient = {
      id: Date.now().toString(),
      name: name,
      image: imageUrl
    };
    
    const data = this.dataManager.getData();
    if (!data.ingredients.some(ing => ing.name === name)) {
      data.ingredients.push(newIngredient);
      this.dataManager.updateData('ingredients', data.ingredients);
      
      if (this.currentView === 'shopping') {
        this.renderShopping();
      } else if (this.currentView === 'fridge') {
        this.renderFridge();
      }
    }
  }

  removeFromCart(idx) {
    const data = this.dataManager.getData();
    data.shoppingCart.splice(idx, 1);
    this.dataManager.updateData('shoppingCart', data.shoppingCart);
    this.renderShopping();
  }

  getFrequentlyUsedIngredients(ratings, recipes) {
    const ingredientCount = {};
    ratings.forEach(rating => {
      const recipe = recipes.find(r => r.id === rating.recipeId);
      if (recipe && rating.rating >= 4) {
        recipe.ingredients.forEach(ing => {
          ingredientCount[ing] = (ingredientCount[ing] || 0) + 1;
        });
      }
    });
    return Object.keys(ingredientCount)
      .sort((a, b) => ingredientCount[b] - ingredientCount[a])
      .slice(0, 5);
  }

  getMissingIngredients(frequentlyUsed, currentIngredients) {
    const currentNames = currentIngredients.map(ing => ing.name.toLowerCase());
    return frequentlyUsed.filter(ing => 
      !currentNames.some(name => name.includes(ing.toLowerCase()) || ing.toLowerCase().includes(name))
    );
  }

  showAlarm() {
    this.currentView = 'alarm';
    this.renderNavigation();
    this.renderAlarm();
  }

  renderAlarm() {
    const data = this.dataManager.getData();
    const alarmSettings = data.alarmSettings || {
      weekday: { enabled: false, hour: 17, minute: 30 },
      weekend: { enabled: false, hour: 12, minute: 0 }
    };

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="alarm-container">
        <h2>알람 설정 ⏰</h2>
        
        <div class="alarm-section">
          <h3>평일 알람</h3>
          <label class="toggle-switch">
            <input type="checkbox" id="weekdayEnabled" ${alarmSettings.weekday.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <div class="time-inputs">
            <input type="number" id="weekdayHour" min="0" max="23" value="${alarmSettings.weekday.hour}">
            <span>시</span>
            <input type="number" id="weekdayMinute" min="0" max="59" value="${alarmSettings.weekday.minute}">
            <span>분</span>
          </div>
        </div>

        <div class="alarm-section">
          <h3>주말 알람</h3>
          <label class="toggle-switch">
            <input type="checkbox" id="weekendEnabled" ${alarmSettings.weekend.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <div class="time-inputs">
            <input type="number" id="weekendHour" min="0" max="23" value="${alarmSettings.weekend.hour}">
            <span>시</span>
            <input type="number" id="weekendMinute" min="0" max="59" value="${alarmSettings.weekend.minute}">
            <span>분</span>
          </div>
        </div>

        <button class="btn btn-primary" onclick="app.saveAlarmSettings()">저장</button>
      </div>
    `;

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
    }
  }

  saveAlarmSettings() {
    const alarmSettings = {
      weekday: {
        enabled: document.getElementById('weekdayEnabled').checked,
        hour: parseInt(document.getElementById('weekdayHour').value),
        minute: parseInt(document.getElementById('weekdayMinute').value)
      },
      weekend: {
        enabled: document.getElementById('weekendEnabled').checked,
        hour: parseInt(document.getElementById('weekendHour').value),
        minute: parseInt(document.getElementById('weekendMinute').value)
      }
    };

    this.dataManager.updateData('alarmSettings', alarmSettings);
    this.setupAlarm();
    alert('알람 설정이 저장되었습니다!');
  }

  setupAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
    }

    this.alarmInterval = setInterval(() => {
      const data = this.dataManager.getData();
      const alarmSettings = data.alarmSettings;
      
      if (!alarmSettings) return;

      const dateInfo = this.weatherService.getCurrentDate();
      const isWeekend = dateInfo.dayOfWeek === '토' || dateInfo.dayOfWeek === '일';
      const setting = isWeekend ? alarmSettings.weekend : alarmSettings.weekday;

      if (setting.enabled && 
          dateInfo.hour === setting.hour && 
          dateInfo.minute === setting.minute) {
        this.showAlarmNotification();
      }
    }, 60000); // 1분마다 체크
  }

  showAlarmNotification() {
    if (Notification.permission === 'granted') {
      new Notification('냉장고를 부탁해!!', {
        body: '오늘의 요리 추천을 확인해보세요! 🍳',
        icon: '/vite.svg'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showAlarmNotification();
        }
      });
    }
  }

  showSettings() {
    this.currentView = 'settings';
    this.renderNavigation();
    this.renderSettings();
  }

  renderSettings() {
    const data = this.dataManager.getData();
    const user = data.user;

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="settings-container">
        <h2>설정 ⚙️</h2>
        
        <div class="settings-section">
          <h3>사용자 정보</h3>
          <div class="info-list">
            <div><strong>도시:</strong> ${user.city}</div>
            <div><strong>가족 형태:</strong> ${user.familyType}</div>
            <div><strong>알레르기:</strong> ${user.allergies.length > 0 ? user.allergies.join(', ') : '없음'}</div>
            <div><strong>선호 맛:</strong> ${user.preferences.length > 0 ? user.preferences.join(', ') : '없음'}</div>
          </div>
          <button class="btn btn-secondary" onclick="app.showUserSetup()">정보 수정</button>
        </div>

        <div class="settings-section">
          <h3>알림 권한</h3>
          <button class="btn btn-primary" onclick="app.requestNotificationPermission()">알림 허용</button>
        </div>

        <div class="settings-section">
          <h3>데이터 초기화</h3>
          <button class="btn btn-danger" onclick="app.resetData()">모든 데이터 삭제</button>
        </div>
      </div>
    `;

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
    }
  }

  requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        alert('알림 권한이 허용되었습니다!');
      } else {
        alert('알림 권한이 거부되었습니다.');
      }
    });
  }

  resetData() {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까?')) {
      localStorage.removeItem(this.dataManager.storageKey);
      this.dataManager.initData();
      this.showUserSetup();
    }
  }

  showRecipeDetail(recipeId) {
    // AI 생성 레시피는 메모리에만 존재하므로 별도 처리
    // recommendationEngine에서 최근 추천된 레시피를 저장해두어야 함
    const data = this.dataManager.getData();
    let recipe = data.recipes.find(r => r.id === recipeId);
    
    // AI 레시피는 메모리에만 있을 수 있으므로, 임시 저장소에서 찾기
    if (!recipe && this.lastRecommendations) {
      recipe = this.lastRecommendations.find(r => r.id === recipeId);
    }
    
    if (!recipe) {
      alert('레시피를 찾을 수 없습니다.');
      return;
    }

    this.currentRecipe = recipe;
    this.renderRecipeDetail();
  }

  renderRecipeDetail() {
    const recipe = this.currentRecipe;
    const data = this.dataManager.getData();
    const userIngredients = data.ingredients;
    const existingRating = data.ratings.find(r => r.recipeId === recipe.id);
    this.currentRating = existingRating ? existingRating.rating : 0;

    // 레시피 이미지 경로 처리 (Netlify 배포 시 절대 경로로 변환)
    let recipeImageUrl = recipe.image || '';
    
    console.log(`레시피 상세 페이지 - 원본 이미지 URL: ${recipe.name} -> ${recipeImageUrl}`);
    
    // 1. 로컬 이미지가 있는지 먼저 확인 (로컬 이미지가 있으면 우선 사용)
    if (this.imageService) {
      const localImage = this.imageService.getLocalImage(recipe.name, 'recipe');
      if (localImage) {
        recipeImageUrl = localImage.startsWith('/') ? localImage : `/${localImage}`;
        console.log(`로컬 이미지 우선 사용: ${recipe.name} -> ${recipeImageUrl}`);
      }
    }
    
    // 2. 이미지 URL이 여전히 없거나 유효하지 않은 경우 처리
    if (!recipeImageUrl || recipeImageUrl.trim() === '' || recipeImageUrl === 'null' || recipeImageUrl === 'undefined') {
      // 로컬 이미지도 확인했는데 없으면 placeholder 사용
      const seed = recipe.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colors = ['4CAF50/ffffff', '2196F3/ffffff', 'FF9800/ffffff', '9C27B0/ffffff'];
      const color = colors[seed % colors.length];
      recipeImageUrl = `https://dummyimage.com/400x300/${color}&text=${encodeURIComponent(recipe.name)}`;
      console.log(`Placeholder 이미지 사용: ${recipe.name} -> ${recipeImageUrl}`);
    } else {
      // 3. 로컬 경로 처리 (/img/로 시작하는 경우)
      if (recipeImageUrl.startsWith('/img/')) {
        // 이미 절대 경로이므로 그대로 사용
        recipeImageUrl = recipeImageUrl;
        console.log(`로컬 이미지 경로 (절대): ${recipeImageUrl}`);
      } 
      // 4. 외부 URL이 아닌 상대 경로 처리
      else if (!recipeImageUrl.startsWith('http') && !recipeImageUrl.startsWith('//') && !recipeImageUrl.startsWith('data:')) {
        // 상대 경로인 경우 절대 경로로 변환
        recipeImageUrl = recipeImageUrl.startsWith('/') ? recipeImageUrl : `/${recipeImageUrl}`;
        console.log(`상대 경로를 절대 경로로 변환: ${recipeImageUrl}`);
      }
      // 5. 외부 URL (http, https, //)는 그대로 사용
      else {
        console.log(`외부 URL 사용: ${recipeImageUrl}`);
      }
    }
    
    console.log(`최종 레시피 상세 이미지 경로: ${recipe.name} -> ${recipeImageUrl}`);

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="recipe-detail-container">
        <button class="btn btn-secondary btn-back" onclick="app.showHome()">← 뒤로</button>
        
        <div class="recipe-header">
          <img src="${recipeImageUrl}" 
               alt="${recipe.name}" 
               loading="lazy"
               onerror="
                 console.error('이미지 로드 실패:', '${recipeImageUrl}');
                 const fallbackUrl = 'https://dummyimage.com/400x300/4CAF50/ffffff&text=${encodeURIComponent(recipe.name)}';
                 this.onerror = null;
                 this.src = fallbackUrl;
               "
               onload="console.log('이미지 로드 성공:', '${recipeImageUrl}')">
          <div class="recipe-title-section">
            <h1>${recipe.name} ${recipe.isAI ? '🤖' : ''}</h1>
            ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
            <div class="recipe-meta-detail">
              <span>⏱️ ${recipe.cookingTime}분</span>
              <span>📊 난이도: ${recipe.difficulty}</span>
              ${recipe.isAI ? '<span class="ai-badge">🤖 AI 추천</span>' : ''}
            </div>
          </div>
        </div>

        <div class="recipe-section">
          <h2>필요 재료</h2>
          <ul class="ingredient-list">
            ${recipe.ingredients.map(ing => {
              const hasIngredient = userIngredients.some(ui => 
                ui.name.toLowerCase().includes(ing.toLowerCase()) ||
                ing.toLowerCase().includes(ui.name.toLowerCase())
              );
              return `<li class="${hasIngredient ? 'has-ingredient' : 'missing-ingredient'}">
                ${ing} ${hasIngredient ? '✅' : '❌'}
              </li>`;
            }).join('')}
          </ul>
        </div>

        <div class="recipe-section">
          <h2>조리 순서</h2>
          <ol class="steps-list">
            ${recipe.steps.map((step, idx) => `
              <li>
                <span class="step-number">${idx + 1}</span>
                <span class="step-content">${step}</span>
              </li>
            `).join('')}
          </ol>
        </div>

        <div class="recipe-section">
          <h2>평가하기</h2>
          <div class="rating-section">
            <div class="star-rating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star ${existingRating && existingRating.rating >= star ? 'filled' : ''}" 
                      data-rating="${star}"
                      onclick="app.setRating(${star})">⭐</span>
              `).join('')}
            </div>
            <textarea id="recipeComment" placeholder="코멘트를 입력하세요...">${existingRating ? existingRating.comment : ''}</textarea>
            <button class="btn btn-primary" onclick="app.saveRating()">평가 저장</button>
          </div>
        </div>
      </div>
    `;

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
    }
  }

  setRating(rating) {
    this.currentRating = rating;
    document.querySelectorAll('.star').forEach((star, idx) => {
      if (idx < rating) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
  }

  saveRating() {
    const recipe = this.currentRecipe;
    const rating = this.currentRating || 0;
    const comment = document.getElementById('recipeComment').value.trim();

    if (rating === 0) {
      alert('별점을 선택해주세요!');
      return;
    }

    const data = this.dataManager.getData();
    const existingIndex = data.ratings.findIndex(r => r.recipeId === recipe.id);
    
    const ratingData = {
      recipeId: recipe.id,
      rating: rating,
      comment: comment,
      date: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      data.ratings[existingIndex] = ratingData;
    } else {
      data.ratings.push(ratingData);
    }

    this.dataManager.updateData('ratings', data.ratings);
    alert('평가가 저장되었습니다!');
    this.renderRecipeDetail();
  }

  navigate(view) {
    switch(view) {
      case 'home':
        this.showHome();
        break;
      case 'fridge':
        this.showFridge();
        break;
      case 'shopping':
        this.showShopping();
        break;
      case 'alarm':
        this.showAlarm();
        break;
      case 'settings':
        this.showSettings();
        break;
    }
  }

  async processReceiptImage(file) {
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadArea = document.getElementById('uploadArea');
    
    try {
      // 파일 크기 체크 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        alert('이미지 파일 크기는 10MB 이하여야 합니다.');
        return;
      }

      uploadArea.style.display = 'none';
      uploadProgress.style.display = 'block';

      // 이미지를 Base64로 변환
      const base64 = await this.fileToBase64(file);

      // OpenAI API로 영수증 분석
      const ingredients = await this.openAIService.analyzeReceiptImage(base64);

      if (ingredients && ingredients.length > 0) {
        // 추출된 재료를 냉장고에 추가
        const data = this.dataManager.getData();
        const existingNames = data.ingredients.map(ing => ing.name.toLowerCase());

        let addedCount = 0;
        // 재료 이미지를 병렬로 가져오기
        const ingredientPromises = ingredients.map(async (ingName) => {
          const normalizedName = ingName.trim();
          if (normalizedName && normalizedName.length > 0 && 
              !existingNames.some(existing => 
                existing.includes(normalizedName.toLowerCase()) ||
                normalizedName.toLowerCase().includes(existing)
              )) {
            let imageUrl = `https://via.placeholder.com/200x200?text=${encodeURIComponent(normalizedName)}`;
            
            // Pixabay에서 이미지 가져오기
            if (this.imageService) {
              try {
                imageUrl = await this.imageService.getIngredientImage(normalizedName);
              } catch (error) {
                console.warn(`재료 이미지 가져오기 실패 (${normalizedName}):`, error);
              }
            }
            
            return {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: normalizedName,
              image: imageUrl
            };
          }
          return null;
        });
        
        const newIngredients = await Promise.all(ingredientPromises);
        newIngredients.forEach(newIngredient => {
          if (newIngredient) {
            data.ingredients.push(newIngredient);
            existingNames.push(newIngredient.name.toLowerCase());
            addedCount++;
          }
        });

        this.dataManager.updateData('ingredients', data.ingredients);
        
        uploadProgress.style.display = 'none';
        uploadArea.style.display = 'block';
        
        alert(`${addedCount}개의 재료가 냉장고에 추가되었습니다!`);
        this.renderFridge();
      } else {
        throw new Error('재료를 추출할 수 없습니다.');
      }
    } catch (error) {
      console.error('영수증 처리 오류:', error);
      uploadProgress.style.display = 'none';
      uploadArea.style.display = 'block';
      
      let errorMessage = '영수증 분석 중 오류가 발생했습니다.';
      if (error.message.includes('API 키')) {
        errorMessage = 'OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.';
      } else if (error.message.includes('API 요청')) {
        errorMessage = 'API 요청이 실패했습니다. API 키와 잔액을 확인해주세요.';
      }
      alert(errorMessage + '\n오류: ' + error.message);
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export default AppUI;

