# 📚 탱고북 저작도구 - Product Requirements Document (PRD)

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 기능](#핵심-기능)
3. [기술 스택](#기술-스택)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [파일 구조](#파일-구조)
6. [API 명세](#api-명세)
7. [데이터 모델](#데이터-모델)
8. [AI 통합](#ai-통합)
9. [사용자 플로우](#사용자-플로우)
10. [개발 가이드](#개발-가이드)

---

## 📖 프로젝트 개요

### 프로젝트명
**탱고북 저작도구 (TangoBook Authoring Tool)**

### 버전
**v12.0.0** (2025-01-21)

### 목적
AI 기반 유아 교육용 동화책 자동 생성 플랫폼으로, 교육자와 부모가 쉽게 맞춤형 동화책을 제작할 수 있도록 지원

### 핵심 가치
- ✨ **AI 자동화**: Gemini 2.5 Flash로 스토리부터 이미지까지 자동 생성
- 🎨 **캐릭터 일관성**: 멀티모달 이미지 참조로 100% 일관성 보장
- 📚 **교육 콘텐츠**: 영어 학습, 퀴즈, 핵심 사물 등 교육 요소 자동 생성
- 💾 **클라우드 저장**: Cloudflare R2 기반 무제한 이미지 저장
- 🚀 **빠른 생성**: 10-12페이지 동화책을 5-10분 내 완성

---

## 🌟 핵심 기능

### 1. 동화책 생성 (Story Generation)

#### 1.1 기본 정보 입력
- **제목**: 동화책 제목 (필수)
- **타겟 연령**: 
  - 4-5세 (유치원)
  - 5-7세 (초등 저학년)
  - 7-8세 (초등 중학년)
- **그림체 선택**:
  - 7가지 프리셋: 현대 일러스트, 수채화, 카툰, 전통 동화책, 애니메이션, 유화, 연필 스케치
  - 커스텀 입력: 자유로운 스타일 지정 (예: "Pixar style 3D animation")
- **참고 내용** (선택): 스토리 생성 시 참조할 내용 입력

#### 1.2 자동 생성 콘텐츠
- **스토리**: 10-12페이지 분량의 창의적인 동화 스토리
- **캐릭터**: 3-8명의 주요 등장인물 자동 생성
  - 이름, 설명, 나이, 역할 포함
  - 캐릭터별 높이 설정 (50-250 pixels)
- **페이지 구조**:
  - 페이지 번호
  - 본문 텍스트
  - 장면 설명 (영어)
  - 구조화된 장면 (캐릭터/배경/분위기)
  - 핵심 사물 목록
- **교육 콘텐츠**:
  - 8개 영어 학습 단어
  - 5-10개 퀴즈 문항
  - 학습 목표 및 교훈

### 2. 캐릭터 레퍼런스 시스템

#### 2.1 캐릭터 관리
- **추가/삭제**: 캐릭터 동적 추가 및 제거
- **정보 수정**: 이름, 설명, 나이, 역할 편집
- **높이 조정**: 50-250 pixels 범위에서 조절
- **프롬프트 커스터마이징**: 각 캐릭터별 생성 프롬프트 수정

#### 2.2 레퍼런스 이미지 생성
- **멀티뷰 레이아웃**:
  - 정면 (center, main pose)
  - 측면 (left side)
  - 3/4 뷰 (right side)
  - 3가지 표정 (happy, surprised, neutral)
- **생성 방식**:
  - 개별 생성: 캐릭터별 개별 생성
  - 배치 생성: 모든 캐릭터 한 번에 생성 (병렬)
- **히스토리 기능** 🆕:
  - 최근 10개 이미지 자동 저장
  - 썸네일 클릭으로 이전 이미지 복원
  - 오래된 이미지 자동 삭제 (R2)
- **업로드 기능** 🆕:
  - 파일 업로드: 로컬 이미지 파일 (JPG, PNG, GIF)
  - URL 입력: 외부 이미지 URL 직접 입력
  - 파일 크기: 최대 5MB

#### 2.3 AI 모델 선택
- **Gemini 3 Pro Image Preview**: 기본 모델
- 설정에서 모델 변경 가능

### 3. 페이지 관리 및 삽화 생성

#### 3.1 페이지 편집
- **텍스트 수정**: 모든 페이지 본문 실시간 편집
- **장면 설명 수정**: 
  - 영어 장면 설명
  - 구조화된 장면 (캐릭터/배경/분위기)
- **페이지 순서 변경**: 드래그 앤 드롭으로 순서 조정
- **페이지 추가/삭제**: 동적 페이지 관리
- **페이지 복제**: 기존 페이지 복사하여 빠른 생성

#### 3.2 삽화 생성
- **캐릭터 일관성 보장**:
  - 레퍼런스 이미지를 직접 참조
  - 멀티모달 이미지 입력으로 100% 일관성
- **생성 방식**:
  - 개별 생성: 페이지별 개별 생성
  - 배치 생성: 모든 페이지 한 번에 생성 (순차)
- **수정사항 입력**: 각 페이지마다 원하는 수정사항 입력
- **히스토리 기능** (TODO):
  - 최근 10개 이미지 저장
  - 이전 버전 복원
- **업로드 기능** 🆕:
  - 파일/URL 업로드 지원

#### 3.3 TTS (Text-to-Speech) 🆕
- **페이지별 음성 생성**: 각 페이지 텍스트를 음성으로 변환
- **모델 선택**: TTS 모델 및 음성 설정
- **음성 다운로드**: 생성된 음성 파일 저장

### 4. 표지 이미지 생성

#### 4.1 프롬프트 자동 생성
- **기본 정보**: 제목, 그림체, 타겟 연령 기반
- **캐릭터 참조**: 선택한 캐릭터들을 표지에 포함
- **커스터마이징**: 프롬프트 직접 수정 가능

#### 4.2 캐릭터 참조 선택
- **체크박스**: 표지에 포함할 캐릭터 선택
- **레퍼런스 이미지**: 선택된 캐릭터의 레퍼런스를 참조하여 생성

#### 4.3 표지 생성
- **자동 생성**: "표지 생성" 버튼 클릭
- **히스토리 기능** 🆕:
  - 최근 10개 표지 저장
  - 썸네일로 이전 표지 복원
- **업로드 기능** 🆕:
  - 파일/URL 업로드 지원

### 5. 교육 콘텐츠

#### 5.1 영어 학습 단어
- **자동 생성**: 8개 단어 자동 선정
- **단어 구성**:
  - 영어 단어
  - 한글 뜻
  - 정의 (definition)
  - 예문 (example)
- **이미지 생성**:
  - 개별 생성: 단어별 개별 이미지 생성
  - 배치 생성: 모든 단어 한 번에 생성
- **핵심 사물 참조** 🆕:
  - 동화책의 key_objects와 매칭
  - 매칭 시 핵심 사물 이미지 재사용
  - "핵심사물" 배지 표시
- **단어 수정**: 각 단어 클릭하여 편집 가능
- **이미지 다운로드**:
  - 개별 다운로드
  - 배치 다운로드 (ZIP)

#### 5.2 핵심 사물 (Key Objects)
- **자동 추출**: 각 페이지에서 중요한 사물 자동 추출
- **이미지 생성**: 핵심 사물별 교육용 이미지 생성
- **학습 단어 연계**: 학습 단어 이미지 생성 시 참조

#### 5.3 퀴즈 생성
- **자동 생성**: 스토리 기반 5-10개 퀴즈
- **퀴즈 유형**: 4지선다형
- **난이도**: 타겟 연령에 맞춤

### 6. 이미지 설정

#### 6.1 이미지 비율
- **옵션**: 1:1, 4:3, 16:9, 3:4, 9:16
- **기본값**: 16:9

#### 6.2 생성 옵션
- **텍스트 제거 강조**: 이미지에 텍스트가 포함되지 않도록 강력 요청
- **캐릭터 일관성 강조**: PIXEL-PERFECT 정확도로 캐릭터 재현
- **추가 프롬프트**: 자유로운 스타일 지시사항 입력
- **이미지 품질**: 표준/고품질 선택

#### 6.3 모델 설정
- **캐릭터 모델**: 캐릭터 레퍼런스 생성 모델
- **삽화 모델**: 페이지 삽화 생성 모델
- **표지 모델**: 표지 이미지 생성 모델
- **학습 단어 모델**: 단어 이미지 생성 모델
- **핵심 사물 모델**: 사물 이미지 생성 모델

### 7. 데이터 관리

#### 7.1 저장 방식
- **Cloudflare R2**: 이미지 및 JSON 데이터 저장
- **LocalStorage 비활성화**: 모든 데이터는 R2에만 저장
- **자동 저장**: 수정 시 자동으로 R2에 업데이트

#### 7.2 동화책 목록
- **조회**: R2에서 동화책 목록 로드
- **선택**: 동화책 클릭하여 편집
- **삭제**: 확인 창 후 동화책 및 관련 이미지 삭제
  - 삭제 확인 창에 제목 표시
  - 삭제 내용 상세 안내 (페이지, 캐릭터, 표지, 콘텐츠)
  - "되돌릴 수 없음" 경고
- **복제**: 기존 동화책 복사하여 새로 생성
- **제목 수정**: 동화책 제목 인라인 편집

#### 7.3 다운로드 기능
- **전체 텍스트 다운로드**: 모든 페이지 텍스트를 .txt 파일로
- **전체 삽화 다운로드**: 모든 페이지 이미지를 ZIP으로
- **개별 다운로드**: 
  - 캐릭터 레퍼런스 이미지
  - 페이지 삽화
  - 표지 이미지
  - 학습 단어 이미지

---

## 🛠️ 기술 스택

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4.18
- **Process Manager**: PM2
- **API Client**: 
  - `@google/generative-ai`: Gemini API 클라이언트
  - `@aws-sdk/client-s3`: Cloudflare R2 (S3 호환)
- **Middleware**:
  - `cors`: CORS 처리
  - `multer`: 파일 업로드
  - `dotenv`: 환경 변수 관리

### Frontend
- **HTML5** + **CSS3**: 시맨틱 마크업
- **TailwindCSS**: 유틸리티 CSS 프레임워크
- **Vanilla JavaScript**: 순수 JavaScript (프레임워크 없음)
- **Axios**: HTTP 클라이언트
- **Font Awesome**: 아이콘
- **Chart.js**: 차트 (예정)

### Storage
- **Cloudflare R2**: 
  - S3 호환 객체 스토리지
  - 이미지 파일 저장
  - JSON 메타데이터 저장
  - 무료 티어: 10GB 저장, 무제한 다운로드

### AI Models
- **Gemini 2.5 Flash**: 
  - 텍스트/스토리 생성
  - 번역
  - 퀴즈 생성
- **Gemini 3 Pro Image Preview**:
  - 캐릭터 레퍼런스 생성
  - 페이지 삽화 생성
  - 표지 이미지 생성
  - 학습 단어 이미지 생성
  - 핵심 사물 이미지 생성

### DevOps
- **Git**: 버전 관리
- **GitHub**: 코드 저장소
- **PM2**: 프로세스 관리 (개발 환경)
- **Deployment**: 
  - Cloudflare Pages (예정)
  - Vercel (현재 미사용)
  - Railway (현재 미사용)

---

## 🏗️ 시스템 아키텍처

### 전체 구조
```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │────────▶│ Express API  │────────▶│  Gemini API  │
│             │◀────────│              │◀────────│              │
└─────────────┘         └──────────────┘         └──────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌──────────────┐
│  R2 Public  │◀────────│ Cloudflare   │
│     URL     │         │      R2      │
└─────────────┘         └──────────────┘
```

### 데이터 플로우

#### 1. 동화책 생성 플로우
```
1. 사용자 입력 (제목, 연령, 그림체)
   ↓
2. POST /api/generate-storybook
   ↓
3. Gemini 2.5 Flash: 스토리 생성 (30-60초)
   ↓
4. JSON 데이터 생성 (캐릭터, 페이지, 교육 콘텐츠)
   ↓
5. POST /api/storybooks: R2에 JSON 저장
   ↓
6. UI 업데이트 및 표시
```

#### 2. 이미지 생성 플로우
```
1. 사용자 "생성" 버튼 클릭
   ↓
2. POST /api/generate-{type}-image
   - 프롬프트 생성 (한글 → 영어 번역)
   - 레퍼런스 이미지 다운로드 (URL → Base64)
   ↓
3. Gemini 3 Pro Image: 이미지 생성 (10-30초)
   - Base64 이미지 반환
   ↓
4. R2 업로드 (Base64 → PNG → R2)
   - 파일명: {id}-{title}-{type}-{name}-{timestamp}.png
   ↓
5. R2 Public URL 반환
   ↓
6. JSON 업데이트 (imageUrl 저장)
   ↓
7. UI 업데이트 (이미지 표시)
```

#### 3. 히스토리 관리 플로우
```
1. 새 이미지 생성 요청
   ↓
2. 기존 이미지 존재 확인
   ↓
3. 기존 이미지를 히스토리에 추가 (imageHistory.unshift)
   ↓
4. 히스토리 길이 체크 (> 10개)
   ↓
5. 오래된 이미지 삭제 (DELETE /api/cleanup-image)
   ↓
6. 히스토리 10개로 제한 (imageHistory.slice(0, 10))
   ↓
7. 새 이미지를 현재 이미지로 설정
   ↓
8. JSON 저장 및 UI 업데이트
```

#### 4. 이미지 업로드 플로우
```
1. 사용자 "업로드" 버튼 클릭
   ↓
2. 모달 열기 (파일/URL 탭)
   ↓
3-A. 파일 업로드:
   - 파일 선택 (최대 5MB)
   - FormData 생성
   - POST /api/upload-image
   - R2에 업로드
   
3-B. URL 입력:
   - URL 입력
   - URL 유효성 검증
   - 서버에서 다운로드 후 R2 업로드
   ↓
4. R2 Public URL 반환
   ↓
5. JSON 업데이트 및 UI 업데이트
```

---

## 📁 파일 구조

### 전체 디렉토리 구조
```
webapp/
├── 📄 server.js                    # Express 메인 서버 (3,291 lines)
├── 📄 ecosystem.config.cjs          # PM2 프로세스 설정
├── 📄 package.json                  # npm 의존성 및 스크립트
├── 📄 .env                          # 환경 변수 (gitignore)
├── 📄 .gitignore                    # Git 제외 파일
│
├── 📂 src/                          # 서버 모듈 (리팩토링 완료)
│   ├── 📂 config/
│   │   └── index.js                 # 환경 변수 관리
│   ├── 📂 middleware/
│   │   └── auth.js                  # API 키 검증 미들웨어
│   └── 📂 services/
│       ├── gemini.js                # Gemini API 서비스
│       └── r2.js                    # Cloudflare R2 서비스
│
├── 📂 public/                       # 프론트엔드 파일
│   ├── 📄 index.html                # 메인 HTML (673 lines)
│   ├── 📄 app.js                    # 메인 JavaScript (5,390 lines)
│   ├── 📄 gemini-client.js          # Gemini 클라이언트 (deprecated)
│   ├── 📄 image-compressor.js       # 이미지 압축 유틸
│   ├── 📄 preview.html              # 동화책 프리뷰 페이지
│   ├── 📄 api-test.html             # API 테스트 페이지
│   ├── 📄 ai-model-pricing.html     # AI 모델 가격 정보
│   └── 📄 APP_GUIDE.js              # 코드 네비게이션 가이드
│
├── 📂 docs/                         # 문서 (마크다운)
│   ├── 📄 README.md                 # 프로젝트 메인 문서
│   ├── 📄 CODE_GUIDE.md             # 코드 네비게이션 가이드
│   ├── 📄 SERVER_GUIDE.js           # 서버 코드 맵
│   ├── 📄 IMAGE_MANAGEMENT_ANALYSIS.md  # 이미지 관리 분석
│   ├── 📄 STORAGE_ARCHITECTURE.md   # 저장소 아키텍처
│   ├── 📄 SECURITY_INCIDENT.md      # 보안 사고 리포트
│   ├── 📄 RAILWAY_DEPLOY_GUIDE.md   # Railway 배포 가이드
│   └── 📄 VERCEL_DEPLOY.md          # Vercel 배포 가이드
│
└── 📂 backups/                      # 백업 파일
    └── server.js.backup             # 리팩토링 전 백업
```

### 주요 파일 설명

#### 서버 파일 (3,291 lines)
```javascript
// server.js
Lines 1-55    : 설정 및 초기화 (imports, R2 클라이언트)
Lines 56-255  : 유틸리티 함수 (인증, R2 업로드)
Lines 257-377 : Gemini API 이미지 생성
Lines 380-1400: 동화책 생성 API
Lines 1460+   : 이미지 생성 API (캐릭터, 삽화, 표지, 학습)
Lines 2557+   : 동화책 CRUD API
Lines 3092+   : 동화책 삭제 및 이미지 정리
```

#### 클라이언트 파일 (5,390 lines)
```javascript
// app.js
Lines 1-800    : 설정 및 초기화
Lines 800-1200 : 동화책 목록 관리
Lines 1200-1800: 동화책 생성 및 표시
Lines 1800-2200: 캐릭터 관리
Lines 2200-2900: 페이지 관리
Lines 2900-3200: 캐릭터 이미지 + 히스토리
Lines 3200-3700: 삽화 및 핵심 사물
Lines 3700-4200: 학습 콘텐츠
Lines 4200-4700: 학습 단어 이미지
Lines 4700-5390: 업로드 모달
```

#### 모듈 파일
```javascript
// src/config/index.js
export const config = {
  PORT, GEMINI_API_KEY, R2: { ... }
}

// src/middleware/auth.js
export function requireAPIKey(req, res, next)

// src/services/gemini.js
export { generateImage, translateText }

// src/services/r2.js
export { 
  uploadImageToR2, uploadBase64ToR2, 
  uploadBufferToR2, uploadJSONToR2,
  deleteImageFromR2, listR2Files 
}
```

---

## 🔌 API 명세

### 인증
모든 API는 `GEMINI_API_KEY` 환경 변수를 요구합니다.

### 엔드포인트 목록

#### 1. 동화책 생성
```http
POST /api/generate-storybook
Content-Type: application/json

Request:
{
  "title": "용감한 토끼의 모험",
  "targetAge": "5-7",
  "artStyle": "Modern Illustration",
  "referenceContent": "토끼가 숲에서 친구를 만나는 이야기" // optional
}

Response:
{
  "success": true,
  "storybook": {
    "id": 1768912723075,
    "title": "용감한 토끼의 모험",
    "targetAge": "5-7",
    "artStyle": "Modern Illustration",
    "coverPrompt": "...",
    "characters": [...],
    "pages": [...],
    "educational_content": {...}
  }
}
```

#### 2. 캐릭터 이미지 생성
```http
POST /api/generate-character-image
Content-Type: application/json

Request:
{
  "character": {
    "name": "토끼",
    "description": "A brave white rabbit...",
    "age": 5
  },
  "artStyle": "Modern Illustration",
  "settings": {
    "aspectRatio": "16:9",
    "enforceNoText": true,
    "enforceCharacterConsistency": true
  },
  "storybookId": "1768912723075",
  "storybookTitle": "용감한 토끼의 모험"
}

Response:
{
  "success": true,
  "imageUrl": "https://pub-xxx.r2.dev/1768912723075-용감한토끼의모험-character-토끼-1737123456789.png"
}
```

#### 3. 페이지 삽화 생성
```http
POST /api/generate-illustration
Content-Type: application/json

Request:
{
  "page": {
    "pageNumber": 1,
    "text": "토끼는 숲속을 걷고 있었어요.",
    "scene_description": "A rabbit walking in the forest",
    "scene_structure": {
      "characters": "토끼가 숲속을 걷고 있음",
      "background": "초록색 숲, 나무들",
      "atmosphere": "밝고 평화로운"
    }
  },
  "artStyle": "Modern Illustration",
  "characterReferences": [
    {
      "name": "토끼",
      "imageUrl": "https://pub-xxx.r2.dev/...",
      "height": 150
    }
  ],
  "settings": {...},
  "storybookId": "1768912723075",
  "storybookTitle": "용감한 토끼의 모험"
}

Response:
{
  "success": true,
  "imageUrl": "https://pub-xxx.r2.dev/1768912723075-용감한토끼의모험-illustration-page1-1737123456789.png"
}
```

#### 4. 표지 이미지 생성
```http
POST /api/generate-cover
Content-Type: application/json

Request:
{
  "storybook": {
    "title": "용감한 토끼의 모험",
    "coverPrompt": "Create a book cover...",
    "artStyle": "Modern Illustration"
  },
  "characterReferences": [...],
  "settings": {...}
}

Response:
{
  "success": true,
  "imageUrl": "https://pub-xxx.r2.dev/1768912723075-용감한토끼의모험-cover-1737123456789.png"
}
```

#### 5. 학습 단어 이미지 생성
```http
POST /api/generate-vocabulary-images
Content-Type: application/json

Request:
{
  "vocabularyItems": [
    {
      "word": "Apple",
      "korean": "사과",
      "definition": "A round fruit",
      "example": "I eat an apple."
    }
  ],
  "artStyle": "Modern Illustration",
  "settings": {...},
  "storybookId": "1768912723075",
  "storybookTitle": "용감한 토끼의 모험"
}

Response:
{
  "success": true,
  "results": [
    {
      "word": "Apple",
      "korean": "사과",
      "imageUrl": "https://pub-xxx.r2.dev/...",
      "success": true,
      "isCharacter": false,
      "isKeyObject": false
    }
  ],
  "total": 1,
  "successful": 1
}
```

#### 6. 이미지 업로드
```http
POST /api/upload-image
Content-Type: multipart/form-data

Request:
FormData {
  image: File,
  storybookId: "1768912723075",
  storybookTitle: "용감한 토끼의 모험",
  type: "character" | "cover" | "illustration",
  characterName: "토끼", // if type=character
  pageNumber: 1 // if type=illustration
}

Response:
{
  "success": true,
  "imageUrl": "https://pub-xxx.r2.dev/..."
}
```

#### 7. 동화책 목록 조회
```http
GET /api/storybooks

Response:
{
  "success": true,
  "storybooks": [
    {
      "id": "1768912723075",
      "title": "용감한 토끼의 모험",
      "createdAt": "2025-01-20T10:30:00Z"
    }
  ]
}
```

#### 8. 동화책 상세 조회
```http
GET /api/storybooks/:id

Response:
{
  "success": true,
  "storybook": { ... }
}
```

#### 9. 동화책 저장
```http
POST /api/storybooks
Content-Type: application/json

Request:
{
  "storybook": { ... }
}

Response:
{
  "success": true,
  "storybook": { ... }
}
```

#### 10. 동화책 삭제
```http
DELETE /api/storybooks/:id

Response:
{
  "success": true,
  "message": "동화책 및 관련 이미지가 삭제되었습니다.",
  "deletedImages": 15
}
```

#### 11. 이미지 정리 (히스토리)
```http
DELETE /api/cleanup-image
Content-Type: application/json

Request:
{
  "imageUrl": "https://pub-xxx.r2.dev/..."
}

Response:
{
  "success": true,
  "message": "이미지가 삭제되었습니다."
}
```

---

## 📊 데이터 모델

### Storybook
```typescript
interface Storybook {
  // 기본 정보
  id: string;                    // Unix timestamp
  title: string;                 // 동화책 제목
  targetAge: string;             // "4-5" | "5-7" | "7-8"
  artStyle: string;              // "Modern Illustration" | ...
  referenceContent?: string;     // 참고 내용
  createdAt: string;             // ISO timestamp
  
  // 표지
  coverPrompt: string;           // 표지 프롬프트
  coverImage?: string;           // R2 URL
  coverImageHistory?: string[];  // 최근 10개
  coverCharacterRefs?: number[]; // 참조 캐릭터 인덱스
  
  // 캐릭터
  characters: Character[];
  
  // 페이지
  pages: Page[];
  
  // 교육 콘텐츠
  educational_content: {
    vocabulary: VocabularyItem[];
    quiz: QuizItem[];
    learning_objectives: string[];
    moral_lesson: string;
  };
  
  // 핵심 사물
  key_objects?: KeyObject[];
  keyObjectImages?: KeyObjectImage[];
  
  // 학습 단어 이미지
  vocabularyImages?: VocabularyImage[];
  
  // 설정
  vocabularyPrompt?: string;     // 학습 단어 커스텀 프롬프트
}
```

### Character
```typescript
interface Character {
  name: string;                  // 캐릭터 이름
  description: string;           // 영어 설명
  age?: number;                  // 나이
  role: string;                  // "주인공" | "조력자" | "악역"
  height: number;                // 50-250 pixels
  
  // 레퍼런스 이미지
  referenceImage?: string;       // R2 URL
  imageHistory?: string[];       // 최근 10개
  customPrompt?: string;         // 커스텀 프롬프트
}
```

### Page
```typescript
interface Page {
  pageNumber: number;
  text: string;                  // 본문 (한글)
  scene_description: string;     // 장면 설명 (영어)
  scene_structure: {
    characters: string;          // 캐릭터 행동 (한글)
    background: string;          // 배경 (한글)
    atmosphere: string;          // 분위기 (한글)
  };
  key_objects?: string;          // 핵심 사물 설명
  
  // 삽화
  illustrationUrl?: string;      // R2 URL
  illustrationHistory?: string[]; // 최근 10개 (TODO)
  customModifications?: string;  // 수정사항
  
  // TTS
  ttsUrl?: string;               // 음성 파일 URL
}
```

### VocabularyItem
```typescript
interface VocabularyItem {
  word: string;                  // 영어 단어
  korean: string;                // 한글 뜻
  definition: string;            // 정의
  example: string;               // 예문
}
```

### VocabularyImage
```typescript
interface VocabularyImage {
  word: string;
  korean: string;
  imageUrl: string;              // R2 URL
  success: boolean;
  isCharacter: boolean;          // 캐릭터와 매칭 여부
  isKeyObject: boolean;          // 핵심 사물과 매칭 여부
}
```

### KeyObject
```typescript
interface KeyObject {
  name: string;                  // 사물 이름 (한글)
  description: string;           // 사물 설명
  pages: number[];               // 등장 페이지
}
```

### KeyObjectImage
```typescript
interface KeyObjectImage {
  objectName: string;
  imageUrl: string;              // R2 URL
  success: boolean;
}
```

### QuizItem
```typescript
interface QuizItem {
  question: string;
  options: string[];             // 4개 선택지
  correctAnswer: number;         // 정답 인덱스 (0-3)
}
```

---

## 🤖 AI 통합

### Gemini API 사용

#### 1. 스토리 생성 (Gemini 2.5 Flash)
```javascript
Model: gemini-2.5-flash
Input: 
  - 제목, 타겟 연령, 그림체, 참고 내용
Output:
  - 10-12 페이지 동화 스토리
  - 3-8명 캐릭터
  - 8개 학습 단어
  - 5-10개 퀴즈
Timeout: 60초
```

#### 2. 이미지 생성 (Gemini 3 Pro Image Preview)
```javascript
Model: gemini-3-pro-image-preview
Input:
  - Text prompt (영어)
  - Reference images (Base64, 최대 3개)
Output:
  - Base64 encoded image
Generation Time: 10-30초
Retry Logic: 최대 3회 (지수 백오프: 2s, 4s, 6s)
```

#### 3. 번역 (Gemini 2.5 Flash)
```javascript
Model: gemini-2.5-flash
Input: 한글 텍스트
Output: 영어 번역
Purpose: 이미지 생성 프롬프트 번역
Fallback: 번역 실패 시 원본 사용
```

### API 할당량 관리

#### 무료 플랜 (Free Tier)
```
Model: gemini-3-pro-image-preview
- 50 requests/day
- 리셋: UTC 자정 (한국 시간 오전 9시)

Error Handling:
- 429 Too Many Requests
  → "⚠️ API 할당량 초과. 잠시 후 다시 시도해주세요. (무료 플랜: 50회/일)"
- 403 Forbidden (API key leaked)
  → "🔐 API 키 문제. 새로운 API 키가 필요합니다."
```

### 프롬프트 엔지니어링

#### 캐릭터 레퍼런스 프롬프트
```
Create a professional character design reference sheet for a children's storybook character.

**Character Name:** {name}
**Character Description (MUST FOLLOW EXACTLY):**
{description}

**Character Age:** {age}

**Art Style:** {artStyle} style for children's book illustration.

**Image Aspect Ratio:** {aspectRatio}

**Layout:** Generate a single image showing the character in multiple views and expressions:
- Front view (center, main pose)
- Side view (left side)
- 3/4 view (right side)
- Three facial expressions at the bottom: happy, surprised, and neutral

**Background:** Clean white background suitable for character reference.

**Quality:** High detail, vibrant colors, soft shading, professional children's book illustration quality. The character should have a warm, friendly, and appealing appearance suitable for young children aged 4-8 years.

**Composition:** Arrange all views in a single cohesive character sheet layout that clearly shows the character's design from different angles.

**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, captions, titles, or character names in the image. Absolutely NO TEXT of any kind. Pure illustration only.
```

#### 페이지 삽화 프롬프트
```
Create a storybook illustration for a children's book page.

**Scene Description:** {scene_description}

**Scene Structure:**
- Characters & Actions: {characters}
- Background: {background}
- Atmosphere: {atmosphere}

**Art Style:** {artStyle}

**Character References (CRITICAL - MUST MATCH EXACTLY):**
{characterReferences.map(char => `
- Character: ${char.name}
  Height in scene: ${char.height} pixels
  IMPORTANT: This character MUST look PIXEL-PERFECT identical to the reference image provided. Match every detail: face shape, eyes, nose, mouth, hair, clothing, colors, proportions.
`)}

**Image Aspect Ratio:** {aspectRatio}

**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, captions, speech bubbles, or character names in the image. Pure illustration only.

{customModifications ? `**Additional Requirements:** ${customModifications}` : ''}
```

---

## 👤 사용자 플로우

### 1. 동화책 생성 플로우
```
시작
  ↓
[새 동화책 만들기] 버튼 클릭
  ↓
제목 입력
  ↓
타겟 연령 선택 (4-5세 / 5-7세 / 7-8세)
  ↓
그림체 선택 (7가지 프리셋 또는 커스텀)
  ↓
참고 내용 입력 (선택사항)
  ↓
[동화책 생성하기] 버튼 클릭
  ↓
AI 스토리 생성 중... (30-60초)
  ↓
동화책 자동 생성 완료
  - 캐릭터 3-8명
  - 페이지 10-12개
  - 학습 단어 8개
  - 퀴즈 5-10개
  ↓
동화책 편집 화면으로 이동
```

### 2. 캐릭터 이미지 생성 플로우
```
동화책 선택
  ↓
캐릭터 섹션으로 스크롤
  ↓
[방법 1] 개별 생성:
  캐릭터 프롬프트 확인/수정
    ↓
  [생성] 버튼 클릭
    ↓
  AI 이미지 생성 (10-30초)
    ↓
  레퍼런스 이미지 표시

[방법 2] 배치 생성:
  [모든 레퍼런스 생성] 버튼 클릭
    ↓
  모든 캐릭터 병렬 생성 (20-60초)
    ↓
  모든 레퍼런스 이미지 표시

[방법 3] 업로드:
  [업로드] 버튼 클릭
    ↓
  모달 열림
    ↓
  [파일 탭] 파일 선택 → 업로드
  [URL 탭] URL 입력 → 업로드
    ↓
  R2에 저장
    ↓
  이미지 표시

히스토리 활용:
  이미지 재생성 시
    ↓
  기존 이미지를 히스토리에 저장
    ↓
  오른쪽에 썸네일 표시 (최대 10개)
    ↓
  썸네일 클릭 → 이전 이미지 복원
```

### 3. 페이지 편집 및 삽화 생성 플로우
```
페이지 섹션으로 스크롤
  ↓
[텍스트 편집]
  각 페이지 텍스트 클릭
    ↓
  인라인 편집
    ↓
  자동 저장

[장면 설명 편집]
  장면 설명 수정
    ↓
  구조화된 장면 수정
    ↓
  자동 저장

[삽화 생성]
  [방법 1] 개별:
    수정사항 입력 (선택)
      ↓
    [생성] 버튼 클릭
      ↓
    AI 삽화 생성 (10-30초)
      ↓
    삽화 표시

  [방법 2] 배치:
    [모든 삽화 생성] 버튼 클릭
      ↓
    모든 페이지 순차 생성 (100-300초)
      ↓
    모든 삽화 표시

  [방법 3] 업로드:
    [업로드] 버튼 → 파일/URL 업로드
      ↓
    삽화 표시
```

### 4. 표지 이미지 생성 플로우
```
표지 섹션으로 스크롤
  ↓
표지 프롬프트 확인/수정
  ↓
참조할 캐릭터 선택 (체크박스)
  ↓
[생성] 버튼 클릭
  ↓
AI 표지 생성 (10-30초)
  ↓
표지 이미지 표시
  ↓
히스토리에서 이전 표지 선택 가능
```

### 5. 학습 단어 이미지 생성 플로우
```
교육 콘텐츠 섹션으로 스크롤
  ↓
학습 단어 목록 확인
  ↓
[핵심 사물 매칭 확인]
  단어가 key_objects와 매칭되면
    ↓
  핵심 사물 이미지 재사용
    ↓
  "핵심사물" 배지 표시

[새 이미지 생성]
  [생성] 버튼 클릭
    ↓
  AI 이미지 생성 (10-30초)
    ↓
  이미지 표시

[배치 생성]
  [모든 단어 이미지 생성] 버튼 클릭
    ↓
  8개 단어 병렬 생성 (20-60초)
    ↓
  모든 이미지 표시
```

### 6. 다운로드 플로우
```
[개별 다운로드]
  이미지 위 [다운로드] 아이콘 클릭
    ↓
  브라우저 다운로드 시작
    ↓
  파일명: {type}_{name}.png

[전체 텍스트 다운로드]
  [전체 텍스트 다운로드] 버튼 클릭
    ↓
  모든 페이지 텍스트를 .txt로 저장
    ↓
  파일명: {title}_텍스트.txt

[전체 삽화 다운로드]
  [전체 삽화 다운로드] 버튼 클릭
    ↓
  모든 페이지 이미지를 순차 다운로드
    ↓
  파일명: {title}_page{n}.png

[학습 단어 배치 다운로드]
  [모든 단어 이미지 다운로드] 버튼 클릭
    ↓
  8개 이미지 순차 다운로드
    ↓
  파일명: {word}_{korean}.png
```

---

## 🚀 개발 가이드

### 개발 환경 설정

#### 1. 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn
- Git
- Gemini API 키
- Cloudflare R2 계정 (선택사항)

#### 2. 설치
```bash
# 저장소 클론
git clone https://github.com/realproto1/ebook3.git
cd ebook3

# 의존성 설치 (300초 타임아웃)
npm install

# .env 파일 생성
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=storybook-images
R2_PUBLIC_URL=https://pub-xxx.r2.dev
EOF
```

#### 3. 개발 서버 실행
```bash
# 빌드 (첫 실행 시)
npm run build

# PM2로 시작
pm2 start ecosystem.config.cjs

# 상태 확인
pm2 list

# 로그 확인 (non-blocking)
pm2 logs storybook-generator --nostream

# 테스트
curl http://localhost:3000
```

#### 4. 포트 관리
```bash
# 포트 3000 정리
fuser -k 3000/tcp 2>/dev/null || true

# 또는 PM2로 정리
pm2 delete all 2>/dev/null || true
```

### 코드 네비게이션

#### 빠른 함수 찾기
```bash
# 1. CODE_GUIDE.md 열기
# 2. 원하는 기능 검색
# 3. 라인 번호 확인
# 4. VS Code에서 Ctrl+G → 라인 번호 입력

# 예: 캐릭터 이미지 생성 함수 찾기
# CODE_GUIDE.md → Line 2923 (app.js)
# server.js → Line 1460 (API)
```

#### 주요 섹션
```
server.js:
  - Line 257: generateImage() - Gemini API
  - Line 1460: POST /api/generate-character-image
  - Line 1898: POST /api/generate-vocabulary-images
  - Line 2867: POST /api/generate-cover
  - Line 3092: DELETE /api/storybooks/:id

app.js:
  - Line 2923: generateCharacterReference()
  - Line 389: generateCoverImage()
  - Line 4197: generateSingleVocabularyImage()
  - Line 2801: saveCurrentStorybook()
  - Line 1370: displayStorybook()
```

### 일반적인 작업

#### 1. 새로운 이미지 타입 추가
```bash
# 1. server.js에 API 추가 (Line 3000+)
app.post('/api/generate-xxx-image', requireAPIKey, async (req, res) => {
  const imageUrl = await generateImage(prompt, referenceImages);
  const r2Url = await uploadImageToR2(imageUrl, filename);
  res.json({ success: true, imageUrl: r2Url });
});

# 2. app.js에 생성 함수 추가 (Line 4500+)
async function generateXXXImage() {
  const response = await axios.post('/api/generate-xxx-image', {});
  currentStorybook.xxxImage = response.data.imageUrl;
  saveCurrentStorybook();
}

# 3. index.html에 버튼 추가
<button onclick="generateXXXImage()">생성</button>
```

#### 2. 히스토리 기능 추가
```javascript
// 1. 데이터 구조에 히스토리 추가
currentStorybook.xxxImageHistory = [];

// 2. 생성 시 기존 이미지를 히스토리에 추가
if (currentStorybook.xxxImage) {
  currentStorybook.xxxImageHistory.unshift(currentStorybook.xxxImage);
  currentStorybook.xxxImageHistory = currentStorybook.xxxImageHistory.slice(0, 10);
  
  // 11번째 이미지 삭제
  if (currentStorybook.xxxImageHistory.length > 10) {
    await axios.delete('/api/cleanup-image', {
      data: { imageUrl: currentStorybook.xxxImageHistory[10] }
    });
  }
}

// 3. 렌더링 함수에서 히스토리 UI 추가
function renderXXXImageWithHistory() {
  const history = currentStorybook.xxxImageHistory || [];
  const historyHTML = history.map((url, idx) => `
    <img src="${url}" onclick="selectXXXImageFromHistory(${idx})" />
  `).join('');
}
```

#### 3. 에러 처리 개선
```javascript
// 429 Rate Limit 에러
if (error.message.includes('429')) {
  errorMessage = '⚠️ API 할당량 초과. 잠시 후 다시 시도해주세요. (무료 플랜: 50회/일)';
}

// 403 API Key 에러
if (error.message.includes('403')) {
  errorMessage = '🔐 API 키 문제. 새로운 API 키가 필요합니다.';
}
```

### Git 워크플로우

#### 1. GitHub 환경 설정
```bash
# GitHub 인증 설정 (첫 실행 시)
# setup_github_environment 도구 사용
```

#### 2. 커밋 가이드라인
```bash
# 브랜치: 항상 main 사용
git checkout main

# 커밋 메시지 형식
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 업데이트
refactor: 코드 리팩토링
style: 코드 스타일 변경
test: 테스트 추가

# 예시
git add .
git commit -m "feat: Add vocabulary image history feature"
git push origin main
```

### 디버깅

#### PM2 로그
```bash
# 일반 로그
pm2 logs storybook-generator --nostream --lines 50

# 에러 로그만
pm2 logs storybook-generator --nostream --err --lines 30

# 특정 키워드 필터
pm2 logs storybook-generator --nostream --lines 100 | grep "429\|403\|error"
```

#### API 테스트
```bash
# 헬스 체크
curl http://localhost:3000/health

# 환경 변수 확인
curl http://localhost:3000/api/debug/env

# 동화책 목록
curl http://localhost:3000/api/storybooks
```

### 배포

#### Cloudflare Pages (예정)
```bash
# 1. Cloudflare API 키 설정
# setup_cloudflare_api_key 도구 사용

# 2. 프로젝트 빌드
npm run build

# 3. Pages 프로젝트 생성
npx wrangler pages project create webapp \
  --production-branch main

# 4. 배포
npx wrangler pages deploy dist --project-name webapp

# 5. 환경 변수 설정
npx wrangler pages secret put GEMINI_API_KEY --project-name webapp
```

### 성능 최적화

#### 1. 이미지 생성 속도
- 병렬 생성: Promise.all 사용
- 재시도 로직: 최대 3회, 지수 백오프
- 타임아웃: 각 생성 30초 제한

#### 2. R2 업로드 최적화
- Buffer 직접 업로드 (Base64 → Buffer → R2)
- 병렬 업로드 지원
- 실패 시 원본 URL fallback

#### 3. 프론트엔드 최적화
- 이미지 lazy loading
- 큰 데이터는 pagination
- R2 URL 직접 참조 (다운로드 비용 0)

---

## 📝 체크리스트

### 코드 작성 시
- [ ] 에러 메시지가 사용자 친화적인가?
- [ ] 로딩 상태를 UI에 표시하는가?
- [ ] 실패 시 재시도 버튼이 있는가?
- [ ] R2에 저장하는가? (Blob URL 사용 금지)
- [ ] 히스토리가 10개로 제한되는가?
- [ ] Git commit 메시지가 명확한가?
- [ ] CODE_GUIDE.md에 라인 번호 업데이트?

### 배포 전
- [ ] .env 파일이 .gitignore에 있는가?
- [ ] API 키가 환경 변수로 설정되었는가?
- [ ] R2 credentials가 올바른가?
- [ ] PM2가 정상 작동하는가?
- [ ] 모든 API 엔드포인트가 테스트되었는가?
- [ ] 에러 처리가 완벽한가?

---

## 🎯 향후 계획

### 단기 (1-2주)
- [ ] 삽화 히스토리 기능 추가
- [ ] TypeScript 마이그레이션
- [ ] 자동 테스트 추가
- [ ] Cloudflare Pages 배포

### 중기 (1-2개월)
- [ ] 사용자 인증 시스템
- [ ] 동화책 공유 기능
- [ ] 다국어 지원 (영어, 중국어)
- [ ] PDF 내보내기 기능

### 장기 (3-6개월)
- [ ] 모바일 앱 개발
- [ ] AI 음성 내레이션
- [ ] 인터랙티브 동화책
- [ ] 구독 모델 도입

---

**마지막 업데이트**: 2025-01-21  
**버전**: v12.0.0  
**상태**: ✅ Active  
**문서 작성자**: AI Assistant with realproto1
