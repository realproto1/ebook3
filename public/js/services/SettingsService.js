/**
 * SettingsService.js
 * 이미지 설정 및 애플리케이션 설정 관리 서비스
 */

(function() {
    'use strict';
    
    class SettingsService {
        constructor() {
            this.settings = {
                aspectRatio: '16:9',
                enforceNoText: true,
                enforceCharacterConsistency: true,
                additionalPrompt: '',
                imageQuality: 'high',
                imageModel: 'gemini-3-pro-image-preview',
                characterModel: 'gemini-3-pro-image-preview',
                keyObjectModel: 'gemini-3-pro-image-preview',
                illustrationModel: 'gemini-3-pro-image-preview',
                vocabularyModel: 'gemini-3-pro-image-preview',
                coverModel: 'gemini-3-pro-image-preview',
                geminiTTSModel: 'gemini-2.5-flash-preview-tts',
                ttsModel: 'Aoede',
                ttsVoiceConfig: '여성 목소리, 부드럽고 따뜻한 톤, 동화 낭독 스타일, 적당한 속도로 또박또박, 어린이가 이해하기 쉽게'
            };
            
            this.IMAGE_MODELS = [
                { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (권장)' },
                { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
                { value: 'imagen4', label: 'Imagen 4' }
            ];
        }
        
        /**
         * 초기화
         */
        init() {
            this.loadSettings();
            console.log('✅ SettingsService 초기화 완료');
        }
        
        /**
         * 설정 로드
         */
        loadSettings() {
            const saved = localStorage.getItem('imageSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                
                // 유효하지 않은 모델 설정 자동 수정
                const validModels = this.IMAGE_MODELS.map(m => m.value);
                const invalidModels = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-2.5-pro'];
                
                // 각 모델 설정 검증 및 수정
                ['coverModel', 'characterModel', 'keyObjectModel', 'illustrationModel', 'vocabularyModel'].forEach(key => {
                    if (this.settings[key] && (invalidModels.includes(this.settings[key]) || !validModels.includes(this.settings[key]))) {
                        console.warn(`⚠️ 유효하지 않은 ${key} 감지: ${this.settings[key]} → gemini-3-pro-image-preview로 자동 수정`);
                        this.settings[key] = 'gemini-3-pro-image-preview';
                    }
                });
                
                // 수정된 설정 저장
                this.saveSettings();
            }
        }
        
        /**
         * 설정 저장
         */
        saveSettings() {
            localStorage.setItem('imageSettings', JSON.stringify(this.settings));
        }
        
        /**
         * 설정값 가져오기
         */
        getSettings() {
            return { ...this.settings };
        }
        
        /**
         * 특정 설정값 가져오기
         */
        getSetting(key) {
            return this.settings[key];
        }
        
        /**
         * 설정값 업데이트
         */
        updateSetting(key, value) {
            this.settings[key] = value;
            this.saveSettings();
        }
        
        /**
         * 여러 설정값 업데이트
         */
        updateSettings(updates) {
            this.settings = { ...this.settings, ...updates };
            this.saveSettings();
        }
        
        /**
         * 설정 모달 열기
         */
        openSettingsModal() {
            // DOM 요소들이 있을 때만 설정 적용
            const aspectRatioEl = document.getElementById('imageAspectRatio');
            const enforceNoTextEl = document.getElementById('enforceNoText');
            const enforceCharacterEl = document.getElementById('enforceCharacterConsistency');
            const additionalPromptEl = document.getElementById('additionalPrompt');
            const imageQualityEl = document.getElementById('imageQuality');
            
            if (aspectRatioEl) aspectRatioEl.value = this.settings.aspectRatio;
            if (enforceNoTextEl) enforceNoTextEl.checked = this.settings.enforceNoText;
            if (enforceCharacterEl) enforceCharacterEl.checked = this.settings.enforceCharacterConsistency;
            if (additionalPromptEl) additionalPromptEl.value = this.settings.additionalPrompt;
            if (imageQualityEl) imageQualityEl.value = this.settings.imageQuality;
            
            // 각 섹션별 모델 선택값 복원
            const modelFields = [
                'characterModelSelect',
                'keyObjectModelSelect',
                'illustrationModelSelect',
                'vocabularyModelSelect',
                'ttsModelSelect'
            ];
            
            modelFields.forEach(fieldId => {
                const el = document.getElementById(fieldId);
                if (el) {
                    const key = fieldId.replace('Select', '');
                    el.value = this.settings[key] || 'gemini-3-pro-image-preview';
                }
            });
            
            // TTS 모델 설명 업데이트
            const ttsModelSelect = document.getElementById('ttsModelSelect');
            if (ttsModelSelect && typeof window.updateTTSModelDescription === 'function') {
                window.updateTTSModelDescription(ttsModelSelect.value);
            }
            
            // API 키 로드
            const savedApiKey = localStorage.getItem('gemini_api_key') || '';
            const geminiApiKeyInput = document.getElementById('geminiApiKey');
            if (geminiApiKeyInput) {
                geminiApiKeyInput.value = savedApiKey;
            }
            
            // 모달 표시
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }
        
        /**
         * 설정 모달 닫기
         */
        closeSettingsModal(event) {
            if (!event || event.target.id === 'settingsModal') {
                const modal = document.getElementById('settingsModal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            }
        }
        
        /**
         * 설정 저장 (UI에서)
         */
        saveSettingsFromUI() {
            // 기본 이미지 설정 저장
            const aspectRatioEl = document.getElementById('imageAspectRatio');
            const enforceNoTextEl = document.getElementById('enforceNoText');
            const enforceCharacterEl = document.getElementById('enforceCharacterConsistency');
            const additionalPromptEl = document.getElementById('additionalPrompt');
            const imageQualityEl = document.getElementById('imageQuality');
            
            if (aspectRatioEl) this.settings.aspectRatio = aspectRatioEl.value;
            if (enforceNoTextEl) this.settings.enforceNoText = enforceNoTextEl.checked;
            if (enforceCharacterEl) this.settings.enforceCharacterConsistency = enforceCharacterEl.checked;
            if (additionalPromptEl) this.settings.additionalPrompt = additionalPromptEl.value;
            if (imageQualityEl) this.settings.imageQuality = imageQualityEl.value;
            
            // 각 섹션별 모델 설정 저장
            const modelElements = {
                characterModel: document.getElementById('characterModelSelect'),
                keyObjectModel: document.getElementById('keyObjectModelSelect'),
                illustrationModel: document.getElementById('illustrationModelSelect'),
                vocabularyModel: document.getElementById('vocabularyModelSelect'),
                ttsModel: document.getElementById('ttsModelSelect')
            };
            
            Object.entries(modelElements).forEach(([key, el]) => {
                if (el) {
                    this.settings[key] = el.value;
                }
            });
            
            console.log('💾 이미지 설정 저장:', this.settings);
            
            // API 키 저장
            const geminiApiKeyEl = document.getElementById('geminiApiKey');
            const apiKey = geminiApiKeyEl ? geminiApiKeyEl.value.trim() : '';
            if (apiKey) {
                localStorage.setItem('gemini_api_key', apiKey);
                // gemini-client.js의 GEMINI_API_KEY 업데이트
                if (typeof window.GEMINI_API_KEY !== 'undefined') {
                    window.GEMINI_API_KEY = apiKey;
                    console.log('✅ 커스텀 Gemini API 키 적용됨');
                }
            } else {
                localStorage.removeItem('gemini_api_key');
                // 기본 키로 복원
                if (typeof window.initGeminiAPIKey === 'function') {
                    window.initGeminiAPIKey();
                    console.log('✅ 기본 Gemini API 키로 복원');
                }
            }
            
            this.saveSettings();
            this.closeSettingsModal();
            
            // 알림 표시
            if (typeof window.showNotification === 'function') {
                window.showNotification('success', '설정 저장 완료', '설정이 성공적으로 저장되었습니다.');
            }
        }
        
        /**
         * 설정 초기화
         */
        resetSettings() {
            if (confirm('모든 설정을 기본값으로 복원하시겠습니까?\n\n⚠️ 주의: API 키도 기본값으로 복원됩니다.')) {
                this.settings = {
                    aspectRatio: '16:9',
                    enforceNoText: true,
                    enforceCharacterConsistency: true,
                    additionalPrompt: '',
                    imageQuality: 'high',
                    imageModel: 'gemini-3-pro-image-preview',
                    characterModel: 'gemini-3-pro-image-preview',
                    keyObjectModel: 'gemini-3-pro-image-preview',
                    illustrationModel: 'gemini-3-pro-image-preview',
                    vocabularyModel: 'gemini-3-pro-image-preview',
                    coverModel: 'gemini-3-pro-image-preview',
                    geminiTTSModel: 'gemini-2.5-flash-preview-tts',
                    ttsModel: 'Aoede',
                    ttsVoiceConfig: '여성 목소리, 부드럽고 따뜻한 톤, 동화 낭독 스타일, 적당한 속도로 또박또박, 어린이가 이해하기 쉽게'
                };
                
                // API 키 초기화
                localStorage.removeItem('gemini_api_key');
                const apiKeyEl = document.getElementById('geminiApiKey');
                if (apiKeyEl) {
                    apiKeyEl.value = '';
                }
                
                // 기본 키로 복원
                if (typeof window.initGeminiAPIKey === 'function') {
                    window.initGeminiAPIKey();
                }
                
                this.saveSettings();
                this.openSettingsModal();
                
                // 알림 표시
                if (typeof window.showNotification === 'function') {
                    window.showNotification('success', '설정 복원 완료', '모든 설정이 기본값으로 복원되었습니다.');
                }
            }
        }
    }
    
    // 브라우저 환경에서 전역 노출
    if (typeof window !== 'undefined') {
        window.SettingsService = SettingsService;
        console.log('✅ SettingsService.js 로드 완료');
    }
    
})();
