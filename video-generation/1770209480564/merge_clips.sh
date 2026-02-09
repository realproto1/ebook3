#!/bin/bash

echo "🔗 클립 연결 시작..."

# filelist.txt 생성
echo "📝 filelist.txt 생성 중..."
for i in {1..15}; do
    echo "file 'clip${i}.mp4'" >> filelist.txt
done

cat filelist.txt

echo ""
echo "🎬 FFmpeg로 클립 연결 중..."

# FFmpeg: 모든 클립 연결
ffmpeg -f concat -safe 0 \
       -i filelist.txt \
       -c copy \
       -y \
       merged.mp4 2>&1 | grep -E "Duration|time=|Output" | tail -5

echo ""
echo "✅ 연결 완료!"
ls -lh merged.mp4
ffmpeg -i merged.mp4 2>&1 | grep Duration
