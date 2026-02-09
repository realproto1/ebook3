/**
 * TTSGenerator - TTS 생성 전용 클래스
 * BaseGenerator를 상속받아 TTS 생성 로직 구현
 */
class TTSGenerator extends BaseGenerator {
    constructor(options = {}) {
        super({
            ...options,
            buttonId: 'generate-all-tts-btn'
        });
        
        this.ttsService = options.ttsService || window.ttsService;
        this.imageSettings = options.imageSettings || window.imageSettings || {};
        this.language = options.language || window.currentLanguage || 'ko';
        
        // 🔍 디버깅: imageSettings 확인
        console.log('🔧 TTSGenerator 초기화:');
        console.log('   imageSettings.ttsModel:', this.imageSettings.ttsModel);
        console.log('   imageSettings.geminiTTSModel:', this.imageSettings.geminiTTSModel);
    }

    /**
     * 단일 페이지 TTS 생성
     */
    async generate(pageIndex) {
        if (!this.storybook || !this.storybook.pages[pageIndex]) {
            throw new Error('유효하지 않은 페이지입니다.');
        }

        // ✅ 1단계: DOM에서 최신 텍스트를 읽어서 storybook 업데이트
        await this._updatePageTextFromDOM(pageIndex);

        // ✅ 2단계: 업데이트된 storybook에서 텍스트 가져오기
        const page = this.storybook.pages[pageIndex];
        const pageText = this._getPageText(page);
        
        if (!pageText?.trim()) {
            throw new Error('페이지 텍스트가 없습니다.');
        }

        const ttsButton = document.getElementById(`tts-btn-${pageIndex}`);

        try {
            // 버튼 로딩
            if (ttsButton) {
                ttsButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>생성중...';
                ttsButton.disabled = true;
            }

            console.log(`🎤 페이지 ${page.pageNumber} TTS 생성 중...`);
            console.log(`   📝 텍스트: "${pageText.substring(0, 50)}..."`);
            console.log(`   🎵 음성: ${this.imageSettings.ttsModel || 'Aoede'} (기본값: Aoede)`);
            console.log(`   🔧 모델: ${this.imageSettings.geminiTTSModel || 'gemini-2.5-flash-preview-tts'}`);

            // API 호출
            const result = await this.ttsService.generatePageTTS(page, {
                model: this.imageSettings.geminiTTSModel || 'gemini-2.5-flash-preview-tts',
                voice: this.imageSettings.ttsModel || 'Aoede',
                voiceConfig: this.imageSettings.ttsVoiceConfig,
                language: this.language,
                storybookId: this.storybook?.id,
                storybookTitle: this.storybook?.title,
                pageNumber: page.pageNumber
            });

            if (!result.success || !result.audioUrl) {
                throw new Error('TTS 생성 실패');
            }

            // 결과 저장
            this._saveResult(pageIndex, result);

            // 버튼 복원
            if (ttsButton) {
                ttsButton.innerHTML = '<i class="fas fa-volume-up mr-1"></i>음성 생성';
                ttsButton.disabled = false;
            }

            console.log(`✅ 페이지 ${page.pageNumber} TTS 생성 완료`);
            this.showSuccess(`페이지 ${page.pageNumber} TTS 생성 완료!`);

            return { success: true, audioUrl: result.audioUrl };

        } catch (error) {
            console.error(`❌ 페이지 ${pageIndex} TTS 생성 실패:`, error);
            
            // 버튼 복원
            if (ttsButton) {
                ttsButton.innerHTML = '<i class="fas fa-volume-up mr-1"></i>음성 생성';
                ttsButton.disabled = false;
            }
            
            throw error;
        }
    }

    /**
     * 모든 페이지 TTS 순차 생성
     */
    async generateAll() {
        const pages = this.storybook?.pages;
        
        if (!pages || pages.length === 0) {
            alert('동화책 페이지가 없습니다.');
            return;
        }

        // 1. 생성할 페이지 필터링
        const pagesToGenerate = pages.filter(page => {
            const pageText = this._getPageText(page);
            const pageTTS = this._getPageTTS(page);
            return pageText?.trim() && !pageTTS;
        });

        if (pagesToGenerate.length === 0) {
            alert('이미 모든 페이지의 TTS가 생성되었습니다.');
            return;
        }

        // 2. 예상 시간 계산 및 확인
        const estimatedTime = this.estimateTime(pagesToGenerate.length, 3);
        if (!confirm(`${pagesToGenerate.length}개의 페이지 TTS를 생성하시겠습니까?\n\n언어: ${this.language}\n예상 소요 시간: 약 ${estimatedTime}초`)) {
            return;
        }

        // 3. 버튼 로딩 시작
        this.setButtonLoading(true);

        try {
            let successCount = 0;
            let failCount = 0;
            const totalPages = pagesToGenerate.length;

            console.log(`🎤 모든 TTS 생성 시작 (${totalPages}개 페이지, 언어: ${this.language})`);

            // 4. 순차적 생성
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const pageText = this._getPageText(page);
                const pageTTS = this._getPageTTS(page);

                // 이미 생성된 페이지는 건너뛰기
                if (!pageText?.trim() || pageTTS) continue;

                // 진행률 업데이트
                const current = successCount + failCount + 1;
                const button = document.getElementById(this.buttonId);
                if (button) {
                    button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>TTS 생성 중 ${current}/${totalPages}`;
                }

                // 페이지 버튼 로딩
                const ttsButton = document.getElementById(`tts-btn-${i}`);
                if (ttsButton) {
                    ttsButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>생성중 (${current}/${totalPages})`;
                    ttsButton.disabled = true;
                }

                try {
                    // ✅ 각 페이지 생성 전 storybook 저장 (최신 텍스트 반영)
                    await this._saveToR2();
                    
                    await this.generate(i);
                    successCount++;

                    // 5페이지마다 중간 저장 및 휴식
                    if (successCount % 5 === 0 && successCount < totalPages) {
                        console.log(`💾 중간 저장 중... (${successCount}개 완료)`);
                        
                        try {
                            await this._saveToR2();
                        } catch (saveError) {
                            console.warn(`⚠️ 중간 저장 실패:`, saveError.message);
                        }

                        // API 할당량 보호
                        console.log(`⏸️ API 할당량 보호: 60초 대기 중...`);
                        if (window.showNotification) {
                            window.showNotification('info', '잠시 대기 중...', 'API 할당량 보호를 위해 60초 대기합니다.');
                        }
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }

                } catch (error) {
                    failCount++;

                    const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류';

                    // 할당량 초과 감지
                    if (errorMessage.includes('quota') || error.response?.status === 429) {
                        console.error('🚫 API 할당량 초과!');
                        if (window.showNotification) {
                            window.showNotification('error', 'API 할당량 초과', 'Gemini TTS API 일일 할당량을 초과했습니다.');
                        }
                        break;
                    }
                }
            }

            // 5. 최종 저장
            if (successCount > 0) {
                try {
                    await this._saveToR2();
                } catch (saveError) {
                    console.error('❌ 최종 저장 실패:', saveError);
                    if (window.showNotification) {
                        window.showNotification('warning', '저장 실패', 'TTS는 생성되었지만 저장에 실패했습니다.');
                    }
                }
            }

            // 6. 디스플레이 업데이트
            this.updateDisplay();

            // 7. 결과 알림
            if (successCount > 0) {
                this.showSuccess(`모든 TTS 생성 완료! 🎤 (${successCount}개 완료${failCount > 0 ? `, ${failCount}개 실패` : ''})`);
            } else if (failCount > 0) {
                this.showFailure('모든 페이지에서 TTS 생성에 실패했습니다. API 할당량을 확인해주세요.');
            }

            console.log(`✅ 모든 TTS 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

        } catch (error) {
            console.error('TTS 배치 생성 오류:', error);
            alert('TTS 생성 중 오류가 발생했습니다: ' + error.message);
        } finally {
            this.setButtonLoading(false);
        }
    }

    /**
     * DOM에서 최신 텍스트를 읽어서 storybook 업데이트
     */
    async _updatePageTextFromDOM(pageIndex) {
        const textareaId = `page-text-${this.language}-${pageIndex}`;
        const textarea = document.getElementById(textareaId);
        
        if (!textarea) {
            console.warn(`⚠️ textarea not found: ${textareaId}`);
            return;
        }
        
        const latestText = textarea.value;
        console.log(`📝 DOM에서 최신 텍스트 읽기 (페이지 ${pageIndex + 1}, 언어: ${this.language})`);
        
        // storybook에 최신 텍스트 반영
        if (this.language === 'ko') {
            this.storybook.pages[pageIndex].text = latestText;
        } else {
            // 다른 언어의 경우 translations 업데이트
            if (!this.storybook.translations) {
                this.storybook.translations = {};
            }
            if (!this.storybook.translations[this.language]) {
                this.storybook.translations[this.language] = this.storybook.pages.map(p => ({
                    pageNumber: p.pageNumber,
                    text: ''
                }));
            }
            const translationPage = this.storybook.translations[this.language].find(
                p => p.pageNumber === this.storybook.pages[pageIndex].pageNumber
            );
            if (translationPage) {
                translationPage.text = latestText;
            }
        }
        
        console.log(`✅ storybook 텍스트 업데이트 완료: "${latestText.substring(0, 50)}..."`);
    }

    /**
     * 페이지 텍스트 가져오기
     */
    _getPageText(page) {
        if (window.getPageText) {
            return window.getPageText(page, this.language);
        }
        
        // Fallback
        if (this.language === 'ko') {
            return page.text;
        }
        return page.translations?.[this.language] || page.text;
    }

    /**
     * 페이지 TTS 가져오기
     */
    _getPageTTS(page) {
        if (window.getPageTTS) {
            return window.getPageTTS(page, this.language);
        }
        
        // Fallback
        if (this.language === 'ko') {
            return page.ttsAudio?.url || page.audioUrl;
        }
        return page.ttsAudio?.[this.language]?.url;
    }

    /**
     * 결과 저장
     */
    _saveResult(pageIndex, result) {
        const page = this.storybook.pages[pageIndex];
        
        if (!page.ttsAudio) {
            page.ttsAudio = {};
        }

        if (this.language === 'ko') {
            page.ttsAudio.url = result.audioUrl;
            page.ttsAudio.model = this.imageSettings.ttsModel;
            page.audioUrl = result.audioUrl;
        } else {
            page.ttsAudio[this.language] = {
                url: result.audioUrl,
                model: this.imageSettings.ttsModel
            };
        }
    }

    /**
     * R2 저장
     */
    async _saveToR2() {
        if (window.saveToR2) {
            return await window.saveToR2(this.storybook);
        } else {
            await this.saveStorybook();
        }
    }
}

// Export
window.TTSGenerator = TTSGenerator;
