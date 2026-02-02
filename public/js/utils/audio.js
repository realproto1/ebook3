/**
 * Audio 유틸리티
 * - Web Audio API 래핑
 * - 효과음 재생
 * - 재사용 가능한 사운드
 */

class AudioPlayer {
    constructor() {
        this.audioContext = null;
        this.sounds = {
            correct: [523.25, 659.25, 783.99], // C5, E5, G5
            retry: [329.63, 293.66], // E4, D4
            complete: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6
            click: [800], // 클릭음
            error: [200, 150] // 에러음
        };
    }

    /**
     * AudioContext 초기화 (지연 로딩)
     */
    initContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * 단일 톤 재생
     * @param {number} frequency - 주파수 (Hz)
     * @param {number} duration - 지속 시간 (초)
     * @param {number} volume - 볼륨 (0.0 - 1.0)
     * @param {number} startTime - 시작 시간 (AudioContext.currentTime 기준)
     */
    playTone(frequency, duration = 0.2, volume = 0.2, startTime = 0) {
        const ctx = this.initContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const start = startTime || ctx.currentTime;
        oscillator.frequency.setValueAtTime(frequency, start);
        gainNode.gain.setValueAtTime(volume, start);
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);

        oscillator.start(start);
        oscillator.stop(start + duration);
    }

    /**
     * 멜로디 재생
     * @param {number[]} frequencies - 주파수 배열
     * @param {number} interval - 음표 간 간격 (초)
     * @param {number} duration - 각 음표 지속 시간 (초)
     * @param {number} volume - 볼륨
     */
    playMelody(frequencies, interval = 0.15, duration = 0.3, volume = 0.2) {
        const ctx = this.initContext();
        
        frequencies.forEach((freq, i) => {
            const startTime = ctx.currentTime + (i * interval);
            this.playTone(freq, duration, volume, startTime);
        });
    }

    /**
     * 정답 효과음
     */
    correct() {
        this.playMelody(this.sounds.correct, 0.1, 0.3, 0.3);
    }

    /**
     * 재시도 효과음
     */
    retry() {
        this.playMelody(this.sounds.retry, 0.1, 0.2, 0.2);
    }

    /**
     * 완료 효과음 (팡파레)
     */
    complete() {
        this.playMelody(this.sounds.complete, 0.15, 0.3, 0.2);
    }

    /**
     * 클릭 효과음
     */
    click() {
        this.playTone(this.sounds.click[0], 0.05, 0.1);
    }

    /**
     * 에러 효과음
     */
    error() {
        this.playMelody(this.sounds.error, 0.1, 0.2, 0.2);
    }

    /**
     * 커스텀 사운드 재생
     * @param {string} name - 사운드 이름
     * @param {number[]} frequencies - 주파수 배열
     * @param {Object} options - 옵션 (interval, duration, volume)
     */
    play(name, frequencies = null, options = {}) {
        const freqs = frequencies || this.sounds[name];
        if (!freqs) {
            console.warn(`Sound "${name}" not found`);
            return;
        }

        const {
            interval = 0.1,
            duration = 0.2,
            volume = 0.2
        } = options;

        this.playMelody(freqs, interval, duration, volume);
    }

    /**
     * 커스텀 사운드 등록
     * @param {string} name 
     * @param {number[]} frequencies 
     */
    registerSound(name, frequencies) {
        this.sounds[name] = frequencies;
    }

    /**
     * 오디오 정지 (AudioContext 닫기)
     */
    stop() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// 싱글톤 인스턴스 생성
const audioPlayer = new AudioPlayer();

// 전역으로 export
if (typeof window !== 'undefined') {
    window.AudioPlayer = AudioPlayer;
    window.audioPlayer = audioPlayer;
}

// ES6 모듈 export (주석 처리 - 일반 script 태그 사용)
// export { AudioPlayer, audioPlayer };
// export default audioPlayer;
