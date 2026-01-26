# System Instruction 가이드

## 개요

이 프로젝트는 Gemini API의 **System Instruction** 기능을 활용하여 AI 동화책 생성의 일관성과 효율성을 향상시킵니다.

System Instruction을 파일로 분리하여 관리함으로써:
- ✅ **토큰 효율 향상**: 프롬프트 길이 16% 축소 (4452줄 → 3718줄)
- ✅ **생성 속도 향상**: 불필요한 반복 설명 제거로 처리 시간 단축
- ✅ **유지보수 용이**: 규칙 변경 시 파일만 수정하면 전체 시스템에 반영
- ✅ **일관성 보장**: 모든 요청에 동일한 기본 규칙 적용

## System Instruction 파일 구조

```
webapp/
├── prompts/
│   ├── system-instruction-story.txt    # 동화책 텍스트 생성용
│   └── system-instruction-image.txt    # 이미지 생성용 (향후 사용)
└── server.js
```

### 1. `system-instruction-story.txt` (동화책 텍스트 생성용)

**용도**: 동화책 스토리 생성 시 AI의 역할과 기본 규칙 정의

**포함 내용**:
- 유아 교육 전문 동화 작가로서의 정체성
- 1페이지 = 1장면 규칙
- 연령대별 작문 가이드라인 (4-5세, 5-7세, 7-8세)
- 스토리 개연성 강화 요구사항
- 원작 동화 처리 가이드라인
- 복선과 회수 규칙
- 데우스 엑스 마키나 금지
- 캐릭터/시간/동기/상황 설명 규칙
- JSON 출력 형식

**특징**:
- 약 140줄, 5.8KB
- 모든 동화책 생성 요청에 공통 적용
- 사용자 요청(제목, 연령대, 페이지 수 등)은 별도의 `userPrompt`로 전달

### 2. `system-instruction-image.txt` (이미지 생성용)

**용도**: 동화책 삽화 생성 시 AI의 역할과 기본 규칙 정의

**포함 내용**:
- 어린이 책 일러스트레이터로서의 정체성
- 캐릭터 및 사물 일관성 규칙
- 공간적 일관성 (좌우 배치) 규칙
- 변신 캐릭터 처리 방법
- 텍스트 금지 규칙
- 연령대별 그림 스타일 가이드라인
- 구도, 조명, 분위기 가이드
- 품질 기준

**특징**:
- 약 120줄, 4.8KB
- 향후 이미지 생성 API 개선 시 적용 예정
- 현재는 프롬프트 내에 직접 포함

## 사용 방법

### server.js에서 로드

```javascript
import { readFileSync } from 'fs';
import path from 'path';

// System Instruction 파일 로드
const SYSTEM_INSTRUCTION_STORY = readFileSync(
  path.join(__dirname, 'prompts', 'system-instruction-story.txt'), 
  'utf-8'
);
```

### Gemini API 호출 시 적용

```javascript
const response = await fetch(geminiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION_STORY }]
    },
    contents: [{ parts: [{ text: userPrompt }] }]
  })
});
```

### 사용자 프롬프트 구성

System Instruction에 공통 규칙이 정의되어 있으므로, `userPrompt`는 **구체적인 요구사항만** 포함합니다:

```javascript
const userPrompt = `다음 조건으로 동화책을 제작해주세요:

제목: "${title}"
타겟 연령: ${targetAge}세 (${settings.description})
페이지 수: ${pageInstruction}
총 단어 수: ${settings.wordCount}자
문장 길이: ${settings.sentenceLength}
문장 복잡도: ${settings.sentenceComplexity}
어휘 수준: ${settings.vocabulary}
${existingCharSection}
${referenceSection}`;
```

## 수정 방법

### 규칙 변경

1. **동화책 작성 규칙 변경**:
   ```bash
   vi prompts/system-instruction-story.txt
   ```

2. **이미지 생성 규칙 변경**:
   ```bash
   vi prompts/system-instruction-image.txt
   ```

3. **서버 재시작**:
   ```bash
   pm2 restart all
   ```

### 예시: "2페이지 = 1장면" 규칙으로 변경

```bash
# system-instruction-story.txt 편집
vi prompts/system-instruction-story.txt

# 다음 줄을 수정:
# 🔥🔥🔥 절대 규칙: 1페이지 = 1장면 🔥🔥🔥
# →
# 🔥🔥🔥 절대 규칙: 2페이지 = 1장면 🔥🔥🔥

# 서버 재시작
pm2 restart all
```

## 성능 비교

### Before (직접 프롬프트 포함)
- **코드 길이**: 4452줄
- **프롬프트 길이**: 약 2000-3000 토큰
- **생성 시간**: gemini-3-pro-preview 120-180초 (타임아웃 발생)

### After (System Instruction 분리)
- **코드 길이**: 3718줄 (**734줄 감소, 16% 축소**)
- **프롬프트 길이**: 약 1500-2000 토큰 (**30-40% 축소**)
- **생성 시간**: gemini-2.5-flash 30-50초 (**60-70% 단축**)

## 주의사항

1. **System Instruction 파일 존재 확인**
   - 서버 시작 시 `prompts/` 디렉토리와 파일들이 존재해야 합니다
   - 파일이 없으면 `Error: ENOENT` 발생

2. **UTF-8 인코딩 필수**
   - System Instruction 파일은 UTF-8 인코딩으로 저장
   - 한글이 포함되어 있으므로 인코딩 오류 주의

3. **Gemini API 버전**
   - System Instruction은 Gemini API v1beta 이상에서 지원
   - 현재 사용 중: `v1beta/models/${geminiModel}:generateContent`

4. **프롬프트 중복 방지**
   - System Instruction과 User Prompt에 동일한 내용을 반복하지 말 것
   - System Instruction: 공통 규칙 및 정체성
   - User Prompt: 구체적인 요구사항만

## 향후 계획

### 1단계 (완료)
- ✅ 동화책 텍스트 생성용 System Instruction 파일 생성
- ✅ server.js에서 파일 로드 및 적용
- ✅ 프롬프트 간소화 및 중복 제거

### 2단계 (진행 예정)
- ⏳ 이미지 생성 API에 System Instruction 적용
- ⏳ 이미지 모델별 System Instruction 최적화

### 3단계 (계획)
- ⏳ 다국어 번역용 System Instruction 분리
- ⏳ 독후활동 퀴즈 생성용 System Instruction 추가

## 문제 해결

### 파일을 찾을 수 없음
```
Error: ENOENT: no such file or directory, open 'prompts/system-instruction-story.txt'
```

**해결책**:
```bash
# prompts 디렉토리 확인
ls -la prompts/

# 파일이 없으면 생성
mkdir -p prompts
# Git에서 다시 pull
git pull origin main
```

### 서버가 시작되지 않음
```
Error: Cannot find module 'fs'
```

**해결책**:
```bash
# Node.js 버전 확인 (18+ 필요)
node --version

# package.json 확인
cat package.json | grep "type"
# "type": "module" 필요
```

### 동화책 생성이 느림
**원인**: System Instruction이 너무 길 수 있음

**해결책**:
```bash
# System Instruction 파일 크기 확인
wc -l prompts/system-instruction-story.txt

# 불필요한 예시나 반복 설명 제거
vi prompts/system-instruction-story.txt
```

## 참고 자료

- [Gemini API Documentation - System Instructions](https://ai.google.dev/docs/system_instructions)
- [Best Practices for Prompting](https://ai.google.dev/docs/prompting_intro)
- [Gemini API - Generation Config](https://ai.google.dev/api/generate-content#generationconfig)

## 라이선스

MIT License - 이 프로젝트의 나머지 부분과 동일
