// UI 컴포넌트 관리
class AppUI {
  constructor(dataManager, weatherService, recommendationEngine) {
    this.dataManager = dataManager;
    this.weatherService = weatherService;
    this.recommendationEngine = recommendationEngine;
    this.currentView = 'home';
    this.currentRecipe = null;
    this.alarmInterval = null;
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
    const weather = await this.weatherService.getWeather(user.city);
    const recommendations = await this.recommendationEngine.getRecommendations();

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    
    if (recommendations.error) {
      main.innerHTML = `
        <div class="home-container">
          <div class="weather-card">
            <h3>오늘의 날씨</h3>
            <div class="weather-info">
              <span class="weather-icon">${weather.icon}</span>
              <div>
                <p class="city">${user.city}</p>
                <p class="temp">${weather.temp}°C ${weather.condition}</p>
              </div>
            </div>
          </div>
          <div class="alert alert-info">${recommendations.error}</div>
        </div>
      `;
    } else {
      main.innerHTML = `
        <div class="home-container">
          <div class="weather-card">
            <h3>오늘의 날씨</h3>
            <div class="weather-info">
              <span class="weather-icon">${weather.icon}</span>
              <div>
                <p class="city">${user.city}</p>
                <p class="temp">${weather.temp}°C ${weather.condition}</p>
              </div>
            </div>
            <p class="date-info">${dateInfo.year}년 ${dateInfo.month}월 ${dateInfo.day}일 ${dateInfo.dayOfWeek}요일</p>
          </div>

          <div class="recommendations-section">
            <h2>오늘의 요리 추천 🍳</h2>
            ${recommendations.length === 0 
              ? '<div class="alert alert-info">보유한 재료로 만들 수 있는 요리가 없습니다. 재료를 추가해주세요!</div>'
              : '<div class="recipe-grid">' + recommendations.map(recipe => `
                  <div class="recipe-card" data-recipe-id="${recipe.id}">
                    <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${recipe.name}'">
                    <div class="recipe-info">
                      <h3>${recipe.name}</h3>
                      <div class="recipe-meta">
                        <span>⏱️ ${recipe.cookingTime}분</span>
                        <span>📊 ${recipe.difficulty}</span>
                      </div>
                      <button class="btn btn-primary btn-sm" onclick="app.showRecipeDetail(${recipe.id})">레시피 보기</button>
                    </div>
                  </div>
                `).join('') + '</div>'
            }
          </div>
        </div>
      `;
    }

    const existingMain = document.querySelector('.main-content');
    if (existingMain) {
      existingMain.replaceWith(main);
    } else {
      const nav = document.querySelector('.main-nav');
      nav.after(main);
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
                <small>(현재 버전에서는 수동 입력을 권장합니다)</small>
              </div>
            </div>
          </div>
        </div>

        <div class="fridge-content">
          <h3>보유 재료</h3>
          ${ingredients.length === 0 
            ? '<div class="alert alert-info">냉장고가 비어있습니다. 재료를 추가해주세요!</div>'
            : `<div class="ingredients-grid">
                ${ingredients.map(ing => `
                  <div class="ingredient-item">
                    <img src="${ing.image || 'https://via.placeholder.com/100x100?text=' + ing.name}" 
                         alt="${ing.name}" 
                         onerror="this.src='https://via.placeholder.com/100x100?text=${ing.name}'">
                    <p>${ing.name}</p>
                    <button class="btn-remove" onclick="app.removeIngredient('${ing.id}')">삭제</button>
                  </div>
                `).join('')}
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

    // 수동 입력 폼
    document.getElementById('manualIngredientForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('ingredientName').value.trim();
      const image = document.getElementById('ingredientImage').value.trim();
      
      if (name) {
        const newIngredient = {
          id: Date.now().toString(),
          name: name,
          image: image || `https://via.placeholder.com/100x100?text=${name}`
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

    document.getElementById('receiptFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        alert('영수증 인식 기능은 개발 중입니다. 현재는 수동 입력을 사용해주세요.');
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

  addToFridge(name) {
    const newIngredient = {
      id: Date.now().toString(),
      name: name,
      image: `https://via.placeholder.com/100x100?text=${name}`
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
    const data = this.dataManager.getData();
    const recipe = data.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    this.currentRecipe = recipe;
    this.renderRecipeDetail();
  }

  renderRecipeDetail() {
    const recipe = this.currentRecipe;
    const data = this.dataManager.getData();
    const userIngredients = data.ingredients;
    const existingRating = data.ratings.find(r => r.recipeId === recipe.id);
    this.currentRating = existingRating ? existingRating.rating : 0;

    const main = document.querySelector('.main-content') || document.createElement('main');
    main.className = 'main-content';
    main.innerHTML = `
      <div class="recipe-detail-container">
        <button class="btn btn-secondary btn-back" onclick="app.showHome()">← 뒤로</button>
        
        <div class="recipe-header">
          <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='https://via.placeholder.com/400x300?text=${recipe.name}'">
          <div class="recipe-title-section">
            <h1>${recipe.name}</h1>
            <div class="recipe-meta-detail">
              <span>⏱️ ${recipe.cookingTime}분</span>
              <span>📊 난이도: ${recipe.difficulty}</span>
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
}

export default AppUI;

