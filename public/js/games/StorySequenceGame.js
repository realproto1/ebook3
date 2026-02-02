/**
 * StorySequenceGame.js
 * 스토리 순서 맞추기 게임 클래스 (GameBase 상속)
 */

import GameBase from './engine/GameBase.js';

class StorySequenceGame extends GameBase {
    constructor(options = {}) {
        super(options);
        
        // 게임 상태
        this.quizQuestions = [];
        this.currentQuestionIndex = 0;
        this.currentOrder = [];
        this.draggedItem = null;
        
        // 게임 설정
        this.totalQuestions = options.totalQuestions || 4;
        this.pagesPerQuestion = options.pagesPerQuestion || 4;
    }
    
    /**
     * 게임 초기화
     */
    async init() {
        try {
            console.log('🎮 StorySequenceGame 초기화 시작');
            
            // 1. 스토리 데이터 로드
            await this.loadStory();
            
            // 2. 문제 생성
            this.generateQuestions();
            
            if (this.quizQuestions.length === 0) {
                alert('스토리 페이지가 부족합니다. (최소 4페이지 필요)');
                this.goBack();
                return;
            }
            
            // 3. 첫 번째 문제 표시
            this.renderQuestion(0);
            
            console.log('✅ StorySequenceGame 초기화 완료');
        } catch (error) {
            console.error('❌ StorySequenceGame 초기화 실패:', error);
            alert('게임을 시작할 수 없습니다.');
            this.goBack();
            throw error;
        }
    }
    
    /**
     * 문제 생성
     */
    generateQuestions() {
        const pages = this.storyData.pages;
        
        if (!pages || pages.length < this.pagesPerQuestion) {
            console.warn('⚠️ 페이지가 부족합니다.');
            return;
        }
        
        const totalPages = pages.length;
        
        // 문제 생성
        for (let i = 0; i < this.totalQuestions; i++) {
            // 각 문제마다 연속된 페이지 선택
            const startIndex = Math.floor((totalPages - this.pagesPerQuestion) * i / (this.totalQuestions - 1 || 1));
            const selectedPages = pages.slice(startIndex, startIndex + this.pagesPerQuestion).map(p => ({
                ...p,
                originalIndex: p.pageNumber || p.page_number
            }));
            
            this.quizQuestions.push({
                pages: selectedPages,
                correctOrder: selectedPages.map(p => p.originalIndex)
            });
        }
        
        console.log(`📝 문제 생성 완료: ${this.quizQuestions.length}개`);
    }
    
    /**
     * 문제 렌더링
     */
    renderQuestion(index) {
        this.currentQuestionIndex = index;
        const question = this.quizQuestions[index];
        
        // 페이지 섞기
        const shuffledPages = this.shuffleArray([...question.pages]);
        this.currentOrder = shuffledPages.map(p => p.originalIndex);
        
        // 진행 상황 업데이트
        const questionNumber = document.getElementById('questionNumber');
        const totalQuestions = document.getElementById('totalQuestions');
        
        if (questionNumber) {
            questionNumber.textContent = index + 1;
        }
        if (totalQuestions) {
            totalQuestions.textContent = this.quizQuestions.length;
        }
        
        // 페이지 카드 렌더링
        const pagesContainer = document.getElementById('pagesContainer');
        if (pagesContainer) {
            pagesContainer.innerHTML = '';
            
            shuffledPages.forEach((page, idx) => {
                const card = this.createPageCard(page, idx);
                pagesContainer.appendChild(card);
            });
        }
        
        // 드래그 앤 드롭 이벤트 설정
        this.setupDragAndDrop();
    }
    
    /**
     * 페이지 카드 생성
     */
    createPageCard(page, index) {
        const card = document.createElement('div');
        card.className = 'sequence-card';
        card.draggable = true;
        card.dataset.index = index;
        card.dataset.originalIndex = page.originalIndex;
        
        const imageUrl = page.imageUrl || page.image_url || page.illustration;
        const text = page.text || page.content || '';
        
        card.innerHTML = `
            <div class="sequence-number">${index + 1}</div>
            ${imageUrl ? `<img src="${imageUrl}" alt="페이지 ${page.originalIndex}" class="page-image">` : ''}
            <div class="page-text">${text.substring(0, 100)}${text.length > 100 ? '...' : ''}</div>
            <div class="drag-handle">
                <i class="fas fa-grip-vertical"></i>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 드래그 앤 드롭 설정
     */
    setupDragAndDrop() {
        const cards = document.querySelectorAll('.sequence-card');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                this.draggedItem = card;
            });
            
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                this.draggedItem = null;
            });
            
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(e.clientY);
                const container = document.getElementById('pagesContainer');
                
                if (afterElement == null) {
                    container.appendChild(this.draggedItem);
                } else {
                    container.insertBefore(this.draggedItem, afterElement);
                }
                
                this.updateCurrentOrder();
            });
        });
    }
    
    /**
     * 드래그 후 요소 찾기
     */
    getDragAfterElement(y) {
        const container = document.getElementById('pagesContainer');
        const draggableElements = [...container.querySelectorAll('.sequence-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    /**
     * 현재 순서 업데이트
     */
    updateCurrentOrder() {
        const cards = document.querySelectorAll('.sequence-card');
        this.currentOrder = Array.from(cards).map(card => parseInt(card.dataset.originalIndex));
        
        // 순서 번호 업데이트
        cards.forEach((card, index) => {
            const numberDiv = card.querySelector('.sequence-number');
            if (numberDiv) {
                numberDiv.textContent = index + 1;
            }
        });
    }
    
    /**
     * 답안 확인
     */
    checkAnswer() {
        const question = this.quizQuestions[this.currentQuestionIndex];
        const isCorrect = JSON.stringify(this.currentOrder) === JSON.stringify(question.correctOrder);
        
        if (isCorrect) {
            this.showFeedback(true);
            
            setTimeout(() => {
                if (this.currentQuestionIndex < this.quizQuestions.length - 1) {
                    this.renderQuestion(this.currentQuestionIndex + 1);
                } else {
                    this.showResult();
                }
            }, 1500);
        } else {
            this.showFeedback(false);
        }
    }
    
    /**
     * 피드백 표시
     */
    showFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('feedback');
        
        if (!feedbackDiv) return;
        
        if (isCorrect) {
            feedbackDiv.innerHTML = `
                <div class="feedback correct">
                    <i class="fas fa-check-circle text-4xl mb-2"></i>
                    <div class="text-xl font-bold">정답입니다! 🎉</div>
                </div>
            `;
        } else {
            feedbackDiv.innerHTML = `
                <div class="feedback wrong">
                    <i class="fas fa-times-circle text-4xl mb-2"></i>
                    <div class="text-xl font-bold">다시 시도해보세요!</div>
                </div>
            `;
        }
        
        feedbackDiv.style.display = 'block';
        
        setTimeout(() => {
            if (feedbackDiv) {
                feedbackDiv.style.display = 'none';
            }
        }, 1500);
    }
    
    /**
     * 결과 표시
     */
    showResult() {
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;
        
        gameArea.innerHTML = `
            <div class="text-center py-8">
                <div class="text-8xl mb-6">🎉</div>
                <div class="text-3xl font-bold mb-4 text-gray-800">모든 문제를 완료했습니다!</div>
                <div class="text-xl text-gray-600 mb-8">축하합니다!</div>
                
                <div class="flex gap-4 justify-center">
                    <button onclick="game.restart()" class="btn btn-restart">
                        <i class="fas fa-redo mr-2"></i>
                        다시 도전
                    </button>
                    <button onclick="game.goBack()" class="btn btn-back">
                        <i class="fas fa-arrow-left mr-2"></i>
                        돌아가기
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 배열 섞기 (Fisher-Yates)
     */
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
    
    /**
     * 게임 재시작
     */
    restart() {
        this.currentQuestionIndex = 0;
        this.currentOrder = [];
        this.init();
    }
}

// ES6 모듈 export
export default StorySequenceGame;

// 전역으로도 노출 (레거시 지원)
if (typeof window !== 'undefined') {
    window.StorySequenceGame = StorySequenceGame;
}
