/**
 * GameBase
 * - 모든 게임의 베이스 클래스
 * - 공통 로직 (점수, 진행도, 피드백)
 * - 이벤트 관리
 */

class GameBase {
    constructor(options = {}) {
        this.storyId = options.storyId || null;
        this.storyData = null;
        this.currentIndex = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.correctCount = 0;
        this.items = [];
        this.isPlaying = false;
        
        // 디버그 모드
        this.DEBUG_MODE = options.debugMode || false;
    }

    /**
     * 게임 초기화 (하위 클래스에서 구현)
     */
    async init() {
        throw new Error('init() must be implemented by subclass');
    }

    /**
     * 스토리 데이터 로드
     */
    async loadStory() {
        try {
            if (!this.storyId) {
                throw new Error('스토리 ID가 없습니다.');
            }

            if (this.DEBUG_MODE) console.log('📚 스토리 로딩 중:', this.storyId);

            this.storyData = await api.get(`/api/storybooks/${this.storyId}`, {
                errorMessage: '스토리를 불러올 수 없습니다.'
            });

            if (this.DEBUG_MODE) console.log('✅ 스토리 로드 완료:', this.storyData.title);

            return this.storyData;
        } catch (error) {
            console.error('loadStory error:', error);
            alert('스토리를 불러올 수 없습니다.');
            this.goBack();
            throw error;
        }
    }

    /**
     * 게임 시작
     */
    start() {
        this.isPlaying = true;
        this.currentIndex = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.correctCount = 0;
    }

    /**
     * 게임 일시정지
     */
    pause() {
        this.isPlaying = false;
    }

    /**
     * 게임 재개
     */
    resume() {
        this.isPlaying = true;
    }

    /**
     * 다음 문제로
     */
    next() {
        if (this.currentIndex < this.items.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false;
    }

    /**
     * 이전 문제로
     */
    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return true;
        }
        return false;
    }

    /**
     * 진행도 업데이트
     */
    updateProgress() {
        const progressBar = DOM.id('progress-bar');
        const progressText = DOM.id('progress-text');
        
        if (progressBar && this.items.length > 0) {
            const percentage = Math.round((this.currentIndex / this.items.length) * 100);
            progressBar.style.width = `${percentage}%`;
            
            if (progressText) {
                progressText.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
            }
        }
    }

    /**
     * 점수 업데이트
     */
    updateScore() {
        const scoreEl = DOM.id('correctCount');
        if (scoreEl) {
            scoreEl.textContent = this.correctCount;
        }

        const accuracyEl = DOM.id('accuracy');
        if (accuracyEl && this.totalAttempts > 0) {
            const accuracy = Math.round((this.correctCount / this.totalAttempts) * 100);
            accuracyEl.textContent = `${accuracy}%`;
        }
    }

    /**
     * 정답 피드백 표시
     * @param {Function} callback
     */
    showCorrectFeedback(callback) {
        audioPlayer.correct();

        const feedback = DOM.create('div', {
            style: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(34, 197, 94, 0.95)',
                color: 'white',
                padding: '30px 50px',
                borderRadius: '20px',
                fontSize: '32px',
                fontWeight: 'bold',
                zIndex: '10000',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }
        }, '✓ 정답!');

        document.body.appendChild(feedback);

        setTimeout(() => {
            DOM.remove(feedback);
            if (callback) callback();
        }, 1000);
    }

    /**
     * 오답 피드백 표시
     * @param {number} accuracy - 정확도 (선택)
     */
    showRetryFeedback(accuracy = null) {
        audioPlayer.retry();

        const message = accuracy !== null 
            ? `정확도: ${accuracy.toFixed(1)}%<br>다시 시도해보세요!`
            : '다시 시도해보세요!';

        const feedback = DOM.create('div', {
            style: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(239, 68, 68, 0.95)',
                color: 'white',
                padding: '30px 50px',
                borderRadius: '20px',
                fontSize: '24px',
                fontWeight: 'bold',
                zIndex: '10000',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            },
            html: true
        }, message);

        document.body.appendChild(feedback);

        setTimeout(() => {
            DOM.remove(feedback);
        }, 1500);
    }

    /**
     * 결과 화면 표시
     */
    showResults() {
        audioPlayer.complete();

        const accuracy = this.totalAttempts > 0 
            ? Math.round((this.correctCount / this.totalAttempts) * 100)
            : 0;

        const resultsHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="font-size: 36px; font-weight: bold; color: #333; margin-bottom: 30px;">
                    🎉 게임 완료!
                </h2>
                <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 18px; color: #666; margin-bottom: 10px;">정답률</div>
                        <div style="font-size: 48px; font-weight: bold; color: #10b981;">
                            ${accuracy}%
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
                        <div style="padding: 15px; background: #f3f4f6; border-radius: 10px;">
                            <div style="font-size: 14px; color: #666;">정답</div>
                            <div style="font-size: 28px; font-weight: bold; color: #10b981;">${this.correctCount}</div>
                        </div>
                        <div style="padding: 15px; background: #f3f4f6; border-radius: 10px;">
                            <div style="font-size: 14px; color: #666;">시도</div>
                            <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${this.totalAttempts}</div>
                        </div>
                    </div>
                    <button onclick="location.href='/games.html'" 
                            style="margin-top: 30px; width: 100%; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer;">
                        <i class="fas fa-list"></i> 게임 목록
                    </button>
                </div>
            </div>
        `;

        const gameArea = DOM.id('game-area') || DOM.id('game-container') || document.body;
        gameArea.innerHTML = resultsHTML;
    }

    /**
     * 뒤로가기
     */
    goBack() {
        window.history.back();
    }

    /**
     * 게임 목록으로
     */
    goToGameList() {
        window.location.href = '/games.html';
    }

    /**
     * 디버그 로그
     * @param  {...any} args 
     */
    log(...args) {
        if (this.DEBUG_MODE) {
            console.log(...args);
        }
    }

    /**
     * 현재 아이템 가져오기
     * @returns {Object|null}
     */
    getCurrentItem() {
        return this.items[this.currentIndex] || null;
    }

    /**
     * 게임 상태 저장
     */
    saveState() {
        const state = {
            currentIndex: this.currentIndex,
            score: this.score,
            totalAttempts: this.totalAttempts,
            correctCount: this.correctCount,
            timestamp: new Date().toISOString()
        };

        Storage.setNamespaced('game', this.constructor.name, state);
    }

    /**
     * 게임 상태 로드
     * @returns {Object|null}
     */
    loadState() {
        return Storage.getNamespaced('game', this.constructor.name, null);
    }

    /**
     * 게임 상태 초기화
     */
    clearState() {
        Storage.clearNamespace('game');
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.GameBase = GameBase;
}
