#!/bin/bash

echo "🔗 클립 연결 시작 (재인코딩 방식)..."

# FFmpeg filter_complex를 사용해서 연결
ffmpeg \
  -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 -i clip4.mp4 -i clip5.mp4 \
  -i clip6.mp4 -i clip7.mp4 -i clip8.mp4 -i clip9.mp4 -i clip10.mp4 \
  -i clip11.mp4 -i clip12.mp4 -i clip13.mp4 -i clip14.mp4 -i clip15.mp4 \
  -filter_complex "\
    [0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]\
    [5:v][5:a][6:v][6:a][7:v][7:a][8:v][8:a][9:v][9:a]\
    [10:v][10:a][11:v][11:a][12:v][12:a][13:v][13:a][14:v][14:a]\
    concat=n=15:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 192k \
  -y merged.mp4 2>&1 | tail -10

echo ""
echo "✅ 연결 완료!"
ls -lh merged.mp4
echo ""
echo "📊 동영상 정보:"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 merged.mp4 | awk '{print "총 길이: " int($1) " 초 (" int($1/60) "분 " int($1%60) "초)"}'
