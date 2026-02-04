/**
 * BaseImageGenerator.js
 * 모든 이미지 생성의 공통 로직 처리
 * - 설정 저장/복원 (재생성 시 동일한 설정 사용)
 * - 로딩 UI 표시
 * - 히스토리 관리
 * - 에러 처리
 */

class BaseImageGenerator {
    constructor(imageService, uiHelper) {
        this.imageService = imageService;
        this.uiHelper = uiHelper;
    }

    /**
     * 로딩 UI 표시
     */
    showLoading(element, message = '생성 중...') {
        if (this.uiHelper && element) {
            this.uiHelper.showLoadingUI(element, message);
        } else if (element) {
            element.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-4">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-2"></div>
                    <p class="text-gray-600 text-xs">${message}</p>
                </div>
            `;
        }
    }

    /**
     * 히스토리 관리
     */
    manageHistory(currentImage, history = [], maxHistory = 10) {
        if (!currentImage) return history;

        const newHistory = [currentImage, ...history];
        return newHistory.slice(0, maxHistory);
    }

    /**
     * 설정 병합 (재생성 시 저장된 설정 우선 사용)
     */
    mergeSettings(savedSettings = {}, currentSettings = {}, defaults = {}) {
        return {
            model: savedSettings.model || currentSettings.model || defaults.model,
            aspectRatio: savedSettings.aspectRatio || currentSettings.aspectRatio || defaults.aspectRatio,
            artStyle: savedSettings.artStyle || currentSettings.artStyle || defaults.artStyle,
            additionalPrompt: savedSettings.additionalPrompt || currentSettings.additionalPrompt || ''
        };
    }

    /**
     * 에러 UI 표시
     */
    showError(element, message, retryCallback) {
        if (!element) return;

        element.innerHTML = `
            <div class="text-center p-4">
                <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-2"></i>
                <p class="text-red-600 text-xs mb-2">생성 실패</p>
                <p class="text-gray-600 text-xs mb-3">${message}</p>
                ${retryCallback ? `
                    <button 
                        onclick="${retryCallback}"
                        class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                    >
                        <i class="fas fa-redo mr-2"></i>재시도
                    </button>
                ` : ''}
            </div>
        `;
    }
}

// 전역 인스턴스 생성
window.BaseImageGenerator = BaseImageGenerator;
