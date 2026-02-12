#!/usr/bin/env python3
"""
MoviePy를 사용한 Instagram 동영상 생성
자동 줄바꿈 및 한글 지원
"""
import sys
import json
from moviepy import *
from moviepy.video.VideoClip import TextClip, ImageClip, ColorClip
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip

def create_clip(image_path, audio_path, title, subtitle, duration, width, height, output_path):
    """
    Instagram 스타일 비디오 클립 생성
    
    Args:
        image_path: 이미지 파일 경로
        audio_path: 오디오 파일 경로 (None 가능)
        title: 제목 텍스트
        subtitle: 자막 텍스트
        duration: 클립 길이 (초)
        width: 영상 너비
        height: 영상 높이
        output_path: 출력 파일 경로
    """
    
    # 한글 폰트 경로
    font_path = '/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf'
    
    # 1. 검은 배경
    background = ColorClip(size=(width, height), color=(0, 0, 0), duration=duration)
    
    # 2. 이미지 로드 및 리사이즈
    image = ImageClip(image_path)
    max_image_height = 700
    
    # 이미지 비율 유지하며 리사이즈
    if image.h > max_image_height:
        image = image.resized(height=max_image_height)
    if image.w > width:
        image = image.resized(width=width)
    
    # 이미지 중앙 배치 (y=150에서 시작)
    image = image.with_position(('center', 150)).with_duration(duration)
    
    # 3. 제목 텍스트 (상단)
    title_clip = TextClip(
        text=title,
        font=font_path,
        font_size=60,
        color='white',
        size=(width - 80, None),
        method='caption'
    ).with_position(('center', 40)).with_duration(duration)
    
    # 4. 자막 텍스트 (하단, 자동 줄바꿈)
    subtitle_clip = TextClip(
        text=subtitle,
        font=font_path,
        font_size=38,
        color='white',
        size=(width - 80, None),  # 너비 1000px (좌우 40px 여백), 높이 자동
        method='caption'          # 자동 줄바꿈
    ).with_position(('center', 870)).with_duration(duration)
    
    # 5. 모든 클립 합성
    video = CompositeVideoClip([
        background,
        image,
        title_clip,
        subtitle_clip
    ], size=(width, height))
    
    # 6. 오디오 추가 (있는 경우)
    if audio_path:
        audio = AudioFileClip(audio_path)
        video = video.with_audio(audio)
    
    # 7. 비디오 출력
    video.write_videofile(
        output_path,
        fps=25,
        codec='libx264',
        audio_codec='aac',
        audio_bitrate='192k',
        preset='fast',
        logger=None  # 로그 출력 최소화
    )
    
    print(f"✅ 클립 생성 완료: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 create_instagram_video.py <config_json>")
        sys.exit(1)
    
    # JSON 설정 파일 로드
    config_path = sys.argv[1]
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 클립 생성
    create_clip(
        image_path=config['image_path'],
        audio_path=config.get('audio_path'),
        title=config['title'],
        subtitle=config['subtitle'],
        duration=config['duration'],
        width=config['width'],
        height=config['height'],
        output_path=config['output_path']
    )
