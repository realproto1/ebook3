/**
 * ⚡ Quick Reference Guide for server.js
 * 
 * 이 파일은 server.js의 주요 섹션을 빠르게 찾기 위한 가이드입니다.
 * 각 함수/라우트의 라인 번호를 업데이트하여 유지관리하세요.
 */

export const SERVER_MAP = {
  // 📦 설정 및 초기화
  imports: { start: 1, end: 15 },
  middleware: { start: 16, end: 20 },
  r2Client: { start: 21, end: 55 },
  
  // 🔐 인증 및 미들웨어
  requireAPIKey: { line: 56, desc: "API 키 검증 미들웨어" },
  
  // 📤 R2 업로드 함수
  uploadImageToR2: { line: 77, desc: "URL 이미지를 R2에 업로드" },
  uploadBase64ToR2: { line: 117, desc: "Base64 이미지를 R2에 업로드" },
  uploadBufferToR2: { line: 168, desc: "Buffer를 R2에 업로드" },
  cleanupOldHistoryImage: { line: 196, desc: "히스토리 이미지 삭제" },
  uploadJSONToR2: { line: 227, desc: "JSON 데이터를 R2에 업로드" },
  
  // 🎨 Gemini API
  generateImage: { line: 257, desc: "Gemini API 이미지 생성 (재시도 포함)" },
  
  // 🛣️ API 라우트
  routes: {
    debug: { line: 380, path: "GET /api/debug/env", desc: "환경 변수 상태 확인" },
    uploadImage: { line: 397, path: "POST /api/upload-image", desc: "이미지 파일 업로드" },
    
    // 동화책 관련
    generateStorybook: { line: 454, path: "POST /api/generate-storybook", desc: "동화책 생성" },
    createStorybook: { line: 2964, path: "POST /api/storybooks", desc: "동화책 저장" },
    listStorybooks: { line: 2557, path: "GET /api/storybooks", desc: "동화책 목록" },
    getStorybook: { line: 2682, path: "GET /api/storybooks/:id", desc: "동화책 상세" },
    deleteStorybook: { line: 3092, path: "DELETE /api/storybooks/:id", desc: "동화책 삭제" },
    
    // 이미지 생성
    generateCharacter: { line: 1460, path: "POST /api/generate-character-image", desc: "캐릭터 이미지 생성" },
    generateCover: { line: 2867, path: "POST /api/generate-cover", desc: "표지 이미지 생성" },
    generateIllustration: { line: 1564, path: "POST /api/generate-illustration", desc: "삽화 생성" },
    generateVocabulary: { line: 1898, path: "POST /api/generate-vocabulary-images", desc: "학습 단어 이미지" },
    generateKeyObject: { line: 2773, path: "POST /api/generate-key-object", desc: "핵심 사물 이미지" },
    
    // 기타 콘텐츠
    generateQuiz: { line: 2118, path: "POST /api/generate-quiz", desc: "퀴즈 생성" },
    generateTTS: { line: 2221, path: "POST /api/generate-tts", desc: "TTS 생성" },
    translateStorybook: { line: 2354, path: "POST /api/translate-storybook", desc: "동화책 번역" },
    
    // 유틸리티
    cleanupImage: { line: 2743, path: "DELETE /api/cleanup-image", desc: "이미지 정리" },
    downloadImage: { line: 3252, path: "GET /api/download-image", desc: "이미지 다운로드 프록시" },
    health: { line: 2729, path: "GET /health", desc: "헬스 체크" },
  },
  
  // 🔧 헬퍼 함수
  helpers: {
    updateStorybooksIndex: { line: 3014, desc: "동화책 인덱스 업데이트" },
    removeFromStorybooksIndex: { line: 3204, desc: "동화책 인덱스에서 제거" },
  }
};

/**
 * 빠른 검색을 위한 함수
 */
export function findSection(keyword) {
  const results = [];
  
  // 라우트 검색
  for (const [name, info] of Object.entries(SERVER_MAP.routes)) {
    if (name.toLowerCase().includes(keyword.toLowerCase()) || 
        info.desc.includes(keyword) ||
        info.path.includes(keyword)) {
      results.push({ type: 'route', name, ...info });
    }
  }
  
  // 함수 검색
  for (const [name, info] of Object.entries(SERVER_MAP)) {
    if (typeof info === 'object' && info.line && 
        (name.toLowerCase().includes(keyword.toLowerCase()) || 
         info.desc?.includes(keyword))) {
      results.push({ type: 'function', name, ...info });
    }
  }
  
  return results;
}

// 사용 예시:
// import { SERVER_MAP, findSection } from './SERVER_GUIDE.js';
// const routes = findSection('vocabulary');  // 학습 단어 관련 찾기
// const line = SERVER_MAP.routes.generateVocabulary.line;  // 라인 번호 가져오기

console.log('📚 Server Guide Loaded');
console.log('   Total routes:', Object.keys(SERVER_MAP.routes).length);
console.log('   Use findSection(keyword) to search');
