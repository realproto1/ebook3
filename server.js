import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

// 새로운 모듈 import
import { config, validateApiKeys, logConfig } from './server/config/env.js';
import { r2Client, logR2Config } from './server/config/r2.js';
import { requireAPIKey } from './server/middleware/auth.js';
import { upload, audioUpload } from './server/middleware/upload.js';
import { initializeGemini } from './server/services/gemini.js';
import * as R2Storage from './server/services/r2Storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// System Instruction 파일 로드
const SYSTEM_INSTRUCTION_STORY = readFileSync(
  path.join(__dirname, 'prompts', 'system-instruction-story.txt'), 
  'utf-8'
);
const SYSTEM_INSTRUCTION_IMAGE = readFileSync(
  path.join(__dirname, 'prompts', 'system-instruction-image.txt'), 
  'utf-8'
);

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 환경 변수 검증 및 로깅
validateApiKeys();
logConfig();
logR2Config();

// Gemini AI 초기화
initializeGemini();

// 하위 호환성을 위한 레거시 변수들 (기존 코드에서 사용 중)
const GEMINI_API_KEY = config.geminiApiKey;
const R2_ACCOUNT_ID = config.r2.accountId;
const R2_ACCESS_KEY_ID = config.r2.accessKeyId;
const R2_SECRET_ACCESS_KEY = config.r2.secretAccessKey;
const R2_BUCKET_NAME = config.r2.bucketName;
const R2_PUBLIC_URL = config.r2.publicUrl;

// ===== Cloudflare R2 헬퍼 함수 (R2Storage 서비스로 이동) =====
// R2Storage.uploadImageToR2, uploadBase64ToR2, uploadBufferToR2, etc.
// 이제 R2Storage 모듈에서 제공됩니다.

// 하위 호환성을 위한 래퍼 함수들
const uploadImageToR2 = R2Storage.uploadImageToR2;
const uploadBase64ToR2 = R2Storage.uploadBase64ToR2;
const uploadBufferToR2 = R2Storage.uploadBufferToR2;
const uploadJSONToR2 = R2Storage.uploadJSONToR2;
const getJSONFromR2 = R2Storage.getJSONFromR2;
const cleanupOldHistoryImage = R2Storage.deleteImageFromR2;


// Gemini 이미지 생성 함수 (Nano Banana Pro) - 멀티모달 지원 + 자동 재시도
async function generateImage(prompt, referenceImages = [], retryCount = 0, maxRetries = 3, modelName = 'gemini-3-pro-image-preview') {
  try {
    console.log(`🤖 Using Model: ${modelName}`);
    console.log(`📞 Calling Gemini Image Generation API (Attempt ${retryCount + 1}/${maxRetries})...`);
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
          
          // MIME type 추출 (Content-Type 헤더 또는 URL 확장자)
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
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
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
      
      // 503 에러(overloaded)이고 재시도 횟수가 남아있으면 재시도
      if (response.status === 503 && retryCount < maxRetries - 1) {
        const waitTime = 5000 * (retryCount + 1); // 5초, 10초, 15초로 증가
        console.log(`🔄 503 Error (Model Overloaded). Retrying in ${waitTime/1000} seconds... (Attempt ${retryCount + 2}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateImage(prompt, referenceImages, retryCount + 1, maxRetries, modelName);
      }
      
      // 503 에러가 최종적으로 실패한 경우
      if (response.status === 503) {
        throw new Error('🔥 Gemini 서버 과부하: 현재 Gemini API가 매우 혼잡합니다. 5-10분 후 다시 시도해주세요.');
      }
      
      // 429 에러 (Quota exceeded)
      if (response.status === 429) {
        throw new Error('⏱️ API 요청 한도 초과: Gemini API 무료 티어는 하루 1,500개 요청 제한이 있습니다. 내일 다시 시도하거나 API 키를 업그레이드해주세요.');
      }
      
      // 500 에러이고 재시도 횟수가 남아있으면 재시도
      if (response.status === 500 && retryCount < maxRetries - 1) {
        const waitTime = 2000 * (retryCount + 1); // 2초, 4초, 6초
        console.log(`🔄 500 Error detected. Retrying in ${waitTime/1000} seconds... (Attempt ${retryCount + 2}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateImage(prompt, referenceImages, retryCount + 1, maxRetries, modelName);
      }
      
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');
    console.log('Full Response:', JSON.stringify(data, null, 2));
    
    // finishReason 확인
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      const finishReason = candidate.finishReason;
      console.log('🔍 Finish Reason:', finishReason);
      
      // safetyRatings 확인
      if (candidate.safetyRatings) {
        console.log('🛡️ Safety Ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
      }
      
      // blockReason 확인
      if (data.promptFeedback) {
        console.log('⚠️ Prompt Feedback:', JSON.stringify(data.promptFeedback, null, 2));
      }
      
      // finishReason 검사: SAFETY나 RECITATION만 에러로 처리
      // OTHER는 정상 응답일 수 있음 (이미지 데이터가 있으면 OK)
      if (finishReason === 'SAFETY') {
        console.error('❌ Image generation blocked by safety policy');
        console.error('Safety Ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
        throw new Error('안전 정책에 의해 이미지 생성이 차단되었습니다. 프롬프트를 수정해주세요.');
      }
      
      if (finishReason === 'RECITATION') {
        console.error('❌ Image generation blocked due to recitation');
        throw new Error('저작권 문제로 이미지 생성이 차단되었습니다. 프롬프트를 수정해주세요.');
      }
      
      // OTHER나 STOP은 정상 처리 (이미지 데이터 확인)
      if (finishReason === 'OTHER' || finishReason === 'STOP') {
        console.log('✅ finishReason:', finishReason, '(정상 처리)');
      }
    }
    
    // 응답에서 이미지 데이터 추출
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const content = data.candidates[0].content;
      const finishReason = data.candidates[0].finishReason;
      
      // content가 빈 객체인지 확인
      if (Object.keys(content).length === 0) {
        console.warn('⚠️ Empty content in response');
        console.warn('Finish Reason:', finishReason);
        
        // finishReason이 OTHER인 경우 재시도 가능한 에러로 처리
        if (finishReason === 'OTHER') {
          throw new Error('GEMINI_OTHER_ERROR: 이미지 생성 중 일시적 오류가 발생했습니다. 다시 시도해주세요.');
        }
        
        throw new Error(`Image generation failed: ${finishReason} - Empty content`);
      }
      
      const parts = content.parts;
      
      // parts가 없거나 배열이 아닌 경우 - 먼저 검증
      if (!parts) {
        console.warn('⚠️ No parts in response');
        console.warn('Finish Reason:', finishReason);
        console.warn('Content:', JSON.stringify(content, null, 2));
        
        // finishReason이 OTHER인 경우 재시도 가능한 에러로 처리
        if (finishReason === 'OTHER') {
          throw new Error('GEMINI_OTHER_ERROR: 이미지 생성 중 일시적 오류가 발생했습니다. 다시 시도해주세요.');
        }
        
        throw new Error(`Image generation failed: ${finishReason} - No parts in response`);
      }
      
      // parts가 배열인지 확인
      if (!Array.isArray(parts)) {
        console.error('❌ parts is not an array:', typeof parts, parts);
        console.error('Full response:', JSON.stringify(data, null, 2));
        
        // finishReason이 OTHER인 경우 재시도 가능한 에러로 처리
        if (finishReason === 'OTHER') {
          throw new Error('GEMINI_OTHER_ERROR: 이미지 생성 중 일시적 오류가 발생했습니다. 다시 시도해주세요.');
        }
        
        throw new Error('Invalid response structure: parts is not an array');
      }
      
      // parts 배열이 비어있는 경우
      if (parts.length === 0) {
        console.warn('⚠️ Empty parts array');
        console.warn('Finish Reason:', finishReason);
        
        // finishReason이 OTHER인 경우 재시도 가능한 에러로 처리
        if (finishReason === 'OTHER') {
          throw new Error('GEMINI_OTHER_ERROR: 이미지 생성 중 일시적 오류가 발생했습니다. 다시 시도해주세요.');
        }
        
        throw new Error(`Image generation failed: ${finishReason} - Empty parts array`);
      }
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const base64Image = part.inlineData.data;
          console.log('✅ Image generated successfully');
          return `data:${mimeType};base64,${base64Image}`;
        }
      }
    }
    
    // 응답 구조 디버깅
    console.error('❌ No image data in response. Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
    throw new Error('No image data in response');
    
  } catch (error) {
    console.error('Image generation error:', error);
    
    // GEMINI_OTHER_ERROR인 경우 재시도
    if (error.message && error.message.includes('GEMINI_OTHER_ERROR') && retryCount < maxRetries - 1) {
      console.log(`🔄 Retrying due to GEMINI_OTHER_ERROR (${retryCount + 1}/${maxRetries - 1})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 지수 백오프
      return generateImage(prompt, referenceImages, retryCount + 1, maxRetries, modelName);
    }
    
    throw error;
  }
}

// 디버깅용 환경 변수 상태 확인 엔드포인트
app.get('/api/debug/env', (req, res) => {
  const hasKey = !!GEMINI_API_KEY;
  const keyLength = GEMINI_API_KEY ? GEMINI_API_KEY.length : 0;
  const keyPreview = GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET';
  
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    hasAPIKey: hasKey,
    keyLength: keyLength,
    keyPreview: keyPreview,
    message: hasKey ? '✅ API 키가 설정되어 있습니다' : '❌ API 키가 설정되지 않았습니다',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API'))
  });
});

// 이미지 업로드 API
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '이미지 파일이 없습니다.' });
    }
    
    const { storybookId, type, pageNumber, characterIndex, characterName, storybookTitle } = req.body;
    
    // 파일명 생성 (다른 API와 일관된 패턴 사용)
    const timestamp = Date.now();
    const ext = req.file.originalname.split('.').pop();
    
    // 안전한 파일명을 위한 문자열 정리
    const safeTitle = (storybookTitle || '').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const safeName = (characterName || '').replace(/[^a-zA-Z0-9가-힣]/g, '');
    
    let filename;
    
    if (type === 'character') {
      // 캐릭터 이미지: {id}-{title}-character-{name}-{timestamp}.{ext}
      const nameOrIndex = safeName || characterIndex || 'new';
      filename = `${storybookId}-${safeTitle}-character-${nameOrIndex}-${timestamp}.${ext}`;
    } else if (type === 'cover') {
      // 표지 이미지: {id}-{title}-cover-{timestamp}.{ext}
      filename = `${storybookId}-${safeTitle}-cover-${timestamp}.${ext}`;
    } else if (type === 'illustration') {
      // 삽화 이미지: {id}-{title}-illustration-page{number}-{timestamp}.{ext}
      filename = `${storybookId}-${safeTitle}-illustration-page${pageNumber || 'unknown'}-${timestamp}.${ext}`;
    } else {
      // 기타: 기본 패턴 사용
      filename = `${storybookId}-${safeTitle}-${type}-${pageNumber || 'unknown'}-${timestamp}.${ext}`;
    }
    
    console.log(`📤 Uploading image: ${filename}`);
    
    // R2에 업로드
    const imageUrl = await uploadBufferToR2(
      req.file.buffer,
      filename,
      req.file.mimetype
    );
    
    res.json({
      success: true,
      imageUrl: imageUrl
    });
    
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 오디오 파일 업로드 API
app.post('/api/upload-audio', async (req, res) => {
  try {
    const { audioData, filename, storybookId, storybookTitle } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ success: false, error: '오디오 데이터가 없습니다.' });
    }
    
    // Base64 디코딩
    const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 파일명 생성
    const timestamp = Date.now();
    const safeTitle = (storybookTitle || '').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const audioFilename = filename || `${storybookId}-${safeTitle}-audio-${timestamp}.wav`;
    
    console.log(`🎵 Uploading audio: ${audioFilename}`);
    
    // R2에 업로드
    const audioUrl = await uploadBufferToR2(
      buffer,
      audioFilename,
      'audio/wav'
    );
    
    res.json({
      success: true,
      audioUrl: audioUrl
    });
    
  } catch (error) {
    console.error('오디오 업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TTS 파일 업로드 API
app.post('/api/upload-tts', audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '오디오 파일이 없습니다.' });
    }
    
    const { storybookId, storybookTitle, pageNumber, language } = req.body;
    
    // 파일명 생성
    const timestamp = Date.now();
    const safeTitle = (storybookTitle || '').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const ext = req.file.originalname.split('.').pop() || 'wav';
    const audioFilename = `${storybookId}-${safeTitle}-tts-${language}-page${pageNumber}-${timestamp}.${ext}`;
    
    console.log(`🎵 Uploading TTS audio: ${audioFilename}`);
    
    // R2에 업로드
    const audioUrl = await uploadBufferToR2(
      req.file.buffer,
      audioFilename,
      req.file.mimetype || 'audio/wav'
    );
    
    res.json({
      success: true,
      audioUrl: audioUrl
    });
    
  } catch (error) {
    console.error('TTS 업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 1. 동화책 스토리 생성 API
app.post('/api/generate-storybook', requireAPIKey, async (req, res) => {
  try {
    const { title, targetAge, artStyle, referenceContent, totalPages = 10, geminiModel = 'gemini-2.5-flash', existingCharacters, languages = ['ko'] } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '동화책 제목을 입력해주세요.' });
    }
    
    if (!languages || languages.length === 0) {
      return res.status(400).json({ error: '최소 1개 이상의 언어를 선택해주세요.' });
    }
    
    console.log(`📚 동화책 생성 시작: "${title}" - 언어: ${languages.join(', ')}`);
    
    // 언어 이름 매핑
    const languageNames = {
      'ko': '한국어',
      'en': 'English',
      'zh': '中文',
      'ja': '日本語',
      'es': 'Español',
      'fr': 'Français'
    };

    // 연령대별 설정 (페이지 수, 단어 수, 문장 길이, 어휘 수준)
    const ageSettings = {
      '4': { 
        defaultPages: 10,
        pageRange: '8-12',
        wordCount: '800-1200', 
        sentenceLength: '6-8어절',
        sentenceComplexity: '매우 단순한 문장, 강한 반복 패턴',
        vocabulary: '초보 단계 일상 단어 (엄마, 아빠, 집, 밥 등)',
        description: '4세: 매우 짧은 문장, 반복적 리듬, 풍부한 의성어/의태어, 단순한 그림 설명 수준'
      },
      '5': { 
        defaultPages: 12,
        pageRange: '10-15',
        wordCount: '2000-3000', 
        sentenceLength: '10-14어절',
        sentenceComplexity: '단순한 문장 구조, 기본적인 연결',
        vocabulary: '쉬운 일상 단어와 기본 감정 표현 (기쁘다, 슬프다)',
        description: '5세: 짧고 명료한 문장, 간단한 인과관계, 구체적 상황 묘사, 반복 요소 활용'
      },
      '6': { 
        defaultPages: 15,
        pageRange: '12-18',
        wordCount: '2500-3500', 
        sentenceLength: '12-18어절',
        sentenceComplexity: '적절한 복문, 기본적인 인과관계 표현',
        vocabulary: '일상적 단어와 다양한 감정 표현 (질투하다, 기대하다)',
        description: '6세: 논리적 흐름, 감정 묘사 확대, 캐릭터 심리 표현, 대화 활용'
      },
      '7': { 
        defaultPages: 18,
        pageRange: '15-22',
        wordCount: '3000-4500', 
        sentenceLength: '15-22어절',
        sentenceComplexity: '복잡한 문장, 다양한 연결어미 사용',
        vocabulary: '추상 개념 일부 포함 (용기, 정직, 우정)',
        description: '7세: 복합적 스토리, 도덕적 메시지, 캐릭터 변화 표현, 다층적 갈등'
      },
      '8': { 
        defaultPages: 20,
        pageRange: '16-25',
        wordCount: '4000-5500', 
        sentenceLength: '18-25어절',
        sentenceComplexity: '고급 문장 구조, 은유와 비유 활용',
        vocabulary: '추상적 개념과 고급 어휘 (성찰, 희생, 운명)',
        description: '8세: 깊이 있는 주제, 복잡한 캐릭터 심리, 상징적 요소, 교훈적 통찰'
      }
    };
    const settings = ageSettings[targetAge] || ageSettings['5'];

    // 페이지 수 결정 (0이면 AI가 자동 결정, 아니면 지정된 수)
    let pageCount;
    let pageInstruction;
    
    if (totalPages === 0 || !totalPages) {
      // AI가 자동으로 적절한 페이지 수 결정
      pageCount = settings.defaultPages;
      const pageRangeText = settings.pageRange || `${settings.defaultPages - 2}-${settings.defaultPages + 2}`;
      pageInstruction = `스토리의 흐름과 내용에 맞춰 ${pageRangeText}페이지 사이에서 자연스럽게 조정하세요. 억지로 늘리거나 줄이지 말고, 이야기가 완결되는데 필요한 만큼만 사용하세요.`;
    } else {
      // 사용자가 지정한 페이지 수 (5-30 범위)
      pageCount = Math.min(Math.max(totalPages, 5), 30);
      pageInstruction = `정확히 ${pageCount}페이지로 작성하세요`;
    }

    // 기존 캐릭터 섹션 (다시 만들기 시)
    const existingCharSection = existingCharacters ? `

기존 캐릭터 정보 (이 캐릭터들을 반드시 사용하세요):
${existingCharacters.map((char, idx) => `${idx + 1}. ${char.name} (${char.role}): ${char.description}`).join('\n')}

**중요**: 위 캐릭터들을 그대로 사용하되, 새로운 스토리에 맞게 역할과 행동을 재구성하세요.` : '';

    // Gemini로 스토리 생성
    const referenceSection = referenceContent ? `

참고할 내용:
${referenceContent}

위 내용을 참고하여 새롭게 재해석하거나 유사한 구조로 창작해주세요.` : '';

    // User Prompt는 아래 line 725에서 생성됨 (systemInstruction과 함께)

    // 시스템 인스트럭션: 파일에서 로드 (prompts/system-instruction-story.txt)
    const systemInstruction = SYSTEM_INSTRUCTION_STORY;

    // 사용자 프롬프트: 구체적인 요구사항만
    const userPrompt = `다음 조건으로 동화책을 제작해주세요:

제목: "${title}"
타겟 연령: ${targetAge}세 (${settings.description})
페이지 수: ${pageInstruction}
총 단어 수: ${settings.wordCount}자
문장 길이: ${settings.sentenceLength}
문장 복잡도: ${settings.sentenceComplexity}
어휘 수준: ${settings.vocabulary}${existingCharSection}${referenceSection}

**중요: 반드시 educational_content.vocabulary를 포함해야 합니다.**
- 동화 내용과 관련된 **동물, 사물, 장소 등의 명사**를 최소 8개 이상 작성하세요.
- **반드시 명사만 사용**: 동물(개, 제비, 곰, 쥐), 사물(사과, 거울, 박, 씨앗, 집), 장소(숲, 강, 마을), 자연(나무, 꽃, 별)
- **절대 금지**: 사람 이름(흥부, 놀부, 백설공주, 신데렐라), 직업/신분(공주, 왕자, 난쟁이, 왕비), 형용사(착하다, 큰), 동사(돕다, 먹다), 감정(사랑, 기쁨)
- 각 단어는 word(영어 명사), korean(한글 명사), definition(설명), example(예문)을 모두 포함해야 합니다.`;

    // 선택한 Gemini 모델 사용
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`🤖 Using AI Model: ${geminiModel}`);
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Error:', errorText);
      
      let errorMessage = 'AI 스토리 생성 실패';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          const code = errorJson.error.code;
          const status = errorJson.error.status;
          const message = errorJson.error.message;
          
          if (code === 503 || status === 'UNAVAILABLE') {
            errorMessage = 'AI 서버가 일시적으로 과부하 상태입니다. 1-2분 후 다시 시도해주세요.';
          } else if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
            errorMessage = '⏱️ API 요청 한도 초과: Gemini API는 1분당 15개 요청 제한이 있습니다. 1-2분 후 다시 시도해주세요. (현재 너무 많은 동화책을 빠르게 생성하고 있습니다)';
          } else if (code === 403) {
            errorMessage = 'API 키 권한 오류입니다. 관리자에게 문의하세요.';
          } else {
            errorMessage = `AI 오류: ${message}`;
          }
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      
      return res.status(response.status).json({ 
        success: false,
        error: errorMessage 
      });
    }

    const data = await response.json();
    
    // 에러 응답 체크
    if (data.error) {
      console.error('Gemini API Error:', data.error);
      throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    // 응답 구조 검증
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected Gemini response structure:', JSON.stringify(data, null, 2));
      throw new Error('Gemini API returned unexpected response structure');
    }
    
    let storyText = data.candidates[0].content.parts[0].text;
    
    // JSON 추출
    storyText = storyText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let storybook;
    try {
      storybook = JSON.parse(storyText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Failed to parse text:', storyText.substring(0, 1000) + '...');
      
      // JSON이 중간에 잘렸는지 확인
      if (storyText.length > 0 && storyText.includes('"title"') && !storyText.endsWith('}')) {
        throw new Error('⚠️ AI 응답이 중간에 잘렸습니다. 이것은 보통 API 요청 한도 초과(429 에러) 후에 발생합니다. 1-2분 후 다시 시도해주세요.');
      }
      
      throw new Error('Failed to parse AI response as JSON. The AI response may be incomplete or malformed.');
    }
    
    // 그룹 캐릭터 자동 확장 (예: "일곱 난쟁이" → 난쟁이1, 난쟁이2, ...)
    const expandedCharacters = [];
    for (const char of storybook.characters) {
      // AI가 이미 숫자를 붙인 경우 감지 (예: "왕자1", "난쟁이1")
      const aiNumberedMatch = char.name.match(/^(.+?)(\d+)$/);
      
      const groupMatch = char.name.match(/^(.*?)\s*[x×X]\s*(\d+)$/); // "도둑 x 3" 형식
      const numberMatch = char.name.match(/(\d+)\s*(명|마리|개|분|분의)/); // "세 명의 도둑" 형식
      const koreanNumberMatch = char.name.match(/(일곱|여섯|다섯|네|셋|두|하나|한)\s*(명의|마리의|개의)?\s*(.+)/); // "일곱 난쟁이" 형식
      
      // 한글 숫자를 아라비아 숫자로 변환
      const koreanNumbers = {
        '하나': 1, '한': 1, '하나의': 1,
        '둘': 2, '두': 2, '두의': 2,
        '셋': 3, '세': 3, '세의': 3,
        '넷': 4, '네': 4, '네의': 4,
        '다섯': 5, '다섯의': 5,
        '여섯': 6, '여섯의': 6,
        '일곱': 7, '일곱의': 7,
        '여덟': 8, '여덟의': 8,
        '아홉': 9, '아홉의': 9,
        '열': 10, '열의': 10
      };
      
      let count = 1;
      let baseName = char.name;
      
      // AI가 이미 숫자를 붙인 경우 (예: "왕자1" → "왕자")
      if (aiNumberedMatch && !groupMatch && !numberMatch && !koreanNumberMatch) {
        const possibleBase = aiNumberedMatch[1];
        const number = parseInt(aiNumberedMatch[2]);
        
        // 같은 base name을 가진 다른 캐릭터가 있는지 확인
        const sameBaseCount = storybook.characters.filter(c => 
          c.name.startsWith(possibleBase) && c.name.match(/^.+?\d+$/)
        ).length;
        
        if (sameBaseCount > 1) {
          // 여러 개 있으면 그룹으로 판단
          baseName = possibleBase;
          // 이미 개별화되어 있으므로 그대로 추가
          expandedCharacters.push(char);
          continue;
        } else {
          // 단 1개만 있으면 숫자 제거
          console.log(`AI가 불필요하게 숫자 붙임: "${char.name}" → "${possibleBase}"`);
          expandedCharacters.push({
            name: possibleBase,
            description: char.description,
            role: char.role
          });
          continue;
        }
      }
      
      if (groupMatch) {
        // "도둑 x 3" 형식
        baseName = groupMatch[1].trim();
        count = parseInt(groupMatch[2]);
      } else if (numberMatch) {
        // "3명의 도둑" 형식
        count = parseInt(numberMatch[1]);
        baseName = char.name.replace(numberMatch[0], '').trim();
      } else if (koreanNumberMatch) {
        // "일곱 난쟁이" 형식
        const koreanNum = koreanNumberMatch[1];
        count = koreanNumbers[koreanNum] || 1;
        baseName = koreanNumberMatch[3].trim();
      }
      
      // 그룹 캐릭터인 경우 (2명 이상)
      if (count > 1 && count <= 10) {
        console.log(`그룹 캐릭터 확장: "${char.name}" → ${count}명`);
        for (let i = 1; i <= count; i++) {
          expandedCharacters.push({
            name: `${baseName}${i}`,
            description: `${char.description} (${i}번째 ${baseName})`,
            role: char.role,
            age: char.age,
            height: char.height
          });
        }
      } else {
        // 단일 캐릭터
        expandedCharacters.push(char);
      }
    }
    
    storybook.characters = expandedCharacters;
    
    // educational_content.vocabulary를 key_objects로 변환 (UI 호환성)
    if (storybook.educational_content && storybook.educational_content.vocabulary) {
      // sizeCm 값을 랜덤하게 설정 (20cm ~ 200cm)
      const getSizeCategory = (sizeCm) => {
        if (sizeCm < 50) return 'small';
        if (sizeCm < 100) return 'medium';
        return 'large';
      };
      
      storybook.key_objects = storybook.educational_content.vocabulary.map(vocab => {
        // 랜덤 sizeCm 생성 (20 ~ 200)
        const sizeCm = Math.floor(Math.random() * 180) + 20; // 20 ~ 200
        
        return {
          name: vocab.word,
          korean: vocab.korean,
          description: vocab.definition, // description 필드 추가 (definition과 동일)
          definition: vocab.definition,
          example: vocab.example,
          size: getSizeCategory(sizeCm), // sizeCm에 따라 자동 결정
          sizeCm: sizeCm // 랜덤 크기
        };
      });
      console.log(`✅ Vocabulary → Key Objects 변환 완료: ${storybook.key_objects.length}개`);
    }
    
    // ID와 메타데이터 추가
    storybook.id = Date.now().toString();
    storybook.targetAge = targetAge;
    storybook.artStyle = artStyle;
    storybook.createdAt = new Date().toISOString();
    storybook.category = ''; // 카테고리 초기화 (빈 문자열)
    
    // 🎨 scene_description을 illustrationPrompt에 복사 (UI 호환성)
    if (storybook.pages && Array.isArray(storybook.pages)) {
      storybook.pages.forEach(page => {
        if (page.scene_description && !page.illustrationPrompt) {
          page.illustrationPrompt = page.scene_description;
        }
      });
      console.log(`✅ Scene descriptions → illustration prompts 복사 완료`);
    }
    
    // 다국어 번역 처리
    if (languages.length > 1 || (languages.length === 1 && languages[0] !== 'ko')) {
      console.log(`🌍 다국어 번역 시작: ${languages.join(', ')}`);
      storybook.translations = {};
      
      // 한국어 저장 (기본 언어)
      if (languages.includes('ko')) {
        storybook.translations.ko = storybook.pages.map(page => ({
          pageNumber: page.pageNumber,
          text: page.text
        }));
      }
      
      // 다른 언어로 번역
      const languageMap = {
        'en': 'English',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'es': 'Spanish',
        'fr': 'French'
      };
      
      for (const lang of languages) {
        if (lang === 'ko') continue; // 한국어는 이미 저장됨
        
        try {
          const targetLang = languageMap[lang];
          console.log(`  📝 ${targetLang} 번역 중...`);
          
          // 모든 페이지의 텍스트를 한 번에 번역
          const pagesText = storybook.pages.map((page, idx) => 
            `[PAGE ${page.pageNumber}]\n${page.text}`
          ).join('\n\n---\n\n');
          
          const translatePrompt = `Translate the following children's storybook to ${targetLang}.

**CRITICAL TRANSLATION RULES:**
1. **COMPLETE TRANSLATION**: Translate EVERY word to ${targetLang}. Do NOT mix Korean or other languages.
2. **NO MIXED LANGUAGES**: The output must be 100% in ${targetLang} only. 
   - ❌ WRONG: "개미 said with a worried look"
   - ✅ CORRECT: "The ant said with a worried look"
3. Character names: Keep proper nouns as they are (백설공주 → Snow White, 신데렐라 → Cinderella)
4. Maintain natural tone and style for children ages ${targetAge || '4-8'}
5. Keep cultural context appropriate for the target language
6. Preserve emotional nuance and storytelling rhythm
7. Adapt idioms and expressions to be culturally relevant
8. Maintain the same reading level and vocabulary complexity

**STORYBOOK TITLE:**
${title}

**THEME:**
${storybook.theme || ''}

**PAGES TO TRANSLATE:**
${pagesText}

**RESPOND IN THIS EXACT JSON FORMAT:**
{
  "translatedPages": [
    {
      "pageNumber": 1,
      "text": "translated text for page 1 (100% in ${targetLang})"
    },
    {
      "pageNumber": 2,
      "text": "translated text for page 2 (100% in ${targetLang})"
    }
  ]
}

**CRITICAL:** 
- Respond ONLY with valid JSON. No markdown, no explanation, just pure JSON.
- Every translated text must be 100% in ${targetLang}. NO mixed languages.`;

          // 사용자가 선택한 모델 또는 기본 모델 사용
          const translateModel = geminiModel || 'gemini-2.5-flash';
          console.log(`  🤖 번역 모델: ${translateModel}`);
          
          const translateResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${translateModel}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: translatePrompt }] }],
                generationConfig: {
                  temperature: 0.4,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192
                }
              })
            }
          );
          
          if (!translateResponse.ok) {
            throw new Error(`Translation API failed: ${translateResponse.status}`);
          }
          
          const translateData = await translateResponse.json();
          let translationText = translateData.candidates[0].content.parts[0].text;
          
          // JSON 추출
          translationText = translationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const translationResult = JSON.parse(translationText);
          
          // 번역된 페이지 저장
          storybook.translations[lang] = translationResult.translatedPages;
          
          console.log(`  ✅ ${targetLang} 번역 완료: ${translationResult.translatedPages.length}페이지`);
          
        } catch (translateError) {
          console.error(`  ❌ ${lang} 번역 실패:`, translateError.message);
          // 번역 실패 시 원본 텍스트 사용
          storybook.translations[lang] = storybook.pages.map(page => ({
            pageNumber: page.pageNumber,
            text: page.text + ` (번역 실패: 원본)`
          }));
        }
      }
      
      console.log(`✅ 다국어 번역 완료: ${Object.keys(storybook.translations).join(', ')}`);
    }
    
    // R2에 동화책 JSON 저장
    try {
      const jsonFilename = `storybook-${storybook.id}.json`;
      const r2JsonUrl = await uploadJSONToR2(storybook, jsonFilename);
      storybook.r2JsonUrl = r2JsonUrl;
      console.log(`✅ Storybook JSON saved to R2: ${r2JsonUrl}`);
      
      // 인덱스 업데이트
      console.log(`📝 [INDEX] Updating index after storybook generation`);
      await updateStorybooksIndex(storybook);
      console.log(`✅ [INDEX] Index update completed after generation`);
    } catch (error) {
      console.error('⚠️ Failed to save storybook JSON to R2:', error);
      // JSON 저장 실패해도 계속 진행 (이미지는 저장됨)
    }
    
    res.json({
      success: true,
      storybook
    });

  } catch (error) {
    console.error('Storybook generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: '스토리 생성 실패: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 2. 캐릭터 레퍼런스 이미지 생성
app.post('/api/generate-character-image', requireAPIKey, async (req, res) => {
  try {
    const { character, artStyle, referenceImages = [], settings = {}, storybookId = '', storybookTitle = '' } = req.body;
    
    // 설정값 기본값
    const aspectRatio = settings.aspectRatio || '16:9';
    const enforceNoText = settings.enforceNoText !== false;
    const additionalPrompt = settings.additionalPrompt || '';
    const modelName = settings.characterModel || 'gemini-3-pro-image-preview';  // 캐릭터 이미지 생성 모델
    
    console.log('🤖 Character model:', modelName);
    console.log('📸 Reference images:', referenceImages.length, '개');
    
    // character.description을 영어로 번역 (한글인 경우)
    let characterDescriptionEn = character.description;
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(character.description)) {
      // 한글이 포함되어 있으면 번역
      console.log('Translating character description to English...');
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const translateResponse = await fetch(translateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Translate the following Korean character description to English. ONLY translate the character's physical appearance, personality, and features. DO NOT add any art style, rendering technique, or visual style descriptions:\n\n${character.description}` 
            }] 
          }]
        })
      });
      
      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        if (translateData.candidates && 
            translateData.candidates[0] && 
            translateData.candidates[0].content && 
            translateData.candidates[0].content.parts && 
            translateData.candidates[0].content.parts[0]) {
          characterDescriptionEn = translateData.candidates[0].content.parts[0].text.trim();
          console.log('Translated character description:', characterDescriptionEn);
        } else {
          console.warn('Translation response structure unexpected, using original description');
          characterDescriptionEn = character.description;
        }
      } else {
        console.warn('Translation failed, using original description');
        characterDescriptionEn = character.description;
      }
    }
    
    // 텍스트 제거 강조
    const noTextPrompt = enforceNoText ? 
      '\n\n**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, captions, titles, or character names in the image. Absolutely NO TEXT of any kind. Pure illustration only.' : 
      '\n\n**IMPORTANT:** Do NOT include any text, labels, words, or letters in the image. No text overlays, no character names, no captions. Pure illustration only.';
    
    // 참조 이미지 안내
    const referencePrompt = referenceImages.length > 0 ? 
      `\n\n**🔍 REFERENCE IMAGE PROVIDED:**
A reference image is attached showing the current appearance of this character.
- **IMPORTANT:** Use this reference image to maintain visual consistency
- Keep the same overall look, proportions, and key features as shown in the reference
- Apply the art style specified above while preserving the character's identity from the reference
- The reference shows the character you should recreate in the specified art style` : '';
    
    const prompt = `Create a professional character design reference sheet for a children's storybook character. 

**🎨 CRITICAL - ART STYLE (HIGHEST PRIORITY):**
${artStyle}

**⚠️ MANDATORY:** You MUST follow the art style specifications above EXACTLY. This includes:
- Exact color palette (muted blue/gray/charcoal if specified)
- Exact texture and medium (watercolor, gouache, textured paper if specified)
- Exact atmosphere and mood (moody, whimsical, etc. if specified)
- Exact rendering technique (soft washes, dry-brush, layered look if specified)
- Exact decorative patterns and visual elements (dots, scales, grain if specified)
DO NOT deviate from the art style. DO NOT use a different color palette. DO NOT use a different rendering technique.

**Character Description:** ${characterDescriptionEn}

${character.age ? `**Character Age:** ${character.age}` : ''}

**Image Aspect Ratio:** ${aspectRatio}

**Layout:** Generate a single image showing the character in multiple views and expressions:
- Front view (center, main pose)
- Side view (left side)  
- 3/4 view (right side)
- Three facial expressions at the bottom: happy, surprised, and neutral

**Background:** Clean white background suitable for character reference, or use the background style specified in the art style above (e.g., textured paper).

**Quality:** Follow the art style specifications at the top with ABSOLUTE PRECISION. The character should have a warm, friendly, and appealing appearance suitable for young children aged 4-8 years. Every visual aspect must match the specified art style perfectly.

**Composition:** Arrange all views in a single cohesive character sheet layout that clearly shows the character's design from different angles. Apply the art style consistently across all views.
${referencePrompt}
${noTextPrompt}
${additionalPrompt ? '\n\n**Additional Requirements:** ' + additionalPrompt : ''}

🚨 FINAL REMINDER: The art style at the top of this prompt is MANDATORY and NON-NEGOTIABLE. Follow it EXACTLY.`;
    
    console.log('🎨 Generating character image with settings:', { modelName, aspectRatio, enforceNoText, hasReference: referenceImages.length > 0 });

    const imageUrl = await generateImage(prompt, referenceImages, 0, 3, modelName);
    
    // R2에 업로드 - 통일된 파일명 규칙
    const timestamp = Date.now();
    const safeStorybookId = storybookId || 'unknown';
    const safeStorybookTitle = (storybookTitle || 'untitled').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const safeCharacterName = character.name.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const filename = `${safeStorybookId}-${safeStorybookTitle}-character-${safeCharacterName}-${timestamp}.png`;
    const r2Url = await uploadImageToR2(imageUrl, filename);
    
    res.json({
      success: true,
      imageUrl: r2Url, // R2 URL 반환
      originalUrl: imageUrl, // 원본 URL (백업용)
      prompt
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: '이미지 생성 실패: ' + error.message
    });
  }
});

// 3. 페이지 삽화 생성 (캐릭터 레퍼런스 이미지 참조)
app.post('/api/generate-illustration', requireAPIKey, async (req, res) => {
  try {
    const { page, artStyle, characterReferences, settings = {}, editNote = '', previousPages = [], storybookId = '', storybookTitle = '' } = req.body;
    
    // 설정값 기본값
    const aspectRatio = settings.aspectRatio || '16:9';
    const enforceNoText = settings.enforceNoText !== false;
    const enforceCharacterConsistency = settings.enforceCharacterConsistency !== false;
    const additionalPrompt = settings.additionalPrompt || '';
    const modelName = settings.illustrationModel || 'gemini-3-pro-image-preview';  // 삽화 이미지 생성 모델
    
    console.log('🤖 Illustration model:', modelName);
    
    // editNote를 영어로 번역 (한글인 경우)
    let editNoteEn = '';
    if (editNote && editNote.trim()) {
      if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(editNote)) {
        // 한글이 포함되어 있으면 번역
        console.log('Translating edit note to English...');
        const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const translateResponse = await fetch(translateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `Translate the following Korean edit note for image modification to English:\n\n${editNote}` 
              }] 
            }]
          })
        });
        
        if (translateResponse.ok) {
          const translateData = await translateResponse.json();
          if (translateData.candidates && 
              translateData.candidates[0] && 
              translateData.candidates[0].content && 
              translateData.candidates[0].content.parts && 
              translateData.candidates[0].content.parts[0]) {
            editNoteEn = translateData.candidates[0].content.parts[0].text.trim();
            console.log('Translated edit note:', editNoteEn);
          } else {
            console.warn('Translation response structure unexpected, using original edit note');
            editNoteEn = editNote;
          }
        } else {
          console.warn('Translation failed, using original edit note');
          editNoteEn = editNote;
        }
      } else {
        editNoteEn = editNote;
      }
    }
    
    // scene_description을 영어로 번역 (한글인 경우)
    let sceneDescriptionEn = page.scene_description;
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(page.scene_description)) {
      // 한글이 포함되어 있으면 번역
      console.log('Translating scene description to English...');
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const translateResponse = await fetch(translateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Translate the following Korean scene description to English for image generation. Keep it detailed and visual:\n\n${page.scene_description}` 
            }] 
          }]
        })
      });
      
      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        if (translateData.candidates && 
            translateData.candidates[0] && 
            translateData.candidates[0].content && 
            translateData.candidates[0].content.parts && 
            translateData.candidates[0].content.parts[0]) {
          sceneDescriptionEn = translateData.candidates[0].content.parts[0].text.trim();
          console.log('Translated scene description:', sceneDescriptionEn);
        } else {
          console.warn('Translation response structure unexpected, using original description');
          sceneDescriptionEn = page.scene_description;
        }
      } else {
        console.warn('Translation failed, using original description');
        sceneDescriptionEn = page.scene_description;
      }
    }
    
    // 캐릭터 레퍼런스 이미지 수집
    const referenceImages = [];
    let characterInfo = '';
    
    console.log(`📸 Received ${characterReferences ? characterReferences.length : 0} character references`);
    if (characterReferences && characterReferences.length > 0) {
      console.log(`🔍 First reference type: ${typeof characterReferences[0]}`);
      if (typeof characterReferences[0] === 'string') {
        console.log(`📝 Reference is URL array`);
      } else {
        console.log(`📝 Reference is character object array`);
      }
    }
    
    if (characterReferences && characterReferences.length > 0) {
      const consistencyLevel = enforceCharacterConsistency ? 
        '\n\n**🎯 Character Consistency - ABSOLUTE CRITICAL REQUIREMENT 🎯:**\nThe characters in this scene MUST match EXACTLY the appearance shown in the reference images with PIXEL-PERFECT accuracy.\nThis is NOT optional - this is MANDATORY.\n\n' :
        '\n\n**🎯 Character Consistency - MANDATORY REQUIREMENT 🎯:**\nThe characters in this scene MUST match the reference images exactly.\n\n';
      
      characterInfo = consistencyLevel;
      
      characterReferences.forEach((charOrUrl, index) => {
        // URL 배열 또는 캐릭터 객체 배열 모두 처리
        const imageUrl = typeof charOrUrl === 'string' ? charOrUrl : charOrUrl.referenceImage;
        const charName = typeof charOrUrl === 'string' ? `Character ${index + 1}` : charOrUrl.name;
        const charDesc = typeof charOrUrl === 'string' ? '' : charOrUrl.description;
        
        if (imageUrl) {
          referenceImages.push(imageUrl);
          if (enforceCharacterConsistency) {
            characterInfo += `**Reference Image ${index + 1} - ${charName}:**
COPY THIS CHARACTER WITH PIXEL-PERFECT ACCURACY:
- Face: EXACT same facial features, eye shape, eye color, nose, mouth
- Hair: EXACT same hairstyle, hair color, hair length
- Clothing: EXACT same outfit colors, style, patterns, accessories
- Body: EXACT same body proportions, height, build
- Skin tone: EXACT same skin color and texture
- EVERY SINGLE DETAIL must match the reference image

**⚠️ CRITICAL - CLOTHING CONSISTENCY:**
DO NOT change the character's clothing/outfit between pages unless the story explicitly mentions a costume change.
If the reference shows a blue dress, it MUST be blue in ALL pages.
If the reference shows a red cape, it MUST be red in ALL pages.
Keep the EXACT SAME clothing throughout the story.\n\n`;
          } else {
            characterInfo += `**Reference Image ${index + 1} - ${charName}:**
Match this character's appearance: ${charDesc}
**IMPORTANT:** Keep the same clothing/outfit in all scenes.\n\n`;
          }
        }
      });
      
      if (enforceCharacterConsistency) {
        characterInfo += '\n**🚨 ABSOLUTE REQUIREMENT - NO EXCEPTIONS 🚨:**\nLook at EVERY reference image above and recreate EACH character with PIXEL-PERFECT accuracy.\nSame face, same hair, same clothing, same colors, same features, same proportions, same EVERYTHING.\nDo NOT deviate from the reference images by even 0.1%.\nDo NOT change clothing colors, styles, or patterns.\nDo NOT modify hairstyles or facial features.\nPERFECT REPLICATION REQUIRED.';
      } else {
        characterInfo += '\n**IMPORTANT REQUIREMENT:**\nMatch the reference images carefully, especially clothing and facial features.\nKeep the same outfit colors and styles throughout the story.';
      }
    }
    
    // 구조화된 장면 설명 구성 (한글을 영어로 번역)
    let sceneDetails = '';
    if (page.scene_structure) {
      // scene_structure도 영어로 번역
      const structureText = `Characters & Actions: ${page.scene_structure.characters}\nBackground Setting: ${page.scene_structure.background}\nMood & Atmosphere: ${page.scene_structure.atmosphere}`;
      
      console.log('Translating scene structure to English...');
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const translateResponse = await fetch(translateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Translate the following Korean scene structure to English for image generation:\n\n${structureText}` 
            }] 
          }]
        })
      });
      
      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        if (translateData.candidates && 
            translateData.candidates[0] && 
            translateData.candidates[0].content && 
            translateData.candidates[0].content.parts && 
            translateData.candidates[0].content.parts[0]) {
          const translated = translateData.candidates[0].content.parts[0].text.trim();
          sceneDetails = `\n\n**Scene Structure:**\n${translated}`;
          console.log('Translated scene structure:', translated);
        } else {
          console.warn('Translation response structure unexpected, using original structure');
          sceneDetails = `\n\n**Scene Structure:**
- **Characters & Actions:** ${page.scene_structure.characters}
- **Background Setting:** ${page.scene_structure.background}  
- **Mood & Atmosphere:** ${page.scene_structure.atmosphere}${page.scene_structure.key_objects ? `\n- **Key Objects:** ${page.scene_structure.key_objects}` : ''}${page.scene_structure.spatial_layout ? `\n- **Spatial Layout:** ${page.scene_structure.spatial_layout}` : ''}`;
        }
      } else {
        sceneDetails = `\n\n**Scene Structure:**
- **Characters & Actions:** ${page.scene_structure.characters}
- **Background Setting:** ${page.scene_structure.background}  
- **Mood & Atmosphere:** ${page.scene_structure.atmosphere}${page.scene_structure.key_objects ? `\n- **Key Objects:** ${page.scene_structure.key_objects}` : ''}${page.scene_structure.spatial_layout ? `\n- **Spatial Layout:** ${page.scene_structure.spatial_layout}` : ''}`;
      }
    }
    
    // 전체 스토리 맥락 구성 (이전 페이지들)
    let storyContext = '';
    let objectConsistencyNote = '';
    let spatialConsistencyNote = '';
    
    if (previousPages && previousPages.length > 0) {
      console.log(`Including story context from ${previousPages.length} previous pages`);
      const previousTexts = previousPages
        .filter(p => p.pageNumber < page.pageNumber)
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map(p => `Page ${p.pageNumber}: ${p.text}`)
        .join('\n');
      
      // 바로 이전 페이지의 spatial_layout 참조 (공간적 일관성 유지)
      const previousPage = previousPages
        .filter(p => p.pageNumber === page.pageNumber - 1)
        .sort((a, b) => b.pageNumber - a.pageNumber)[0];
      
      if (previousPage && previousPage.scene_structure && previousPage.scene_structure.spatial_layout) {
        const previousLayout = previousPage.scene_structure.spatial_layout;
        if (previousLayout.trim() && page.scene_structure && page.scene_structure.spatial_layout) {
          spatialConsistencyNote = `\n\n**⭐ CRITICAL - SPATIAL CONSISTENCY ⭐:**
The previous page (Page ${previousPage.pageNumber}) had this character layout:
"${previousLayout}"

The current page (Page ${page.pageNumber}) has this layout:
"${page.scene_structure.spatial_layout}"

**ABSOLUTE REQUIREMENT - MAINTAIN SPATIAL CONSISTENCY:**
- If the same characters appear in consecutive pages, they MUST maintain their left-right positions
- For example: If "Red Riding Hood on left, Wolf on right" in previous page, they must STAY "Red Riding Hood on left, Wolf on right" in current page
- DO NOT flip/mirror the positions unless there is a clear scene change or character movement
- Sudden left-right reversal confuses readers and breaks visual continuity
- Keep characters in their established spatial positions throughout continuous scenes`;
        }
      }
      
      // 처음 등장한 key_objects를 찾아서 참조 (일관성 유지)
      // 현재 페이지에 key_objects가 있으면, 이전 페이지들에서 처음 등장한 설명을 찾음
      if (page.scene_structure && page.scene_structure.key_objects && page.scene_structure.key_objects.trim()) {
        // 현재 페이지의 key_objects에서 사물 이름 추출 (예: "마법 램프", "유리 구두" 등)
        const currentObjects = page.scene_structure.key_objects;
        
        // 이전 페이지들을 순서대로 순회하며 처음 등장한 key_objects 찾기
        const sortedPreviousPages = previousPages
          .filter(p => p.pageNumber < page.pageNumber && p.scene_structure && p.scene_structure.key_objects)
          .sort((a, b) => a.pageNumber - b.pageNumber);
        
        if (sortedPreviousPages.length > 0) {
          // 처음 등장한 페이지의 key_objects
          const firstAppearance = sortedPreviousPages[0];
          const firstObjects = firstAppearance.scene_structure.key_objects;
          
          if (firstObjects.trim()) {
            objectConsistencyNote = `\n\n**⭐ CRITICAL - OBJECT CONSISTENCY ⭐:**
These key objects FIRST appeared on Page ${firstAppearance.pageNumber} with this description:
${firstObjects}

**ABSOLUTE REQUIREMENT:** The objects in the current page MUST look EXACTLY THE SAME as when they first appeared on Page ${firstAppearance.pageNumber}. Use the EXACT same:
- Colors (same color tones and shades)
- Shapes (same geometric forms and proportions)
- Materials (same textures and finishes)
- Decorations (same patterns and ornaments)
- Size and proportions (same relative sizes)

For example:
- If a "copper-colored lamp with curved handle and Arab patterns" appeared first, it must ALWAYS be copper-colored with curved handle and Arab patterns
- If a "transparent crystal shoe with delicate heel" appeared first, it must ALWAYS be transparent crystal with delicate heel
- Keep PIXEL-PERFECT consistency with the first appearance to maintain story continuity`;
          }
        }
      }
      
      if (previousTexts) {
        storyContext = `\n\n**STORY CONTEXT - What happened before this scene:**
${previousTexts}

**CURRENT PAGE ${page.pageNumber}:** ${page.text}

**CRITICAL:** The illustration MUST match the current page state. For example, if a character transformed (like mermaid becoming human), they MUST appear in their NEW form on the current page, not their old form.${objectConsistencyNote}${spatialConsistencyNote}`;
      }
    }
    
    // 텍스트 제거 강조 (기본적으로도 강력하게 적용)
    const noTextPrompt = enforceNoText ? 
      '\n\n**🚫 CRITICAL - ABSOLUTELY NO TEXT 🚫:**\nDo NOT include ANY text, labels, words, letters, captions, titles, speech bubbles, dialogue boxes, or text overlays in the image.\nAbsolutely NO TEXT of any kind - not even a single letter or number.\nNO VISUAL TEXT ELEMENTS WHATSOEVER.\nPure illustration only with zero text content.' : 
      '\n\n**🚫 IMPORTANT - NO TEXT 🚫:**\nDo NOT include any text, labels, words, letters, captions, titles, speech bubbles, dialogue boxes, or text overlays in the image.\nNo visual text of any kind.\nPure illustration only.';
    
    const prompt = `🎨 ART STYLE (CRITICAL - READ THIS FIRST):
${artStyle}

⚠️ MANDATORY: You MUST follow the art style specification above EXACTLY. This is the MOST IMPORTANT requirement.
Do NOT use any other style. Do NOT add your own interpretation. 
STRICT ADHERENCE TO THE SPECIFIED ART STYLE IS REQUIRED.

${storyContext}

**Main Scene Description:** ${sceneDescriptionEn}
${sceneDetails}
${characterInfo}
${editNoteEn ? `\n\n**Important Modification Request:** ${editNoteEn}` : ''}

**Image Aspect Ratio:** ${aspectRatio}

**Composition:** Create a scene that captures the emotion and action of the story moment. Use a horizontal composition suitable for a storybook spread.

**Lighting & Atmosphere:** ${page.scene_structure?.background?.includes('밤') || page.scene_structure?.background?.includes('night') || page.scene_structure?.background?.includes('달빛') || page.scene_structure?.background?.includes('moonlight') || page.scene_structure?.background?.includes('저녁') || page.scene_structure?.background?.includes('evening') ? 'NIGHT SCENE: Dark sky with stars or moonlight. Use cool blue/purple tones for nighttime atmosphere. Include visible moon or stars if outdoors. Indoor scenes should have candles, lanterns, or dim warm lighting.' : 'DAY SCENE: Bright, clear daylight with warm sunlight. Use bright yellows and warm colors for daytime atmosphere. Show clear blue sky if outdoors. Indoor scenes should have natural sunlight streaming through windows.'} The scene should feel magical yet safe and welcoming for young children.

**Background:** Detailed but not overwhelming - the focus should remain on the characters and their actions while providing a rich, immersive environment.
${noTextPrompt}
${additionalPrompt ? '\n\n**Additional Requirements:** ' + additionalPrompt : ''}

🎯 QUALITY REQUIREMENT:
This illustration is for a children's storybook. The image MUST:
- Be engaging and age-appropriate for children aged 4-8 years
- Follow the exact texture, brush strokes, color palette, shading technique specified in the art style above
- Be emotionally engaging and visually captivating while maintaining a child-friendly, whimsical tone
- Look like it was created by the same illustrator using the same technique and materials

🚨 FINAL REMINDER: USE THE EXACT ART STYLE SPECIFIED AT THE TOP. NO DEVIATIONS.`;
    
    console.log('🎨 Generating illustration with', referenceImages.length, 'reference images');
    console.log('⚙️ Settings:', { modelName, aspectRatio, enforceNoText, enforceCharacterConsistency });

    const imageUrl = await generateImage(prompt, referenceImages, 0, 3, modelName);
    
    // R2에 업로드 - 통일된 파일명 규칙
    const timestamp = Date.now();
    const safeStorybookId = storybookId || 'unknown';
    const safeStorybookTitle = (storybookTitle || 'untitled').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const pageNum = String(page.pageNumber).padStart(2, '0');
    const filename = `${safeStorybookId}-${safeStorybookTitle}-illustration-page${pageNum}-${timestamp}.png`;
    const r2Url = await uploadImageToR2(imageUrl, filename);
    
    res.json({
      success: true,
      imageUrl: r2Url, // R2 URL 반환
      originalUrl: imageUrl, // 원본 URL (백업용)
      prompt
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: '이미지 생성 실패: ' + error.message
    });
  }
});

// 4. 단어 학습용 이미지 생성 (캐릭터와 사물 일관성 강화)
app.post('/api/generate-vocabulary-images', requireAPIKey, async (req, res) => {
  try {
    const { vocabulary, vocabularyItems, artStyle, settings = {}, storybook = {} } = req.body;
    
    // vocabularyItems 또는 vocabulary 사용 (클라이언트 호환성)
    const vocabList = vocabularyItems || vocabulary;
    
    if (!vocabList || vocabList.length === 0) {
      return res.status(400).json({ error: '단어 목록이 필요합니다.' });
    }
    
    const aspectRatio = settings.aspectRatio || '1:1';
    const enforceNoText = settings.enforceNoText !== false;
    const additionalPrompt = settings.additionalPrompt || '';
    
    // 동화책의 캐릭터와 key_objects 정보 수집
    const characters = storybook.characters || [];
    const allKeyObjects = [];
    
    // 모든 페이지에서 key_objects 수집
    if (storybook.pages && Array.isArray(storybook.pages)) {
      storybook.pages.forEach(page => {
        if (page.scene_structure && page.scene_structure.key_objects) {
          allKeyObjects.push(page.scene_structure.key_objects);
        }
      });
    }
    
    const images = [];
    
    for (const vocabItem of vocabList) {
      try {
        // vocabItem이 객체인지 문자열인지 확인
        const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
        const korean = typeof vocabItem === 'object' ? vocabItem.korean : '';
        
        const noTextPrompt = enforceNoText ? 
          '\n\n**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, or captions in the image. Absolutely NO TEXT of any kind. Pure illustration only.' :
          '\n\n**IMPORTANT:** Do NOT include any text, labels, words, or letters in the image.';
        
        // 이 단어가 캐릭터인지 확인
        const matchingCharacter = characters.find(char => 
          char.name && (
            char.name.toLowerCase().includes(korean.toLowerCase()) ||
            korean.toLowerCase().includes(char.name.toLowerCase()) ||
            char.role === '주인공' ||
            char.role === '조력자' ||
            char.role === '악역'
          )
        );
        
        // 이 단어가 주요 사물인지 확인
        const isKeyObject = allKeyObjects.some(objDesc => 
          objDesc && objDesc.toLowerCase().includes(korean.toLowerCase())
        );
        
        let prompt;
        let referenceImages = [];
        
        // 캐릭터인 경우 - 캐릭터 레퍼런스 이미지 사용
        if (matchingCharacter) {
          console.log(`📚 Character found for "${word}" (${korean}): ${matchingCharacter.name}`);
          
          if (matchingCharacter.referenceImage) {
            referenceImages.push(matchingCharacter.referenceImage);
            console.log(`  🎨 Using character reference image`);
          }
          
          prompt = `Create a simple, clear, educational illustration for a children's vocabulary learning card showing a character.

**Character to Illustrate:** ${word}${korean ? ` (${korean})` : ''}

**CRITICAL - Character Appearance (MUST FOLLOW EXACTLY):**
${matchingCharacter.description}

**Character Role:** ${matchingCharacter.role}

**Art Style:** ${artStyle}

**Image Aspect Ratio:** ${aspectRatio}

**Requirements:**
- Show the character in a simple, clear, frontal pose
- Clean white or simple background (no complex scenes)
- **EXACT appearance matching the character description above**
- **Follow the art style specifications precisely** - same texture, brush strokes, color palette, and artistic technique
- Child-friendly, appealing design
- Age-appropriate for 4-8 years old
- Focus on the character's distinctive features
- Make it easy for children to recognize this character
- Maintain visual consistency with the storybook's art style
${noTextPrompt}
${additionalPrompt ? '\n\n**Additional Requirements:** ' + additionalPrompt : ''}

${matchingCharacter.referenceImage ? '**IMPORTANT:** Use the provided reference image to maintain EXACT visual consistency with the character\'s appearance in the storybook. Match ALL visual details precisely.' : ''}

Create a single, clear character portrait that children can easily recognize.`;
        }
        // 주요 사물인 경우 - scene_structure의 key_objects 설명 활용
        else if (isKeyObject) {
          console.log(`🔑 Key object found for "${word}" (${korean})`);
          
          // key_objects에서 관련 설명 찾기
          const objectDescription = allKeyObjects.find(objDesc => 
            objDesc && objDesc.toLowerCase().includes(korean.toLowerCase())
          );
          
          prompt = `Create a simple, clear, educational illustration for a children's vocabulary learning card showing an important story object.

**Object to Illustrate:** ${word}${korean ? ` (${korean})` : ''}

**Object Description from Story:**
${objectDescription || '이 동화에서 중요한 역할을 하는 사물입니다.'}

**Art Style:** ${artStyle} style for children's book illustration. Use the EXACT same visual style, color palette, texture, and artistic technique as the storybook. Match the illustration style precisely - including brush strokes, shading technique, color saturation, and overall aesthetic. This should look like it came from the same illustrator and the same book.

**Image Aspect Ratio:** ${aspectRatio}

**Requirements:**
- Show the object clearly and simply
- Clean white background
- **Match the visual description from the story above**
- **Use the SAME art style, colors, and visual language as the storybook**
- Bright, vibrant colors consistent with the book's palette
- Child-friendly, appealing design
- Age-appropriate for 4-8 years old
- Focus on the object's distinctive features as described
- Make it visually consistent with how it appears in the storybook illustrations
- Same level of detail and rendering style as character references
${noTextPrompt}
${additionalPrompt ? '\n\n**Additional Requirements:** ' + additionalPrompt : ''}

CRITICAL: This image must be visually indistinguishable in style from the storybook's character references and page illustrations. Use identical artistic techniques, color choices, and visual treatment.`;
        }
        // 일반 단어인 경우 - 기본 프롬프트
        else {
          console.log(`📝 General word: "${word}" (${korean})`);
          
          prompt = `Create a simple, clear, educational illustration for a children's vocabulary learning card.

**Word to Illustrate:** ${word}${korean ? ` (${korean})` : ''}

**Art Style:** ${artStyle} style for children's book illustration. Use the EXACT same visual style, color palette, texture, and artistic technique as would be used in this storybook. Match the illustration style precisely - including brush strokes, shading technique, color saturation, and overall aesthetic.

**Image Aspect Ratio:** ${aspectRatio}

**Requirements:**
- Show a clear, simple representation of "${word}"
- Clean white background
- **Use the SAME art style and visual language as the storybook**
- Bright, vibrant colors consistent with the book's palette
- Child-friendly, appealing design
- Age-appropriate for 4-8 years old
- Focus on clarity and easy recognition
- The object should be a concrete, tangible noun (not abstract concepts)
- Same level of detail and rendering style as character references
${noTextPrompt}
${additionalPrompt ? '\n\n**Additional Requirements:** ' + additionalPrompt : ''}

CRITICAL: This image must be visually consistent in style with the storybook's character references and page illustrations. Use identical artistic techniques and visual treatment.`;
        }

        console.log(`Generating vocabulary image for: ${word}${korean ? ` (${korean})` : ''}`);
        const imageUrl = await generateImage(prompt, referenceImages);
        
        // R2에 업로드 - 통일된 파일명 규칙
        const timestamp = Date.now();
        const safeStorybookId = storybook.id || 'unknown';
        const safeStorybookTitle = (storybook.title || 'untitled').replace(/[^a-zA-Z0-9가-힣]/g, '');
        const safeWord = word.replace(/[^a-zA-Z0-9가-힣]/g, '');
        const filename = `${safeStorybookId}-${safeStorybookTitle}-vocabulary-${safeWord}-${timestamp}.png`;
        const r2Url = await uploadImageToR2(imageUrl, filename);
        
        images.push({
          word: word,
          korean: korean,
          imageUrl: r2Url, // R2 URL 사용
          originalUrl: imageUrl, // 원본 URL 백업
          success: true,
          isCharacter: !!matchingCharacter,
          isKeyObject: isKeyObject
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
        console.error(`Error generating image for ${word}:`, error);
        
        // 429 에러에 대한 명확한 메시지
        let errorMessage = error.message;
        if (error.message.includes('429')) {
          errorMessage = '⚠️ API 할당량 초과. 잠시 후 다시 시도해주세요. (무료 플랜: 50회/일)';
        } else if (error.message.includes('403')) {
          errorMessage = '🔐 API 키 문제. 새로운 API 키가 필요합니다.';
        }
        
        images.push({
          word: word,
          korean: typeof vocabItem === 'object' ? vocabItem.korean : '',
          imageUrl: null,
          success: false,
          error: errorMessage
        });
      }
    }
    
    res.json({
      success: true,
      results: images,  // 클라이언트가 'results'를 기대함
      images: images,   // 하위 호환성
      total: vocabList.length,
      successful: images.filter(img => img.success).length
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: '단어 이미지 생성 실패: ' + error.message
    });
  }
});

// 학습 단어 이미지 업로드 API (로컬 파일 또는 URL)
app.post('/api/upload-vocabulary-image', requireAPIKey, upload.single('image'), async (req, res) => {
  try {
    const { word, korean, imageUrl, storybookId, storybookTitle } = req.body;
    
    if (!word) {
      return res.status(400).json({ 
        success: false, 
        error: '단어(word)가 필요합니다.' 
      });
    }
    
    let uploadedUrl;
    const timestamp = Date.now();
    const safeStorybookId = storybookId || 'custom';
    const safeStorybookTitle = (storybookTitle || 'vocabulary').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const safeWord = word.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const filename = `${safeStorybookId}-${safeStorybookTitle}-vocabulary-${safeWord}-${timestamp}.png`;
    
    // 1. 로컬 파일이 업로드된 경우
    if (req.file) {
      console.log(`📤 Uploading local file for vocabulary: ${word}`);
      
      // Multer가 처리한 파일을 R2에 업로드
      const fileBuffer = req.file.buffer;
      
      // Buffer를 임시 파일로 저장
      const tempPath = `/tmp/${filename}`;
      await fs.promises.writeFile(tempPath, fileBuffer);
      
      // R2에 업로드
      uploadedUrl = await uploadImageToR2FromPath(tempPath, filename);
      
      // 임시 파일 삭제
      await fs.promises.unlink(tempPath);
      
      console.log(`✅ Local file uploaded: ${uploadedUrl}`);
    }
    // 2. URL이 제공된 경우
    else if (imageUrl) {
      console.log(`🔗 Uploading image from URL for vocabulary: ${word}`);
      
      // URL에서 이미지 다운로드 후 R2에 업로드
      uploadedUrl = await uploadImageToR2(imageUrl, filename);
      
      console.log(`✅ URL image uploaded: ${uploadedUrl}`);
    }
    else {
      return res.status(400).json({ 
        success: false, 
        error: '이미지 파일 또는 URL이 필요합니다.' 
      });
    }
    
    res.json({
      success: true,
      word: word,
      korean: korean || '',
      imageUrl: uploadedUrl,
      message: '이미지가 성공적으로 업로드되었습니다.'
    });
    
  } catch (error) {
    console.error('Error uploading vocabulary image:', error);
    res.status(500).json({ 
      success: false,
      error: '이미지 업로드 실패: ' + error.message
    });
  }
});

// 퀴즈 생성 API
app.post('/api/generate-quiz', requireAPIKey, async (req, res) => {
  try {
    const { storybook, count = 5 } = req.body;
    
    if (!storybook || !storybook.pages || !storybook.title) {
      return res.status(400).json({
        success: false,
        error: '동화책 데이터가 필요합니다.'
      });
    }
    
    console.log(`\n📝 Generating ${count} quiz questions for: ${storybook.title}`);
    
    // 스토리 텍스트 추출
    const storyText = storybook.pages.map((page, idx) => 
      `페이지 ${idx + 1}: ${page.text}`
    ).join('\n\n');
    
    // 캐릭터 정보 추출
    const characterInfo = storybook.characters ? 
      storybook.characters.map(char => `${char.name}: ${char.role}`).join(', ') : '';
    
    // Key Objects 정보 추출
    const keyObjectsInfo = storybook.key_objects && storybook.key_objects.length > 0 ?
      storybook.key_objects.map(obj => `${obj.name}: ${obj.description || ''}`).join(', ') : '';
    
    const prompt = `다음 동화책을 읽고 Key Objects(핵심 사물)를 기반으로 한 어린이 퀴즈 ${count}개를 만들어주세요.

**동화 제목:** ${storybook.title}

**캐릭터:** ${characterInfo}

**핵심 사물(Key Objects):** ${keyObjectsInfo}

**동화 내용:**
${storyText}

**퀴즈 생성 규칙:**
1. 타깃 연령: ${storybook.targetAge || '6'}세 수준
2. **반드시 Key Objects(핵심 사물)와 관련된 퀴즈를 만들어야 합니다**
3. 각 퀴즈는 다음 형식으로 작성:
   - question: 질문 (Key Object에 대한 질문)
   - options: 4개의 선택지 (배열)
   - answer: 정답 번호 (0, 1, 2, 3 중 하나)
   - explanation: 정답 설명 (Key Object와 연관지어 설명)
   - relatedKeyObject: 관련된 Key Object 이름
4. 퀴즈 유형 (Key Objects 기반):
   - 사물 식별 (이것은 무엇인가요?)
   - 사물 용도 (이것은 어디에 쓰이나요?)
   - 사물과 스토리 연결 (이 사물은 언제 등장했나요?)
   - 사물의 특징 (이 사물의 색깔/모양은?)
   - 사물의 중요성 (왜 이 사물이 중요한가요?)
5. 모든 선택지는 그럴듯해야 하지만 명확히 하나만 정답
6. 쉬운 질문부터 조금씩 어려운 질문 순서로

**JSON 형식으로만 응답하세요:**
{
  "quizzes": [
    {
      "question": "질문",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": 0,
      "explanation": "정답 설명",
      "relatedKeyObject": "Key Object 이름"
    }
  ]
}

JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });

    let quizText = response.data.candidates[0].content.parts[0].text;
    
    // JSON 추출
    quizText = quizText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const quizData = JSON.parse(quizText);
    
    console.log(`✅ Generated ${quizData.quizzes.length} quiz questions`);
    
    res.json({
      success: true,
      quizzes: quizData.quizzes,
      count: quizData.quizzes.length
    });

  } catch (error) {
    console.error('퀴즈 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: '퀴즈 생성 실패: ' + error.message
    });
  }
});

// TTS 생성 API
app.post('/api/generate-tts', requireAPIKey, async (req, res) => {
  try {
    const { text, voiceConfig, model, geminiModel, storybookId, storybookTitle, pageNumber, language } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: '텍스트가 필요합니다.'
      });
    }
    
    console.log(`\n🎙️ ========== TTS 생성 시작 ==========`);
    console.log(`📝 텍스트: "${text.substring(0, 50)}..."`);
    console.log(`🎵 클라이언트에서 받은 model 파라미터: "${model}" (voice)`);
    console.log(`📥 클라이언트에서 받은 geminiModel 파라미터: "${geminiModel}"`);
    console.log(`🔧 사용할 Gemini Model: ${geminiModel || 'gemini-2.5-flash-preview-tts'}`);
    console.log(`🌍 언어: ${language || 'ko'}`);
    console.log(`⚙️ voiceConfig: ${voiceConfig}`);
    
    // GoogleGenerativeAI 인스턴스 생성
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // TTS 모델 설정 - 클라이언트에서 받은 모델 또는 기본값
    const ttsModelName = geminiModel || "gemini-2.5-flash-preview-tts";
    
    console.log(`✅ 최종 TTS 모델: ${ttsModelName}`);
    
    const ttsModel = genAI.getGenerativeModel({ 
      model: ttsModelName
    });
    
    // 음성 이름 (기본값: Aoede - 여자)
    const voiceName = model || 'Aoede';
    
    console.log(`🎤 최종 사용 음성: "${voiceName}" ${voiceName === 'Aoede' ? '(여자 목소리)' : voiceName === 'Puck' ? '(남자 목소리)' : ''}`);
    console.log(`========================================\n`);
    
    // TTS 요청
    const result = await ttsModel.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: text }] 
      }],
      generationConfig: {
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    });
    
    // 오디오 데이터 추출
    const response = await result.response;
    
    if (response && response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'audio/wav';
            const pcmData = Buffer.from(part.inlineData.data, 'base64');
            
            console.log(`✅ TTS generated successfully (mime: ${mimeType}, PCM size: ${pcmData.length} bytes)`);
            
            // PCM을 WAV로 변환
            let audioBuffer;
            if (mimeType.includes('L16') || mimeType.includes('pcm')) {
              // Extract sample rate from mime type (e.g., "audio/L16;codec=pcm;rate=24000")
              const sampleRateMatch = mimeType.match(/rate=(\d+)/);
              const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;
              
              console.log(`🔄 Converting PCM to WAV (sample rate: ${sampleRate}Hz)`);
              
              // WAV 헤더 생성
              const numChannels = 1; // Mono
              const bitsPerSample = 16;
              const byteRate = sampleRate * numChannels * bitsPerSample / 8;
              const blockAlign = numChannels * bitsPerSample / 8;
              const dataSize = pcmData.length;
              const fileSize = 36 + dataSize;
              
              const wavHeader = Buffer.alloc(44);
              
              // RIFF chunk descriptor
              wavHeader.write('RIFF', 0);
              wavHeader.writeUInt32LE(fileSize, 4);
              wavHeader.write('WAVE', 8);
              
              // fmt sub-chunk
              wavHeader.write('fmt ', 12);
              wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
              wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
              wavHeader.writeUInt16LE(numChannels, 22);
              wavHeader.writeUInt32LE(sampleRate, 24);
              wavHeader.writeUInt32LE(byteRate, 28);
              wavHeader.writeUInt16LE(blockAlign, 32);
              wavHeader.writeUInt16LE(bitsPerSample, 34);
              
              // data sub-chunk
              wavHeader.write('data', 36);
              wavHeader.writeUInt32LE(dataSize, 40);
              
              // WAV 파일 = 헤더 + PCM 데이터
              audioBuffer = Buffer.concat([wavHeader, pcmData]);
              console.log(`✅ WAV conversion complete (total size: ${audioBuffer.length} bytes)`);
            } else {
              audioBuffer = pcmData;
            }
            
            // R2에 업로드 (storybookId와 pageNumber가 있는 경우)
            let audioUrl;
            if (storybookId && pageNumber && language) {
              const timestamp = Date.now();
              const safeLang = language || 'ko';
              const safeTitle = (storybookTitle || 'storybook').replace(/[^a-zA-Z0-9가-힣]/g, '-');
              const filename = `${storybookId}-${safeTitle}-tts-page${pageNumber}-${safeLang}-${timestamp}.wav`;
              
              console.log(`📤 Uploading TTS to R2: ${filename}`);
              
              const { PutObjectCommand } = await import('@aws-sdk/client-s3');
              const putCommand = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: filename,
                Body: audioBuffer,
                ContentType: 'audio/wav'
              });
              
              await r2Client.send(putCommand);
              audioUrl = `${R2_PUBLIC_URL}/${filename}`;
              console.log(`✅ TTS uploaded to R2: ${audioUrl}`);
            } else {
              // storybookId가 없으면 base64로 반환 (하위 호환성)
              const base64Audio = audioBuffer.toString('base64');
              audioUrl = `data:audio/wav;base64,${base64Audio}`;
              console.log(`⚠️ TTS returned as base64 (no storybookId provided)`);
            }
            
            return res.json({
              success: true,
              audioUrl: audioUrl,
              mimeType: 'audio/wav'
            });
          }
        }
      }
    }
    
    // 오디오를 찾지 못한 경우
    console.error('❌ Gemini TTS API에서 오디오를 찾을 수 없습니다.');
    throw new Error('Gemini TTS API에서 오디오를 찾을 수 없습니다.');
    
  } catch (error) {
    console.error('TTS 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'TTS 생성 실패: ' + error.message
    });
  }
});

// 동화책 번역 API
app.post('/api/translate-storybook', requireAPIKey, async (req, res) => {
  try {
    const { storybook, targetLanguage, geminiModel } = req.body;
    
    if (!storybook || !storybook.pages || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: '동화책 데이터와 타겟 언어가 필요합니다.'
      });
    }
    
    const languageMap = {
      'en': 'English',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'vi': 'Vietnamese',
      'th': 'Thai'
    };
    
    const targetLang = languageMap[targetLanguage] || 'English';
    
    console.log(`\n🌍 Translating storybook to ${targetLang}`);
    console.log(`Pages to translate: ${storybook.pages.length}`);
    
    // 5페이지씩 나눠서 번역 (타임아웃 방지)
    const CHUNK_SIZE = 5;
    const allTranslatedPages = [];
    let translatedTitle = storybook.title;
    let translatedTheme = storybook.theme || '';
    
    for (let i = 0; i < storybook.pages.length; i += CHUNK_SIZE) {
      const chunk = storybook.pages.slice(i, i + CHUNK_SIZE);
      console.log(`📄 Translating pages ${i + 1} to ${Math.min(i + CHUNK_SIZE, storybook.pages.length)}...`);
      
      const pagesText = chunk.map((page) => 
        `[PAGE ${page.pageNumber}]\n${page.text}`
      ).join('\n\n---\n\n');
      
      // 첫 번째 청크에서만 제목과 주제 번역
      const titleThemeSection = i === 0 ? `
**STORYBOOK TITLE:**
${storybook.title}

**THEME:**
${storybook.theme || ''}

Translate the title and theme as well.
` : '';
      
      // 중국어 번역 시 특별 규칙
      const isChineseTranslation = targetLanguage === 'zh';
      
      const characterNameRule = isChineseTranslation 
        ? '4. Translate ALL text including character names to natural Chinese - use appropriate Chinese names or transliterate Korean names into Chinese characters (汉字)'
        : '4. Keep character names as they are (do not translate proper nouns unless it\'s Chinese translation)';
      
      const prompt = `Translate the following children's storybook pages to ${targetLang}.

**IMPORTANT TRANSLATION RULES:**
1. Maintain the natural tone and style for children ages ${storybook.targetAge || '4-8'}
2. Keep cultural context appropriate for the target language
3. Preserve emotional nuance and storytelling rhythm
${characterNameRule}
5. Adapt idioms and expressions to be culturally relevant
6. Maintain the same reading level and vocabulary complexity
7. The ENTIRE output MUST be in ${targetLang} only - no mixing with Korean or other languages

${titleThemeSection}

**PAGES TO TRANSLATE:**
${pagesText}

**RESPOND IN THIS EXACT JSON FORMAT:**
${i === 0 ? `{
  "translatedTitle": "translated title in ${targetLang}",
  "translatedTheme": "translated theme in ${targetLang}",
  "translatedPages": [
    {
      "pageNumber": 1,
      "text": "translated text for page 1 in pure ${targetLang}"
    }
  ]
}` : `{
  "translatedPages": [
    {
      "pageNumber": ${chunk[0].pageNumber},
      "text": "translated text in pure ${targetLang}"
    }
  ]
}`}

**CRITICAL:** 
- Respond ONLY with valid JSON. No markdown, no explanation, just pure JSON.
- ALL translated text MUST be in ${targetLang.toUpperCase()} only - absolutely NO Korean or mixed languages.`;

      const translateModel = geminiModel || 'gemini-2.5-flash';
      console.log(`  🤖 번역 모델: ${translateModel} (청크 ${i + 1}/${numChunks})`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${translateModel}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.4,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      let translationText = data.candidates[0].content.parts[0].text;
      
      // JSON 추출
      translationText = translationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const translationData = JSON.parse(translationText);
      
      // 첫 번째 청크에서 제목과 주제 저장
      if (i === 0 && translationData.translatedTitle) {
        translatedTitle = translationData.translatedTitle;
        translatedTheme = translationData.translatedTheme || storybook.theme;
      }
      
      // 번역된 페이지 추가
      allTranslatedPages.push(...translationData.translatedPages);
      
      console.log(`✅ Chunk ${Math.floor(i / CHUNK_SIZE) + 1} complete (${translationData.translatedPages.length} pages)`);
    }
    
    console.log(`✅ Translation complete for all ${allTranslatedPages.length} pages`);
    
    // translatedPages를 텍스트 배열로 변환 (pageNumber 순서대로)
    const translatedPagesText = allTranslatedPages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(p => p.text);
    
    res.json({
      success: true,
      translatedTitle: translatedTitle,
      translatedTheme: translatedTheme,
      translatedPages: translatedPagesText  // 텍스트 배열로 반환
    });

  } catch (error) {
    console.error('번역 실패:', error);
    res.status(500).json({
      success: false,
      error: '번역 실패: ' + error.message
    });
  }
});

// 단일 페이지 번역 API
app.post('/api/translate-page', requireAPIKey, async (req, res) => {
  try {
    const { text, targetLanguage, context } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: '텍스트와 타겟 언어가 필요합니다.'
      });
    }
    
    const languageMap = {
      'en': 'English',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'vi': 'Vietnamese',
      'th': 'Thai'
    };
    
    const targetLang = languageMap[targetLanguage] || 'English';
    
    console.log(`\n🌍 Translating single page to ${targetLang}`);
    
    const contextInfo = context ? `
**STORY CONTEXT:**
Title: ${context.title || ''}
Theme: ${context.theme || ''}
Characters: ${context.characters || ''}
` : '';
    
    // 중국어 번역 시 특별 규칙
    const isChineseTranslation = targetLanguage === 'zh';
    
    const characterNameRule = isChineseTranslation 
      ? '4. Translate ALL text including character names to natural Chinese - use appropriate Chinese names or transliterate Korean names into Chinese characters (汉字)'
      : '4. Keep character names as they are (do not translate proper nouns unless it\'s Chinese translation)';
    
    const prompt = `Translate the following children's storybook page to ${targetLang}.

**IMPORTANT TRANSLATION RULES:**
1. Maintain the natural tone and style for children
2. Keep cultural context appropriate for the target language
3. Preserve emotional nuance and storytelling rhythm
${characterNameRule}
5. Adapt idioms and expressions to be culturally relevant
6. Maintain the same reading level and vocabulary complexity
7. The ENTIRE output MUST be in ${targetLang} only - no mixing with Korean or other languages

${contextInfo}

**TEXT TO TRANSLATE:**
${text}

**RESPOND WITH ONLY THE TRANSLATED TEXT IN ${targetLang.toUpperCase()}. NO JSON, NO EXPLANATION, NO MIXED LANGUAGES, JUST THE PURE ${targetLang.toUpperCase()} TRANSLATION.**`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const translatedText = data.candidates[0].content.parts[0].text.trim();
    
    console.log(`✅ Page translation complete`);
    
    res.json({
      success: true,
      translatedText: translatedText
    });

  } catch (error) {
    console.error('페이지 번역 실패:', error);
    res.status(500).json({
      success: false,
      error: '번역 실패: ' + error.message
    });
  }
});

// TTS 생성 API
app.post('/api/generate-tts', requireAPIKey, async (req, res) => {
  try {
    const { text, model, voiceConfig } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: '텍스트가 필요합니다.'
      });
    }
    
    console.log(`\n🔊 TTS 생성 시작`);
    console.log(`Model: ${model}`);
    console.log(`Text length: ${text.length}`);
    console.log(`Voice config: ${voiceConfig}`);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `다음 텍스트를 자연스럽게 읽어주세요.

**음성 설정:** ${voiceConfig}

**텍스트:**
${text}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`TTS API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // TTS는 오디오 URL을 반환한다고 가정 (실제 구현은 모델에 따라 다름)
    // 여기서는 간단하게 처리
    const audioUrl = data.audioUrl || null;
    
    console.log(`✅ TTS 생성 완료`);
    
    res.json({
      success: true,
      audioUrl: audioUrl
    });

  } catch (error) {
    console.error('TTS 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'TTS 생성 실패: ' + error.message
    });
  }
});

// 핵심 사물 설명/예문 자동 생성 API
app.post('/api/generate-keyobject-description', requireAPIKey, async (req, res) => {
  try {
    const { objectName, storyText } = req.body;
    
    if (!objectName) {
      return res.status(400).json({ 
        success: false, 
        error: '사물 이름이 필요합니다.' 
      });
    }
    
    if (!storyText || storyText.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '동화 텍스트가 필요합니다.' 
      });
    }
    
    console.log(`🔍 핵심 사물 설명 생성 시작: ${objectName}`);
    console.log(`📖 동화 텍스트 길이: ${storyText.length}자`);
    
    // Gemini API로 설명과 예문 생성
    const prompt = `You are a children's storybook assistant. Analyze the story text and generate a description and example sentence for the key object.

**Story Text:**
${storyText}

**Key Object:** ${objectName}

**Instructions:**
1. This object must be a CONCRETE NOUN (animal or physical object), not abstract concepts or actions
2. Find how this object appears in the story
3. Generate a simple, visual description suitable for 4-8 year old children
4. Find an example sentence from the story where this object appears
5. If the object doesn't appear in the story, create a relevant description and example

**Output Format (JSON only, no markdown):**
{
  "description": "Simple visual description of the object in Korean (20-50 characters)",
  "example": "Example sentence from the story in Korean (no quotes needed)"
}

**Important:** 
- Ensure the object is a concrete noun (명사) - animals, objects, things you can see/touch
- NOT allowed: emotions (행복), actions (웃음), abstract concepts (사랑)
- Description should focus on visual appearance
- Example should be a natural sentence from the story context`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('Gemini API에서 응답을 받지 못했습니다.');
    }
    
    const generatedText = response.data.candidates[0].content.parts[0].text;
    console.log(`📝 Generated text: ${generatedText}`);
    
    // JSON 추출 (마크다운 코드 블록 제거)
    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }
    
    const result = JSON.parse(jsonText);
    
    console.log(`✅ 핵심 사물 설명 생성 완료`);
    console.log(`  - Description: ${result.description}`);
    console.log(`  - Example: ${result.example}`);
    
    res.json({
      success: true,
      description: result.description,
      example: result.example
    });

  } catch (error) {
    console.error('핵심 사물 설명 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: '핵심 사물 설명 생성 실패: ' + error.message
    });
  }
});

// ===== 동화책 관리 API (R2 저장소) =====

// 동화책 목록 조회 (R2에서)
app.get('/api/storybooks', async (req, res) => {
  console.log('📚 [API] GET /api/storybooks - R2 동화책 목록 조회 시작');
  try {
    // 1️⃣ 먼저 인덱스 파일 시도
    const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
    let indexExists = false;
    let index = { storybooks: [] };
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'storybooks-index.json'
      });
      const response = await r2Client.send(getCommand);
      const content = await response.Body.transformToString();
      index = JSON.parse(content);
      indexExists = true;
      console.log('✅ [R2] 인덱스 파일 로드 성공:', index.storybooks.length, '권');
    } catch (error) {
      console.log('📝 [R2] 인덱스 파일 없음 - 새로 생성합니다');
      
      // 빈 인덱스 파일 생성
      const putCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'storybooks-index.json',
        Body: JSON.stringify(index, null, 2),
        ContentType: 'application/json'
      });
      
      await r2Client.send(putCommand);
      console.log('✅ [R2] 빈 인덱스 파일 생성 완료');
      indexExists = true;
    }
    
    // 2️⃣ 인덱스 파일이 있으면 반환
    if (indexExists && index.storybooks.length > 0) {
      console.log('📋 [R2] 동화책 목록:', index.storybooks.map(b => b.title).join(', '));
      return res.json({
        success: true,
        storybooks: index.storybooks
      });
    }
    
    // 3️⃣ 인덱스가 비어있으면 전체 스캔 (폴백)
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    console.log('🔍 [R2] Bucket:', R2_BUCKET_NAME, 'Prefix: storybook-');
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'storybook-',
      MaxKeys: 100
    });
    
    console.log('📡 [R2] ListObjectsV2Command 실행 중...');
    const listResult = await r2Client.send(listCommand);
    console.log('✅ [R2] ListObjectsV2 결과:', listResult.Contents ? listResult.Contents.length : 0, '개 파일');
    
    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log('ℹ️ [R2] 동화책 없음');
      return res.json({
        success: true,
        storybooks: []
      });
    }
    
    // JSON 파일만 필터링
    const jsonFiles = listResult.Contents.filter(obj => obj.Key.endsWith('.json') && obj.Key !== 'storybooks-index.json');
    console.log('📄 [R2] JSON 파일:', jsonFiles.length, '개');
    console.log('📋 [R2] 파일 목록:', jsonFiles.map(f => f.Key).join(', '));
    
    // 각 JSON 파일 다운로드하여 메타데이터 추출
    const storybooks = [];
    for (const file of jsonFiles.slice(0, 20)) { // 최대 20개만
      try {
        console.log(`📥 [R2] ${file.Key} 다운로드 중...`);
        
        // S3 GetObjectCommand로 인증된 요청
        const getCommand = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: file.Key
        });
        const getResult = await r2Client.send(getCommand);
        
        // Stream을 문자열로 변환
        const bodyContents = await getResult.Body.transformToString();
        const data = JSON.parse(bodyContents);
        console.log(`✅ [R2] ${file.Key} 파싱 성공:`, data.title);
        
        // 메타데이터만 추출 (전체 페이지 내용은 제외)
        storybooks.push({
          id: data.id,
          title: data.title,
          targetAge: data.targetAge,
          artStyle: data.artStyle,
          createdAt: data.createdAt,
          pageCount: data.pages ? data.pages.length : 0,
          characterCount: data.characters ? data.characters.length : 0,
          r2JsonUrl: `${R2_PUBLIC_URL}/${file.Key}`
        });
      } catch (error) {
        console.error(`❌ [R2] ${file.Key} 로드 실패:`, error.message);
      }
    }
    
    console.log(`📚 [R2] 총 ${storybooks.length}권의 동화책 로드 완료`);
    
    // 최신순 정렬
    storybooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log('✅ [API] 응답 전송:', storybooks.map(b => b.title).join(', '));
    res.json({
      success: true,
      storybooks
    });
    
  } catch (error) {
    console.error('❌ [API] 동화책 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '동화책 목록 조회 실패: ' + error.message
    });
  }
});

// 특정 동화책 상세 조회 (R2에서)
app.get('/api/storybooks/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`📖 [API] GET /api/storybooks/${id} - 동화책 상세 조회 시작`);
  try {
    const filename = `storybook-${id}.json`;
    
    console.log(`📥 [R2] ${filename} 다운로드 시도`);
    
    // S3 GetObjectCommand로 인증된 요청
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename
    });
    
    try {
      const getResult = await r2Client.send(getCommand);
      
      console.log(`✅ [R2] ${filename} 다운로드 성공, 파싱 중...`);
      // Stream을 문자열로 변환
      const bodyContents = await getResult.Body.transformToString();
      const storybook = JSON.parse(bodyContents);
      
      // TTS base64 데이터 제거 (응답 크기 최적화)
      if (storybook.pages && Array.isArray(storybook.pages)) {
        storybook.pages.forEach(page => {
          // 🎨 scene_description을 illustrationPrompt에 복사 (기존 동화책 호환성)
          if (page.scene_description && !page.illustrationPrompt) {
            page.illustrationPrompt = page.scene_description;
          }
          
          if (page.ttsAudio) {
            // base64 인라인 데이터 체크 및 제거
            if (typeof page.ttsAudio.url === 'string' && page.ttsAudio.url.startsWith('data:audio/')) {
              // R2 URL이 있다면 유지, 없으면 제거
              delete page.ttsAudio.url;
            }
            // 다국어 TTS도 동일하게 처리
            Object.keys(page.ttsAudio).forEach(lang => {
              if (typeof page.ttsAudio[lang] === 'object' && page.ttsAudio[lang].url) {
                if (page.ttsAudio[lang].url.startsWith('data:audio/')) {
                  delete page.ttsAudio[lang].url;
                }
              }
            });
          }
          // audioUrl도 base64면 제거
          if (page.audioUrl && page.audioUrl.startsWith('data:audio/')) {
            delete page.audioUrl;
          }
        });
      }
      
      console.log(`✅ [API] 동화책 로드 완료:`, storybook.title, `(페이지: ${storybook.pages?.length || 0}, 캐릭터: ${storybook.characters?.length || 0}, 퀴즈: ${storybook.quizzes?.length || 0}, Key Objects: ${storybook.key_objects?.length || 0}, base64 TTS removed)`);
    
      res.json(storybook);
    } catch (getError) {
      // NoSuchKey 에러는 404로 처리
      if (getError.name === 'NoSuchKey' || getError.Code === 'NoSuchKey') {
        console.error(`❌ [R2] ${filename} 파일 없음`);
        return res.status(404).json({
          success: false,
          error: '동화책을 찾을 수 없습니다.'
        });
      }
      throw getError; // 다른 에러는 외부 catch로
    }
    
  } catch (error) {
    console.error(`❌ [API] 동화책 ${id} 조회 실패:`, error);
    res.status(500).json({
      success: false,
      error: '동화책 조회 실패: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    r2_configured: !!R2_ACCESS_KEY_ID,
    gemini_configured: !!GEMINI_API_KEY
  });
});

// API 키 제공 엔드포인트 (클라이언트에서 직접 Gemini API 호출용)
// 히스토리 이미지 정리 API
app.delete('/api/cleanup-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'imageUrl이 필요합니다.' });
    }
    
    await cleanupOldHistoryImage(imageUrl);
    
    res.json({ success: true, message: '이미지가 삭제되었습니다.' });
  } catch (error) {
    console.error('이미지 정리 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ❌ 보안 위험: API 키 노출 엔드포인트 제거
// 클라이언트에서 직접 Gemini API를 호출하면 API 키가 브라우저에 노출되어
// Google이 자동으로 키를 차단합니다.
// 모든 Gemini API 호출은 서버를 통해서만 이루어져야 합니다.
app.get('/api/config', (req, res) => {
  // API 키를 클라이언트에 절대 전달하지 않음
  res.json({
    success: false,
    error: 'API 키는 보안상의 이유로 클라이언트에 제공되지 않습니다. 모든 이미지 생성은 서버를 통해 이루어집니다.'
  });
});

// 5. Key Object 이미지 생성
app.post('/api/generate-key-object', requireAPIKey, async (req, res) => {
  try {
    // 두 가지 형식 지원:
    // 1. { keyObject: { name, description, ... }, ... }
    // 2. { name, description, prompt, ... }
    let keyObject;
    if (req.body.keyObject) {
      // 기존 형식
      keyObject = req.body.keyObject;
    } else {
      // 새로운 형식 (ImageService)
      keyObject = {
        name: req.body.name,
        description: req.body.description || req.body.prompt || req.body.name,
        prompt: req.body.prompt || req.body.description || req.body.name
      };
    }
    
    const { artStyle, settings = {}, storybookId = '', storybookTitle = '' } = req.body;
    
    // 설정값 - Key Object는 항상 4:3 비율로 고정
    const aspectRatio = req.body.aspectRatio || '4:3';  // ImageService에서 전달된 aspectRatio 우선 사용
    const enforceNoText = settings.enforceNoText !== false;
    const additionalPrompt = settings.additionalPrompt || '';
    const modelName = req.body.model || settings.keyObjectModel || 'gemini-3-pro-image-preview';  // ImageService에서 전달된 model 우선 사용
    
    console.log('📐 Key Object aspect ratio (fixed):', aspectRatio);
    console.log('🤖 Key Object model:', modelName);
    console.log('🔑 Key Object data:', keyObject);
    
    // keyObject.description을 영어로 번역 (한글인 경우)
    let descriptionEn = keyObject.description;
    if (descriptionEn && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(descriptionEn)) {
      console.log('Translating key object description to English...');
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const translateResponse = await fetch(translateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Translate the following Korean key object description to English for image generation. Keep it detailed and visual:\n\n${keyObject.description}` 
            }] 
          }]
        })
      });
      
      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        if (translateData.candidates && 
            translateData.candidates[0] && 
            translateData.candidates[0].content && 
            translateData.candidates[0].content.parts && 
            translateData.candidates[0].content.parts[0]) {
          descriptionEn = translateData.candidates[0].content.parts[0].text.trim();
          console.log('Translated key object description:', descriptionEn);
        }
      }
    }
    
    // 텍스트 제거 강조
    const noTextPrompt = enforceNoText ? 
      '\n\n**CRITICAL: NO TEXT, NO WORDS, NO LETTERS IN THE IMAGE**' : 
      '\n\n**IMPORTANT:** Do NOT include any text in the image.';
    
    console.log('🎨 Art Style:', artStyle);
    
    const prompt = `Create a professional illustration of a key object for a children's storybook.

**🎨 CRITICAL - ART STYLE (HIGHEST PRIORITY):**
${artStyle}

**⚠️ MANDATORY:** You MUST follow the art style specifications above EXACTLY. This includes:
- Exact color palette (muted blue/gray/charcoal if specified)
- Exact texture and medium (watercolor, gouache, textured paper if specified)
- Exact atmosphere and mood (moody, whimsical, etc. if specified)
- Exact rendering technique (soft washes, dry-brush, layered look if specified)
- Exact decorative patterns and visual elements (dots, scales, grain if specified)
DO NOT deviate from the art style. DO NOT use a different color palette. DO NOT use a different rendering technique.

**Object Name:** ${keyObject.name}

**Object Description:** ${descriptionEn}

**Image Aspect Ratio:** ${aspectRatio}

**Requirements:**
- Clean white or simple background (or textured paper if specified in art style)
- Follow the color palette from the art style above
- Professional, high-quality illustration in the specified art style
- Focus on the distinctive features described above
- Make it recognizable and memorable
- Apply the art style consistently
${noTextPrompt}
${additionalPrompt ? '\n\n**Additional Requirements:** ' + additionalPrompt : ''}

🚨 FINAL REMINDER: The art style at the top of this prompt is MANDATORY and NON-NEGOTIABLE. Follow it EXACTLY.`;
    
    console.log('🎨 Generating key object image with settings:', { 
      modelName,
      artStyle, 
      aspectRatio, 
      enforceNoText,
      objectName: keyObject.name
    });
    console.log('📋 Prompt (first 300 chars):', prompt.substring(0, 300));

    const imageUrl = await generateImage(prompt, [], 0, 3, modelName);
    
    // R2에 업로드 - 통일된 파일명 규칙
    const timestamp = Date.now();
    const safeStorybookId = storybookId || 'unknown';
    const safeStorybookTitle = (storybookTitle || 'untitled').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const safeObjectName = keyObject.name.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const filename = `${safeStorybookId}-${safeStorybookTitle}-keyobject-${safeObjectName}-${timestamp}.png`;
    const r2Url = await uploadImageToR2(imageUrl, filename);
    
    res.json({
      success: true,
      imageUrl: r2Url, // R2 URL 반환
      originalUrl: imageUrl, // 원본 URL (백업용)
      prompt
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Key Object 이미지 생성 실패: ' + error.message
    });
  }
});

// Key Objects 자동 생성 API
app.post('/api/generate-key-objects', requireAPIKey, async (req, res) => {
  try {
    const { storybookId, title, pages, targetAge, overwrite = false } = req.body;

    console.log('🎯 Key Objects 자동 생성 시작:', { storybookId, title, pageCount: pages?.length, targetAge });

    if (!pages || pages.length === 0) {
      return res.status(400).json({ success: false, message: '페이지 정보가 없습니다.' });
    }

    // 동화책 내용 수집 (각 페이지의 텍스트)
    const storyContent = pages.map((page, idx) => `Page ${idx + 1}: ${page.text}`).join('\n\n');

    // Gemini로 Key Objects 생성
    const prompt = `Analyze this children's storybook and identify 8 key objects that appear in the story.

**Story Title:** ${title}
**Target Age:** ${targetAge}

**Story Content:**
${storyContent}

**Requirements:**
1. Select 8 important objects that children should learn from this story
2. Objects should be concrete items (not abstract concepts)
3. Mix of different sizes: 2-3 small objects, 3-4 medium objects, 1-2 large objects
4. Each object needs:
   - English name (simple, 1-2 words)
   - Korean name (한글)
   - Simple description for children (in Korean)
   - Simple definition (in Korean)
   - Example sentence from the story (in Korean)
   - Size category (small/medium/large)
   - Approximate size in centimeters

**Output JSON format:**
{
  "keyObjects": [
    {
      "name": "Apple",
      "korean": "사과",
      "description": "빨갛고 둥근 과일이에요. 맛있고 건강에 좋아요.",
      "definition": "빨갛고 둥근 과일이에요. 맛있고 건강에 좋아요.",
      "example": "백설공주가 마녀가 준 사과를 먹었어요.",
      "size": "small",
      "sizeCm": 10
    }
  ]
}

Return ONLY valid JSON, no additional text.`;

    console.log('📋 Gemini 요청 프롬프트 길이:', prompt.length);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API 오류: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Gemini 응답이 비어있습니다.');
    }

    console.log('📝 Gemini 응답 길이:', responseText.length);

    // JSON 파싱
    let keyObjectsData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        keyObjectsData = JSON.parse(jsonMatch[0]);
      } else {
        keyObjectsData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.log('원본 응답:', responseText);
      throw new Error('AI 응답을 JSON으로 변환할 수 없습니다.');
    }

    const keyObjects = keyObjectsData.keyObjects || [];

    if (keyObjects.length === 0) {
      throw new Error('생성된 Key Objects가 없습니다.');
    }

    console.log(`✅ Key Objects 생성 완료: \${keyObjects.length}개`);

    res.json({
      success: true,
      keyObjects: keyObjects,
      count: keyObjects.length
    });

  } catch (error) {
    console.error('❌ Key Objects 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'Key Objects 생성 실패: ' + error.message
    });
  }
});

// 6. 커버 이미지 생성
app.post('/api/generate-cover', requireAPIKey, async (req, res) => {
  try {
    const { title, artStyle, characterReferences = [], settings = {}, customPrompt = '', storybookId = '' } = req.body;
    
    // 받은 요청 전체 로깅
    console.log('='.repeat(60));
    console.log('📮 /api/generate-cover 요청 받음');
    console.log('📋 Request body:', JSON.stringify({
      title,
      artStyle,
      characterReferencesCount: characterReferences.length,
      settings,
      customPrompt: customPrompt ? `${customPrompt.substring(0, 50)}...` : '(없음)',
      storybookId
    }, null, 2));
    
    // 설정값 기본값
    const aspectRatio = settings.aspectRatio || '4:3';  // 표지 기본 비율: 4:3 (책 표지에 적합)
    const enforceNoText = settings.enforceNoText !== false;
    const additionalPrompt = settings.additionalPrompt || '';
    const modelName = settings.coverModel || 'gemini-3-pro-image-preview';  // 표지 이미지 생성 모델
    
    console.log('📐 Cover aspect ratio:', aspectRatio);
    console.log('🤖 Cover model:', modelName);
    console.log('='.repeat(60));
    
    // 프롬프트: 사용자가 입력한 텍스트만 사용
    if (!customPrompt || !customPrompt.trim()) {
      return res.status(400).json({ 
        success: false,
        error: '표지 프롬프트를 입력해주세요.'
      });
    }
    
    // customPrompt를 영어로 번역 (한글인 경우)
    let prompt = customPrompt.trim();
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(customPrompt)) {
      console.log('Translating cover prompt to English...');
      const translateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const translateResponse = await fetch(translateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Translate the following Korean text to English briefly and concisely (max 500 words):\n\n${customPrompt}` 
            }] 
          }]
        })
      });
      
      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        if (translateData.candidates && 
            translateData.candidates[0] && 
            translateData.candidates[0].content && 
            translateData.candidates[0].content.parts && 
            translateData.candidates[0].content.parts[0]) {
          prompt = translateData.candidates[0].content.parts[0].text.trim();
          console.log('Translated cover prompt (length:', prompt.length, ')');
        }
      }
    }
    
    // 프롬프트 길이 제한 (2000자로 제한)
    if (prompt.length > 2000) {
      console.warn('⚠️ 프롬프트가 너무 깁니다 (', prompt.length, '자). 2000자로 자릅니다.');
      prompt = prompt.substring(0, 2000) + '...';
    }
    
    console.log('🎨 Generating cover image with settings:', { 
      modelName,
      aspectRatio, 
      enforceNoText, 
      characterReferences: characterReferences.length,
      promptLength: prompt.length
    });
    
    console.log('📋 Final prompt (first 300 chars):', prompt.substring(0, 300));

    const imageUrl = await generateImage(prompt, characterReferences, 0, 3, modelName);
    
    // R2에 업로드 - 통일된 파일명 규칙
    const timestamp = Date.now();
    const safeStorybookId = storybookId || 'unknown';
    const safeTitle = title.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const filename = `${safeStorybookId}-${safeTitle}-cover-${timestamp}.png`;
    const r2Url = await uploadImageToR2(imageUrl, filename);
    
    res.json({
      success: true,
      imageUrl: r2Url, // R2 URL 반환
      originalUrl: imageUrl, // 원본 URL (백업용)
      prompt
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: '커버 이미지 생성 실패: ' + error.message
    });
  }
});

// 7. 동화책 저장/업데이트 API
// 동화책 저장 함수 (POST와 PUT에서 공통 사용)
async function saveStorybookToR2(storybook) {
  if (!storybook.id) {
    throw new Error('동화책 ID가 필요합니다.');
  }
  
  console.log(`💾 Saving storybook: ${storybook.title} (ID: ${storybook.id})`);
  
  // R2에 JSON 파일로 저장
  const filename = `storybook-${storybook.id}.json`;
  const jsonContent = JSON.stringify(storybook, null, 2);
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: Buffer.from(jsonContent, 'utf-8'),
    ContentType: 'application/json',
  });
  
  await r2Client.send(command);
  
  console.log(`✅ Storybook saved to R2: ${filename}`);
  
  // 동화책 목록 인덱스 업데이트
  console.log(`📝 [INDEX] Starting index update for: ${storybook.title}`);
  await updateStorybooksIndex(storybook);
  console.log(`✅ [INDEX] Index update completed`);
  
  // 공개된 동화책이면 viewer metadata도 업데이트
  if (storybook.isPublic) {
    console.log(`🔄 [VIEWER] Updating viewer metadata for public storybook: ${storybook.title}`);
    await updateViewerMetadata();
    console.log(`✅ [VIEWER] Viewer metadata updated`);
  }
  
  return {
    success: true,
    id: storybook.id,
    message: '동화책이 저장되었습니다.',
    r2Url: `${R2_PUBLIC_URL}/${filename}`
  };
}

// POST /api/storybooks - 새 동화책 생성
app.post('/api/storybooks', async (req, res) => {
  try {
    const storybook = req.body;
    const result = await saveStorybookToR2(storybook);
    res.json(result);
  } catch (error) {
    console.error('동화책 저장 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '동화책 저장 실패: ' + error.message
    });
  }
});

// PUT /api/storybooks/:id - 기존 동화책 업데이트
app.put('/api/storybooks/:id', async (req, res) => {
  try {
    const storybook = req.body;
    const id = req.params.id;
    
    // ID 검증
    if (!storybook.id || storybook.id !== id) {
      return res.status(400).json({ 
        success: false, 
        error: '동화책 ID가 일치하지 않습니다.' 
      });
    }
    
    console.log(`📝 Updating storybook: ${storybook.title} (ID: ${id})`);
    
    const result = await saveStorybookToR2(storybook);
    res.json(result);
  } catch (error) {
    console.error('동화책 업데이트 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '동화책 업데이트 실패: ' + error.message
    });
  }
});

// 동화책 목록 인덱스 업데이트 (메타데이터만)
async function updateStorybooksIndex(storybook) {
  try {
    console.log(`🔍 [INDEX] updateStorybooksIndex called for: ${storybook.title} (ID: ${storybook.id})`);
    const indexFilename = 'storybooks-index.json';
    
    // 기존 인덱스 파일 읽기
    let index = { storybooks: [] };
    
    try {
      console.log(`📖 [INDEX] Reading existing index file...`);
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: indexFilename
      });
      
      const response = await r2Client.send(getCommand);
      const body = await response.Body.transformToString();
      index = JSON.parse(body);
      console.log(`✅ [INDEX] Existing index loaded: ${index.storybooks.length} storybooks`);
    } catch (error) {
      // 파일이 없으면 새로 생성
      console.log('📝 [INDEX] No existing index, creating new one');
    }
    
    // 메타데이터만 추출
    console.log(`📋 [INDEX] Creating metadata...`);
    const metadata = {
      id: storybook.id,
      title: storybook.title,
      targetAge: storybook.targetAge,
      artStyle: storybook.artStyle,
      createdAt: storybook.createdAt,
      updatedAt: new Date().toISOString(),
      pageCount: storybook.pages ? storybook.pages.length : 0,
      characterCount: storybook.characters ? storybook.characters.length : 0,
      hasCover: !!storybook.coverImage,
      r2JsonUrl: `${R2_PUBLIC_URL}/storybook-${storybook.id}.json`
    };
    console.log(`✅ [INDEX] Metadata created:`, JSON.stringify(metadata, null, 2));
    
    // 기존 항목 찾기
    const existingIndex = index.storybooks.findIndex(item => item.id === storybook.id);
    
    if (existingIndex >= 0) {
      // 업데이트
      index.storybooks[existingIndex] = metadata;
      console.log(`📝 Updated index for: ${storybook.title}`);
    } else {
      // 새로 추가
      index.storybooks.push(metadata);
      console.log(`📝 Added to index: ${storybook.title}`);
    }
    
    // 최신순 정렬
    index.storybooks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // 인덱스 파일 저장
    console.log(`💾 [INDEX] Saving index file...`);
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: indexFilename,
      Body: Buffer.from(JSON.stringify(index, null, 2), 'utf-8'),
      ContentType: 'application/json',
    });
    
    await r2Client.send(putCommand);
    
    console.log(`✅ Index updated: ${index.storybooks.length} storybooks`);
    
  } catch (error) {
    console.error('❌ [INDEX] 인덱스 업데이트 오류:', error);
    console.error('❌ [INDEX] Error stack:', error.stack);
    // 인덱스 업데이트 실패해도 동화책 저장은 성공으로 처리
  }
}

// 메인 페이지
// 8. 동화책 삭제 API
app.delete('/api/storybooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting storybook: ID ${id}`);
    
    const { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    // 1️⃣ 먼저 JSON 파일을 읽어서 관련 이미지 URL 추출
    const filename = `storybook-${id}.json`;
    let imageFiles = [];
    
    try {
      console.log(`📖 Reading storybook JSON to find images...`);
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename
      });
      
      const response = await r2Client.send(getCommand);
      const content = await response.Body.transformToString();
      const storybook = JSON.parse(content);
      
      console.log(`✅ Storybook loaded: ${storybook.title}`);
      
      // 동화책 ID와 제목으로 시작하는 모든 이미지 파일 찾기
      const storybookIdPrefix = `${id}-`;
      const titleSafe = storybook.title?.replace(/[^a-zA-Z0-9가-힣]/g, '') || '';
      const titlePrefix = titleSafe ? `${id}-${titleSafe}-` : storybookIdPrefix;
      
      console.log(`🔍 Searching for images with prefix: ${titlePrefix}`);
      
      // R2에서 해당 동화책의 모든 이미지 파일 찾기
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: titlePrefix,
        MaxKeys: 1000
      });
      
      const listResult = await r2Client.send(listCommand);
      
      if (listResult.Contents && listResult.Contents.length > 0) {
        imageFiles = listResult.Contents
          .filter(obj => obj.Key.endsWith('.png') || obj.Key.endsWith('.jpg') || obj.Key.endsWith('.jpeg'))
          .map(obj => obj.Key);
        
        console.log(`📸 Found ${imageFiles.length} image files:`, imageFiles);
      } else {
        console.log(`ℹ️ No image files found with prefix: ${titlePrefix}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Failed to read storybook JSON or list images:`, error.message);
      // JSON이 없어도 계속 진행 (이미 삭제되었을 수 있음)
    }
    
    // 2️⃣ 이미지 파일들 삭제
    if (imageFiles.length > 0) {
      console.log(`🗑️ Deleting ${imageFiles.length} image files...`);
      let deletedCount = 0;
      let failedCount = 0;
      
      for (const imageKey of imageFiles) {
        try {
          const deleteImageCommand = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: imageKey
          });
          await r2Client.send(deleteImageCommand);
          deletedCount++;
          console.log(`  ✅ Deleted: ${imageKey}`);
        } catch (error) {
          failedCount++;
          console.error(`  ❌ Failed to delete ${imageKey}:`, error.message);
        }
      }
      
      console.log(`✅ Image deletion complete: ${deletedCount} deleted, ${failedCount} failed`);
    }
    
    // 3️⃣ JSON 파일 삭제 (필수 - 실패 시 전체 삭제 실패)
    console.log(`🗑️ Deleting JSON file: ${filename}`);
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename
    });
    
    await r2Client.send(deleteCommand);
    console.log(`✅ Deleted JSON from R2: ${filename}`);
    
    // 4️⃣ 인덱스에서도 제거
    await removeFromStorybooksIndex(id);
    
    res.json({
      success: true,
      message: '동화책이 삭제되었습니다.',
      deletedImages: imageFiles.length
    });
    
  } catch (error) {
    console.error('❌ 동화책 삭제 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '동화책 삭제 실패: ' + error.message
    });
  }
});

// 인덱스에서 동화책 제거
async function removeFromStorybooksIndex(storybookId) {
  try {
    const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    // 기존 인덱스 읽기
    let index = { storybooks: [] };
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'storybooks-index.json'
      });
      const response = await r2Client.send(getCommand);
      const content = await response.Body.transformToString();
      index = JSON.parse(content);
    } catch (error) {
      console.log('📝 Index file not found, nothing to remove');
      return;
    }
    
    // 해당 동화책 제거
    const beforeCount = index.storybooks.length;
    index.storybooks = index.storybooks.filter(book => book.id !== storybookId);
    const afterCount = index.storybooks.length;
    
    if (beforeCount === afterCount) {
      console.log(`⚠️ Storybook ${storybookId} not found in index`);
      return;
    }
    
    // 인덱스 업데이트
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'storybooks-index.json',
      Body: JSON.stringify(index, null, 2),
      ContentType: 'application/json'
    });
    
    await r2Client.send(putCommand);
    console.log(`📝 Removed from index: ${storybookId}`);
    console.log(`✅ Index updated: ${afterCount} storybooks remaining`);
    
  } catch (error) {
    console.error('❌ Failed to remove from index:', error);
    throw error;
  }
}

// ========================================
// 🎬 뷰어 통합 API
// ========================================

// 1️⃣ 공개 상태 변경 API (작가 도구 전용 - 인증 필요)
app.put('/api/storybooks/:id/public', requireAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    
    console.log(`🔄 Updating public status for storybook ${id}: ${isPublic}`);
    
    // R2에서 동화책 JSON 로드
    const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const filename = `storybook-${id}.json`;
    
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename
    });
    
    const response = await r2Client.send(getCommand);
    const content = await response.Body.transformToString();
    const storybook = JSON.parse(content);
    
    // 공개 상태 업데이트
    storybook.isPublic = isPublic;
    storybook.publishedAt = isPublic ? new Date().toISOString() : null;
    
    // R2에 저장
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: Buffer.from(JSON.stringify(storybook, null, 2), 'utf-8'),
      ContentType: 'application/json',
    });
    
    await r2Client.send(putCommand);
    
    console.log(`✅ Public status updated for: ${storybook.title}`);
    
    // 뷰어 메타데이터 업데이트
    await updateViewerMetadata();
    
    res.json({ 
      success: true, 
      isPublic, 
      publishedAt: storybook.publishedAt,
      message: isPublic ? '동화책이 뷰어에 공개되었습니다.' : '동화책이 비공개로 전환되었습니다.'
    });
  } catch (error) {
    console.error('❌ 공개 상태 변경 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '공개 상태 변경 실패: ' + error.message 
    });
  }
});

// 뷰어 메타데이터 수동 업데이트 API (표지 변경 시 사용)
app.post('/api/viewer/refresh-metadata', async (req, res) => {
  try {
    console.log('🔄 Manual viewer metadata refresh requested');
    
    await updateViewerMetadata();
    
    res.json({ 
      success: true,
      message: '뷰어 메타데이터가 업데이트되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 공개 상태 변경 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '공개 상태 변경 실패: ' + error.message 
    });
  }
});

// 2️⃣ 뷰어용 메타데이터 업데이트 함수
async function updateViewerMetadata() {
  try {
    console.log('🔄 Updating viewer metadata...');
    
    const { ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    // 모든 동화책 파일 찾기
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'storybook-',
      MaxKeys: 1000
    });
    
    const listResult = await r2Client.send(listCommand);
    const publicStorybooks = [];
    
    // 공개된 동화책만 필터링
    for (const obj of (listResult.Contents || [])) {
      if (obj.Key.startsWith('storybook-') && obj.Key.endsWith('.json')) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: obj.Key
          });
          
          const response = await r2Client.send(getCommand);
          const content = await response.Body.transformToString();
          const storybook = JSON.parse(content);
          
          if (storybook.isPublic) {
            publicStorybooks.push({
              id: storybook.id,
              title: storybook.title,
              category: storybook.category || '',  // 카테고리 추가
              targetAge: storybook.targetAge,
              artStyle: storybook.artStyle,
              coverImage: storybook.coverImage,
              pageCount: storybook.pages?.length || 0,
              characterCount: storybook.characters?.length || 0,
              vocabularyCount: storybook.educational_content?.vocabulary?.length || 0,
              isPublic: true,
              publishedAt: storybook.publishedAt,
              r2JsonUrl: `${R2_PUBLIC_URL}/${obj.Key}`
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to read ${obj.Key}:`, error.message);
        }
      }
    }
    
    // 최신순 정렬
    publicStorybooks.sort((a, b) => 
      new Date(b.publishedAt) - new Date(a.publishedAt)
    );
    
    // 뷰어 메타데이터 파일 저장
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'viewer-metadata.json',
      Body: Buffer.from(JSON.stringify({ storybooks: publicStorybooks }, null, 2), 'utf-8'),
      ContentType: 'application/json',
    });
    
    await r2Client.send(putCommand);
    
    console.log(`✅ Viewer metadata updated: ${publicStorybooks.length} public storybooks`);
    return publicStorybooks;
    
  } catch (error) {
    console.error('❌ 뷰어 메타데이터 업데이트 실패:', error);
    throw error;
  }
}

// 3️⃣ 뷰어용 공개 API - 동화책 목록 (인증 불필요)
app.get('/api/viewer/storybooks', async (req, res) => {
  try {
    console.log('📖 Viewer: Loading public storybooks list');
    
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'viewer-metadata.json'
      });
      
      const response = await r2Client.send(getCommand);
      const content = await response.Body.transformToString();
      const data = JSON.parse(content);
      
      console.log(`✅ Returned ${data.storybooks.length} public storybooks`);
      
      res.json({
        success: true,
        storybooks: data.storybooks || []
      });
      
    } catch (error) {
      // 메타데이터 파일이 없으면 빈 배열 반환
      console.log('ℹ️ No viewer metadata found, returning empty list');
      res.json({
        success: true,
        storybooks: []
      });
    }
    
  } catch (error) {
    console.error('❌ 뷰어 목록 로드 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '뷰어 목록 로드 실패: ' + error.message 
    });
  }
});

// 🔧 임시: viewer-metadata.json 강제 업데이트 (디버깅용)
app.post('/api/refresh-viewer-metadata', async (req, res) => {
  try {
    console.log('🔄 강제로 viewer-metadata 업데이트 중...');
    await updateViewerMetadata();
    res.json({ success: true, message: 'Viewer metadata refreshed' });
  } catch (error) {
    console.error('❌ 메타데이터 업데이트 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4️⃣ 뷰어용 공개 API - 동화책 상세 (인증 불필요)
app.get('/api/viewer/storybooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📖 Viewer: Loading storybook ${id}`);
    
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const filename = `storybook-${id}.json`;
    
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename
    });
    
    const response = await r2Client.send(getCommand);
    const content = await response.Body.transformToString();
    const storybook = JSON.parse(content);
    
    // 공개된 동화책만 반환
    if (!storybook.isPublic) {
      console.log(`⚠️ Storybook ${id} is not public`);
      return res.status(403).json({ 
        success: false, 
        error: '비공개 동화책입니다.' 
      });
    }
    
    // TTS base64 데이터 제거 (viewer는 URL만 필요)
    if (storybook.pages && Array.isArray(storybook.pages)) {
      storybook.pages.forEach(page => {
        if (page.ttsAudio) {
          // base64 데이터가 있고 URL이 없으면, URL을 base64로 설정
          if (typeof page.ttsAudio.url === 'string' && page.ttsAudio.url.startsWith('data:audio/')) {
            // base64 인라인 데이터는 R2에 업로드되어 있어야 하므로 제거
            delete page.ttsAudio.url;
          }
          // 다국어 TTS도 동일하게 처리
          if (page.ttsAudio.en && page.ttsAudio.en.url && page.ttsAudio.en.url.startsWith('data:audio/')) {
            delete page.ttsAudio.en.url;
          }
          if (page.ttsAudio.ko && page.ttsAudio.ko.url && page.ttsAudio.ko.url.startsWith('data:audio/')) {
            delete page.ttsAudio.ko.url;
          }
        }
        // audioUrl도 base64면 제거
        if (page.audioUrl && page.audioUrl.startsWith('data:audio/')) {
          delete page.audioUrl;
        }
      });
    }
    
    console.log(`✅ Returned storybook: ${storybook.title} (base64 TTS removed)`);
    
    // 캐시 방지 헤더 설정
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json({
      success: true,
      storybook: storybook
    });
    
  } catch (error) {
    console.error('❌ 동화책 상세 로드 실패:', error);
    
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ 
        success: false, 
        error: '동화책을 찾을 수 없습니다.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: '동화책 상세 로드 실패: ' + error.message 
    });
  }
});

// ===== R2 파일 다운로드 프록시 (CORS 우회) =====
app.get('/api/download-audio/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log(`📥 오디오 다운로드 요청: ${filename}`);
    
    // R2에서 파일 가져오기
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename
    });
    
    const r2Response = await r2Client.send(getCommand);
    
    // Content-Disposition 헤더 설정 (강제 다운로드)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', r2Response.ContentType || 'audio/wav');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 스트림 전달
    r2Response.Body.pipe(res);
    
    console.log(`✅ 오디오 다운로드 시작: ${filename}`);
    
  } catch (error) {
    console.error('❌ 오디오 다운로드 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '파일 다운로드 실패: ' + error.message 
    });
  }
});

// ===== 🎬 동영상 생성 API =====

/**
 * POST /api/generate-video
 * 동화책을 FFmpeg로 동영상으로 생성
 */
app.post('/api/generate-video', async (req, res) => {
    try {
        const { 
            storybookId, 
            startPage, 
            endPage, 
            includeCover, 
            coverDuration,
            includeBackgroundMusic,
            resolution,
            transition 
        } = req.body;
        
        console.log('🎬 동영상 생성 요청:', {
            storybookId,
            startPage,
            endPage,
            includeCover,
            coverDuration,
            includeBackgroundMusic,
            resolution,
            transition
        });
        
        // 스토리북 가져오기
        const storybookKey = `storybook-${storybookId}.json`;
        const storybookObject = await r2Client.send(new GetObjectCommand({
            Bucket: config.r2.bucketName,
            Key: storybookKey
        }));
        
        if (!storybookObject) {
            return res.status(404).json({ success: false, message: '동화책을 찾을 수 없습니다.' });
        }
        
        const storybookText = await storybookObject.Body.transformToString();
        const storybook = JSON.parse(storybookText);
        
        // 페이지 범위 추출
        const pages = storybook.pages.slice(startPage - 1, endPage);
        
        if (pages.length === 0) {
            return res.status(400).json({ success: false, message: '선택한 페이지가 없습니다.' });
        }
        
        // 배경음악 URL 가져오기
        let backgroundMusicUrl = null;
        if (includeBackgroundMusic && storybook.backgroundMusicId) {
            try {
                // R2에서 배경음악 목록 가져오기
                const musicListCommand = new GetObjectCommand({
                    Bucket: config.r2.bucketName,
                    Key: 'background-music.json'
                });
                const musicListResponse = await r2Client.send(musicListCommand);
                const musicListText = await musicListResponse.Body.transformToString();
                const musicList = JSON.parse(musicListText);
                
                // ID로 배경음악 찾기
                const music = musicList.find(m => m.id === storybook.backgroundMusicId);
                if (music) {
                    backgroundMusicUrl = music.url;
                    console.log('✅ 배경음악 찾음:', music.title, backgroundMusicUrl);
                } else {
                    console.warn('⚠️ 배경음악을 찾을 수 없습니다:', storybook.backgroundMusicId);
                }
            } catch (err) {
                console.warn('⚠️ 배경음악 목록을 가져올 수 없습니다:', err.message);
            }
        }
        
        // 표지 이미지 URL
        const coverImageUrl = includeCover && storybook.coverImage ? storybook.coverImage : null;
        
        console.log('📦 동영상 생성 데이터:', {
            pages: pages.length,
            coverImageUrl,
            backgroundMusicUrl,
            resolution,
            transition
        });
        
        // FFmpeg로 동영상 생성
        const { execSync } = await import('child_process');
        const fs = await import('fs');
        const os = await import('os');
        const pathModule = await import('path');
        
        // 임시 작업 디렉토리 생성
        const workDir = pathModule.join(os.tmpdir(), `video-${storybookId}-${Date.now()}`);
        fs.mkdirSync(workDir, { recursive: true });
        
        console.log('📁 작업 디렉토리:', workDir);
        
        try {
            // 1. 이미지와 오디오 다운로드
            console.log('⬇️ 에셋 다운로드 시작...');
            
            const downloadFile = async (url, filename) => {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                fs.writeFileSync(pathModule.join(workDir, filename), Buffer.from(response.data));
            };
            
            // 표지 다운로드 (선택 시)
            if (coverImageUrl) {
                console.log('  → 표지 다운로드...');
                await downloadFile(coverImageUrl, 'cover.jpg');
            }
            
            // 페이지 이미지 및 오디오 다운로드
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const pageNum = i + 1;
                
                console.log(`  → 페이지 ${pageNum} 다운로드...`);
                
                if (page.illustrationImage) {
                    const ext = page.illustrationImage.includes('.png') ? 'png' : 'jpg';
                    await downloadFile(page.illustrationImage, `page${pageNum}.${ext}`);
                }
                
                const ttsUrl = page.ttsAudio?.url || page.audioUrl;
                if (ttsUrl) {
                    await downloadFile(ttsUrl, `page${pageNum}.wav`);
                }
            }
            
            // 배경음악 다운로드 (선택 시)
            if (backgroundMusicUrl) {
                console.log('  → 배경음악 다운로드...');
                await downloadFile(backgroundMusicUrl, 'bgm.mp3');
            }
            
            console.log('✅ 에셋 다운로드 완료');
            
            // 2. 해상도 설정
            const resolutionMap = {
                '720p': '1280:720',
                '1080p': '1920:1080'
            };
            const videoSize = resolutionMap[resolution] || '1280:720';
            
            // 3. 클립 생성
            console.log('🎞️ 클립 생성 시작...');
            
            const clips = [];
            
            // 표지 클립 생성 (선택 시)
            if (coverImageUrl) {
                console.log(`  → 표지 클립 생성 (${coverDuration}초)...`);
                const coverClipPath = pathModule.join(workDir, 'clip_cover.mp4');
                
                // 표지에도 무음 오디오 추가 (다른 클립과 호환성)
                execSync(`ffmpeg -y -loop 1 -i "${pathModule.join(workDir, 'cover.jpg')}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=24000 -c:v libx264 -c:a aac -b:a 192k -t ${coverDuration} -pix_fmt yuv420p -vf "scale=${videoSize}:force_original_aspect_ratio=decrease,pad=${videoSize}:(ow-iw)/2:(oh-ih)/2" -preset fast -shortest "${coverClipPath}"`, {
                    cwd: workDir
                });
                
                const coverStats = fs.statSync(coverClipPath);
                console.log(`     ✅ 표지 클립 생성 완료 (${(coverStats.size / 1024 / 1024).toFixed(2)} MB)`);
                
                clips.push(coverClipPath);
            }
            
            // 페이지 클립 생성
            for (let i = 0; i < pages.length; i++) {
                const pageNum = i + 1;
                console.log(`  → 페이지 ${pageNum} 클립 생성...`);
                
                const imagePath = fs.existsSync(pathModule.join(workDir, `page${pageNum}.png`)) 
                    ? pathModule.join(workDir, `page${pageNum}.png`)
                    : pathModule.join(workDir, `page${pageNum}.jpg`);
                
                const audioPath = pathModule.join(workDir, `page${pageNum}.wav`);
                const clipPath = pathModule.join(workDir, `clip${pageNum}.mp4`);
                
                if (fs.existsSync(audioPath)) {
                    // 오디오가 있으면 오디오 길이만큼 동영상 생성
                    const audioStats = fs.statSync(audioPath);
                    console.log(`     오디오 파일 존재: ${pathModule.basename(audioPath)} (${(audioStats.size / 1024).toFixed(2)} KB)`);
                    
                    // 오디오 길이 확인
                    try {
                        const audioDuration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {
                            cwd: workDir,
                            encoding: 'utf8'
                        }).trim();
                        console.log(`     ⏱️ 오디오 길이: ${parseFloat(audioDuration).toFixed(2)}초`);
                    } catch {}
                    
                    try {
                        // -y 플래그 추가 (기존 파일 덮어쓰기)
                        const result = execSync(`ffmpeg -y -loop 1 -framerate 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -vf "scale=${videoSize}:force_original_aspect_ratio=decrease,pad=${videoSize}:(ow-iw)/2:(oh-ih)/2" -shortest -preset fast "${clipPath}"`, {
                            cwd: workDir
                        });
                        
                        // 생성된 클립 검증
                        const clipStats = fs.statSync(clipPath);
                        console.log(`     ✅ 클립 생성 완료 (${(clipStats.size / 1024 / 1024).toFixed(2)} MB)`);
                        
                        // 클립 길이 확인
                        try {
                            const clipDuration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${clipPath}"`, {
                                cwd: workDir,
                                encoding: 'utf8'
                            }).trim();
                            console.log(`     ⏱️ 클립 길이: ${parseFloat(clipDuration).toFixed(2)}초`);
                        } catch {}
                        
                        // 오디오 스트림 확인
                        const probeResult = execSync(`ffprobe -v error -select_streams a -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${clipPath}"`, {
                            cwd: workDir,
                            encoding: 'utf8'
                        }).trim();
                        
                        if (probeResult) {
                            console.log(`     🔊 오디오 코덱: ${probeResult}`);
                        } else {
                            console.warn(`     ⚠️ 오디오 스트림이 없습니다!`);
                        }
                    } catch (err) {
                        console.error(`     ❌ FFmpeg 에러:`, err.message);
                        throw err;
                    }
                } else {
                    // 오디오가 없으면 5초 동영상
                    console.log(`     오디오 파일 없음 - 5초 클립 생성`);
                    execSync(`ffmpeg -y -loop 1 -i "${imagePath}" -c:v libx264 -t 5 -pix_fmt yuv420p -vf "scale=${videoSize}:force_original_aspect_ratio=decrease,pad=${videoSize}:(ow-iw)/2:(oh-ih)/2" -preset fast "${clipPath}"`, {
                        cwd: workDir
                    });
                }
                
                clips.push(clipPath);
            }
            
            console.log('✅ 클립 생성 완료');
            
            // 4. 클립 병합
            console.log('🔗 클립 병합 시작...');
            
            const concatListPath = pathModule.join(workDir, 'concat.txt');
            const concatContent = clips.map(clip => `file '${pathModule.basename(clip)}'`).join('\n');
            fs.writeFileSync(concatListPath, concatContent);
            
            console.log('📄 concat.txt 내용:');
            console.log(concatContent);
            
            const mergedVideoPath = pathModule.join(workDir, 'merged.mp4');
            
            // concat demuxer로 병합 (오디오 보존)
            try {
                execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${mergedVideoPath}"`, {
                    cwd: workDir
                });
                
                // 병합된 파일 검증
                const mergedStats = fs.statSync(mergedVideoPath);
                console.log(`✅ 병합 완료 (${(mergedStats.size / 1024 / 1024).toFixed(2)} MB)`);
                
                // 오디오 스트림 확인
                const audioCheck = execSync(`ffprobe -v error -select_streams a -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${mergedVideoPath}"`, {
                    cwd: workDir,
                    encoding: 'utf8'
                }).trim();
                
                if (audioCheck) {
                    console.log(`🔊 병합 파일 오디오 코덱: ${audioCheck}`);
                } else {
                    console.warn(`⚠️ 병합 파일에 오디오가 없습니다! 재인코딩 시도...`);
                    
                    // 재인코딩으로 다시 시도
                    const reencoded = pathModule.join(workDir, 'merged_reencoded.mp4');
                    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -c:a aac -b:a 192k -preset fast "${reencoded}"`, {
                        cwd: workDir
                    });
                    
                    // 원본 삭제하고 재인코딩 파일 사용
                    fs.unlinkSync(mergedVideoPath);
                    fs.renameSync(reencoded, mergedVideoPath);
                    console.log(`✅ 재인코딩 완료`);
                }
            } catch (err) {
                console.error('❌ 병합 에러:', err.message);
                throw err;
            }
            
            console.log('✅ 클립 병합 완료');
            
            // 5. 배경음악 믹싱 (선택 시)
            let finalVideoPath = mergedVideoPath;
            
            if (includeBackgroundMusic && backgroundMusicUrl && fs.existsSync(pathModule.join(workDir, 'bgm.mp3'))) {
                console.log('🎵 배경음악 믹싱 시작...');
                
                const withBGMPath = pathModule.join(workDir, 'final_with_bgm.mp4');
                
                // 배경음악을 동영상 길이에 맞게 루프하고, TTS 음량 유지하면서 BGM 음량 낮춤
                // amix 대신 amerge 사용해서 더 안정적으로 믹싱
                execSync(`ffmpeg -y -i "${mergedVideoPath}" -stream_loop -1 -i "${pathModule.join(workDir, 'bgm.mp3')}" -filter_complex "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${withBGMPath}"`, {
                    cwd: workDir,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                
                finalVideoPath = withBGMPath;
                console.log('✅ 배경음악 믹싱 완료');
            }
            
            // 6. R2에 업로드
            console.log('☁️ R2 업로드 시작...');
            
            const timestamp = Date.now();
            const videoFilename = `${storybookId}-video-${timestamp}.mp4`;
            const videoKey = `videos/${videoFilename}`;
            
            const videoBuffer = fs.readFileSync(finalVideoPath);
            
            await r2Client.send(new PutObjectCommand({
                Bucket: config.r2.bucketName,
                Key: videoKey,
                Body: videoBuffer,
                ContentType: 'video/mp4'
            }));
            
            const videoUrl = `${config.r2.publicUrl}/${videoKey}`;
            
            console.log('✅ R2 업로드 완료:', videoUrl);
            
            // 7. 임시 파일 정리
            console.log('🧹 임시 파일 정리...');
            fs.rmSync(workDir, { recursive: true, force: true });
            
            console.log('✅ 동영상 생성 완료!');
            
            return res.json({
                success: true,
                videoUrl,
                message: '동영상이 성공적으로 생성되었습니다.'
            });
            
        } catch (error) {
            console.error('❌ FFmpeg 실행 오류:', error);
            
            // 에러 발생 시 임시 파일 정리
            try {
                fs.rmSync(workDir, { recursive: true, force: true });
            } catch {}
            
            throw error;
        }
        
    } catch (error) {
        console.error('❌ 동영상 생성 오류:', error);
        return res.status(500).json({ 
            success: false, 
            message: '동영상 생성 중 오류가 발생했습니다: ' + error.message 
        });
    }
});

// ===== 5️⃣ 댓글 API =====

// 댓글 목록 조회 (인증 불필요)
app.get('/api/viewer/storybooks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`💬 Loading comments for storybook ${id}`);
    
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const filename = `comments-${id}.json`;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename
      });
      
      const response = await r2Client.send(getCommand);
      const content = await response.Body.transformToString();
      const data = JSON.parse(content);
      
      console.log(`✅ Loaded ${data.comments.length} comments`);
      
      res.json({
        success: true,
        comments: data.comments || []
      });
      
    } catch (error) {
      // 댓글 파일이 없으면 빈 배열 반환
      if (error.name === 'NoSuchKey') {
        console.log(`ℹ️ No comments found for ${id}, returning empty list`);
        return res.json({
          success: true,
          comments: []
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('❌ 댓글 로드 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 로드 실패: ' + error.message 
    });
  }
});

// 댓글 작성 (인증 불필요)
app.post('/api/viewer/storybooks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, content } = req.body;
    
    if (!nickname || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '별명과 내용을 입력해주세요.' 
      });
    }
    
    // 내용 길이 제한
    if (content.length > 500) {
      return res.status(400).json({ 
        success: false, 
        error: '댓글은 500자 이내로 작성해주세요.' 
      });
    }
    
    console.log(`💬 Adding comment to storybook ${id}`);
    
    const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const filename = `comments-${id}.json`;
    
    let comments = [];
    
    // 기존 댓글 불러오기
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename
      });
      
      const response = await r2Client.send(getCommand);
      const existingContent = await response.Body.transformToString();
      const data = JSON.parse(existingContent);
      comments = data.comments || [];
    } catch (error) {
      if (error.name !== 'NoSuchKey') {
        throw error;
      }
      // 파일이 없으면 빈 배열로 시작
    }
    
    // 새 댓글 추가
    const newComment = {
      id: Date.now().toString(),
      nickname: nickname.substring(0, 20), // 별명 길이 제한
      content: content.substring(0, 500), // 내용 길이 제한
      createdAt: new Date().toISOString()
    };
    
    comments.unshift(newComment); // 최신 댓글이 먼저 오도록
    
    // 최대 100개까지만 보관
    if (comments.length > 100) {
      comments = comments.slice(0, 100);
    }
    
    // R2에 저장
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: Buffer.from(JSON.stringify({ comments }, null, 2), 'utf-8'),
      ContentType: 'application/json',
    });
    
    await r2Client.send(putCommand);
    
    console.log(`✅ Comment added: ${newComment.id}`);
    
    res.json({
      success: true,
      comment: newComment,
      totalComments: comments.length
    });
    
  } catch (error) {
    console.error('❌ 댓글 작성 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 작성 실패: ' + error.message 
    });
  }
});

// ========================================
// 🖼️ 기타 유틸리티 API
// ========================================

// 이미지 다운로드 프록시 API (CORS 우회)
app.get('/api/download-image', async (req, res) => {
  try {
    const { url, filename } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`📥 Downloading image for user: ${url.substring(0, 80)}...`);
    
    // URL에서 이미지 다운로드
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // 파일명 설정
    const downloadFilename = filename || 'image.png';
    
    // Content-Disposition 헤더로 다운로드 강제
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.send(Buffer.from(buffer));
    
    console.log(`✅ Image downloaded: ${downloadFilename}`);
  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).json({ error: 'Download failed: ' + error.message });
  }
});

// ==================== 배경음악 API ====================

// 배경음악 목록 조회
app.get('/api/background-music', async (req, res) => {
  try {
    // R2에서 background-music.json 파일 가져오기
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'background-music.json',
    });
    
    try {
      const response = await r2Client.send(command);
      const data = await response.Body.transformToString();
      const musicList = JSON.parse(data);
      res.json({ success: true, music: musicList });
    } catch (error) {
      // 파일이 없으면 빈 배열 반환
      if (error.name === 'NoSuchKey') {
        res.json({ success: true, music: [] });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 배경음악 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 배경음악 추가
app.post('/api/background-music', audioUpload.single('audio'), async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, error: '제목을 입력해주세요.' });
    }
    
    let audioUrl = '';
    
    // 파일 업로드
    if (req.file) {
      const timestamp = Date.now();
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      const fileName = `background-music/${timestamp}-${sanitizedTitle}.${req.file.mimetype.split('/')[1]}`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });
      
      await r2Client.send(uploadCommand);
      audioUrl = `${R2_PUBLIC_URL}/${fileName}`;
      console.log(`✅ 배경음악 업로드 완료: ${audioUrl}`);
    } else {
      return res.status(400).json({ success: false, error: '오디오 파일을 선택해주세요.' });
    }
    
    // 기존 배경음악 목록 가져오기
    let musicList = [];
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'background-music.json',
      });
      const response = await r2Client.send(command);
      const data = await response.Body.transformToString();
      musicList = JSON.parse(data);
    } catch (error) {
      if (error.name !== 'NoSuchKey') {
        throw error;
      }
    }
    
    // 새 배경음악 추가
    const newMusic = {
      id: `bgm_${Date.now()}`,
      title,
      url: audioUrl,
      createdAt: new Date().toISOString(),
    };
    
    musicList.push(newMusic);
    
    // R2에 저장
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'background-music.json',
      Body: JSON.stringify(musicList, null, 2),
      ContentType: 'application/json',
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ 배경음악 추가 완료: ${title}`);
    res.json({ success: true, music: newMusic });
  } catch (error) {
    console.error('❌ 배경음악 추가 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 배경음악 삭제
app.delete('/api/background-music/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 기존 배경음악 목록 가져오기
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'background-music.json',
    });
    
    const response = await r2Client.send(command);
    const data = await response.Body.transformToString();
    let musicList = JSON.parse(data);
    
    // 삭제할 음악 찾기
    const musicToDelete = musicList.find(m => m.id === id);
    if (!musicToDelete) {
      return res.status(404).json({ success: false, error: '배경음악을 찾을 수 없습니다.' });
    }
    
    // 목록에서 제거
    musicList = musicList.filter(m => m.id !== id);
    
    // R2에 저장
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'background-music.json',
      Body: JSON.stringify(musicList, null, 2),
      ContentType: 'application/json',
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ 배경음악 삭제 완료: ${musicToDelete.title}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ 배경음악 삭제 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 동화책 조회수 API ====================

// 조회수 증가
app.post('/api/storybooks/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    // R2에서 view-counts.json 파일 가져오기
    let viewCounts = {};
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'view-counts.json',
      });
      const response = await r2Client.send(command);
      const data = await response.Body.transformToString();
      viewCounts = JSON.parse(data);
    } catch (error) {
      if (error.name !== 'NoSuchKey') {
        throw error;
      }
    }
    
    // 조회수 증가
    if (!viewCounts[id]) {
      viewCounts[id] = 0;
    }
    viewCounts[id]++;
    
    // R2에 저장
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'view-counts.json',
      Body: JSON.stringify(viewCounts, null, 2),
      ContentType: 'application/json',
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ 조회수 증가: ${id} → ${viewCounts[id]}`);
    res.json({ success: true, views: viewCounts[id] });
  } catch (error) {
    console.error('❌ 조회수 증가 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 전체 조회수 조회
app.get('/api/view-counts', async (req, res) => {
  try {
    // R2에서 view-counts.json 파일 가져오기
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'view-counts.json',
    });
    
    try {
      const response = await r2Client.send(command);
      const data = await response.Body.transformToString();
      const viewCounts = JSON.parse(data);
      res.json({ success: true, viewCounts });
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        res.json({ success: true, viewCounts: {} });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 조회수 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 폴더 관리 API
// ============================================

// 폴더 목록 조회
app.get('/api/folders', async (req, res) => {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'folders.json'
    });
    
    const response = await r2Client.send(getCommand);
    const content = await response.Body.transformToString();
    const data = JSON.parse(content);
    
    res.json({ success: true, folders: data.folders || [] });
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // 파일 없으면 빈 배열 반환
      res.json({ success: true, folders: [] });
    } else {
      console.error('폴더 조회 오류:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 폴더 저장
app.post('/api/folders', async (req, res) => {
  try {
    const { folders } = req.body;
    
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'folders.json',
      Body: JSON.stringify({ folders }, null, 2),
      ContentType: 'application/json'
    });
    
    await r2Client.send(putCommand);
    console.log('✅ 폴더 저장 완료:', folders.length, '개');
    
    res.json({ success: true });
  } catch (error) {
    console.error('폴더 저장 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 메인 페이지 라우팅
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
