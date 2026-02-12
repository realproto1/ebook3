const BaseVideoGenerator = require('./BaseVideoGenerator');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Instagram용 동영상 생성기
 * 세로 영상 (9:16, 1:1, 4:5)
 * 상단: 제목, 중앙: 콘텐츠, 하단: 자막
 */
class InstagramVideoGenerator extends BaseVideoGenerator {
    constructor(options) {
        super(options);
        
        // Instagram 설정
        this.aspectRatio = options.aspectRatio || '9:16';
        this.maxDuration = options.maxDuration || 60;
        
        const resolutionMap = {
            '9:16': '1080:1920',
            '1:1': '1080:1080',
            '4:5': '1080:1350'
        };
        this.videoSize = resolutionMap[this.aspectRatio];
        
        // 레이아웃 설정
        this.titleFontSize = 80;
        this.subtitleFontSize = 50;
        this.titleColor = 'white';
        this.subtitleColor = 'white';
        this.bgColor = '#000000';
    }

    /**
     * 텍스트 이스케이프 (FFmpeg drawtext용)
     */
    escapeText(text) {
        return text
            .replace(/\\/g, '\\\\\\\\')
            .replace(/'/g, "\\'")
            .replace(/:/g, '\\:')
            .replace(/\n/g, ' ');
    }

    /**
     * Instagram용 클립 생성 (제목 + 콘텐츠 + 자막)
     */
    async generateClips() {
        console.log('🎞️ Instagram 클립 생성 시작...');
        const clips = [];

        const [width, height] = this.videoSize.split(':').map(Number);
        
        // 레이아웃 계산
        const titleHeight = 200;
        const subtitleHeight = 150;
        const contentHeight = height - titleHeight - subtitleHeight;
        const contentY = titleHeight;

        // 표지 클립
        if (this.includeCover && fs.existsSync(path.join(this.workDir, 'cover.jpg'))) {
            console.log(`  → 표지 클립 생성 (${this.coverDuration}초)...`);
            const coverClipPath = path.join(this.workDir, 'clip_cover.mp4');

            const title = this.escapeText(this.storybook.title || '동화책');
            
            // 1. 배경 (검은색)
            // 2. 표지 이미지 (중앙 영역에 맞춤)
            // 3. 상단 제목
            let filter = `color=${this.bgColor}:s=${width}x${height}[bg];`;
            filter += `[bg]movie='${path.join(this.workDir, 'cover.jpg')}'[cover];`;
            filter += `[cover]scale=${width}:${contentHeight}:force_original_aspect_ratio=decrease[scaled];`;
            filter += `[bg][scaled]overlay=(W-w)/2:${contentY}[with_img];`;
            filter += `[with_img]drawtext=text='${title}':fontsize=${this.titleFontSize}:fontcolor=${this.titleColor}:x=(w-text_w)/2:y=50:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`;

            execSync(
                `ffmpeg -y -f lavfi -i ${filter} -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=24000 -c:v libx264 -c:a aac -b:a 192k -t ${this.coverDuration} -pix_fmt yuv420p -preset fast "${coverClipPath}"`,
                { cwd: this.workDir }
            );

            clips.push(coverClipPath);
        }

        // 페이지 클립
        const pages = this.storybook.pages.slice(this.startPage - 1, this.endPage);
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageNum = i + 1;
            const imagePath = path.join(this.workDir, `page${pageNum}.jpg`);
            const audioPath = path.join(this.workDir, `page${pageNum}.wav`);

            if (!fs.existsSync(imagePath)) {
                console.warn(`⚠️ 페이지 ${pageNum} 이미지 없음`);
                continue;
            }

            console.log(`  → 페이지 ${pageNum} 클립 생성...`);
            const clipPath = path.join(this.workDir, `clip_${pageNum}.mp4`);

            const title = this.escapeText(this.storybook.title || '동화책');
            const pageText = this.escapeText(page.text || '');
            const subtitle = pageText.substring(0, 100); // 최대 100자

            // TTS 길이 계산
            let duration = 5;
            let audioInput = '';
            let audioFilter = '';
            
            if (fs.existsSync(audioPath)) {
                duration = this.getAudioDuration(audioPath);
                duration += this.pageGap;
                audioInput = `-i "${audioPath}"`;
                
                if (this.pageGap > 0) {
                    audioFilter = `-af "adelay=${Math.round(this.pageGap * 1000)}|${Math.round(this.pageGap * 1000)}"`;
                }
            } else {
                audioInput = '-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=24000';
            }

            // 복합 필터 구성
            // 1. 검은 배경
            // 2. 중앙에 이미지
            // 3. 상단 제목
            // 4. 하단 자막
            let complexFilter = `color=${this.bgColor}:s=${width}x${height}:d=${duration}[bg];`;
            complexFilter += `movie='${imagePath}',scale=${width}:${contentHeight}:force_original_aspect_ratio=decrease,setsar=1[img];`;
            complexFilter += `[bg][img]overlay=(W-w)/2:${contentY}[with_img];`;
            complexFilter += `[with_img]drawtext=text='${title}':fontsize=${this.titleFontSize}:fontcolor=${this.titleColor}:x=(w-text_w)/2:y=50:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf[with_title];`;
            complexFilter += `[with_title]drawtext=text='${subtitle}':fontsize=${this.subtitleFontSize}:fontcolor=${this.subtitleColor}:x=(w-text_w)/2:y=${height - 120}:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`;

            execSync(
                `ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=24000 ${audioInput} -filter_complex "${complexFilter}" -c:v libx264 -c:a aac -b:a 192k ${audioFilter} -t ${duration} -pix_fmt yuv420p -preset fast "${clipPath}"`,
                { cwd: this.workDir, stdio: ['pipe', 'pipe', 'pipe'] }
            );

            clips.push(clipPath);
        }

        console.log(`✅ Instagram 클립 생성 완료 (${clips.length}개)`);
        return clips;
    }
}

module.exports = InstagramVideoGenerator;
