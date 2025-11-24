// OpenAI API 서비스
class OpenAIService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async analyzeReceiptImage(imageBase64) {
    if (!this.apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: '당신은 영수증 이미지를 분석하여 재료 목록을 추출하는 전문가입니다. 이미지에서 식료품이나 요리 재료를 찾아서 JSON 형식으로 반환하세요. 각 재료는 한글 이름으로 표시하세요.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '이 영수증 이미지에서 식료품 및 요리 재료를 추출하여 JSON 배열로 반환해주세요. 형식: {"ingredients": ["재료1", "재료2", ...]}'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API 요청 실패');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      // JSON 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.ingredients || [];
      }
      
      // JSON이 없으면 텍스트에서 재료 추출
      const lines = content.split('\n').filter(line => line.trim());
      const ingredients = lines
        .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(item => item.length > 0 && item.length < 50);
      
      return ingredients;
    } catch (error) {
      console.error('OpenAI API 오류:', error);
      throw error;
    }
  }

  async generateRecipeSuggestion(ingredients, preferences, weather) {
    if (!this.apiKey) {
      return null; // API 키가 없으면 기존 로직 사용
    }

    try {
      const prompt = `
당신은 한국 요리 추천 전문가입니다. 다음 정보를 바탕으로 한국인들이 선호하는 요리를 추천해주세요:

보유 재료: ${ingredients.join(', ')}
선호 맛: ${preferences.join(', ') || '없음'}
날씨: ${weather.condition}, ${weather.temp}°C

한국인들이 가장 선호하는 메뉴를 우선적으로 추천해주세요:
- 국물 요리: 김치찌개, 된장찌개, 순두부찌개, 부대찌개, 갈비탕, 설렁탕, 미역국, 콩나물국 등
- 밥 요리: 비빔밥, 김치볶음밥, 볶음밥, 주먹밥 등
- 고기 요리: 불고기, 삼겹살, 갈비, 제육볶음, 닭볶음탕 등
- 간단 요리: 계란말이, 계란후라이, 계란찜, 두부조림, 나물, 시금치나물 등
- 면 요리: 라면, 짜장면, 비빔국수, 물냉면 등
- 간식: 떡볶이, 순대, 어묵, 호떡 등

다음 형식의 JSON으로 응답해주세요:
{
  "recipes": [
    {
      "name": "요리 이름",
      "description": "간단한 설명",
      "cookingTime": 30,
      "difficulty": "쉬움",
      "ingredients": ["재료1", "재료2"],
      "steps": ["1단계", "2단계"]
    }
  ]
}
최대 3개의 요리를 추천해주세요. 한국인들이 자주 먹고 선호하는 메뉴를 우선 추천해주세요.
`;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '당신은 한국 요리 전문가입니다. 제공된 재료와 선호도에 맞는 요리를 추천합니다. 항상 유효한 JSON 형식으로 응답하세요.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('레시피 추천 API 요청 실패');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      // JSON 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.recipes || [];
      }
      
      return null;
    } catch (error) {
      console.error('OpenAI 레시피 추천 오류:', error);
      return null;
    }
  }

  // DALL-E API를 사용하여 이미지 생성
  async generateImage(prompt, size = '1024x1024') {
    if (!this.apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    try {
      // DALL-E 3는 1024x1024, 1792x1024, 1024x1792만 지원
      const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
      const imageSize = validSizes.includes(size) ? size : '1024x1024';
      
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: imageSize,
          quality: 'standard',
          style: 'natural'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error?.message || '이미지 생성 실패';
        
        // Rate limit이나 비용 관련 오류는 조용히 처리
        if (errorMessage.includes('rate_limit') || errorMessage.includes('billing')) {
          console.warn('DALL-E API 제한:', errorMessage);
          throw new Error('API 제한 또는 비용 문제');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].url;
      }
      
      throw new Error('이미지 URL을 받지 못했습니다.');
    } catch (error) {
      console.error('DALL-E 이미지 생성 오류:', error);
      throw error;
    }
  }

  // 레시피 이미지 생성을 위한 프롬프트 생성
  generateRecipeImagePrompt(recipeName) {
    return `A beautiful, appetizing Korean dish called "${recipeName}". Professional food photography style, well-lit, on a clean plate, high quality, realistic, appetizing`;
  }

  // 재료 이미지 생성을 위한 프롬프트 생성
  generateIngredientImagePrompt(ingredientName) {
    return `Fresh ${ingredientName} ingredient, Korean food ingredient, clean white background, professional product photography, high quality, realistic`;
  }
}

export default OpenAIService;


