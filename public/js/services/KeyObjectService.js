/**
 * KeyObjectService.js
 * Key Object 이미지 생성/재생성 통합 서비스
 */

class KeyObjectService {
    constructor() {
        this.imageService = null;
        this.uiHelper = null;
    }

    /**
     * 초기화: 의존성 주입
     */
    initialize(imageService, uiHelper) {
        this.imageService = imageService;
        this.uiHelper = uiHelper;
    }

    /**
     * Key Object 이미지 생성/재생성 통합 메서드
     * @param {Object} storybook - 현재 스토리북
     * @param {Number} objIndex - Key Object 인덱스
     * @param {Object} options - 옵션 { imageSettings, saveCallback }
     */
    async generateOrUpdate(storybook, objIndex, options = {}) {
        const { imageSettings = {}, saveCallback } = options;

        console.log(`🎨 [${objIndex}] Key Object 생성 시작`);

        // 1. 데이터 검증
        if (!storybook || !storybook.key_objects || !storybook.key_objects[objIndex]) {
            console.error(`❌ [${objIndex}] Key Object 정보가 없습니다.`);
            alert('Key Object 정보가 없습니다.');
            return { index: objIndex, success: false, error: 'No key object data' };
        }

        const obj = storybook.key_objects[objIndex];
        console.log(`📦 [${objIndex}] Key Object:`, obj);

        // 2. DOM 검증
        const objImgDiv = document.getElementById(`keyobj-img-${objIndex}`);
        console.log(`🎯 [${objIndex}] DOM element:`, objImgDiv ? 'Found' : 'NOT FOUND');

        if (!objImgDiv) {
            console.error(`❌ [${objIndex}] DOM element not found: keyobj-img-${objIndex}`);
            return { index: objIndex, success: false, error: 'DOM element not found' };
        }

        try {
            // 3. 로딩 UI 표시
            this._showLoadingUI(objImgDiv);

            // 4. ImageService 검증
            const service = this.imageService || window.imageService;
            if (!service) {
                throw new Error('ImageService가 로드되지 않았습니다.');
            }

            // 5. API 호출
            console.log(`📡 [${objIndex}] ImageService 호출 시작...`);
            console.log(`📋 [${objIndex}] 요청 데이터:`, {
                name: obj.name || obj.korean,
                description: obj.description || obj.korean || obj.name,
                korean: obj.korean || obj.name,
                model: imageSettings.keyObjectModel || 'gemini-3-pro-image-preview',
                aspectRatio: imageSettings.aspectRatio || '1:1',
                artStyle: storybook.artStyle || '디즈니 스타일'
            });

            const result = await service.generateKeyObject({
                name: obj.name || obj.korean,
                description: obj.description || obj.korean || obj.name,
                korean: obj.korean || obj.name,
                prompt: obj.description || obj.korean || obj.name
            }, {
                model: imageSettings.keyObjectModel || 'gemini-3-pro-image-preview',
                aspectRatio: imageSettings.aspectRatio || '1:1',
                artStyle: storybook.artStyle || '디즈니 스타일',
                settings: imageSettings,
                storybookId: storybook.id,
                storybookTitle: storybook.title,
                onStart: (element) => {
                    if (element) {
                        this._showLoadingUI(element);
                    }
                }
            });

            console.log(`✅ [${objIndex}] API 응답 받음:`, result);

            // 6. 결과 검증
            if (result && result.success && result.imageUrl) {
                return await this._handleSuccess(
                    storybook,
                    objIndex,
                    obj,
                    result.imageUrl,
                    objImgDiv,
                    saveCallback
                );
            } else {
                throw new Error(result?.error || 'ImageService에서 이미지 URL을 받지 못했습니다.');
            }

        } catch (error) {
            return this._handleError(error, storybook, objIndex, obj, objImgDiv);
        }
    }

    /**
     * 로딩 UI 표시
     */
    _showLoadingUI(element) {
        if (this.uiHelper && element) {
            this.uiHelper.showLoadingUI(element, '생성 중...');
        } else if (element) {
            element.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-4"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-2"></div><p class="text-gray-600 text-xs">생성 중...</p></div>';
        }
    }

    /**
     * 성공 처리
     */
    async _handleSuccess(storybook, objIndex, obj, imageUrl, objImgDiv, saveCallback) {
        console.log(`💾 [${objIndex}] 이미지 URL 받음: ${imageUrl}`);

        // keyObjectImages 배열 초기화
        if (!storybook.keyObjectImages) {
            storybook.keyObjectImages = [];
            console.log(`📦 [${objIndex}] keyObjectImages 배열 초기화`);
        }

        // 이미지 저장
        storybook.keyObjectImages[objIndex] = {
            name: obj.name,
            korean: obj.korean,
            imageUrl: imageUrl,
            success: true
        };
        console.log(`💾 [${objIndex}] keyObjectImages 업데이트 완료`);

        // 저장 콜백
        if (saveCallback) {
            console.log(`💾 [${objIndex}] saveCallback 호출...`);
            saveCallback();
            console.log(`✅ [${objIndex}] saveCallback 완료`);
        }

        // UI 렌더링
        if (this.uiHelper && objImgDiv) {
            this.uiHelper.renderKeyObjectImage(objImgDiv, imageUrl, {
                name: obj.name,
                korean: obj.korean
            });
        } else if (objImgDiv) {
            objImgDiv.innerHTML = `<img src="${imageUrl}" alt="${obj.name}" class="w-full h-full object-cover rounded-lg"/>`;
        }

        console.log(`✅ Key Object "${obj.name}" 이미지 생성 완료`);

        // 모든 페이지의 참조 이미지 섹션 새로고침
        if (typeof window.refreshAllPageReferenceImages === 'function') {
            window.refreshAllPageReferenceImages();
        }

        return {
            index: objIndex,
            success: true,
            imageUrl: imageUrl
        };
    }

    /**
     * 에러 처리
     */
    _handleError(error, storybook, objIndex, obj, objImgDiv) {
        console.error(`❌ [${objIndex}] Key Object 이미지 생성 오류 (${obj.name}):`, error);

        // 기존 이미지 확인
        const existingImage = storybook.keyObjectImages && storybook.keyObjectImages[objIndex];

        if (existingImage && existingImage.imageUrl) {
            // 기존 이미지 유지
            if (objImgDiv) {
                objImgDiv.innerHTML = `<img src="${existingImage.imageUrl}" alt="${obj.name}" class="w-full h-full object-cover rounded-lg"/>`;
            }
            if (typeof window.showNotification === 'function') {
                window.showNotification('error', '재생성 실패', `${obj.korean} 이미지 재생성에 실패했습니다.\n기존 이미지가 유지됩니다.`);
            }
        } else {
            // 재시도 버튼 표시
            if (objImgDiv) {
                objImgDiv.innerHTML = `
                    <div class="text-center p-4">
                        <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-2"></i>
                        <p class="text-red-600 text-xs mb-2">생성 실패</p>
                        <button 
                            onclick="generateSingleKeyObjectImage(${objIndex})"
                            class="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                        >
                            <i class="fas fa-redo mr-1"></i>재시도
                        </button>
                    </div>
                `;
            }
        }

        return {
            index: objIndex,
            success: false,
            error: error.message
        };
    }

    /**
     * 모든 Key Object 이미지 생성
     */
    async generateAll(storybook, options = {}) {
        const { imageSettings = {}, saveCallback } = options;

        const keyObjects = storybook.key_objects || [];
        if (keyObjects.length === 0) {
            alert('생성할 Key Object가 없습니다.');
            return { success: false, error: 'No key objects found' };
        }

        // 중복 클릭 방지
        if (window.isGeneratingKeyObjectImages) {
            alert('이미 생성 중입니다. 잠시만 기다려주세요.');
            return { success: false, error: 'Already generating' };
        }

        window.isGeneratingKeyObjectImages = true;

        try {
            console.log(`🎨 모든 Key Object 이미지 병렬 생성 시작: ${keyObjects.length}개`);

            // keyObjectImages 초기화
            if (!storybook.keyObjectImages) {
                storybook.keyObjectImages = new Array(keyObjects.length);
            }

            // 병렬 생성
            const results = await Promise.all(
                keyObjects.map((_, i) => this.generateOrUpdate(storybook, i, { imageSettings, saveCallback }))
            );

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            console.log(`✅ Key Object 이미지 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

            if (failCount > 0) {
                alert(`Key Object 이미지 생성 완료!\n성공: ${successCount}개\n실패: ${failCount}개\n\n실패한 이미지는 개별적으로 재시도해주세요.`);
            } else {
                alert(`모든 Key Object 이미지 생성이 완료되었습니다! (${successCount}개)`);
            }

            return { success: failCount === 0, successCount, failCount, results };

        } finally {
            window.isGeneratingKeyObjectImages = false;
        }
    }
}

// 전역 인스턴스 생성
const keyObjectService = new KeyObjectService();
