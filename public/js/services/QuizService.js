/**
 * QuizService.js
 * 퀴즈 생성 및 관리 서비스
 */

(function() {
    'use strict';

    class QuizService {
        constructor() {
            this.api = null;
        }

        /**
         * 초기화
         */
        init(dependencies) {
            this.api = dependencies.api;
            console.log('✅ QuizService 초기화 완료');
        }

        /**
         * 퀴즈 생성
         * @param {Object} storybook - 동화책 객체
         * @param {number} count - 생성할 퀴즈 개수
         * @returns {Promise<Array>} 생성된 퀴즈 배열
         */
        async generateQuiz(storybook, count = 5) {
            if (!storybook || !storybook.pages || storybook.pages.length === 0) {
                throw new Error('동화책을 먼저 생성해주세요.');
            }
            
            // Key Objects 체크
            if (!storybook.key_objects || storybook.key_objects.length === 0) {
                throw new Error('퀴즈를 생성하려면 먼저 Key Objects(핵심 사물)를 생성해주세요.\n\n"Key Objects(핵심 사물)" 섹션에서 사물을 추가할 수 있습니다.');
            }
            
            console.log(`🎯 Generating ${count} quiz questions based on Key Objects...`);
            console.log('📦 Key Objects:', storybook.key_objects.map(obj => obj.name).join(', '));
            
            const response = await this.api.post('/api/generate-quiz', {
                storybook: storybook,
                count: count
            });
            
            if (response.data.success && response.data.quizzes) {
                console.log(`✅ Generated ${response.data.quizzes.length} Key Object-based quiz questions`);
                
                // 성공 메시지
                const successQuizzes = response.data.quizzes.filter(q => q.relatedKeyObject).length;
                if (successQuizzes > 0) {
                    console.log(`🔑 ${successQuizzes}개의 퀴즈가 Key Objects와 연결되었습니다.`);
                }
                
                return response.data.quizzes;
            } else {
                throw new Error('퀴즈 생성 실패');
            }
        }

        /**
         * 로딩 UI 렌더링
         * @param {HTMLElement} container - 컨테이너 엘리먼트
         * @param {Object} storybook - 동화책 객체
         */
        renderLoadingUI(container, storybook) {
            if (!container) return;
            
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Key Objects 기반 퀴즈를 생성하고 있습니다...</p>
                    <p class="text-xs text-gray-500 mt-2">Key Objects: ${storybook.key_objects.map(obj => obj.name).join(', ')}</p>
                </div>
            `;
        }

        /**
         * 에러 UI 렌더링
         * @param {HTMLElement} container - 컨테이너 엘리먼트
         * @param {Error} error - 에러 객체
         */
        renderErrorUI(container, error) {
            if (!container) return;
            
            container.innerHTML = `
                <div class="text-center py-8 text-red-600">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>퀴즈 생성 중 오류가 발생했습니다.</p>
                    <p class="text-sm mt-2">${error.response?.data?.error || error.message}</p>
                    <button 
                        onclick="generateQuiz()"
                        class="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                    >
                        <i class="fas fa-redo mr-1"></i>다시 시도
                    </button>
                </div>
            `;
        }
    }

    // 브라우저 환경에서 전역으로 노출
    if (typeof window !== 'undefined') {
        window.QuizService = QuizService;
        console.log('✅ QuizService.js 로드 완료');
    }
})();
