/**
 * ValidationService.js
 * 동화책 완성도 검증 및 상태 확인 서비스
 */

(function() {
    'use strict';
    
    class ValidationService {
        constructor() {
            this.languageNames = {
                'ko': '한국어',
                'en': '영어',
                'ja': '일본어',
                'zh': '중국어',
                'es': '스페인어',
                'fr': '프랑스어',
                'de': '독일어'
            };
        }
        
        /**
         * 초기화
         */
        init() {
            console.log('✅ ValidationService 초기화 완료');
        }
        
        /**
         * 완성도 계산
         */
        calculateCompletionRate(book) {
            if (!book || !book.pages) return 0;
            
            // 사용 가능한 언어 목록
            const availableLanguages = ['ko'];
            if (book.translations && typeof book.translations === 'object') {
                availableLanguages.push(...Object.keys(book.translations));
            }
            
            // 각 항목 카운트
            const characterTotal = book.characters?.length || 0;
            const characterWithImage = book.characters?.filter(c => c.referenceImage).length || 0;
            
            const keyObjectTotal = book.key_objects?.length || 0;
            const keyObjectWithImage = book.keyObjectImages?.filter(img => img?.imageUrl).length || 0;
            
            const pageTotal = book.pages.length;
            const illustrationCount = book.pages.filter(p => p.illustrationImage).length;
            
            // 언어별 텍스트/TTS 카운트
            let textCount = 0;
            let ttsCount = 0;
            
            availableLanguages.forEach(lang => {
                book.pages.forEach((page, idx) => {
                    // 텍스트 체크
                    if (lang === 'ko') {
                        if (page.text && page.text.trim()) textCount++;
                    } else {
                        const translatedText = book.translations?.[lang]?.[idx];
                        if (translatedText && typeof translatedText === 'string' && translatedText.trim()) {
                            textCount++;
                        }
                    }
                    
                    // TTS 체크
                    if (lang === 'ko') {
                        if (page.audioUrl) ttsCount++;
                    } else {
                        if (page.translatedAudioUrls?.[lang]) ttsCount++;
                    }
                });
            });
            
            // 총 항목 및 완료 항목
            const totalItems = 
                characterTotal + 
                keyObjectTotal + 
                pageTotal + // 삽화
                (availableLanguages.length * pageTotal) + // 텍스트
                (availableLanguages.length * pageTotal) + // TTS
                1; // 표지
            
            const completedItems = 
                characterWithImage + 
                keyObjectWithImage + 
                illustrationCount + 
                textCount + 
                ttsCount + 
                (book.coverImage ? 1 : 0);
            
            return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        }
        
        /**
         * 완성도에 따른 버튼 색상 반환
         */
        getCompletionButtonColor(book) {
            const rate = this.calculateCompletionRate(book);
            
            if (rate >= 90) {
                return 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800';
            } else if (rate >= 70) {
                return 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600';
            } else if (rate >= 50) {
                return 'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600';
            } else if (rate >= 30) {
                return 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600';
            } else {
                return 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600';
            }
        }
        
        /**
         * 동화책 상태 확인 및 팝업 표시
         */
        checkStorybookStatus(bookId, storybooks) {
            const book = storybooks.find(b => b.id === bookId);
            if (!book) {
                alert('동화책을 찾을 수 없습니다.');
                return;
            }
            
            // 사용 가능한 언어 목록
            const availableLanguages = ['ko'];
            if (book.translations && typeof book.translations === 'object') {
                availableLanguages.push(...Object.keys(book.translations));
            }
            
            // 상태 수집
            const status = this._collectStatus(book, availableLanguages);
            
            // 완성도 계산
            const completionRate = this.calculateCompletionRate(book);
            
            // HTML 생성 및 표시
            this._showStatusPopup(book, status, completionRate, availableLanguages);
        }
        
        /**
         * 상태 정보 수집 (내부 메서드)
         */
        _collectStatus(book, availableLanguages) {
            const status = {
                characterReferences: {
                    total: book.characters?.length || 0,
                    withImage: book.characters?.filter(c => c.referenceImage).length || 0,
                    missing: []
                },
                keyObjects: {
                    total: book.key_objects?.length || 0,
                    withImage: book.keyObjectImages?.filter(img => img?.imageUrl).length || 0,
                    missing: []
                },
                illustrations: {
                    total: book.pages?.length || 0,
                    withIllustration: book.pages?.filter(p => p.illustrationImage).length || 0,
                    missing: []
                },
                textByLanguage: {},
                ttsByLanguage: {},
                cover: {
                    hasImage: !!book.coverImage
                }
            };
            
            // 캐릭터 누락 확인
            book.characters?.forEach((char, idx) => {
                if (!char.referenceImage) {
                    status.characterReferences.missing.push(idx + 1);
                }
            });
            
            // Key Object 누락 확인
            book.key_objects?.forEach((obj, idx) => {
                const hasImage = book.keyObjectImages?.[idx]?.imageUrl;
                if (!hasImage) {
                    status.keyObjects.missing.push(idx + 1);
                }
            });
            
            // 삽화 누락 확인
            book.pages?.forEach((page, idx) => {
                if (!page.illustrationImage) {
                    status.illustrations.missing.push(page.pageNumber || idx + 1);
                }
            });
            
            // 언어별 텍스트/TTS 상태
            availableLanguages.forEach(lang => {
                status.textByLanguage[lang] = {
                    language: this.languageNames[lang] || lang,
                    total: book.pages?.length || 0,
                    completed: 0,
                    missing: []
                };
                
                status.ttsByLanguage[lang] = {
                    language: this.languageNames[lang] || lang,
                    total: book.pages?.length || 0,
                    completed: 0,
                    missing: []
                };
                
                book.pages?.forEach((page, idx) => {
                    const pageNum = page.pageNumber || idx + 1;
                    
                    // 텍스트 체크
                    let hasText = false;
                    if (lang === 'ko') {
                        hasText = page.text && page.text.trim();
                    } else {
                        const translatedText = book.translations?.[lang]?.[idx];
                        hasText = translatedText && typeof translatedText === 'string' && translatedText.trim();
                    }
                    
                    if (hasText) {
                        status.textByLanguage[lang].completed++;
                    } else {
                        status.textByLanguage[lang].missing.push(pageNum);
                    }
                    
                    // TTS 체크
                    let hasTTS = false;
                    if (lang === 'ko') {
                        hasTTS = !!page.audioUrl;
                    } else {
                        hasTTS = !!page.translatedAudioUrls?.[lang];
                    }
                    
                    if (hasTTS) {
                        status.ttsByLanguage[lang].completed++;
                    } else {
                        status.ttsByLanguage[lang].missing.push(pageNum);
                    }
                });
            });
            
            return status;
        }
        
        /**
         * 상태 팝업 표시 (내부 메서드)
         */
        _showStatusPopup(book, status, completionRate, availableLanguages) {
            // 완성도에 따른 색상
            let rateColor = 'text-red-600';
            if (completionRate >= 90) rateColor = 'text-blue-600';
            else if (completionRate >= 70) rateColor = 'text-cyan-600';
            else if (completionRate >= 50) rateColor = 'text-green-600';
            else if (completionRate >= 30) rateColor = 'text-orange-600';
            
            const html = `
                <div id="statusPopup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeStatusPopup()">
                    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                        <!-- 헤더 -->
                        <div class="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h2 class="text-xl font-bold">${book.title}</h2>
                                    <p class="text-sm opacity-90 mt-1">${book.targetAge}세 · ${book.pages?.length || 0}페이지</p>
                                </div>
                                <div class="text-right">
                                    <div class="text-3xl font-bold ${rateColor} bg-white px-3 py-1 rounded">${completionRate}%</div>
                                    <p class="text-xs mt-1">완성도</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 내용 -->
                        <div class="p-6 space-y-4">
                            ${this._generateStatusSections(status, availableLanguages)}
                        </div>
                        
                        <!-- 푸터 -->
                        <div class="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t">
                            <button onclick="closeStatusPopup()" class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // 기존 팝업 제거
            const existingPopup = document.getElementById('statusPopup');
            if (existingPopup) {
                existingPopup.remove();
            }
            
            // 새 팝업 추가
            document.body.insertAdjacentHTML('beforeend', html);
        }
        
        /**
         * 상태 섹션 HTML 생성 (내부 메서드)
         */
        _generateStatusSections(status, availableLanguages) {
            let html = '';
            
            // 표지
            html += this._generateSection(
                '📖 표지',
                status.cover.hasImage ? '✅ 완료' : '❌ 미완성',
                status.cover.hasImage
            );
            
            // 캐릭터 레퍼런스
            html += this._generateSection(
                '👥 캐릭터 레퍼런스',
                `${status.characterReferences.withImage}/${status.characterReferences.total}`,
                status.characterReferences.withImage === status.characterReferences.total,
                status.characterReferences.missing.length > 0 ? `누락: ${status.characterReferences.missing.join(', ')}번` : null
            );
            
            // Key Objects
            html += this._generateSection(
                '🔑 핵심 사물 (Key Objects)',
                `${status.keyObjects.withImage}/${status.keyObjects.total}`,
                status.keyObjects.withImage === status.keyObjects.total,
                status.keyObjects.missing.length > 0 ? `누락: ${status.keyObjects.missing.join(', ')}번` : null
            );
            
            // 삽화
            html += this._generateSection(
                '🎨 페이지 삽화',
                `${status.illustrations.withIllustration}/${status.illustrations.total}`,
                status.illustrations.withIllustration === status.illustrations.total,
                status.illustrations.missing.length > 0 ? `누락: ${status.illustrations.missing.join(', ')}페이지` : null
            );
            
            // 언어별 텍스트
            availableLanguages.forEach(lang => {
                const text = status.textByLanguage[lang];
                html += this._generateSection(
                    `📝 ${text.language} 텍스트`,
                    `${text.completed}/${text.total}`,
                    text.completed === text.total,
                    text.missing.length > 0 ? `누락: ${text.missing.join(', ')}페이지` : null
                );
            });
            
            // 언어별 TTS
            availableLanguages.forEach(lang => {
                const tts = status.ttsByLanguage[lang];
                html += this._generateSection(
                    `🔊 ${tts.language} TTS`,
                    `${tts.completed}/${tts.total}`,
                    tts.completed === tts.total,
                    tts.missing.length > 0 ? `누락: ${tts.missing.join(', ')}페이지` : null
                );
            });
            
            return html;
        }
        
        /**
         * 개별 섹션 HTML 생성 (내부 메서드)
         */
        _generateSection(title, status, isComplete, details = null) {
            const icon = isComplete ? '✅' : '⚠️';
            const textColor = isComplete ? 'text-green-600' : 'text-orange-600';
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${icon}</span>
                            <span class="font-medium text-gray-700">${title}</span>
                        </div>
                        ${details ? `<p class="text-xs text-gray-500 mt-1 ml-7">${details}</p>` : ''}
                    </div>
                    <span class="font-bold ${textColor}">${status}</span>
                </div>
            `;
        }
    }
    
    // 브라우저 환경에서 전역 노출
    if (typeof window !== 'undefined') {
        window.ValidationService = ValidationService;
        console.log('✅ ValidationService.js 로드 완료');
    }
    
})();
