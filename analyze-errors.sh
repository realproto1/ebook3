#!/bin/bash

# 색상 정의
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   탱고북 에러 로그 분석${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 로그 파일 경로
ERROR_LOG="/home/user/.pm2/logs/storybook-generator-error-0.log"
OUT_LOG="/home/user/.pm2/logs/storybook-generator-out-0.log"

# 분석할 라인 수 (기본값 100)
LINES=${1:-100}

echo -e "${BLUE}📊 최근 ${LINES}줄 분석 중...${NC}"
echo ""

# 임시 파일에 최근 로그 저장
TEMP_LOG=$(mktemp)
tail -n "$LINES" "$ERROR_LOG" "$OUT_LOG" > "$TEMP_LOG" 2>/dev/null

# 1. 에러 통계
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📈 에러 통계${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ERROR_COUNT=$(grep -i "error" "$TEMP_LOG" | wc -l)
WARNING_COUNT=$(grep -i "warn" "$TEMP_LOG" | wc -l)
TIMEOUT_COUNT=$(grep -iE "timeout|524" "$TEMP_LOG" | wc -l)
OVERLOAD_COUNT=$(grep -iE "503|overload" "$TEMP_LOG" | wc -l)
GEMINI_ERROR_COUNT=$(grep -i "gemini.*error\|gemini_other_error" "$TEMP_LOG" | wc -l)

echo -e "${RED}❌ 총 에러: $ERROR_COUNT${NC}"
echo -e "${YELLOW}⚠️  경고: $WARNING_COUNT${NC}"
echo -e "${RED}⏱️  타임아웃: $TIMEOUT_COUNT${NC}"
echo -e "${RED}🔥 오버로드 (503): $OVERLOAD_COUNT${NC}"
echo -e "${RED}🤖 Gemini 에러: $GEMINI_ERROR_COUNT${NC}"
echo ""

# 2. 주요 에러 타입별 분류
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔍 주요 에러 타입${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# axios 에러
AXIOS_ERROR=$(grep -c "axios is not defined" "$TEMP_LOG")
if [ "$AXIOS_ERROR" -gt 0 ]; then
    echo -e "${RED}📦 axios is not defined: $AXIOS_ERROR 회${NC}"
fi

# parts 에러
PARTS_ERROR=$(grep -c "parts is not an array" "$TEMP_LOG")
if [ "$PARTS_ERROR" -gt 0 ]; then
    echo -e "${RED}🔧 parts is not an array: $PARTS_ERROR 회${NC}"
fi

# Gemini OTHER 에러
OTHER_ERROR=$(grep -c "GEMINI_OTHER_ERROR\|finishReason: OTHER" "$TEMP_LOG")
if [ "$OTHER_ERROR" -gt 0 ]; then
    echo -e "${YELLOW}🤖 Gemini OTHER Error: $OTHER_ERROR 회${NC}"
fi

# 503 Model Overloaded
OVERLOAD=$(grep -c "model is overloaded\|503.*UNAVAILABLE" "$TEMP_LOG")
if [ "$OVERLOAD" -gt 0 ]; then
    echo -e "${RED}🔥 Model Overloaded (503): $OVERLOAD 회${NC}"
fi

# 524 Timeout
TIMEOUT=$(grep -c "524" "$TEMP_LOG")
if [ "$TIMEOUT" -gt 0 ]; then
    echo -e "${RED}⏱️  Cloudflare 524 Timeout: $TIMEOUT 회${NC}"
fi

# 이미지 생성 실패
IMAGE_FAIL=$(grep -c "Image generation.*fail\|이미지 생성.*실패" "$TEMP_LOG")
if [ "$IMAGE_FAIL" -gt 0 ]; then
    echo -e "${RED}🖼️  이미지 생성 실패: $IMAGE_FAIL 회${NC}"
fi

# 텍스트 생성 실패
TEXT_FAIL=$(grep -c "스토리 생성 실패\|generate-storybook.*error" "$TEMP_LOG")
if [ "$TEXT_FAIL" -gt 0 ]; then
    echo -e "${RED}📚 텍스트 생성 실패: $TEXT_FAIL 회${NC}"
fi

echo ""

# 3. 최근 에러 메시지 (최대 10개)
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 최근 에러 메시지 (최대 10개)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

grep -iE "error|fail|실패" "$TEMP_LOG" | grep -v "no error" | tail -10 | while read -r line; do
    echo -e "${RED}❌ $line${NC}"
done

echo ""

# 4. API 호출 통계
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌐 API 호출 통계${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

STORYBOOK_GEN=$(grep -c "generate-storybook\|동화책 생성 시작" "$TEMP_LOG")
ILLUSTRATION_GEN=$(grep -c "generate-illustration\|Image generation" "$TEMP_LOG")
TTS_GEN=$(grep -c "generate-tts\|TTS 생성" "$TEMP_LOG")

echo -e "${BLUE}📚 동화책 생성 요청: $STORYBOOK_GEN 회${NC}"
echo -e "${BLUE}🖼️  이미지 생성 요청: $ILLUSTRATION_GEN 회${NC}"
echo -e "${BLUE}🔊 TTS 생성 요청: $TTS_GEN 회${NC}"

echo ""

# 5. Gemini API 응답 통계
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🤖 Gemini API 응답 통계${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FINISH_STOP=$(grep -c "finishReason.*STOP\|Finish Reason: STOP" "$TEMP_LOG")
FINISH_OTHER=$(grep -c "finishReason.*OTHER\|Finish Reason: OTHER" "$TEMP_LOG")
FINISH_SAFETY=$(grep -c "finishReason.*SAFETY\|blocked by safety" "$TEMP_LOG")

echo -e "${GREEN}✅ STOP (정상): $FINISH_STOP 회${NC}"
echo -e "${YELLOW}⚠️  OTHER (일시적 오류): $FINISH_OTHER 회${NC}"
echo -e "${RED}🚫 SAFETY (차단): $FINISH_SAFETY 회${NC}"

echo ""

# 6. 재시도 통계
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔄 재시도 통계${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RETRY_COUNT=$(grep -c "Retrying\|재시도" "$TEMP_LOG")
echo -e "${YELLOW}🔄 재시도 시도: $RETRY_COUNT 회${NC}"

echo ""

# 7. 최근 성공 메시지
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}✅ 최근 성공 메시지 (최대 5개)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

grep -iE "success|성공|완료|generated successfully" "$TEMP_LOG" | tail -5 | while read -r line; do
    echo -e "${GREEN}✅ $line${NC}"
done

echo ""

# 8. 권장 조치사항
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}💡 권장 조치사항${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$AXIOS_ERROR" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  axios 모듈 누락: server.js에서 axios import 필요${NC}"
fi

if [ "$PARTS_ERROR" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Gemini API 응답 구조 문제: parts 검증 로직 확인 필요${NC}"
fi

if [ "$OVERLOAD" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Gemini API 과부하: 재시도 로직 작동 중, 잠시 후 다시 시도하세요${NC}"
fi

if [ "$TIMEOUT" -gt 0 ]; then
    echo -e "${RED}❌ 타임아웃 발생: 프롬프트 축소 또는 더 빠른 모델(gemini-2.5-flash) 사용 권장${NC}"
fi

if [ "$OTHER_ERROR" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Gemini OTHER 에러 빈번: API 상태 확인 필요${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   분석 완료${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}💡 실시간 모니터링: ./monitor-errors.sh${NC}"
echo -e "${BLUE}💡 더 많은 로그 보기: ./analyze-errors.sh 200${NC}"
echo ""

# 임시 파일 삭제
rm -f "$TEMP_LOG"
