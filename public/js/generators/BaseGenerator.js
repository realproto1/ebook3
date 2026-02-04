/**
 * BaseGenerator - 모든 생성 작업의 베이스 클래스
 * 
 * 공통 패턴:
 * 1. 버튼 로딩 상태 관리
 * 2. 입력 데이터 수집
 * 3. API 호출
 * 4. 결과 저장
 * 5. UI 업데이트
 * 6. 에러 처리
 */
class BaseGenerator {
    constructor(options = {}) {
        this.storybook = options.storybook || null;
        this.buttonId = options.buttonId || null;
        this.saveCallback = options.saveCallback || null;
        this.updateCallback = options.updateCallback || null;
    }

    /**
     * 버튼 로딩 상태 설정
     */
    setButtonLoading(loading = true) {
        if (!this.buttonId) return;
        
        const button = document.getElementById(this.buttonId);
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>생성 중...';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent.replace(/^생성 중\.\.\./, '');
        }
    }

    /**
     * 로딩 UI 표시
     */
    showLoading(element, message = '생성 중...') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-2"></i>
                    <p class="text-gray-600">${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * 에러 UI 표시
     */
    showError(element, message, retryCallback = null) {
        if (!element) return;
        
        const retryButton = retryCallback 
            ? `<button onclick="${retryCallback}" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                <i class="fas fa-redo mr-2"></i>재시도
               </button>`
            : '';
        
        element.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-2"></i>
                    <p class="text-red-600">${message}</p>
                    ${retryButton}
                </div>
            </div>
        `;
    }

    /**
     * 히스토리 관리 (최대 10개)
     */
    manageHistory(historyArray, newItem, maxItems = 10) {
        if (!historyArray) historyArray = [];
        
        // 새 항목을 맨 앞에 추가
        historyArray.unshift(newItem);
        
        // 최대 개수 유지
        if (historyArray.length > maxItems) {
            historyArray.splice(maxItems);
        }
        
        return historyArray;
    }

    /**
     * Storybook 저장
     */
    async saveStorybook() {
        if (this.saveCallback) {
            await this.saveCallback();
        } else if (window.saveCurrentStorybook) {
            await window.saveCurrentStorybook();
        }
    }

    /**
     * 디스플레이 업데이트
     */
    updateDisplay() {
        if (this.updateCallback) {
            this.updateCallback();
        } else if (window.displayStorybook && this.storybook) {
            window.displayStorybook(this.storybook);
        }
    }

    /**
     * 성공 알림
     */
    showSuccess(message) {
        console.log(`✅ ${message}`);
        // Toast 알림이 있다면 사용
        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    /**
     * 실패 알림
     */
    showFailure(message) {
        console.error(`❌ ${message}`);
        alert(message);
    }

    /**
     * 진행률 계산
     */
    calculateProgress(current, total) {
        return Math.round((current / total) * 100);
    }

    /**
     * 예상 시간 계산 (초 단위)
     */
    estimateTime(count, secondsPerItem) {
        return count * secondsPerItem;
    }

    /**
     * 하위 클래스에서 구현해야 하는 메서드들
     */
    async generate() {
        throw new Error('generate() must be implemented by subclass');
    }

    async generateAll() {
        throw new Error('generateAll() must be implemented by subclass');
    }
}

// Export
window.BaseGenerator = BaseGenerator;
