/**
 * TranslationService.js
 * 번역 서비스
 */

(function() {
    'use strict';

    class TranslationService {
        constructor() {
            this.api = null;
        }

        /**
         * 초기화
         */
        init(dependencies) {
            this.api = dependencies.api;
            console.log('✅ TranslationService 초기화 완료');
        }

        /**
         * 단일 페이지 번역
         * @param {Object} page - 페이지 객체
         * @param {string} targetLanguage - 목표 언어
         * @param {Object} context - 번역 컨텍스트
         * @returns {Promise<string>} 번역된 텍스트
         */
        async translatePage(page, targetLanguage, context = {}) {
            if (!page || !page.text || page.text.trim() === '') {
                throw new Error('번역할 텍스트가 없습니다.');
            }
            
            if (targetLanguage === 'ko') {
                throw new Error('한국어는 번역할 필요가 없습니다.');
            }
            
            try {
                const response = await this.api.post('/api/translate-page', {
                    text: page.text,
                    targetLanguage: targetLanguage,
                    context: context
                }, {
                    timeout: 30000  // 30초
                });
                
                if (response.data.success) {
                    console.log(`✅ 페이지 ${page.pageNumber} 번역 완료`);
                    return response.data.translatedText;
                } else {
                    throw new Error(response.data.error || '번역 실패');
                }
            } catch (error) {
                console.error('페이지 번역 실패:', error);
                throw error;
            }
        }

        /**
         * 모든 페이지 순차 번역
         * @param {Object} storybook - 동화책 객체
         * @param {string} targetLanguage - 목표 언어
         * @param {Function} progressCallback - 진행 상황 콜백
         * @returns {Promise<Object>} 번역 결과 {successCount, failCount, translations}
         */
        async translateAllPages(storybook, targetLanguage, progressCallback = null) {
            if (!storybook || !storybook.pages) {
                throw new Error('동화책이 선택되지 않았습니다.');
            }
            
            if (targetLanguage === 'ko') {
                throw new Error('한국어는 번역할 필요가 없습니다.');
            }
            
            const totalPages = storybook.pages.length;
            let successCount = 0;
            let failCount = 0;
            
            // translations 초기화
            if (!storybook.translations) {
                storybook.translations = {};
            }
            if (!storybook.translations[targetLanguage]) {
                storybook.translations[targetLanguage] = storybook.pages.map(p => ({
                    pageNumber: p.pageNumber,
                    text: ''
                }));
            }
            
            console.log(`🌐 모든 페이지 번역 시작 (${totalPages}개 페이지)`);
            console.log('📋 번역 데이터 구조:', {
                hasTranslations: !!storybook.translations,
                hasCurrentLang: !!storybook.translations?.[targetLanguage],
                translationCount: storybook.translations?.[targetLanguage]?.length || 0,
                targetLanguage: targetLanguage
            });
            
            for (let i = 0; i < storybook.pages.length; i++) {
                const page = storybook.pages[i];
                
                // 이미 번역된 페이지는 건너뛰기
                const translatedPage = storybook.translations[targetLanguage]?.find(p => p.pageNumber === page.pageNumber);
                const hasTranslation = translatedPage && translatedPage.text && translatedPage.text.trim() !== '';
                
                console.log(`📄 페이지 ${page.pageNumber}: 번역=${hasTranslation}, 텍스트=${translatedPage?.text?.substring(0, 50)}...`);
                
                if (hasTranslation) {
                    console.log(`⏭️ 페이지 ${page.pageNumber} 이미 번역됨, 건너뛰기`);
                    successCount++;
                    
                    // 진행 상황 콜백
                    if (progressCallback) {
                        progressCallback(i + 1, totalPages, 'skipped');
                    }
                    
                    continue;
                }
                
                console.log(`🌐 페이지 ${page.pageNumber}/${totalPages} 번역 중...`);
                
                // 진행 상황 콜백
                if (progressCallback) {
                    progressCallback(i + 1, totalPages, 'translating');
                }
                
                try {
                    const sourceText = page.text;
                    
                    if (!sourceText || sourceText.trim() === '') {
                        console.log(`⚠️ 페이지 ${page.pageNumber} 텍스트 없음, 건너뛰기`);
                        continue;
                    }
                    
                    const translatedText = await this.translatePage(page, targetLanguage, {
                        title: storybook.title,
                        theme: storybook.theme,
                        characters: storybook.characters ? storybook.characters.map(c => c.name).join(', ') : ''
                    });
                    
                    // 해당 페이지 번역 텍스트 저장
                    const translationPage = storybook.translations[targetLanguage].find(p => p.pageNumber === page.pageNumber);
                    if (translationPage) {
                        translationPage.text = translatedText;
                    }
                    
                    successCount++;
                    console.log(`✅ 페이지 ${page.pageNumber} 번역 완료`);
                    
                    // 진행 상황 콜백
                    if (progressCallback) {
                        progressCallback(i + 1, totalPages, 'success', translatedText);
                    }
                    
                } catch (error) {
                    failCount++;
                    console.error(`❌ 페이지 ${page.pageNumber} 번역 실패:`, error);
                    
                    // 진행 상황 콜백
                    if (progressCallback) {
                        progressCallback(i + 1, totalPages, 'error', error);
                    }
                }
                
                // 페이지 간 딜레이 (API 제한 방지)
                if (i < storybook.pages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.log(`🎉 번역 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
            
            return {
                successCount,
                failCount,
                translations: storybook.translations[targetLanguage]
            };
        }

        /**
         * 번역 버튼 상태 업데이트
         * @param {HTMLElement} button - 버튼 엘리먼트
         * @param {string} state - 'idle', 'loading', 'success', 'error'
         * @param {number} current - 현재 진행 수
         * @param {number} total - 전체 수
         */
        updateButtonState(button, state, current = 0, total = 0) {
            if (!button) return;
            
            switch (state) {
                case 'idle':
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-language mr-1"></i>번역';
                    break;
                    
                case 'loading':
                    button.disabled = true;
                    if (total > 0) {
                        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>번역 중... (${current}/${total})`;
                    } else {
                        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>번역 중...';
                    }
                    break;
                    
                case 'success':
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-check-circle mr-1"></i>번역 완료';
                    setTimeout(() => {
                        this.updateButtonState(button, 'idle');
                    }, 2000);
                    break;
                    
                case 'error':
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>번역 실패';
                    setTimeout(() => {
                        this.updateButtonState(button, 'idle');
                    }, 2000);
                    break;
            }
        }
    }

    // 브라우저 환경에서 전역으로 노출
    if (typeof window !== 'undefined') {
        window.TranslationService = TranslationService;
        console.log('✅ TranslationService.js 로드 완료');
    }
})();
