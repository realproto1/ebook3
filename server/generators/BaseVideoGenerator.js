const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

/**
 * 기본 동영상 생성기 클래스
 * YouTube, Instagram 등 다양한 플랫폼용 동영상 생성의 공통 로직 제공
 */
class BaseVideoGenerator {
    /**
     * @param {Object} options - 생성 옵션
     * @param {Object} options.storybook - 동화책 객체
     * @param {number} options.startPage - 시작 페이지
     * @param {number} options.endPage - 종료 페이지
     * @param {boolean} options.includeCover - 표지 포함 여부
     * @param {number} options.coverDuration - 표지 표시 시간
     * @param {boolean} options.includeBackgroundMusic - 배경음악 포함 여부
     * @param {string} options.backgroundMusicUrl - 배경음악 URL
     * @param {string} options.transition - 전환 효과 (fade, slideleft, slideright, none)
     * @param {number} options.pageGap - 페이지 시작 전 정지 시간
     * @param {string} options.workDir - 작업 디렉토리
     */
    constructor(options) {
        this.storybook = options.storybook;
        this.startPage = options.startPage;
        this.endPage = options.endPage;
        this.includeCover = options.includeCover;
        this.coverDuration = options.coverDuration || 3;
        this.includeBackgroundMusic = options.includeBackgroundMusic;
        this.backgroundMusicUrl = options.backgroundMusicUrl;
        this.transition = options.transition || 'fade';
        this.pageGap = options.pageGap || 1;
        this.workDir = options.workDir;
        
        // 플랫폼별로 오버라이드할 속성
        this.videoSize = '1280:720'; // 기본값
        this.aspectRatio = '16:9'; // 기본값
    }

    /**
     * 파일 다운로드
     * @param {string} url - 다운로드할 파일 URL
     * @param {string} filename - 저장할 파일명
     */
    async downloadFile(url, filename) {
        const filePath = path.join(this.workDir, filename);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, response.data);
        return filePath;
    }

    /**
     * 에셋 다운로드 (이미지, TTS, 배경음악)
     */
    async downloadAssets() {
        console.log('📥 에셋 다운로드 시작...');

        // 표지 다운로드
        if (this.includeCover && this.storybook.coverImage) {
            console.log('  → 표지 이미지 다운로드...');
            await this.downloadFile(this.storybook.coverImage, 'cover.jpg');
        }

        // 페이지 다운로드
        const pages = this.storybook.pages.slice(this.startPage - 1, this.endPage);
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageNum = i + 1;

            console.log(`  → 페이지 ${pageNum} 다운로드...`);

            if (page.illustrationImage) {
                const ext = page.illustrationImage.includes('.png') ? 'png' : 'jpg';
                await this.downloadFile(page.illustrationImage, `page${pageNum}.${ext}`);
            }

            const ttsUrl = page.ttsAudio?.ko?.url || page.audioUrl;
            if (ttsUrl) {
                await this.downloadFile(ttsUrl, `page${pageNum}.wav`);
            }
        }

        // 배경음악 다운로드
        if (this.includeBackgroundMusic && this.backgroundMusicUrl) {
            console.log('  → 배경음악 다운로드...');
            await this.downloadFile(this.backgroundMusicUrl, 'bgm.mp3');
        }

        console.log('✅ 에셋 다운로드 완료');
    }

    /**
     * TTS 오디오 길이 확인
     * @param {string} audioPath - 오디오 파일 경로
     * @returns {number} 오디오 길이 (초)
     */
    getAudioDuration(audioPath) {
        try {
            const durationStr = execSync(
                `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
                { cwd: this.workDir, encoding: 'utf8' }
            ).trim();
            return parseFloat(durationStr);
        } catch (err) {
            console.warn(`⚠️ 오디오 길이 확인 실패: ${audioPath}`);
            return 5; // 기본값
        }
    }

    /**
     * 비디오 필터 생성 (전환 효과 포함)
     * @param {boolean} isFirst - 첫 번째 클립 여부
     * @returns {string} FFmpeg 비디오 필터
     */
    getVideoFilter(isFirst = false) {
        let filter = `scale=${this.videoSize}:force_original_aspect_ratio=decrease,pad=${this.videoSize}:(ow-iw)/2:(oh-ih)/2`;

        if (this.transition === 'fade' && isFirst) {
            filter += ',fade=t=in:st=0:d=0.3';
        }

        return filter;
    }

    /**
     * 오디오 필터 생성 (딜레이 포함)
     * @returns {string} FFmpeg 오디오 필터
     */
    getAudioFilter() {
        if (this.pageGap > 0) {
            return `-af "adelay=${Math.round(this.pageGap * 1000)}|${Math.round(this.pageGap * 1000)}"`;
        }
        return '';
    }

    /**
     * 클립 생성 (하위 클래스에서 오버라이드)
     * @abstract
     */
    async generateClips() {
        throw new Error('generateClips() must be implemented by subclass');
    }

    /**
     * 클립 병합
     * @param {Array<string>} clips - 클립 파일 경로 배열
     * @returns {string} 병합된 비디오 파일 경로
     */
    async mergeClips(clips) {
        console.log('🔗 클립 병합 시작...');

        const concatListPath = path.join(this.workDir, 'concat.txt');
        const concatContent = clips.map(clip => `file '${path.basename(clip)}'`).join('\n');
        fs.writeFileSync(concatListPath, concatContent);

        const mergedVideoPath = path.join(this.workDir, 'merged.mp4');

        try {
            execSync(
                `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${mergedVideoPath}"`,
                { cwd: this.workDir }
            );

            console.log('✅ 클립 병합 완료');
            return mergedVideoPath;
        } catch (err) {
            console.warn('⚠️ 병합 실패, 재인코딩 시도...');

            const reencoded = path.join(this.workDir, 'merged_reencoded.mp4');
            execSync(
                `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -c:a aac -b:a 192k -preset fast "${reencoded}"`,
                { cwd: this.workDir }
            );

            fs.unlinkSync(mergedVideoPath);
            fs.renameSync(reencoded, mergedVideoPath);
            console.log('✅ 재인코딩 완료');
            return mergedVideoPath;
        }
    }

    /**
     * 배경음악 믹싱
     * @param {string} videoPath - 입력 비디오 경로
     * @returns {string} 배경음악이 믹싱된 비디오 경로
     */
    async mixBackgroundMusic(videoPath) {
        if (!this.includeBackgroundMusic || !fs.existsSync(path.join(this.workDir, 'bgm.mp3'))) {
            return videoPath;
        }

        console.log('🎵 배경음악 믹싱 시작...');

        const withBGMPath = path.join(this.workDir, 'final_with_bgm.mp4');

        execSync(
            `ffmpeg -y -i "${videoPath}" -stream_loop -1 -i "${path.join(this.workDir, 'bgm.mp3')}" -filter_complex "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${withBGMPath}"`,
            { cwd: this.workDir, stdio: ['pipe', 'pipe', 'pipe'] }
        );

        console.log('✅ 배경음악 믹싱 완료');
        return withBGMPath;
    }

    /**
     * 동영상 생성 (메인 메서드)
     * @returns {string} 생성된 비디오 파일 경로
     */
    async generate() {
        try {
            // 1. 에셋 다운로드
            await this.downloadAssets();

            // 2. 클립 생성 (하위 클래스에서 구현)
            const clips = await this.generateClips();

            // 3. 클립 병합
            const mergedVideo = await this.mergeClips(clips);

            // 4. 배경음악 믹싱
            const finalVideo = await this.mixBackgroundMusic(mergedVideo);

            console.log('✅ 동영상 생성 완료!');
            return finalVideo;

        } catch (error) {
            console.error('❌ 동영상 생성 오류:', error);
            throw error;
        }
    }
}

module.exports = BaseVideoGenerator;
