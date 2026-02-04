/**
 * CharacterReferenceService.js
 * 캐릭터 레퍼런스 이미지 생성/재생성 통합 서비스
 */

class CharacterReferenceService {
    constructor() {
        this.imageService = null;
    }

    /**
     * 초기화: 의존성 주입
     */
    initialize(imageService) {
        this.imageService = imageService;
    }

    /**
     * 캐릭터 레퍼런스 생성/재생성 통합 메서드
     * @param {Object} storybook - 현재 스토리북
     * @param {Number} charIndex - 캐릭터 인덱스
     * @param {Object} options - 옵션 { imageSettings, saveCallback, renderCallback }
     */
    async generateOrUpdate(storybook, charIndex, options = {}) {
        const { imageSettings = {}, saveCallback, renderCallback } = options;
        
        const character = storybook.characters[charIndex];
        const refDiv = document.getElementById(`char-ref-${charIndex}`);

        try {
            // 1. 입력 데이터 수집
            const customPrompt = document.getElementById(`char-prompt-${charIndex}`)?.value.trim() || character.description;

            // 2. 로딩 UI 표시
            this._showLoadingUI(refDiv);

            // 3. 재생성 여부 확인
            const isRegeneration = !!character.referenceImage;
            console.log(`🎨 캐릭터 "${character.name}" ${isRegeneration ? '재생성' : '생성'} - 모델: ${imageSettings.characterModel}`);

            // 4. ImageService 검증
            const service = this.imageService || window.imageService;
            if (!service) {
                throw new Error('ImageService가 로드되지 않았습니다. 페이지를 새로고침 해주세요.');
            }

            // 5. API 호출
            const result = await service.generateCharacter({
                name: character.name,
                description: customPrompt,
                age: character.age
            }, {
                model: imageSettings.characterModel || 'gemini-3-pro-image-preview',
                artStyle: storybook.artStyle || '디즈니 스타일',
                aspectRatio: '16:9',
                storybookId: storybook.id,
                storybookTitle: storybook.title
            });

            // 6. 결과 검증
            if (!result.success || !result.imageUrl) {
                throw new Error(result.error || '이미지 URL을 받지 못했습니다.');
            }

            // 7. 성공 처리
            return await this._handleSuccess(
                storybook,
                charIndex,
                character,
                result.imageUrl,
                saveCallback,
                renderCallback
            );

        } catch (error) {
            return this._handleError(error, character, charIndex, refDiv, renderCallback);
        }
    }

    /**
     * 로딩 UI 표시
     */
    _showLoadingUI(element) {
        if (element && typeof window.showLoadingUI === 'function') {
            window.showLoadingUI(element, 'AI가 이미지 생성 중...');
        }
    }

    /**
     * 성공 처리
     */
    async _handleSuccess(storybook, charIndex, character, imageUrl, saveCallback, renderCallback) {
        console.log(`📥 이미지 생성 완료: ${imageUrl}`);

        // 히스토리 관리
        if (typeof window.manageImageHistory === 'function') {
            character.imageHistory = window.manageImageHistory(
                character.imageHistory || [],
                imageUrl,
                character.referenceImage
            );
        }

        // 이미지 업데이트
        storybook.characters[charIndex].referenceImage = imageUrl;

        // 저장 콜백
        if (saveCallback) {
            await saveCallback();
        }

        // 렌더링 콜백
        if (renderCallback) {
            renderCallback(charIndex);
        }

        return { success: true, imageUrl };
    }

    /**
     * 에러 처리
     */
    _handleError(error, character, charIndex, refDiv, renderCallback) {
        console.error('캐릭터 이미지 생성 실패:', error);
        const errorMsg = error.response?.data?.error || error.message || '알 수 없는 오류';

        // 기존 이미지 유지 또는 에러 표시
        if (character.referenceImage) {
            if (renderCallback) {
                renderCallback(charIndex);
            }
            if (typeof window.showNotification === 'function') {
                window.showNotification('error', '재생성 실패', `${errorMsg}\n기존 이미지가 유지됩니다.`);
            }
        } else {
            if (refDiv && typeof window.showErrorUI === 'function') {
                window.showErrorUI(refDiv, errorMsg);
            }
        }

        return { success: false, error: errorMsg };
    }

    /**
     * 모든 캐릭터 레퍼런스 생성
     */
    async generateAll(storybook, options = {}) {
        const { imageSettings = {}, saveCallback, renderCallback } = options;
        
        const characters = storybook.characters || [];
        if (characters.length === 0) {
            return { success: false, error: 'No characters found' };
        }

        console.log(`🎨 모든 캐릭터 레퍼런스 생성 시작: ${characters.length}개`);

        const results = await Promise.all(
            characters.map((_, index) => 
                this.generateOrUpdate(storybook, index, { imageSettings, saveCallback, renderCallback })
            )
        );

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        console.log(`✅ 캐릭터 레퍼런스 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

        return { success: failCount === 0, successCount, failCount, results };
    }
}

// 전역 인스턴스 생성
const characterReferenceService = new CharacterReferenceService();
