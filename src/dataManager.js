// 데이터 관리 모듈
class DataManager {
  constructor() {
    this.storageKey = 'fridgeAppData';
    this.initData();
  }

  initData() {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = {
        user: null,
        ingredients: [],
        recipes: this.getDefaultRecipes(),
        ratings: [],
        shoppingCart: [],
        alarmSettings: null,
        events: []
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getData() {
    return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  }

  updateData(key, value) {
    const data = this.getData();
    data[key] = value;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  getDefaultRecipes() {
    return [
      {
        id: 1,
        name: '된장찌개',
        image: null, // 이미지 서비스로 가져옴
        cookingTime: 30,
        difficulty: '쉬움',
        ingredients: ['된장', '두부', '대파', '감자', '고춧가루'],
        steps: [
          '물 500ml를 끓인다',
          '된장 2큰술을 풀어 넣는다',
          '감자를 넣고 5분 끓인다',
          '두부와 대파를 넣고 3분 더 끓인다',
          '고춧가루를 넣고 마무리한다'
        ],
        season: '연중',
        weather: ['맑음', '흐림', '비'],
        tags: ['한식', '국물요리']
      },
      {
        id: 2,
        name: '김치볶음밥',
        image: '/img/김치볶음밥.jpg', // 로컬 이미지 사용
        cookingTime: 15,
        difficulty: '쉬움',
        ingredients: ['김치', '밥', '계란', '대파', '참기름'],
        steps: [
          '김치를 잘게 썬다',
          '팬에 기름을 두르고 김치를 볶는다',
          '밥을 넣고 볶는다',
          '계란을 풀어 넣고 섞는다',
          '대파와 참기름을 넣고 마무리한다'
        ],
        season: '연중',
        weather: ['맑음', '흐림'],
        tags: ['한식', '간단요리']
      },
      {
        id: 3,
        name: '삼겹살 구이',
        image: null,
        cookingTime: 20,
        difficulty: '쉬움',
        ingredients: ['삼겹살', '소금', '후추', '상추', '깻잎'],
        steps: [
          '삼겹살을 적당한 크기로 자른다',
          '팬에 굽는다',
          '소금, 후추로 간을 한다',
          '상추와 깻잎과 함께 먹는다'
        ],
        season: '연중',
        weather: ['맑음'],
        tags: ['한식', '고기요리']
      },
      {
        id: 4,
        name: '콩나물국',
        image: null,
        cookingTime: 15,
        difficulty: '쉬움',
        ingredients: ['콩나물', '대파', '고춧가루', '멸치육수'],
        steps: [
          '멸치육수를 끓인다',
          '콩나물을 넣고 끓인다',
          '대파와 고춧가루를 넣는다',
          '5분 더 끓인다'
        ],
        season: '연중',
        weather: ['흐림', '비'],
        tags: ['한식', '국물요리']
      },
      {
        id: 5,
        name: '계란말이',
        image: '/img/계란말이.jpg', // 로컬 이미지 사용
        cookingTime: 10,
        difficulty: '보통',
        ingredients: ['계란', '당근', '대파', '소금'],
        steps: [
          '계란을 풀어 준비한다',
          '당근과 대파를 잘게 썬다',
          '계란에 섞어 소금으로 간한다',
          '팬에 부어 말아 만든다'
        ],
        season: '연중',
        weather: ['맑음', '흐림'],
        tags: ['한식', '간단요리']
      },
      {
        id: 6,
        name: '파스타',
        image: null,
        cookingTime: 25,
        difficulty: '보통',
        ingredients: ['파스타면', '토마토', '올리브오일', '마늘', '파마산치즈'],
        steps: [
          '파스타면을 삶는다',
          '마늘을 볶는다',
          '토마토를 넣고 끓인다',
          '면을 넣고 섞는다',
          '치즈를 뿌린다'
        ],
        season: '연중',
        weather: ['맑음'],
        tags: ['양식', '파스타']
      }
    ];
  }

  getSeasonalIngredients(month) {
    const seasonal = {
      1: ['무', '배추', '양배추', '당근'],
      2: ['무', '배추', '양배추', '당근'],
      3: ['시금치', '대파', '미나리'],
      4: ['시금치', '대파', '미나리', '새싹채소'],
      5: ['오이', '토마토', '상추', '시금치'],
      6: ['오이', '토마토', '상추', '가지'],
      7: ['오이', '토마토', '상추', '가지', '옥수수'],
      8: ['오이', '토마토', '상추', '가지', '옥수수'],
      9: ['고구마', '감자', '배추'],
      10: ['무', '배추', '양배추', '고구마'],
      11: ['무', '배추', '양배추', '당근'],
      12: ['무', '배추', '양배추', '당근']
    };
    return seasonal[month] || [];
  }
}

export default DataManager;

