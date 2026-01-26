#!/bin/bash

# 색상 정의
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   탱고북 에러 모니터링 시작${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 로그 파일 경로
ERROR_LOG="/home/user/.pm2/logs/storybook-generator-error-0.log"
OUT_LOG="/home/user/.pm2/logs/storybook-generator-out-0.log"

# 로그 파일 초기화 (선택사항)
# > "$ERROR_LOG"
# > "$OUT_LOG"

echo -e "${BLUE}📊 모니터링 중: ${NC}"
echo -e "   - Error Log: $ERROR_LOG"
echo -e "   - Output Log: $OUT_LOG"
echo ""
echo -e "${YELLOW}⚡ Ctrl+C 로 종료${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo ""

# 실시간 에러 로그 모니터링
tail -f "$ERROR_LOG" "$OUT_LOG" | while read -r line; do
    # 파일명 헤더 감지
    if [[ $line == "==>"* ]]; then
        echo -e "\n${BLUE}$line${NC}"
        continue
    fi
    
    # 에러 패턴 감지 및 강조
    if [[ $line == *"Error"* ]] || [[ $line == *"error"* ]] || [[ $line == *"ERROR"* ]]; then
        echo -e "${RED}❌ $line${NC}"
    elif [[ $line == *"warn"* ]] || [[ $line == *"WARN"* ]] || [[ $line == *"⚠️"* ]]; then
        echo -e "${YELLOW}⚠️  $line${NC}"
    elif [[ $line == *"success"* ]] || [[ $line == *"✅"* ]] || [[ $line == *"완료"* ]]; then
        echo -e "${GREEN}✅ $line${NC}"
    elif [[ $line == *"generate-storybook"* ]] || [[ $line == *"동화책 생성"* ]]; then
        echo -e "${BLUE}📚 $line${NC}"
    elif [[ $line == *"generate-illustration"* ]] || [[ $line == *"이미지 생성"* ]]; then
        echo -e "${BLUE}🖼️  $line${NC}"
    elif [[ $line == *"503"* ]] || [[ $line == *"overload"* ]]; then
        echo -e "${RED}🔥 [503 OVERLOAD] $line${NC}"
    elif [[ $line == *"524"* ]] || [[ $line == *"timeout"* ]] || [[ $line == *"TIMEOUT"* ]]; then
        echo -e "${RED}⏱️  [TIMEOUT] $line${NC}"
    elif [[ $line == *"Gemini"* ]]; then
        echo -e "${YELLOW}🤖 $line${NC}"
    else
        echo "$line"
    fi
done
