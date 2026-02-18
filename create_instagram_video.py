#!/usr/bin/env python3
"""
MoviePy를 사용한 Instagram 동영상 생성
자동 줄바꿈 및 한글 지원
자막 분할 및 타이밍 싱크
"""
import sys
import json
import re
from moviepy import *
from moviepy.video.VideoClip import TextClip, ImageClip, ColorClip
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip

def split_sentences(text):
    """
    텍스트를 문장 단위로 분할
    마침표(.), 느낌표(!), 물음표(?) 기준
    """
    # 문장 분리 (마침표, 느낌표, 물음표 뒤에 공백이나 끝)
    sentences = re.split(r'([.!?])\s*', text)
    
    # 빈 문자열 제거 및 구두점 재결합
    result = []
    i = 0
    while i < len(sentences):
        if i + 1 < len(sentences) and sentences[i+1] in '.!?':
            result.append(sentences[i] + sentences[i+1])
            i += 2
        elif sentences[i].strip():
            result.append(sentences[i].strip())
            i += 1
        else:
            i += 1
    
    return [s.strip() for s in result if s.strip()]

def calculate_sentence_timings(sentences, total_duration):
    """
    문장별 길이(글자 수) 비율에 따라 시간 할당
    
    Args:
        sentences: 문장 리스트
        total_duration: 전체 TTS 길이 (초)
    
    Returns:
        [(start_time, end_time, sentence), ...]
    """
    if not sentences:
        return []
    
    # 각 문장의 글자 수 계산
    char_counts = [len(s) for s in sentences]
    total_chars = sum(char_counts)
    
    # 문장별 시간 할당
    timings = []
    current_time = 0
    
    for i, sentence in enumerate(sentences):
        # 이 문장이 차지할 시간 = (문장 글자 수 / 전체 글자 수) * 전체 시간
        duration = (char_counts[i] / total_chars) * total_duration
        start_time = current_time
        end_time = current_time + duration
        
        timings.append((start_time, end_time, sentence))
        current_time = end_time
    
    return timings

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
    
    # 4. 자막 텍스트 (하단, 자동 줄바꿈) - 순차 표시
    # 문장 분할 및 타이밍 계산
    sentences = split_sentences(subtitle)
    
    subtitle_clips = []
    
    if len(sentences) > 1:
        # 여러 문장인 경우: 문장별 타이밍 계산
        print(f"📝 자막 분할: {len(sentences)}개 문장")
        timings = calculate_sentence_timings(sentences, tts_duration)
        
        for start_time, end_time, sentence in timings:
            duration = end_time - start_time
            print(f"   - {start_time:.2f}~{end_time:.2f}초 ({duration:.2f}초): {sentence[:30]}...")
            
            # 각 문장별 자막 클립 생성
            sentence_clip = TextClip(
                text=sentence,
                font=font_path,
                font_size=42,
                color='white',
                size=(width - 60, None),
                method='caption',
                interline=10
            ).with_position(('center', 820)).with_start(start_time).with_duration(duration)
            
            subtitle_clips.append(sentence_clip)
    else:
        # 단일 문장인 경우: 전체 표시
        print(f"📝 자막: 단일 문장 (전체 표시)")
        subtitle_clip = TextClip(
            text=subtitle,
            font=font_path,
            font_size=42,
            color='white',
            size=(width - 60, None),
            method='caption',
            interline=10
        ).with_position(('center', 820)).with_duration(total_duration)
        
        subtitle_clips.append(subtitle_clip)
    
    # 5. 모든 클립 합성
    video = CompositeVideoClip([
        background,
        image,
        title_clip,
        *subtitle_clips  # 여러 자막 클립을 모두 추가
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
