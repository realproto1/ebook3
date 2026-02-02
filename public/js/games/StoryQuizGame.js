/**
 * StoryQuizGame.js
 * 스토리 퀴즈 게임 클래스 (GameBase 상속)
 */

import GameBase from './engine/GameBase.js';

class StoryQuizGame extends GameBase {
    constructor(options = {}) {
        super(options);
        
        // 퀴즈 상태
        this.quizQuestions = [];
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.answered = false;
        
        // 게임 설정
        this.totalQuestions = options.totalQuestions || 5;
        this.optionsCount = options.optionsCount || 4;
    }
    
    /**
     * 게임 초기화
     */
    async init() {
        try {
            console.log('🎮 StoryQuizGame 초기화 시작');
            
            // 1. 스토리 데이터 로드
            await this.loadStory();
            
            // 2. 퀴즈 생성
            this.generateQuizQuestions();
            
            if (this.quizQuestions.length === 0) {
                alert('퀴즈 문제가 없습니다.');
                this.goBack();
                return;
            }
            
            // 3. 첫 번째 문제 표시
            this.showQuestion(0);
            
            console.log('✅ StoryQuizGame 초기화 완료');
        } catch (error) {
            console.error('❌ StoryQuizGame 초기화 실패:', error);
            alert('게임을 시작할 수 없습니다.');
            this.goBack();
            throw error;
        }
    }
    
    /**
     * 퀴즈 문제 생성
     */
    generateQuizQuestions() {
        // 1. 기존 quizzes 데이터가 있으면 사용
        if (this.storyData.quizzes && this.storyData.quizzes.length > 0) {
            this.quizQuestions = this.storyData.quizzes.slice(0, this.totalQuestions);
            console.log(`📝 기존 퀴즈 사용: ${this.quizQuestions.length}개`);
            return;
        }
        
        // 2. keyObjectImages에서 퀴즈 생성
        const keyObjects = this.storyData.keyObjectImages?.filter(
            obj => obj.imageUrl && obj.success
        ) || [];
        
        if (keyObjects.length === 0) {
            console.warn('⚠️ Key Objects 이미지가 없습니다.');
            return;
        }
        
        // 퀴즈 문제 생성
        this.quizQuestions = keyObjects.slice(0, this.totalQuestions).map(obj => ({
            question: '이 사물의 이름은 무엇일까요?',
            imageUrl: obj.imageUrl,
            correctAnswer: obj.korean || obj.name,
            options: this.generateOptions(obj.korean || obj.name, keyObjects)
        }));
        
        console.log(`📝 퀴즈 생성 완료: ${this.quizQuestions.length}개`);
    }
    
    /**
     * 선택지 생성 (정답 + 오답 3개)
     */
    generateOptions(correctAnswer, allObjects) {
        const options = [correctAnswer];
        
        // 다른 객체들에서 오답 선택
        const otherObjects = allObjects.filter(
            obj => (obj.korean || obj.name) !== correctAnswer
        );
        
        // 랜덤하게 3개 선택
        while (options.length < this.optionsCount && otherObjects.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherObjects.length);
            const wrongAnswer = otherObjects[randomIndex].korean || otherObjects[randomIndex].name;
            
            if (!options.includes(wrongAnswer)) {
                options.push(wrongAnswer);
            }
            
            otherObjects.splice(randomIndex, 1);
        }
        
        // 부족한 경우 더미 데이터 추가
        const dummyAnswers = ['사과', '바나나', '자동차', '집', '나무', '꽃', '책', '연필'];
        while (options.length < this.optionsCount) {
            const dummy = dummyAnswers[Math.floor(Math.random() * dummyAnswers.length)];
            if (!options.includes(dummy)) {
                options.push(dummy);
            }
        }
        
        // 선택지 섞기
        return this.shuffleArray(options);
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
     * 문제 표시
     */
    showQuestion(index) {
        this.currentQuestionIndex = index;
        this.answered = false;
        
        const question = this.quizQuestions[index];
        
        // 진행 상황 업데이트
        this.updateProgress();
        
        // 문제 번호
        const questionNumber = document.getElementById('questionNumber');
        if (questionNumber) {
            questionNumber.textContent = `문제 ${index + 1} / ${this.quizQuestions.length}`;
        }
        
        // 이미지
        const keyObjectImage = document.getElementById('keyObjectImage');
        if (keyObjectImage && question.imageUrl) {
            keyObjectImage.src = question.imageUrl;
            keyObjectImage.alt = '퀴즈 이미지';
        }
        
        // 질문 텍스트
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = question.question;
        }
        
        // 선택지
        const optionsContainer = document.getElementById('optionsContainer');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            
            question.options.forEach((option, optionIndex) => {
                const button = this.createOptionButton(option, optionIndex);
                optionsContainer.appendChild(button);
            });
        }
    }
    
    /**
     * 선택지 버튼 생성
     */
    createOptionButton(option, index) {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.dataset.option = option;
        button.addEventListener('click', () => this.selectAnswer(option));
        return button;
    }
    
    /**
     * 답변 선택
     */
    selectAnswer(selectedOption) {
        if (this.answered) return;
        
        this.answered = true;
        const question = this.quizQuestions[this.currentQuestionIndex];
        const isCorrect = selectedOption === question.correctAnswer;
        
        if (isCorrect) {
            this.correctAnswers++;
        }
        
        // UI 업데이트
        this.showAnswerFeedback(selectedOption, question.correctAnswer);
        
        // 다음 문제로 자동 이동 (1.5초 후)
        setTimeout(() => {
            if (this.currentQuestionIndex < this.quizQuestions.length - 1) {
                this.showQuestion(this.currentQuestionIndex + 1);
            } else {
                this.showResult();
            }
        }, 1500);
    }
    
    /**
     * 답변 피드백 표시
     */
    showAnswerFeedback(selectedOption, correctAnswer) {
        const buttons = document.querySelectorAll('.option-btn');
        
        buttons.forEach(button => {
            const option = button.dataset.option;
            
            if (option === correctAnswer) {
                button.classList.add('correct');
                button.innerHTML = `<i class="fas fa-check mr-2"></i>${option}`;
            } else if (option === selectedOption) {
                button.classList.add('wrong');
                button.innerHTML = `<i class="fas fa-times mr-2"></i>${option}`;
            }
            
            button.disabled = true;
        });
    }
    
    /**
     * 진행 상황 업데이트
     */
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percentage = ((this.currentQuestionIndex + 1) / this.quizQuestions.length) * 100;
            progressFill.style.width = `${percentage}%`;
            progressFill.textContent = `${this.currentQuestionIndex + 1} / ${this.quizQuestions.length}`;
        }
    }
    
    /**
     * 결과 표시
     */
    showResult() {
        const percentage = Math.round((this.correctAnswers / this.quizQuestions.length) * 100);
        
        // 결과 화면으로 전환
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;
        
        let emoji = '🎉';
        let message = '완벽해요!';
        
        if (percentage >= 80) {
            emoji = '🎉';
            message = '완벽해요!';
        } else if (percentage >= 60) {
            emoji = '😊';
            message = '잘했어요!';
        } else if (percentage >= 40) {
            emoji = '🙂';
            message = '괜찮아요!';
        } else {
            emoji = '💪';
            message = '다시 도전해봐요!';
        }
        
        gameArea.innerHTML = `
            <div class="text-center py-8">
                <div class="text-8xl mb-6">${emoji}</div>
                <div class="text-3xl font-bold mb-4 text-gray-800">${message}</div>
                <div class="text-6xl font-bold mb-6 text-purple-600">${this.correctAnswers} / ${this.quizQuestions.length}</div>
                <div class="text-2xl text-gray-600 mb-8">${percentage}% 정답!</div>
                
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
     * 게임 재시작
     */
    restart() {
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.answered = false;
        
        this.init();
    }
}

// ES6 모듈 export
export default StoryQuizGame;

// 전역으로도 노출 (레거시 지원)
if (typeof window !== 'undefined') {
    window.StoryQuizGame = StoryQuizGame;
}
