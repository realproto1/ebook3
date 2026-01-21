# 이미지 관리 현황 분석 및 개선 제안

## 📊 현재 상황

### 1. 파일명 규칙 (R2 Storage)

#### 일관성 있는 파일명
```javascript
// ✅ 캐릭터 이미지
${storybookId}-${storybookTitle}-character-${characterName}-${timestamp}.png
예: 1768912723075-엄지공주-character-엄지공주-1737123456789.png

// ✅ 삽화 이미지
${storybookId}-${storybookTitle}-illustration-page${pageNum}-${timestamp}.png
예: 1768912723075-엄지공주-illustration-page1-1737123456789.png

// ✅ 학습 단어 이미지
${storybookId}-${storybookTitle}-vocabulary-${word}-${timestamp}.png
예: 1768912723075-엄지공주-vocabulary-apple-1737123456789.png

// ✅ Key Object 이미지
${storybookId}-${storybookTitle}-keyobject-${objectName}-${timestamp}.png
예: 1768912723075-엄지공주-keyobject-꽃-1737123456789.png

// ✅ 표지 이미지
${storybookId}-${storybookTitle}-cover-${timestamp}.png
예: 1768912723075-엄지공주-cover-1737123456789.png
```

#### 일관성 없는 파일명
```javascript
// ❌ 파일 업로드 (type만 표시)
${storybookId}-${type}-${pageNumber || 'cover'}-${timestamp}.${ext}
예: 1768912723075-character-0-1737123456789.png
// 문제: storybookTitle과 구체적인 대상(캐릭터명 등) 누락
```

### 2. 동화책 삭제 시 이미지 삭제

#### ✅ 현재 구현 완료
```javascript
app.delete('/api/storybooks/:id', async (req, res) => {
  // 1. JSON 파일에서 동화책 정보 로드
  // 2. 동화책 ID와 제목으로 시작하는 모든 이미지 파일 검색
  //    - Prefix: `${id}-${titleSafe}-`
  //    - ListObjectsV2Command 사용
  // 3. 찾은 모든 이미지 파일 삭제 (PNG, JPG, JPEG)
  // 4. JSON 파일 삭제
  // 5. 인덱스 업데이트
}
```

**장점:**
- ✅ 동화책 삭제 시 관련 이미지 자동 삭제
- ✅ Prefix 기반 검색으로 효율적
- ✅ 최대 1000개 파일까지 처리 가능

**단점:**
- ⚠️ 파일명이 일관되지 않으면 누락 가능
- ⚠️ 1000개 이상 이미지 시 페이징 필요

### 3. 히스토리 이미지 관리

#### 현재 구조 (JSON)
```javascript
// 동화책 JSON 파일
{
  "id": "1768912723075",
  "title": "엄지 공주",
  "characters": [
    {
      "name": "엄지공주",
      "referenceImage": "https://r2.dev/xxx-character-xxx.png",
      "imageHistory": [
        "https://r2.dev/xxx-character-xxx-old1.png",
        "https://r2.dev/xxx-character-xxx-old2.png"
      ]
    }
  ],
  "coverImage": "https://r2.dev/xxx-cover-xxx.png",
  "coverImageHistory": [
    "https://r2.dev/xxx-cover-xxx-old1.png"
  ]
}
```

**장점:**
- ✅ 구조가 간단하고 직관적
- ✅ 동화책과 이미지 관계가 명확
- ✅ R2만으로 완전한 시스템 구축 (DB 불필요)
- ✅ 백업/복원이 간단 (JSON 파일 하나)

**단점:**
- ⚠️ 히스토리 이미지도 R2에 저장되어 용량 증가
- ⚠️ JSON 파일 크기가 커질 수 있음
- ⚠️ 여러 동화책에서 같은 이미지 재사용 불가

---

## 🔄 개선 제안

### 제안 1: 파일 업로드 API 파일명 통일 ⭐⭐⭐ (권장)

**문제:**
```javascript
// 현재: type만 표시
${storybookId}-${type}-${pageNumber}-${timestamp}.${ext}
```

**개선:**
```javascript
// 개선안: 다른 API와 동일한 패턴
// 캐릭터 업로드
${storybookId}-${storybookTitle}-character-${characterIndex}-${timestamp}.${ext}

// 표지 업로드
${storybookId}-${storybookTitle}-cover-${timestamp}.${ext}

// 삽화 업로드
${storybookId}-${storybookTitle}-illustration-page${pageNumber}-${timestamp}.${ext}
```

**구현 위치:** `server.js` 라인 377-379

---

### 제안 2: 히스토리 이미지 자동 정리 ⭐⭐

**목표:** 오래된 히스토리 이미지 자동 삭제로 저장 공간 절약

**방법:**
```javascript
// 현재 이미지를 히스토리에 추가할 때
if (character.imageHistory && character.imageHistory.length >= 10) {
  // 가장 오래된 히스토리 이미지 URL 추출
  const oldestImageUrl = character.imageHistory[9];
  
  // R2에서 삭제
  const key = oldestImageUrl.split('/').pop();
  await deleteFromR2(key);
  
  // 배열에서 제거
  character.imageHistory = character.imageHistory.slice(0, 9);
}
```

**장점:**
- ✅ 저장 공간 절약
- ✅ 최대 10개 히스토리 유지

**단점:**
- ⚠️ 삭제된 이미지는 복구 불가

---

### 제안 3: Database vs JSON 비교

#### Option A: 현재 방식 유지 (JSON + R2) ⭐⭐⭐ (권장)

**현재 구조:**
```
R2 Storage:
├── storybook-index.json (동화책 목록)
├── storybook-{id}.json (각 동화책 데이터)
└── {id}-{title}-{type}-{name}-{timestamp}.png (이미지들)
```

**장점:**
- ✅ 추가 인프라 불필요 (R2만)
- ✅ 백업/복원 간단
- ✅ 비용 저렴 (R2만 과금)
- ✅ 현재 시스템과 완벽히 호환
- ✅ Cloudflare Pages 환경에 최적

**단점:**
- ⚠️ 복잡한 쿼리 어려움
- ⚠️ 동화책 수가 많아지면 인덱스 로딩 느려짐 (수천 개 이상)

#### Option B: Database 도입 (D1 or 외부 DB)

**구조:**
```sql
-- 동화책 테이블
CREATE TABLE storybooks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  data JSON, -- 나머지 데이터
  created_at DATETIME,
  updated_at DATETIME
);

-- 이미지 테이블
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storybook_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'character', 'cover', 'illustration', etc.
  target_name TEXT, -- 캐릭터명, 페이지번호 등
  url TEXT NOT NULL,
  is_current BOOLEAN DEFAULT 1, -- 현재 사용 중인 이미지
  created_at DATETIME,
  FOREIGN KEY (storybook_id) REFERENCES storybooks(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_images_storybook ON images(storybook_id);
CREATE INDEX idx_images_current ON images(storybook_id, is_current);
```

**장점:**
- ✅ 복잡한 쿼리 가능 (검색, 필터링, 정렬)
- ✅ 이미지 메타데이터 관리 용이
- ✅ 히스토리 관리 명확
- ✅ 대량 동화책 처리 효율적 (수만 개 이상)

**단점:**
- ❌ 추가 인프라 필요 (D1 or 외부 DB)
- ❌ 복잡도 증가
- ❌ 비용 증가
- ❌ Cloudflare D1 제약사항:
  - 무료: 5GB 스토리지, 5M reads/day
  - Workers에서만 접근 가능
  - 로컬 개발 시 제약

---

## 📋 최종 권장사항

### 현재 규모 (동화책 < 1000권): JSON 방식 유지 ⭐⭐⭐

**이유:**
1. **간단함:** 추가 인프라 불필요
2. **충분함:** 현재 요구사항 만족
3. **비용:** R2만 사용으로 저렴
4. **호환성:** Cloudflare Pages에 최적화

**즉시 적용 가능한 개선:**
1. ✅ 파일 업로드 API 파일명 통일 (필수)
2. ✅ 히스토리 이미지 자동 정리 (선택)
3. ✅ 삭제 로직 개선 (페이징 추가, 선택)

### 미래 확장 (동화책 > 1000권): Database 고려

**언제 전환?**
- 동화책 1000권 이상
- 복잡한 검색/필터링 필요
- 사용자별 동화책 관리 필요
- 협업 기능 필요

**추천 Database:**
1. **Cloudflare D1** (Serverless SQLite)
   - Cloudflare Pages와 완벽 통합
   - 무료 티어 충분
2. **Supabase** (PostgreSQL)
   - REST API 제공
   - 실시간 기능
   - 무료 티어 500MB

---

## 🚀 즉시 구현 가능한 개선안

### 1. 파일 업로드 API 파일명 통일 (5분)

```javascript
// server.js 라인 377-379 수정
const timestamp = Date.now();
const ext = req.file.originalname.split('.').pop();

// type에 따라 파일명 생성
let filename;
if (type === 'character') {
  filename = `${storybookId}-character-${characterIndex || 'new'}-${timestamp}.${ext}`;
} else if (type === 'cover') {
  filename = `${storybookId}-cover-${timestamp}.${ext}`;
} else if (type === 'illustration') {
  filename = `${storybookId}-illustration-page${pageNumber}-${timestamp}.${ext}`;
} else {
  // 기본값
  filename = `${storybookId}-${type}-${pageNumber || 'unknown'}-${timestamp}.${ext}`;
}
```

### 2. 히스토리 이미지 정리 함수 추가 (10분)

```javascript
// server.js에 추가
async function cleanupOldHistoryImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes(R2_PUBLIC_URL)) return;
  
  try {
    const key = imageUrl.replace(`${R2_PUBLIC_URL}/`, '');
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key
    });
    
    await r2Client.send(command);
    console.log(`🗑️ Cleaned up old history image: ${key}`);
  } catch (error) {
    console.warn(`⚠️ Failed to cleanup history image:`, error.message);
  }
}

// 캐릭터 이미지 생성 시 (server.js 라인 1489 근처)
if (character.imageHistory && character.imageHistory.length >= 10) {
  const oldestImageUrl = character.imageHistory[9];
  await cleanupOldHistoryImage(oldestImageUrl);
  character.imageHistory = character.imageHistory.slice(0, 9);
}
```

---

## 📝 결론

**현재 시스템 (JSON + R2)은 적합합니다!**

**즉시 개선 항목:**
1. ✅ 파일 업로드 API 파일명 통일 → **필수**
2. ✅ 히스토리 이미지 자동 정리 → **권장**

**나중에 고려:**
- 동화책 1000권 이상 시 Database 전환 검토
- 현재는 JSON 방식이 최적의 선택

**추정 저장 용량:**
- 동화책 100권 × (20페이지 + 5캐릭터 + 표지) × 500KB = ~13GB
- R2 무료: 10GB/월
- R2 유료: $0.015/GB → 100권 = $0.20/월 (매우 저렴)
