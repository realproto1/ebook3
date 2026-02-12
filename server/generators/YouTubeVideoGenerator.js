const BaseVideoGenerator = require('./BaseVideoGenerator');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * YouTube용 동영상 생성기
 * 16:9 비율, 720p/1080p 해상도
 */
class YouTubeVideoGenerator extends BaseVideoGenerator {
    constructor(options) {
        super(options);
        
        // YouTube 설정
        this.resolution = options.resolution || '720p';
        const resolutionMap = {
            '720p': '1280:720',
            '1080p': '1920:1080'
        };
        this.videoSize = resolutionMap[this.resolution];
        this.aspectRatio = '16:9';
    }

    /**
     * YouTube용 클립 생성
     */
    async generateClips() {
        console.log('🎞️ YouTube 클립 생성 시작...');
        const clips = [];

        // 표지 클립
        if (this.includeCover && fs.existsSync(path.join(this.workDir, 'cover.jpg'))) {
            console.log(`  → 표지 클립 생성 (${this.coverDuration}초)...`);
            const coverClipPath = path.join(this.workDir, 'clip_cover.mp4');

            let coverFilter = this.getVideoFilter(true);
            const fadeOutStart = Math.max(0, this.coverDuration - 0.3);
            coverFilter += `,fade=t=out:st=${fadeOutStart}:d=0.3`;

            execSync(
                `ffmpeg -y -loop 1 -framerate 1 -i "${path.join(this.workDir, 'cover.jpg')}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=24000 -c:v libx264 -c:a aac -b:a 192k -r 1 -t ${this.coverDuration} -pix_fmt yuv420p -vf "${coverFilter}" -preset fast "${coverClipPath}"`,
                { cwd: this.workDir }
            );

            clips.push(coverClipPath);
        }

        // 페이지 클립
        const pages = this.storybook.pages.slice(this.startPage - 1, this.endPage);
        for (let i = 0; i < pages.length; i++) {
            const pageNum = i + 1;
            const imagePath = path.join(this.workDir, `page${pageNum}.jpg`);
            const audioPath = path.join(this.workDir, `page${pageNum}.wav`);

            if (!fs.existsSync(imagePath)) {
                console.warn(`⚠️ 페이지 ${pageNum} 이미지 없음`);
                continue;
            }

            console.log(`  → 페이지 ${pageNum} 클립 생성...`);
            const clipPath = path.join(this.workDir, `clip_${pageNum}.mp4`);

            if (fs.existsSync(audioPath)) {
                // TTS 있음
                const audioDuration = this.getAudioDuration(audioPath);
                const totalDuration = this.pageGap + audioDuration;

                const videoFilter = this.getVideoFilter(i === 0 && !this.includeCover);
                const audioFilter = this.getAudioFilter();

                execSync(
                    `ffmpeg -y -loop 1 -framerate 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -r 1 -vf "${videoFilter}" ${audioFilter} -t ${totalDuration} -preset fast "${clipPath}"`,
                    { cwd: this.workDir }
                );
            } else {
                // TTS 없음
                const videoFilter = this.getVideoFilter(i === 0 && !this.includeCover);

                execSync(
                    `ffmpeg -y -loop 1 -framerate 1 -i "${imagePath}" -c:v libx264 -r 1 -t 5 -pix_fmt yuv420p -vf "${videoFilter}" -preset fast "${clipPath}"`,
                    { cwd: this.workDir }
                );
            }

            clips.push(clipPath);
        }

        console.log(`✅ YouTube 클립 생성 완료 (${clips.length}개)`);
        return clips;
    }
}

module.exports = YouTubeVideoGenerator;
