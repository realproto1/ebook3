#!/bin/bash

echo "📥 이미지와 오디오 다운로드 시작..."

# JSON에서 페이지 수 확인
PAGE_COUNT=$(jq '.pages | length' storybook.json)
echo "📚 총 ${PAGE_COUNT}개 페이지"

# 각 페이지의 이미지와 오디오 다운로드
for i in $(seq 0 $((PAGE_COUNT - 1))); do
    PAGE_NUM=$((i + 1))
    echo ""
    echo "📄 페이지 ${PAGE_NUM} 다운로드 중..."
    
    # 이미지 URL 추출
    IMAGE_URL=$(jq -r ".pages[${i}].illustrationImage" storybook.json)
    
    # 오디오 URL 추출
    AUDIO_URL=$(jq -r ".pages[${i}].ttsAudio.url" storybook.json)
    
    # 이미지 다운로드 (확장자 추출)
    IMAGE_EXT="${IMAGE_URL##*.}"
    curl -s "$IMAGE_URL" -o "page${PAGE_NUM}.${IMAGE_EXT}"
    echo "  ✅ 이미지: page${PAGE_NUM}.${IMAGE_EXT} ($(wc -c < page${PAGE_NUM}.${IMAGE_EXT}) bytes)"
    
    # 오디오 다운로드
    curl -s "$AUDIO_URL" -o "page${PAGE_NUM}.wav"
    echo "  ✅ 오디오: page${PAGE_NUM}.wav ($(wc -c < page${PAGE_NUM}.wav) bytes)"
done

echo ""
echo "✅ 다운로드 완료!"
ls -lh page* | head -10
