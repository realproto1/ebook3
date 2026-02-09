#!/bin/bash

echo "🎬 가벼운 설정으로 모든 클립 생성 시작..."

for i in {2..15}; do
    echo ""
    echo "📄 클립 ${i} 생성 중..."
    
    # 이미지 파일 찾기
    if [ -f "page${i}.png" ]; then
        IMAGE="page${i}.png"
    else
        IMAGE="page${i}.jfif"
    fi
    
    # 가벼운 설정: 720p, ultrafast preset, crf 28
    ffmpeg -loop 1 -i "$IMAGE" -i "page${i}.wav" \
           -c:v libx264 -preset ultrafast -crf 28 \
           -c:a aac -b:a 128k \
           -pix_fmt yuv420p \
           -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" \
           -shortest -y "clip${i}.mp4" 2>&1 | grep -E "kb/s:" | tail -1
    
    SIZE=$(ls -lh "clip${i}.mp4" | awk '{print $5}')
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "clip${i}.mp4")
    echo "  ✅ 클립 ${i}: ${SIZE}, ${DURATION} 초"
done

echo ""
echo "✅ 모든 클립 생성 완료!"
ls -lh clip*.mp4 | wc -l | xargs echo "총:"
