# 탱고북 저작도구 (Tangobook Author Tool)

AI 기반 유아 교육용 동화책 자동 생성 플랫폼

## 📖 프로젝트 개요

**탱고북 저작도구**는 Gemini AI를 활용하여 맞춤형 동화책을 자동으로 생성하는 웹 애플리케이션입니다. 캐릭터 일관성을 유지하면서 고품질의 삽화, TTS, 퀴즈, 배경음악까지 제공하는 올인원 동화책 제작 도구입니다.

## 🌟 주요 기능

### 1. AI 동화책 생성
- **자동 스토리 생성**: Gemini 2.5 Flash 기반 창의적인 동화 스토리
- **연령별 맞춤 콘텐츠**: 4-5세, 5-7세, 7-8세 연령대별 최적화
- **참고 내용 입력**: 기존 스토리를 참조하여 새로운 동화책 생성
- **다양한 그림체**: 디즈니, 픽사, 수채화, 카툰, 전통 동화책, 유화 등
- **커스텀 그림체**: 직접 입력으로 원하는 스타일 지정

### 2. 캐릭터 레퍼런스 시스템
- **멀티모달 이미지 참조**: Gemini Image로 일관된 캐릭터 생성
- **캐릭터 관리**: 이름 편집, 키 설정, 추가, 삭제 기능
- **프롬프트 커스터마이징**: 각 캐릭터별 프롬프트 수정 가능
- **히스토리 관리**: 이전 생성 이미지 보관 및 선택
- **일괄 생성**: 모든 캐릭터 레퍼런스 한 번에 생성

### 3. 표지 이미지 생성
- **커스텀 프롬프트**: 표지 설명 자유롭게 작성
- **캐릭터 참조**: 선택한 캐릭터를 참조하여 표지 생성
- **비율 선택**: 4:3, 3:4, 16:9, 9:16, 1:1 지원
- **히스토리 관리**: 이전 표지 버전 보관 및 복원
- **업로드 기능**: 직접 제작한 표지 업로드 가능

### 4. Key Objects (핵심 사물) 시스템
- **스토리 일관성**: 중요한 물건들을 미리 생성하여 일관성 유지
- **크기 관리**: Small/Medium/Large 및 cm 단위 크기 설정
- **설명 편집**: 각 사물의 이름, 한글명, 설명, 예문 수정 가능
- **일괄 생성**: 모든 Key Object 이미지 한 번에 생성
- **일괄 업로드**: 준비된 이미지들을 순서대로 일괄 업로드

### 5. 페이지 삽화 생성
- **구조화된 장면 설명**: 캐릭터&행동, 배경, 분위기로 세분화
- **텍스트 편집**: 모든 페이지 텍스트 실시간 수정 (다국어 지원)
- **수정사항 입력**: 각 페이지마다 수정 요청사항 입력
- **캐릭터 일관성**: 레퍼런스와 Key Object를 참조하여 100% 일관성 유지
- **일괄 생성**: 병렬/순차 생성 모드 선택 가능
- **히스토리 관리**: 이전 버전 이미지 보관 및 선택
- **일괄 업로드**: 페이지별 이미지 일괄 업로드

### 6. TTS (Text-to-Speech)
- **다중 TTS 엔진**: Gemini TTS, Minimax TTS, ElevenLabs TTS 지원
- **음성 선택**: 다양한 음성 캐릭터 선택 가능
- **음성 설정**: 톤, 속도, 스타일 커스터마이징
- **다국어 지원**: 한국어, 영어, 일본어, 중국어 등
- **일괄 생성**: 모든 페이지 TTS 한 번에 생성
- **업로드 기능**: 직접 녹음한 오디오 업로드
- **일괄 업로드**: 페이지별 오디오 일괄 업로드

### 7. 배경음악
- **사전 제작 음악**: 다양한 분위기의 배경음악 라이브러리
- **음악 미리듣기**: 선택 전 미리듣기 기능
- **음악 선택**: 동화책에 어울리는 배경음악 선택
- **업로드 기능**: 직접 제작한 배경음악 업로드

### 8. 퀴즈 생성
- **자동 퀴즈 생성**: Key Objects 기반 자동 퀴즈 생성
- **다양한 문제**: 순서 맞추기, 낱말 찾기, 어휘 학습 등
- **난이도 선택**: 쉬움/보통/어려움
- **정답 확인**: 퀴즈 정답 미리보기

### 9. 다국어 번역
- **자동 번역**: Gemini 번역 API로 고품질 번역
- **지원 언어**: 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어
- **언어 추가/삭제**: 필요한 언어만 선택하여 관리
- **일괄 번역**: 모든 페이지 한 번에 번역
- **TTS 지원**: 번역된 텍스트도 TTS 생성 가능

### 10. 다운로드 기능
- **전체 텍스트**: 모든 페이지 텍스트를 .txt 파일로 저장
- **전체 오디오**: 모든 TTS 오디오 일괄 다운로드
- **전체 삽화**: 모든 페이지 이미지 일괄 다운로드
- **개별 다운로드**: 각 이미지/오디오 개별 저장
- **캐릭터 레퍼런스**: 모든 캐릭터 레퍼런스 일괄 다운로드
- **Key Object 이미지**: 모든 Key Object 이미지 일괄 다운로드

## 🛠️ 기술 스택

### Backend
- **Node.js** + **Express**: RESTful API 서버
- **Cloudflare R2**: 이미지/오디오 파일 스토리지
- **Gemini AI**: 스토리, 이미지, TTS 생성

### Frontend
- **HTML5** + **TailwindCSS**: 반응형 UI
- **Modular JavaScript**: 28개 모듈로 구성된 클린 아키텍처
- **Axios**: HTTP 클라이언트
- **R2 Storage**: 데이터 영속성 (60권 이상 동화책 관리)

### AI Models
- **Gemini 2.5 Flash**: 텍스트/스토리 생성
- **Gemini 3 Pro Image**: 이미지 생성 (Nano Banana Pro)
- **Gemini 2.5 Flash TTS**: 음성 합성
- **Minimax TTS**: 고품질 다국어 TTS
- **ElevenLabs TTS**: 프리미엄 TTS

### Architecture (리팩토링 완료)
- **28개 모듈**: 단일 파일 9,365줄 → 28개 모듈 14,690줄
- **코드 감소**: 30.7% (2,880줄 감소)
- **Services (11개)**: ImageService, TTSService, TranslationService, QuizService, MusicService, DownloadService, SettingsService, ValidationService, CoverService, UploadService, DisplayService
- **Managers (3개)**: CharacterManager, PageManager, StorybookManager
- **Utils (4개)**: UIHelper, audio, dom, storage
- **Games (4개)**: MemoryMatch, StoryQuiz, StorySequence, WordWriting

## 📦 설치 및 실행

### 요구사항
- Node.js 18 이상
- npm
- **Gemini API 키** (필수)
- **Cloudflare R2 계정** (스토리지)

### API 키 발급

1. **Gemini API 키**: https://makersuite.google.com/app/apikey
2. **Cloudflare R2**: Cloudflare 대시보드에서 R2 활성화

### 설치

```bash
# 저장소 클론
git clone https://github.com/realproto1/ebook3.git
cd ebook3

# 의존성 설치
npm install

# .env 파일 생성
cp .env.example .env

# .env 파일 편집하여 API 키 입력
# GEMINI_API_KEY=your_actual_api_key_here
# R2_ACCOUNT_ID=your_r2_account_id
# R2_ACCESS_KEY_ID=your_r2_access_key
# R2_SECRET_ACCESS_KEY=your_r2_secret_key
# R2_BUCKET_NAME=your_bucket_name
```

### 개발 서버 실행

```bash
# PM2 사용 (권장)
pm2 start ecosystem.config.cjs

# 직접 실행
npm start
```

서버는 `http://localhost:3000`에서 실행됩니다.

## 🎯 사용 방법

### 1. 동화책 생성
1. "새 동화책 만들기" 클릭
2. 제목, 타겟 연령, 그림체 선택
3. "동화책 생성하기" 버튼 클릭
4. AI가 스토리, 캐릭터, 페이지, Key Objects를 자동 생성

### 2. 캐릭터 레퍼런스 생성
1. 각 캐릭터의 키(height) 설정 (선택사항)
2. "모든 레퍼런스 생성" 클릭
3. 생성된 이미지 확인 및 다운로드

### 3. 표지 생성
1. 참조할 캐릭터 선택
2. 표지 프롬프트 작성 또는 수정
3. 비율 선택 (권장: 3:4 세로)
4. "표지 생성" 클릭

### 4. Key Objects 생성
1. 각 사물의 크기(cm) 확인 및 수정
2. "모든 이미지 생성" 클릭
3. 생성된 이미지 확인

### 5. 페이지 삽화 생성
1. 각 페이지의 텍스트 및 장면 설명 확인/수정
2. "모든 삽화 생성 (병렬)" 클릭 (빠름) 또는 "순차 생성" (안정적)
3. 생성된 삽화 확인 및 히스토리에서 선택

### 6. TTS 생성
1. TTS 엔진 및 음성 선택
2. 음성 설정 조정 (선택사항)
3. "모든 TTS 생성" 클릭
4. 각 페이지에서 오디오 재생 테스트

### 7. 번역 (선택사항)
1. "언어 추가" 클릭
2. 원하는 언어 선택
3. "모든 페이지 번역" 클릭
4. 번역된 텍스트 확인 및 수정

### 8. 퀴즈 생성 (선택사항)
1. 난이도 선택
2. "퀴즈 생성" 클릭
3. 생성된 퀴즈 미리보기

### 9. 다운로드
- **전체 텍스트**: 모든 페이지 텍스트 저장
- **전체 오디오**: 모든 TTS 다운로드
- **전체 삽화**: 모든 이미지 다운로드

## 📊 프로젝트 구조

```
webapp/
├── server.js              # Express 서버 + AI API
├── package.json           # 프로젝트 메타데이터
├── ecosystem.config.cjs   # PM2 설정
├── .gitignore            # Git 제외 파일
├── README.md             # 프로젝트 문서
└── public/
    ├── author.html       # 메인 HTML
    ├── app.js            # 메인 JavaScript (6,485줄)
    └── js/
        ├── config/       # 설정 파일
        │   └── models.js
        ├── controllers/  # 컨트롤러
        │   └── EditorController.js
        ├── core/         # 핵심 기능
        │   └── api.js
        ├── games/        # 게임 모듈 (4개)
        ├── managers/     # 매니저 (3개)
        │   ├── CharacterManager.js
        │   ├── PageManager.js
        │   └── StorybookManager.js
        ├── models/       # 데이터 모델
        │   └── Storybook.js
        ├── services/     # 서비스 (11개)
        │   ├── CoverService.js
        │   ├── DisplayService.js
        │   ├── DownloadService.js
        │   ├── ImageService.js
        │   ├── MusicService.js
        │   ├── QuizService.js
        │   ├── SettingsService.js
        │   ├── StoryService.js
        │   ├── TranslationService.js
        │   ├── TTSService.js
        │   ├── UploadService.js
        │   └── ValidationService.js
        └── utils/        # 유틸리티 (4개)
            ├── UIHelper.js
            ├── audio.js
            ├── dom.js
            └── storage.js
```

## 🔧 주요 API 엔드포인트

### 스토리 생성
- `POST /api/generate-storybook` - 동화책 스토리 자동 생성

### 이미지 생성
- `POST /api/generate-character-image` - 캐릭터 레퍼런스 생성
- `POST /api/generate-cover` - 표지 이미지 생성
- `POST /api/generate-key-object` - Key Object 이미지 생성
- `POST /api/generate-illustration` - 페이지 삽화 생성

### TTS 생성
- `POST /api/generate-tts` - TTS 오디오 생성
- `POST /api/generate-all-tts` - 모든 페이지 TTS 일괄 생성

### 번역
- `POST /api/translate-page` - 단일 페이지 번역
- `POST /api/translate-all-pages` - 모든 페이지 일괄 번역

### 퀴즈
- `POST /api/generate-quiz` - Key Objects 기반 퀴즈 생성

### 스토리지 (R2)
- `GET /api/storybooks` - 모든 동화책 목록 조회
- `POST /api/storybooks` - 동화책 저장
- `DELETE /api/storybooks/:id` - 동화책 삭제
- `POST /api/upload-image` - 이미지 업로드
- `POST /api/upload-tts` - TTS 오디오 업로드
- `POST /api/upload-background-music` - 배경음악 업로드

## 🌐 배포

### Production
- **URL**: (배포 예정)
- **GitHub**: https://github.com/realproto1/ebook3

## ⚠️ 중요 안내

### R2 스토리지
- 현재 **60권 이상의 동화책**이 R2에 저장되어 있습니다
- 평균 로드 시간: 1.2초 (20ms/권)
- 이미지, 오디오 파일 모두 R2에 저장
- 데이터 백업 권장

### API 키 보안
- **절대 API 키를 Git에 커밋하지 마세요**
- `.env` 파일은 `.gitignore`에 포함되어 있습니다
- API 키가 유출되면 즉시 새 키를 발급받으세요
- 프로덕션 환경에서는 환경 변수로 API 키를 설정하세요

## 🚀 최근 업데이트 (리팩토링)

### 코드 구조 개선
- **Before**: 단일 파일 9,365줄
- **After**: 28개 모듈 14,690줄 (app.js 6,485줄)
- **감소**: 2,880줄 (30.7%)

### 수정된 버그 (10개)
1. 중복 변수 선언 제거
2. 잔재 코드 제거 (145줄)
3. Key Object description undefined 오류
4. Key Object API 형식 호환성
5. MusicService axios 직접 사용
6. 드래그 앤 드롭 핸들러 전역 노출
7. 드래그 앤 드롭 순서 변경 정상화
8. 문법 오류 수정
9. handleArtStyleChange 전역 노출
10. 21개 HTML 함수 전역 노출

### 성능 개선
- **모듈화율**: 56%
- **유지보수성**: 극대 향상
- **코드 가독성**: 대폭 개선

## 📝 라이선스

MIT License

## 👨‍💻 개발자

- **프로젝트 관리**: realproto1
- **AI 엔진**: Google Gemini 2.5 Flash + Gemini 3 Pro Image

## 🤝 기여

이슈 및 풀 리퀘스트를 환영합니다!

## 📞 문의

- GitHub Issues: https://github.com/realproto1/ebook3/issues

---

**마지막 업데이트**: 2026-02-03  
**버전**: 14.0.0  
**상태**: ✅ Active Development
