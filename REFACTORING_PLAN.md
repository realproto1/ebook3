# Server.js 리팩토링 계획

## 현재 상태
- **파일 크기**: 4212줄
- **엔드포인트**: 40개
- **문제점**: 
  - 모든 코드가 하나의 파일에 집중
  - 유지보수 어려움
  - 코드 재사용 어려움
  - 테스트 어려움

## 제안 구조

```
server/
├── index.js                    # 메인 서버 파일 (간소화)
├── config/
│   ├── env.js                 # 환경 변수 관리
│   └── r2.js                  # R2 클라이언트 설정
├── middleware/
│   ├── auth.js                # API 키 검증
│   └── upload.js              # Multer 설정
├── routes/
│   ├── storybooks.js          # 동화책 CRUD
│   ├── generation.js          # AI 생성 (스토리, 이미지, TTS)
│   ├── upload.js              # 업로드 관련
│   ├── translation.js         # 번역 관련
│   ├── viewer.js              # 뷰어 관련
│   ├── music.js               # 배경음악 관련
│   ├── folders.js             # 폴더 관련
│   └── comments.js            # 댓글 관련
├── services/
│   ├── gemini.js              # Gemini AI 서비스
│   ├── r2Storage.js           # R2 스토리지 서비스
│   ├── imageGeneration.js     # 이미지 생성 로직
│   ├── ttsGeneration.js       # TTS 생성 로직
│   └── storyGeneration.js     # 스토리 생성 로직
└── utils/
    ├── helpers.js             # 공통 유틸리티
    └── validators.js          # 입력 검증

public/                         # 기존 유지
```

## 주요 개선사항

### 1. 라우트 분리
```javascript
// routes/storybooks.js
import express from 'express';
const router = express.Router();

router.get('/', getStorybooks);
router.get('/:id', getStorybookById);
router.post('/', createStorybook);
router.delete('/:id', deleteStorybook);

export default router;
```

### 2. 서비스 계층 분리
```javascript
// services/r2Storage.js
export class R2StorageService {
  async uploadImage(imageUrl, filename) { ... }
  async getStorybooks() { ... }
  async saveStorybook(storybook) { ... }
}
```

### 3. 설정 분리
```javascript
// config/r2.js
export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  // ...
};
```

## 마이그레이션 단계

### Phase 1: 설정 분리 (가장 먼저)
- [ ] config/env.js
- [ ] config/r2.js

### Phase 2: 미들웨어 분리
- [ ] middleware/auth.js
- [ ] middleware/upload.js

### Phase 3: 서비스 분리
- [ ] services/r2Storage.js
- [ ] services/gemini.js

### Phase 4: 라우트 분리
- [ ] routes/storybooks.js (가장 중요)
- [ ] routes/upload.js
- [ ] routes/generation.js
- [ ] 나머지 라우트들

### Phase 5: 메인 파일 간소화
- [ ] server/index.js (최종 통합)

## 예상 효과
- ✅ 코드 가독성 향상
- ✅ 유지보수 용이
- ✅ 테스트 가능
- ✅ 재사용성 향상
- ✅ 협업 편의성

## 즉시 시작 여부
지금 바로 리팩토링을 시작하시겠습니까?
아니면 현재 기능 개발이 완료된 후에 진행하시겠습니까?
