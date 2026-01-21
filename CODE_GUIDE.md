# 📂 코드 구조 가이드

## 🚀 빠른 네비게이션

### 서버 코드 (server.js - 3291 lines)

**주요 섹션:**
```
Lines 1-55    : 📦 설정 및 초기화 (imports, R2 클라이언트)
Lines 56-255  : 🔧 유틸리티 함수 (requireAPIKey, R2 업로드, JSON 업로드)
Lines 257-377 : 🎨 Gemini API (이미지 생성, 재시도 로직)
Lines 380-450 : 🛠️ 디버그 및 유틸리티 라우트
Lines 454-1400: 📚 동화책 생성 API
Lines 1460-1560: 👤 캐릭터 이미지 생성 API
Lines 1564-1890: 🖼️ 삽화 생성 API
Lines 1898-2110: 📝 학습 단어 이미지 생성 API
Lines 2118-2550: 🎯 퀴즈/TTS/번역 API
Lines 2557-2960: 📋 동화책 CRUD (목록, 상세, 생성)
Lines 2964-3250: 🗑️ 동화책 삭제 및 인덱스 관리
Lines 3252-3290: 🌐 이미지 다운로드 프록시
```

**자주 수정하는 부분:**
- `generateImage()` - Line 257: Gemini API 이미지 생성
- `POST /api/generate-character-image` - Line 1460: 캐릭터 이미지
- `POST /api/generate-vocabulary-images` - Line 1898: 학습 단어
- `POST /api/generate-cover` - Line 2867: 표지 이미지
- `DELETE /api/storybooks/:id` - Line 3092: 동화책 삭제

---

### 클라이언트 코드 (app.js - 5390 lines)

**주요 섹션:**
```
Lines 1-800    : ⚙️ 설정 및 초기화 (이미지 설정, 모델 선택)
Lines 800-1200 : 📚 동화책 목록 관리 (로드, 저장, 렌더링, 삭제)
Lines 1200-1800: 🎨 동화책 생성 및 표시
Lines 1800-2200: 👤 캐릭터 관리 (추가, 제거, 높이 조정)
Lines 2200-2900: 📄 페이지 관리 (CRUD, TTS 생성)
Lines 2900-3200: 🖼️ 캐릭터 이미지 생성 + 히스토리
Lines 3200-3700: 🎨 삽화 및 핵심 사물 이미지
Lines 3700-4200: 📝 학습 콘텐츠 (Key Object 참조)
Lines 4200-4700: 📚 학습 단어 이미지 생성
Lines 4700-5390: 📤 업로드 모달 (캐릭터, 표지, 삽화)
```

**자주 수정하는 함수:**
- `generateCharacterReference()` - Line 2923: 캐릭터 이미지 생성
- `generateCoverImage()` - Line 389: 표지 이미지 생성
- `generateSingleVocabularyImage()` - Line 4197: 학습 단어 이미지
- `saveCurrentStorybook()` - Line 2801: 동화책 R2 저장
- `displayStorybook()` - Line 1370: 동화책 UI 렌더링
- `renderPages()` - Line 1850: 페이지 목록 렌더링

---

## 🔍 빠른 검색 방법

### VS Code에서 빠른 이동:
```
Ctrl + G          : 라인 번호로 이동
Ctrl + P          : 파일 검색
Ctrl + Shift + F  : 전체 검색
Ctrl + P, @       : 심볼 검색 (함수 목록)
```

### 터미널에서 빠른 검색:
```bash
# 함수 찾기
grep -n "function generateCharacterReference" app.js

# API 라우트 찾기
grep -n "app.post.*vocabulary" server.js

# 특정 키워드 포함하는 함수 찾기
grep -n "async function.*vocabulary" app.js
```

---

## 🎯 일반적인 작업 흐름

### 1. 이미지 생성 에러 수정
```
1. 클라이언트에서 에러 발생 (app.js)
   → generateCharacterReference (Line 2923)
   → POST /api/generate-character-image 호출

2. 서버 로그 확인 (server.js)
   → POST /api/generate-character-image (Line 1460)
   → generateImage() 호출 (Line 257)
   → Gemini API 에러 확인

3. 에러 처리 개선
   → catch 블록에서 명확한 메시지 추가
   → 429/403 에러에 대한 특별 처리
```

### 2. 새로운 이미지 타입 추가
```
1. server.js에 새 API 라우트 추가
   → app.post('/api/generate-xxx-image', ...)
   → generateImage() 재사용
   → uploadImageToR2() 호출

2. app.js에 생성 함수 추가
   → async function generateXXXImage()
   → axios.post('/api/generate-xxx-image')
   → saveCurrentStorybook() 호출

3. UI에 버튼 추가 (index.html 또는 renderPages())
   → onclick="generateXXXImage()"
```

### 3. 히스토리 기능 추가
```
1. 데이터 구조에 히스토리 배열 추가
   → currentStorybook.xxxImageHistory = []

2. 생성 시 기존 이미지를 히스토리에 추가
   → if (existing) history.unshift(existing)
   → history = history.slice(0, 10)

3. 렌더링 함수에서 히스토리 UI 추가
   → renderXXXImageWithHistory()
   → 썸네일 클릭 → selectXXXImageFromHistory()
```

---

## 🗺️ 모듈 구조 (부분 리팩토링 완료)

```
webapp/
├── src/
│   ├── config/
│   │   └── index.js           ✅ 환경 변수 관리
│   ├── middleware/
│   │   └── auth.js             ✅ API 키 검증
│   └── services/
│       ├── r2.js               ✅ Cloudflare R2 업로드/다운로드
│       └── gemini.js           ✅ Gemini API 이미지 생성
├── server.js                   📝 메인 Express 앱 (3291 lines)
├── public/
│   ├── app.js                  📝 메인 클라이언트 로직 (5390 lines)
│   └── index.html
├── SERVER_GUIDE.js             📚 서버 코드 네비게이션 가이드
└── public/APP_GUIDE.js         📚 클라이언트 코드 네비게이션 가이드
```

**Note:** 전체 리팩토링은 시간이 많이 걸리므로, 핵심 모듈(config, auth, r2, gemini)만 분리했습니다.
기존 `server.js`와 `app.js`는 유지하되, 가이드 파일을 활용하여 빠르게 네비게이션하세요.

---

## 💡 개발 팁

### 디버깅
```javascript
// 서버 로그
console.log('🔧 Debug:', variable);

// 클라이언트 로그  
console.log('🎨 Client:', variable);

// PM2 로그 확인
pm2 logs storybook-generator --nostream --lines 50
```

### 성능 최적화
- 이미지 생성은 비동기로 처리 (await)
- 대용량 배열은 map/filter 대신 for loop 사용
- R2 업로드는 병렬 처리 가능 (Promise.all)

### 에러 처리
- 429 에러: API 할당량 초과 → 명확한 메시지
- 403 에러: API 키 문제 → 새 키 필요
- 500 에러: 서버 내부 에러 → 재시도 로직

---

## 📝 체크리스트

작업 시 확인사항:
- [ ] 에러 메시지가 사용자 친화적인가?
- [ ] 로딩 상태를 UI에 표시하는가?
- [ ] 실패 시 재시도 버튼이 있는가?
- [ ] R2에 저장하는가? (Blob URL 사용 금지)
- [ ] 히스토리가 10개로 제한되는가?
- [ ] Git commit 메시지가 명확한가?

---

**마지막 업데이트: 2025-01-21**
**Version: v20250120-53**
