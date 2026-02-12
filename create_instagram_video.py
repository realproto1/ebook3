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

def create_clip(image_path, audio_path, title, subtitle, tts_duration, page_gap, total_duration, width, height, output_path):
    """
    Instagram 스타일 비디오 클립 생성
    
    Args:
        image_path: 이미지 파일 경로
        audio_path: 오디오 파일 경로 (None 가능)
        title: 제목 텍스트
        subtitle: 자막 텍스트
        tts_duration: TTS 오디오 실제 길이 (초)
        page_gap: 페이지 간격 (초) - 이 시간 동안 TTS 멈춤
        total_duration: 전체 클립 길이 (초) = tts_duration + page_gap
        width: 영상 너비
        height: 영상 높이
        output_path: 출력 파일 경로
    """
    
    # 한글 폰트 경로
    font_path = '/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf'
    
    # 1. 검은 배경
    background = ColorClip(size=(width, height), color=(0, 0, 0), duration=total_duration)
    
    # 2. 이미지 로드 및 리사이즈
    image = ImageClip(image_path)
    max_image_height = 650  # 이미지 높이 줄여서 자막 공간 확보
    
    # 이미지 비율 유지하며 리사이즈
    if image.h > max_image_height:
        image = image.resized(height=max_image_height)
    if image.w > width:
        image = image.resized(width=width)
    
    # 이미지 중앙 배치 (y=150에서 시작)
    image = image.with_position(('center', 150)).with_duration(total_duration)
    
    # 3. 제목 텍스트 (상단)
    title_clip = TextClip(
        text=title,
        font=font_path,
        font_size=60,
        color='white',
        size=(width - 80, None),
        method='caption'
    ).with_position(('center', 40)).with_duration(total_duration)
    
    # 4. 자막 텍스트 (하단, 자동 줄바꿈)
    # 개선: 폰트 크기 증가 (38→42), 너비 증가 (1000→1020), 위치 상승 (870→820)
    subtitle_clip = TextClip(
        text=subtitle,
        font=font_path,
        font_size=42,             # 폰트 크기 증가
        color='white',
        size=(width - 60, None),  # 너비 1020px (좌우 30px 여백으로 확장), 높이 자동
        method='caption',         # 자동 줄바꿈
        interline=10              # 줄 간격 (양수로 변경: 10px)
    ).with_position(('center', 820)).with_duration(total_duration)  # 위치 상승
    
    # 5. 모든 클립 합성
    video = CompositeVideoClip([
        background,
        image,
        title_clip,
        subtitle_clip
    ], size=(width, height))
    
    # 6. 오디오 추가 (있는 경우)
    # 중요: TTS는 tts_duration 길이만큼만 재생, pageGap 동안은 무음
    if audio_path:
        audio = AudioFileClip(audio_path)
        # TTS 오디오를 tts_duration 길이로 자르기 (pageGap 제외)
        # 주의: subclipped의 end_time은 duration보다 작아야 하므로 0.01초 빼기
        if tts_duration < audio.duration:
            audio = audio.subclipped(0, tts_duration - 0.01)
        # tts_duration이 audio.duration과 같거나 크면 자르지 않음
        
        # 중요: pageGap > 0이면 TTS 뒤에 무음 추가
        # TTS: 0~tts_duration, 무음: tts_duration~total_duration
        if page_gap > 0:
            from moviepy.audio.AudioClip import AudioClip
            # 무음 클립 생성 (page_gap 길이)
            silence = AudioClip(lambda t: 0, duration=page_gap)
            # TTS와 무음을 연결
            from moviepy.audio.fx.MultiplyVolume import MultiplyVolume
            audio = audio.with_duration(tts_duration)  # TTS 길이 명시
            # concatenate_audioclips 사용
            try:
                from moviepy.audio.AudioClip import concatenate_audioclips
                audio = concatenate_audioclips([audio, silence])
            except:
                # MoviePy 버전에 따라 import 경로가 다를 수 있음
                from moviepy.audio.compositing.concatenate import concatenate_audioclips
                audio = concatenate_audioclips([audio, silence])
        
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
        tts_duration=config['tts_duration'],
        page_gap=config['page_gap'],
        total_duration=config['total_duration'],
        width=config['width'],
        height=config['height'],
        output_path=config['output_path']
    )
