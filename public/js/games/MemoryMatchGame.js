/**
 * MemoryMatchGame.js
 * 카드 매칭 게임 클래스 (GameBase 상속)
 */

import GameBase from './engine/GameBase.js';

class MemoryMatchGame extends GameBase {
    constructor(options = {}) {
        super(options);
        
        // 게임 상태
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.isProcessing = false;
        
        // 게임 설정
        this.pairsCount = options.pairsCount || 6; // 기본 6쌍 (12장)
        this.gridColumns = options.gridColumns || 4; // 4x3 그리드
    }
    
    /**
     * 게임 초기화
     */
    async init() {
        try {
            console.log('🎮 MemoryMatchGame 초기화 시작');
            
            // 1. 스토리 데이터 로드
            await this.loadStory();
            
            // 2. Key Objects 추출
            const keyObjects = this.extractKeyObjects();
            
            if (keyObjects.length < 4) {
                alert('Key Objects 이미지가 부족합니다. (최소 4개 필요)');
                this.goBack();
                return;
            }
            
            // 3. 카드 생성
            this.generateCards(keyObjects);
            
            // 4. 타이머 시작
            this.startTimer();
            
            console.log('✅ MemoryMatchGame 초기화 완료');
        } catch (error) {
            console.error('❌ MemoryMatchGame 초기화 실패:', error);
            alert('게임을 시작할 수 없습니다.');
            this.goBack();
            throw error;
        }
    }
    
    /**
     * Key Objects 추출
     */
    extractKeyObjects() {
        const keyObjects = this.storyData.keyObjectImages?.filter(
            obj => obj.imageUrl && obj.success
        ) || [];
        
        console.log(`📦 Key Objects 추출: ${keyObjects.length}개`);
        return keyObjects;
    }
    
    /**
     * 카드 생성 및 섞기
     */
    generateCards(keyObjects) {
        // 필요한 수만큼 key objects 선택
        const selectedObjects = keyObjects.slice(0, this.pairsCount);
        
        // 카드 데이터 생성 (각 이미지 2장씩)
        this.cards = [];
        selectedObjects.forEach((obj, index) => {
            // 첫 번째 카드
            this.cards.push({
                id: `card-${index}-a`,
                pairId: index,
                imageUrl: obj.imageUrl,
                korean: obj.korean,
                flipped: false,
                matched: false
            });
            
            // 두 번째 카드 (쌍)
            this.cards.push({
                id: `card-${index}-b`,
                pairId: index,
                imageUrl: obj.imageUrl,
                korean: obj.korean,
                flipped: false,
                matched: false
            });
        });
        
        // 카드 섞기
        this.shuffleCards();
        
        // 카드 렌더링
        this.renderCards();
        
        console.log(`🃏 카드 생성 완료: ${this.cards.length}장`);
    }
    
    /**
     * 카드 섞기 (Fisher-Yates 알고리즘)
     */
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    /**
     * 카드 렌더링
     */
    renderCards() {
        const container = document.getElementById('cardsContainer');
        if (!container) {
            console.error('❌ #cardsContainer를 찾을 수 없습니다.');
            return;
        }
        
        container.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            container.appendChild(cardElement);
        });
    }
    
    /**
     * 카드 요소 생성
     */
    createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'memory-card';
        cardDiv.dataset.index = index;
        
        cardDiv.innerHTML = `
            <div class="card-inner">
                <!-- 카드 뒷면 -->
                <div class="card-face card-back">
                    <i class="fas fa-question text-4xl text-white"></i>
                </div>
                
                <!-- 카드 앞면 -->
                <div class="card-face card-front">
                    <img src="${card.imageUrl}" alt="${card.korean}" class="card-image">
                    <div class="card-label">${card.korean}</div>
                </div>
            </div>
        `;
        
        // 클릭 이벤트
        cardDiv.addEventListener('click', () => this.flipCard(index));
        
        return cardDiv;
    }
    
    /**
     * 카드 뒤집기
     */
    flipCard(index) {
        // 처리 중이면 무시
        if (this.isProcessing) return;
        
        const card = this.cards[index];
        
        // 이미 뒤집혔거나 매칭된 카드는 무시
        if (card.flipped || card.matched) return;
        
        // 카드 뒤집기
        card.flipped = true;
        this.flippedCards.push(index);
        
        // UI 업데이트
        const cardElement = document.querySelector(`[data-index="${index}"]`);
        if (cardElement) {
            cardElement.classList.add('flipped');
        }
        
        // 2장이 뒤집혔으면 매칭 체크
        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStats();
            this.checkMatch();
        }
    }
    
    /**
     * 매칭 체크
     */
    checkMatch() {
        this.isProcessing = true;
        
        const [index1, index2] = this.flippedCards;
        const card1 = this.cards[index1];
        const card2 = this.cards[index2];
        
        setTimeout(() => {
            if (card1.pairId === card2.pairId) {
                // 매칭 성공!
                this.handleMatch(index1, index2);
            } else {
                // 매칭 실패
                this.handleMismatch(index1, index2);
            }
            
            this.flippedCards = [];
            this.isProcessing = false;
        }, 800);
    }
    
    /**
     * 매칭 성공 처리
     */
    handleMatch(index1, index2) {
        const card1 = this.cards[index1];
        const card2 = this.cards[index2];
        
        card1.matched = true;
        card2.matched = true;
        
        // UI 업데이트
        const element1 = document.querySelector(`[data-index="${index1}"]`);
        const element2 = document.querySelector(`[data-index="${index2}"]`);
        
        if (element1) element1.classList.add('matched');
        if (element2) element2.classList.add('matched');
        
        this.matchedPairs++;
        this.updateStats();
        
        // 모든 쌍을 찾았는지 체크
        if (this.matchedPairs === this.pairsCount) {
            this.gameComplete();
        }
    }
    
    /**
     * 매칭 실패 처리
     */
    handleMismatch(index1, index2) {
        const card1 = this.cards[index1];
        const card2 = this.cards[index2];
        
        card1.flipped = false;
        card2.flipped = false;
        
        // UI 업데이트
        const element1 = document.querySelector(`[data-index="${index1}"]`);
        const element2 = document.querySelector(`[data-index="${index2}"]`);
        
        if (element1) element1.classList.remove('flipped');
        if (element2) element2.classList.remove('flipped');
    }
    
    /**
     * 통계 업데이트
     */
    updateStats() {
        const movesElement = document.getElementById('movesValue');
        const pairsElement = document.getElementById('pairsValue');
        
        if (movesElement) {
            movesElement.textContent = this.moves;
        }
        
        if (pairsElement) {
            pairsElement.textContent = `${this.matchedPairs} / ${this.pairsCount}`;
        }
    }
    
    /**
     * 타이머 시작
     */
    startTimer() {
        this.startTime = Date.now();
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            const timerElement = document.getElementById('timerValue');
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    /**
     * 타이머 정지
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    /**
     * 게임 완료
     */
    gameComplete() {
        this.stopTimer();
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        setTimeout(() => {
            alert(`🎉 게임 완료!\n\n시간: ${minutes}분 ${seconds}초\n이동 횟수: ${this.moves}회`);
        }, 500);
    }
    
    /**
     * 게임 재시작
     */
    restart() {
        this.stopTimer();
        
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.isProcessing = false;
        
        this.init();
    }
}

// ES6 모듈 export
export default MemoryMatchGame;

// 전역으로도 노출 (레거시 지원)
if (typeof window !== 'undefined') {
    window.MemoryMatchGame = MemoryMatchGame;
}
