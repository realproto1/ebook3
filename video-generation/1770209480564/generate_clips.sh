#!/bin/bash

echo "🎬 페이지별 비디오 클립 생성 시작..."

PAGE_COUNT=$(jq '.pages | length' storybook.json)

for i in $(seq 1 ${PAGE_COUNT}); do
    echo ""
    echo "📄 페이지 ${i} 클립 생성 중..."
    
    # 이미지 파일 찾기 (png 또는 jfif)
    if [ -f "page${i}.png" ]; then
        IMAGE="page${i}.png"
    else
        IMAGE="page${i}.jfif"
    fi
    
    # FFmpeg: 이미지 + 오디오 → 비디오 클립
    # -loop 1: 이미지를 반복
    # -i: 입력 파일
    # -c:v libx264: H.264 비디오 코덱
    # -tune stillimage: 정지 이미지 최적화
    # -c:a aac: AAC 오디오 코덱
    # -b:a 192k: 오디오 비트레이트
    # -pix_fmt yuv420p: 유튜브 호환 픽셀 포맷
    # -vf scale: 1920x1080 해상도, 비율 유지, 검은 패딩
    # -shortest: 오디오 길이에 맞춤
    
    ffmpeg -loop 1 -i "$IMAGE" \
           -i "page${i}.wav" \
           -c:v libx264 -tune stillimage \
           -c:a aac -b:a 192k \
           -pix_fmt yuv420p \
           -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
           -shortest \
           -y \
           "clip${i}.mp4" 2>&1 | grep -E "Duration|time=|Output" | tail -3
    
    echo "  ✅ 클립 ${i} 생성 완료: $(ls -lh clip${i}.mp4 | awk '{print $5}')"
done

echo ""
echo "✅ 모든 클립 생성 완료!"
ls -lh clip*.mp4 | wc -l | xargs echo "총 클립 개수:"
