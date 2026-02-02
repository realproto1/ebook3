/**
 * WordWritingGame
 * - 글자 따라쓰기 게임
 * - GameBase 상속
 * - 캔버스 드로잉 및 정확도 계산
 */

import GameBase from './engine/GameBase.js';
import CanvasUtil from './engine/CanvasUtil.js';

export default class WordWritingGame extends GameBase {
    constructor(options = {}) {
        super(options);
        
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.guideImageData = null;
        this.autoAdvanceTriggered = false;
        
        // 임계값 설정
        this.AUTO_ADVANCE_THRESHOLD = 90; // 자동 넘김
        this.CONFIRM_THRESHOLD = 80; // 확인 버튼
        this.GREEN_THRESHOLD = 90; // 녹색 표시
        this.ORANGE_THRESHOLD = 70; // 주황색 표시
    }

    /**
     * 게임 초기화
     */
    async init() {
        try {
            // 스토리 로드
            await this.loadStory();
            
            // 어휘 추출
            this.extractVocabulary();
            
            // 캔버스 초기화
            this.initCanvas();
            
            // 첫 글자 렌더링
            this.renderChar();
            
            this.log('✅ WordWritingGame 초기화 완료');
        } catch (error) {
            console.error('WordWritingGame 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 어휘 추출
     */
    extractVocabulary() {
        let vocabulary = [];

        // educational_content.vocabulary 확인
        if (this.storyData.educational_content?.vocabulary) {
            vocabulary = this.storyData.educational_content.vocabulary;
        }
        // vocabulary 직접 확인
        else if (this.storyData.vocabulary && Array.isArray(this.storyData.vocabulary)) {
            vocabulary = this.storyData.vocabulary;
        }
        // key_objects 사용 (fallback)
        else if (this.storyData.key_objects && Array.isArray(this.storyData.key_objects)) {
            vocabulary = this.storyData.key_objects.map(obj => ({
                korean: obj.korean || obj.name || obj,
                word: obj.name || obj.korean || obj
            }));
        }

        if (vocabulary.length === 0) {
            alert('단어장이 없습니다.');
            this.goBack();
            return;
        }

        // 글자 추출
        this.items = [];
        vocabulary.forEach(item => {
            const word = item.korean || item.word || item;
            for (let char of word) {
                if (char.trim()) {
                    this.items.push({
                        char,
                        word,
                        image_url: item.image_url || null
                    });
                }
            }
        });

        this.log(`📚 어휘 추출: ${this.items.length}개 글자`);
    }

    /**
     * 캔버스 초기화
     */
    initCanvas() {
        // 캔버스 초기화
        const { canvas, ctx } = CanvasUtil.init('drawingCanvas', {
            willReadFrequently: true
        });

        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        this.canvas = canvas;
        this.ctx = ctx;

        // 드로잉 설정
        CanvasUtil.setupDrawing(canvas, ctx, {
            strokeStyle: '#333',
            lineWidth: 25
        });

        // 이벤트 리스너
        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // 터치 이벤트
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    /**
     * 드로잉 시작
     */
    startDrawing(e) {
        this.isDrawing = true;
        const pos = e.touches ? CanvasUtil.getTouchPos(e, this.canvas) : CanvasUtil.getMousePos(e, this.canvas);
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    /**
     * 드로잉
     */
    draw(e) {
        if (!this.isDrawing) return;

        const pos = e.touches ? CanvasUtil.getTouchPos(e, this.canvas) : CanvasUtil.getMousePos(e, this.canvas);
        
        CanvasUtil.drawLine(this.ctx, this.lastX, this.lastY, pos.x, pos.y);
        
        this.lastX = pos.x;
        this.lastY = pos.y;

        // 실시간 정확도 업데이트
        this.updateRealtimeAccuracy();
    }

    /**
     * 드로잉 중지
     */
    stopDrawing() {
        this.isDrawing = false;
    }

    /**
     * 캔버스 지우기
     */
    clearCanvas() {
        CanvasUtil.clear(this.canvas, this.ctx);
        this.autoAdvanceTriggered = false;
        
        // 실시간 정확도 초기화
        const realtimeDiv = document.getElementById('realTimeAccuracy');
        if (realtimeDiv) {
            realtimeDiv.textContent = '';
        }
    }

    /**
     * 가이드 글자 그리기
     */
    drawGuideChar(char) {
        // 캔버스 지우기
        this.clearCanvas();

        // 임시 캔버스에 가이드 이미지 생성 (픽셀 비교용)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        const fontSize = this.canvas.width * 0.6;
        tempCtx.fillStyle = '#000000';
        tempCtx.font = `bold ${fontSize}px 'Noto Sans KR', sans-serif`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(char, tempCanvas.width / 2, tempCanvas.height / 2);

        this.guideImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // 가이드 글자를 CSS 오버레이로 표시
        let overlay = document.getElementById('guideOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'guideOverlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                pointer-events: none;
                opacity: 0.15;
                font-size: ${fontSize}px;
                font-weight: bold;
                color: #fcb69f;
                font-family: 'Noto Sans KR', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            const canvasContainer = this.canvas.parentElement;
            if (canvasContainer) {
                canvasContainer.appendChild(overlay);
            }
        }
        overlay.textContent = char;
        overlay.style.fontSize = `${fontSize}px`;
    }

    /**
     * 글자 렌더링
     */
    renderChar() {
        const item = this.getCurrentItem();
        if (!item) {
            this.showResults();
            return;
        }

        // 진행도 업데이트
        this.updateProgress();

        // 글자 이미지 표시
        const charImage = document.getElementById('keyObjectImage');
        if (charImage) {
            if (item.image_url) {
                charImage.src = item.image_url;
                charImage.alt = item.char;
                charImage.style.display = 'block';
            } else {
                charImage.style.display = 'none';
            }
        }

        // 글자 표시
        const targetChar = document.getElementById('targetChar');
        if (targetChar) {
            targetChar.textContent = item.char;
        }

        // 캔버스 지우고 가이드 그리기
        this.drawGuideChar(item.char);

        // 점수 업데이트
        this.updateScore();
    }

    /**
     * 실시간 정확도 업데이트
     */
    updateRealtimeAccuracy() {
        if (!this.guideImageData) return;

        const realtimeDiv = document.getElementById('realTimeAccuracy');
        if (!realtimeDiv) return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const accuracy = CanvasUtil.calculateAccuracy(imageData, this.guideImageData);

        if (accuracy > 0) {
            realtimeDiv.textContent = `현재 정확도: ${accuracy.toFixed(1)}%`;

            // 색상 변경
            if (accuracy >= this.GREEN_THRESHOLD) {
                realtimeDiv.style.color = '#4caf50'; // 녹색
            } else if (accuracy >= this.ORANGE_THRESHOLD) {
                realtimeDiv.style.color = '#ff9800'; // 주황색
            } else {
                realtimeDiv.style.color = '#fcb69f'; // 기본색
            }

            // 자동 넘김
            if (accuracy >= this.AUTO_ADVANCE_THRESHOLD && !this.autoAdvanceTriggered) {
                this.autoAdvanceTriggered = true;
                this.totalAttempts++;
                this.correctCount++;

                this.log(`✅ 자동 정답 인정! 정확도: ${accuracy.toFixed(1)}%`);

                this.showCorrectFeedback(() => {
                    if (this.next()) {
                        this.renderChar();
                    } else {
                        this.showResults();
                    }
                });
            }
        } else {
            realtimeDiv.textContent = '';
        }
    }

    /**
     * 그림 확인 (확인 버튼)
     */
    checkDrawing() {
        this.totalAttempts++;

        // 캔버스에 그림이 있는지 확인
        if (!CanvasUtil.hasDrawing(this.canvas, this.ctx)) {
            alert('글자를 그려주세요!');
            return;
        }

        // 정확도 측정
        if (!this.guideImageData) {
            alert('가이드 데이터가 없습니다.');
            return;
        }

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const accuracy = CanvasUtil.calculateAccuracy(imageData, this.guideImageData);

        console.log(`정확도: ${accuracy.toFixed(1)}%`);

        if (accuracy >= this.CONFIRM_THRESHOLD) {
            // 정답!
            this.correctCount++;
            this.showCorrectFeedback(() => {
                if (this.next()) {
                    this.renderChar();
                } else {
                    this.showResults();
                }
            });
        } else {
            // 재시도
            this.showRetryFeedback(accuracy);
        }
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.WordWritingGame = WordWritingGame;
}
