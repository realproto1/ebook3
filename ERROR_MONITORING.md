# 탱고북 에러 모니터링 가이드

## 📊 사용 가능한 스크립트

### 1. 실시간 에러 모니터링 (`monitor-errors.sh`)

**용도**: 에러가 발생하는 순간 실시간으로 확인

```bash
cd /home/user/webapp
./monitor-errors.sh
```

**기능**:
- ❌ 에러 메시지 빨간색 강조
- ⚠️  경고 메시지 노란색 강조
- ✅ 성공 메시지 초록색 강조
- 🤖 Gemini API 관련 메시지 노란색
- 🔥 503 Overload 빨간색 강조
- ⏱️  Timeout 빨간색 강조
- 📚 동화책 생성 파란색
- 🖼️  이미지 생성 파란색

**종료**: `Ctrl + C`

---

### 2. 에러 로그 분석 (`analyze-errors.sh`)

**용도**: 최근 에러를 통계적으로 분석

```bash
cd /home/user/webapp

# 기본: 최근 100줄 분석
./analyze-errors.sh

# 최근 200줄 분석
./analyze-errors.sh 200

# 최근 500줄 분석
./analyze-errors.sh 500
```

**분석 항목**:
1. **에러 통계**: 총 에러, 경고, 타임아웃, 오버로드, Gemini 에러 횟수
2. **주요 에러 타입**: axios 에러, parts 에러, OTHER 에러, 503, 524 등
3. **최근 에러 메시지**: 최대 10개의 최근 에러
4. **API 호출 통계**: 동화책/이미지/TTS 생성 요청 횟수
5. **Gemini API 응답 통계**: STOP, OTHER, SAFETY 횟수
6. **재시도 통계**: 재시도 시도 횟수
7. **최근 성공 메시지**: 최대 5개의 성공 로그
8. **권장 조치사항**: 발견된 문제에 대한 해결 방법

---

## 🚀 사용 시나리오

### 시나리오 1: 동화책 생성 중 에러 발생

```bash
# 터미널 1: 실시간 모니터링 시작
cd /home/user/webapp
./monitor-errors.sh

# 터미널 2: 웹 브라우저에서 동화책 생성 시도
# (에러 발생 시 터미널 1에서 실시간 확인)
```

### 시나리오 2: 에러 발생 후 분석

```bash
# 에러 발생 후 분석
cd /home/user/webapp
./analyze-errors.sh 200

# 출력 예시:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📈 에러 통계
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ❌ 총 에러: 15
# ⚠️  경고: 8
# ⏱️  타임아웃: 2
# 🔥 오버로드 (503): 5
# 🤖 Gemini 에러: 10
```

### 시나리오 3: PM2 로그 직접 확인

```bash
# 최근 50줄 로그 확인 (non-blocking)
pm2 logs --nostream --lines 50

# 에러 로그만 확인
pm2 logs --nostream --lines 100 --err

# 출력 로그만 확인
pm2 logs --nostream --lines 100 --out
```

---

## 🔍 주요 에러 패턴

### 1. **axios is not defined**
```
ReferenceError: axios is not defined
```
**원인**: server.js에서 axios import 누락  
**해결**: server.js 상단에 `import axios from 'axios';` 추가

### 2. **parts is not an array**
```
❌ parts is not an array: undefined undefined
Invalid response structure: parts is not an array
```
**원인**: Gemini API 응답 구조 문제  
**해결**: 이미 수정 완료 (finishReason: OTHER 처리)

### 3. **503 Model Overloaded**
```
Gemini Error: {
  "error": {
    "code": 503,
    "message": "The model is overloaded. Please try again later.",
    "status": "UNAVAILABLE"
  }
}
```
**원인**: Gemini API 서버 과부하  
**해결**: 자동 재시도 (3초, 6초, 9초 간격)

### 4. **524 Timeout**
```
Request failed with status code 524
```
**원인**: Cloudflare 타임아웃 (100초 초과)  
**해결**: 
- 더 빠른 모델 사용 (`gemini-2.5-flash`)
- 프롬프트 축소
- 비동기 처리 (백그라운드 작업)

### 5. **GEMINI_OTHER_ERROR**
```
⚠️ finishReason: OTHER with empty content
GEMINI_OTHER_ERROR: 이미지 생성 중 일시적 오류가 발생했습니다.
```
**원인**: Gemini API 일시적 오류  
**해결**: 자동 재시도 (1초, 2초, 3초 간격)

---

## 📝 로그 파일 위치

```bash
# PM2 로그 디렉토리
cd /home/user/.pm2/logs

# 에러 로그
cat storybook-generator-error-0.log

# 출력 로그
cat storybook-generator-out-0.log

# PM2 메인 로그
cat pm2.log
```

---

## 🛠️ 유용한 명령어

```bash
# 서버 재시작
cd /home/user/webapp && pm2 restart all

# 포트 3000 정리
fuser -k 3000/tcp 2>/dev/null || true

# 서버 상태 확인
pm2 status

# 서버 로그 실시간 보기 (blocking)
pm2 logs

# 서버 로그 최근 100줄 (non-blocking)
pm2 logs --nostream --lines 100

# 에러 키워드 검색
pm2 logs --nostream --lines 200 | grep -i error

# API 호출 검색
pm2 logs --nostream --lines 200 | grep -i "generate-storybook\|generate-illustration"
```

---

## 💡 팁

1. **실시간 모니터링**: 동화책 생성 전에 `./monitor-errors.sh` 실행
2. **에러 분석**: 에러 발생 후 `./analyze-errors.sh 200`으로 통계 확인
3. **로그 초기화**: 테스트 전 로그 초기화 하려면:
   ```bash
   > /home/user/.pm2/logs/storybook-generator-error-0.log
   > /home/user/.pm2/logs/storybook-generator-out-0.log
   ```
4. **Git 커밋 전**: `./analyze-errors.sh`로 에러 없는지 확인

---

## 🎯 다음 단계

에러 패턴 확인 후:
1. **axios 에러**: server.js에 axios import 추가
2. **503 Overload**: 잠시 후 재시도 (자동 재시도 작동 중)
3. **524 Timeout**: 모델을 `gemini-2.5-flash`로 변경
4. **parts 에러**: 이미 수정 완료 (최신 코드 사용)

---

**작성일**: 2026-01-26  
**버전**: 1.0.0
