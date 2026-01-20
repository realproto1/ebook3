# 📦 저장소 아키텍처

## 🎯 저장 위치

### ✅ Cloudflare R2에 저장되는 것:

#### 1. 이미지 파일
- **캐릭터 레퍼런스 이미지**: `character-{name}-{timestamp}.png`
- **페이지 삽화**: `illustration-page{number}-{timestamp}.png`
- **어휘 학습 이미지**: `vocabulary-{word}-{timestamp}.png`

#### 2. 동화책 JSON 데이터
- **파일명**: `storybook-{id}.json`
- **포함 내용**:
  ```json
  {
    "id": "1737351234567",
    "title": "백설공주",
    "targetAge": "5",
    "artStyle": "디즈니 스타일",
    "createdAt": "2026-01-20T07:00:00.000Z",
    "r2JsonUrl": "https://pub-554d78bf...r2.dev/storybook-123.json",
    "characters": [
      {
        "name": "백설공주",
        "description": "아름다운 공주...",
        "role": "주인공",
        "age": "약 16세",
        "height": 160,
        "referenceImage": "https://pub-554d78bf...r2.dev/character-백설공주-123.png"
      }
    ],
    "pages": [
      {
        "pageNumber": 1,
        "text": "옛날 옛적에...",
        "scene_description": "성 안 왕좌에 앉아있는 왕비",
        "scene_structure": {
          "characters": "왕비",
          "background": "웅장한 성 내부",
          "atmosphere": "신비로운 분위기"
        },
        "illustrationImage": "https://pub-554d78bf...r2.dev/illustration-page1-123.png"
      }
    ],
    "theme": "착함의 승리",
    "educational_content": {
      "symbols": ["사과는 유혹을 상징"],
      "activity": "나만의 동화 만들기"
    }
  }
  ```

### ❌ R2에 저장되지 않는 것:

#### TTS 오디오 파일
- **현재 상태**: 임시 생성 후 사라짐
- **향후 계획**: R2에 MP3 파일로 저장 예정

---

## 🔄 데이터 흐름

### 동화책 생성 시:

```
1. 사용자가 제목/연령 입력
   ↓
2. Gemini API로 스토리 생성 (JSON)
   ↓
3. 캐릭터 레퍼런스 이미지 생성
   ↓ (각 이미지)
4. Gemini → 임시 URL → R2 업로드 → 영구 URL
   ↓
5. 페이지 삽화 생성 (병렬/순차)
   ↓ (각 이미지)
6. Gemini → 임시 URL → R2 업로드 → 영구 URL
   ↓
7. 전체 동화책 JSON을 R2에 저장
   ↓
8. 브라우저에 최종 결과 반환
```

---

## 🌐 API 엔드포인트

### 동화책 생성:
```
POST /api/generate-storybook
→ 동화책 JSON + R2 저장
```

### 동화책 목록 조회:
```
GET /api/storybooks
→ R2에서 모든 동화책 메타데이터 조회
```

### 특정 동화책 조회:
```
GET /api/storybooks/:id
→ R2에서 전체 동화책 JSON 다운로드
```

---

## 💾 저장소 크기 예상

### 동화책 1권 기준:
- **JSON 파일**: ~50KB
- **캐릭터 이미지** (5개): ~2.5MB (500KB × 5)
- **페이지 삽화** (12개): ~6MB (500KB × 12)
- **합계**: ~8.5MB

### 무료 티어 (10GB):
- **저장 가능 동화책 수**: 약 1,100권
- **무료 읽기 요청**: 무제한
- **무료 쓰기 요청**: 100만 건/월

---

## 🔍 브라우저 vs R2 저장

### Before (이전):
```
┌─────────────────────────────┐
│  브라우저 localStorage      │
│  - 동화책 JSON (임시)       │
│  - 이미지 URL만 저장         │
│  ❌ 캐시 삭제 시 모두 사라짐│
└─────────────────────────────┘
```

### After (현재):
```
┌─────────────────────────────┐
│  Cloudflare R2 Storage      │
│  ✅ 동화책 JSON (영구)      │
│  ✅ 모든 이미지 (영구)       │
│  ✅ 글로벌 CDN              │
│  ✅ 다른 기기에서도 접근    │
└─────────────────────────────┘
```

---

## 📊 R2 Public URL

### 현재 설정:
```
Base URL: https://pub-554d78bf0f2346cfb850060ac23280a7.r2.dev
Bucket: storybook-images
```

### 파일 접근:
```
이미지: {base_url}/character-백설공주-123.png
JSON: {base_url}/storybook-123.json
```

---

## 🚀 향후 개선 계획

### 1. TTS 오디오 저장
```javascript
// 오디오 파일도 R2에 저장
const audioFilename = `audio-page${pageNumber}-${timestamp}.mp3`;
const audioUrl = await uploadAudioToR2(audioBuffer, audioFilename);
```

### 2. 동화책 삭제 API
```javascript
DELETE /api/storybooks/:id
→ R2에서 JSON 및 관련 이미지 모두 삭제
```

### 3. 동화책 수정 API
```javascript
PUT /api/storybooks/:id
→ R2의 JSON 업데이트
```

### 4. 검색 및 필터링
```javascript
GET /api/storybooks?age=5&keyword=공주
→ 연령별, 키워드별 필터링
```

---

## 💰 비용

### Cloudflare R2 무료 티어:
- ✅ **저장 용량**: 10GB (무료)
- ✅ **읽기 요청**: 무제한 (무료)
- ✅ **쓰기 요청**: 100만 건/월 (무료)
- ✅ **삭제 요청**: 100만 건/월 (무료)

### 예상 월 사용량:
- **동화책 100권 생성**: ~850MB 저장, ~1,500 쓰기 요청
- **월 비용**: **$0** (무료 티어 내)

---

## 🔐 보안

### R2 Public Access:
- ✅ **읽기**: 모든 사람 가능 (Public URL)
- ❌ **쓰기**: API 키 필요 (서버만 가능)
- ❌ **삭제**: API 키 필요 (서버만 가능)

### API 보호:
- ✅ Gemini API Key: 서버 환경 변수
- ✅ R2 Access Key: 서버 환경 변수
- ✅ 클라이언트는 서버 API를 통해서만 접근

---

## 📝 요약

1. ✅ **이미지**: R2에 영구 저장
2. ✅ **동화책 JSON**: R2에 영구 저장
3. ✅ **목록/상세 조회**: R2 API로 제공
4. ⏳ **TTS 오디오**: 향후 R2 저장 예정
5. ✅ **무료**: 10GB까지 완전 무료
