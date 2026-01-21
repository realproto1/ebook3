import { config } from '../config/index.js';

/**
 * Gemini API를 사용한 이미지 생성
 */
export async function generateImage(prompt, referenceImages = [], retryCount = 0, maxRetries = 3) {
  try {
    console.log(`Calling Gemini Image Generation API (Attempt ${retryCount + 1}/${maxRetries})...`);
    console.log('Prompt:', prompt);
    console.log('Reference Images:', referenceImages.length);
    
    // parts 배열 구성 (프롬프트 + 레퍼런스 이미지들)
    const parts = [{ text: prompt }];
    
    // 레퍼런스 이미지 추가
    for (const imageUrl of referenceImages) {
      if (!imageUrl) continue;
      
      try {
        let base64Data, mimeType;
        
        // 1️⃣ Base64 데이터 (이미 변환된 경우)
        if (imageUrl.startsWith('data:image/')) {
          base64Data = imageUrl.split(',')[1];
          mimeType = imageUrl.split(';')[0].split(':')[1];
          console.log(`  📎 Adding base64 reference image (${mimeType})`);
        }
        // 2️⃣ HTTP URL (R2 또는 외부 URL)
        else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          console.log(`  📥 Downloading reference image from URL: ${imageUrl.substring(0, 80)}...`);
          
          // URL에서 이미지 다운로드
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.warn(`  ⚠️ Failed to download image: ${imageResponse.status}`);
            continue;
          }
          
          // Buffer로 변환
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          base64Data = buffer.toString('base64');
          
          // MIME type 추출
          mimeType = imageResponse.headers.get('content-type') || 'image/png';
          console.log(`  ✅ Downloaded and converted to base64 (${mimeType}, ${Math.round(buffer.length / 1024)}KB)`);
        }
        else {
          console.warn(`  ⚠️ Unknown image URL format: ${imageUrl.substring(0, 50)}`);
          continue;
        }
        
        // Gemini API에 추가
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
        
      } catch (error) {
        console.error(`  ❌ Failed to process reference image: ${error.message}`);
        // 한 이미지 실패해도 계속 진행
      }
    }
    
    console.log(`📊 Total parts: 1 text + ${parts.length - 1} images`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${config.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'text/plain'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      
      // 500 에러이고 재시도 횟수가 남아있으면 재시도
      if (response.status === 500 && retryCount < maxRetries - 1) {
        const waitTime = 2000 * (retryCount + 1); // 2초, 4초, 6초
        console.log(`🔄 500 Error detected. Retrying in ${waitTime/1000} seconds... (Attempt ${retryCount + 2}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateImage(prompt, referenceImages, retryCount + 1, maxRetries);
      }
      
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');
    
    // 응답에서 이미지 데이터 추출
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const base64Image = part.inlineData.data;
          console.log('Image generated successfully');
          return `data:${mimeType};base64,${base64Image}`;
        }
      }
    }
    
    throw new Error('No image data in response');
    
  } catch (error) {
    console.error('Image generation error:', error);
    throw error;
  }
}

/**
 * Gemini API를 사용한 텍스트 번역
 */
export async function translateText(text, targetLanguage = 'English') {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate the following text to ${targetLanguage} for image generation purposes. Only output the translated text, nothing else:\n\n${text}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const translatedText = data.candidates[0].content.parts[0].text;
      return translatedText.trim();
    }
    
    throw new Error('No translation result');
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}

export default {
  generateImage,
  translateText,
};
