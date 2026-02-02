/**
 * UIHelper.js
 * 이미지 생성 관련 UI 렌더링 헬퍼
 */

class UIHelper {
    /**
     * 로딩 UI 표시
     * @param {HTMLElement} element 
     * @param {string} message 
     */
    static showLoadingUI(element, message = '생성 중...') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-4 min-h-[200px]">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-2"></div>
                <p class="text-gray-600 text-sm">${message}</p>
            </div>
        `;
    }

    /**
     * 에러 UI 표시
     * @param {HTMLElement} element 
     * @param {string} errorMessage 
     * @param {Function} retryCallback 
     */
    static showErrorUI(element, errorMessage, retryCallback = null) {
        if (!element) return;
        
        const retryButton = retryCallback ? `
            <button 
                class="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
            >
                <i class="fas fa-redo mr-2"></i>재시도
            </button>
        ` : '';
        
        element.innerHTML = `
            <div class="p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-600 text-3xl mb-2"></i>
                <p class="text-red-600 text-sm mb-2 font-bold">⚠️ 생성 실패</p>
                <p class="text-gray-700 text-xs mb-2">${errorMessage}</p>
                ${retryButton}
            </div>
        `;
        
        if (retryCallback) {
            const btn = element.querySelector('button');
            if (btn) {
                btn.onclick = retryCallback;
            }
        }
    }

    /**
     * 캐릭터 이미지 렌더링 (히스토리 포함)
     * @param {HTMLElement} element 
     * @param {string} imageUrl 
     * @param {Object} options 
     */
    static renderCharacterImage(element, imageUrl, options = {}) {
        const {
            charIndex = 0,
            characterName = '',
            history = [],
            onDelete = null,
            onDownload = null
        } = options;
        
        if (!element) return;
        
        const historyHTML = history.length > 0 ? `
            <div class="w-20 overflow-y-auto space-y-2 p-1" style="scrollbar-width: thin;">
                ${history.map((url, idx) => `
                    <div class="relative group cursor-pointer border-2 border-transparent hover:border-purple-400 rounded transition" 
                         onclick="selectCharacterImageFromHistory(${charIndex}, ${idx})" 
                         title="이전 버전 ${idx + 1}">
                        <img src="${url}" alt="이전 ${idx + 1}" class="w-full h-16 object-cover rounded"/>
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                            <i class="fas fa-check text-white text-xs opacity-0 group-hover:opacity-100 transition"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        element.innerHTML = `
            <div class="flex gap-2 h-full">
                <div class="flex-1 relative group">
                    <img src="${imageUrl}" alt="${characterName}" class="w-full h-auto object-cover rounded-lg"/>
                    <button 
                        onclick="downloadImage('${imageUrl}', '캐릭터_${characterName}.png')"
                        class="absolute bottom-3 right-3 bg-white bg-opacity-90 text-purple-600 w-11 h-11 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                        title="다운로드"
                    >
                        <i class="fas fa-download text-base"></i>
                    </button>
                </div>
                ${historyHTML}
            </div>
        `;
    }

    /**
     * 삽화 이미지 렌더링 (히스토리 포함)
     * @param {HTMLElement} element 
     * @param {string} imageUrl 
     * @param {Object} options 
     */
    static renderIllustration(element, imageUrl, options = {}) {
        const {
            pageIndex = 0,
            storybookTitle = '',
            history = [],
            onDelete = null
        } = options;
        
        if (!element) return;
        
        const historyHTML = history.length > 0 ? `
            <div class="w-20 overflow-y-auto space-y-2 p-1" style="scrollbar-width: thin; scrollbar-color: rgba(34, 197, 94, 0.5) rgba(34, 197, 94, 0.1);">
                ${history.map((url, histIdx) => `
                    <div class="relative group cursor-pointer border-2 border-transparent hover:border-green-400 rounded transition" 
                         onclick="selectIllustrationFromHistory(${pageIndex}, ${histIdx})" 
                         title="이전 버전 ${histIdx + 1}">
                        <img src="${url}" alt="이전 ${histIdx + 1}" class="w-full h-16 object-cover rounded"/>
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                            <i class="fas fa-check text-white text-xs opacity-0 group-hover:opacity-100 transition"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        element.innerHTML = `
            <div class="flex gap-2 h-full">
                <div class="flex-1 relative group">
                    <img src="${imageUrl}" alt="삽화 ${pageIndex + 1}" class="w-full h-auto cursor-pointer" onclick="toggleImageDeleteButton('page-${pageIndex}')"/>
                    <button 
                        id="page-${pageIndex}-delete-btn"
                        onclick="event.stopPropagation(); deletePageIllustration(${pageIndex})"
                        class="hidden absolute top-3 right-3 bg-red-500 bg-opacity-90 text-white w-10 h-10 rounded-full hover:bg-opacity-100 transition shadow-lg flex items-center justify-center z-10"
                        title="이미지 삭제"
                    >
                        <i class="fas fa-times"></i>
                    </button>
                    <button 
                        onclick="downloadImage('${imageUrl}', '${storybookTitle}_페이지_${pageIndex + 1}.png')"
                        class="absolute bottom-3 right-3 bg-white bg-opacity-90 text-green-600 w-11 h-11 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                        title="다운로드"
                    >
                        <i class="fas fa-download text-base"></i>
                    </button>
                </div>
                ${historyHTML}
            </div>
        `;
    }

    /**
     * 단어 이미지 렌더링
     * @param {HTMLElement} element 
     * @param {string} imageUrl 
     * @param {Object} options 
     */
    static renderVocabularyImage(element, imageUrl, options = {}) {
        const {
            word = '',
            korean = '',
            isKeyObject = false,
            reused = false
        } = options;
        
        if (!element) return;
        
        let badge = '';
        if (reused && isKeyObject) {
            badge = '<span class="absolute top-1 right-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">핵심사물</span>';
        } else if (isKeyObject) {
            badge = '<span class="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">핵심사물</span>';
        }
        
        element.innerHTML = `
            <div class="relative w-full h-full">
                ${badge}
                <img src="${imageUrl}" alt="${word}" class="w-full h-full object-cover rounded-lg"/>
            </div>
        `;
    }

    /**
     * Key Object 이미지 렌더링
     * @param {HTMLElement} element 
     * @param {string} imageUrl 
     * @param {Object} options 
     */
    static renderKeyObjectImage(element, imageUrl, options = {}) {
        const {
            name = '',
            korean = ''
        } = options;
        
        if (!element) return;
        
        element.innerHTML = `
            <img src="${imageUrl}" alt="${name}" class="w-full h-full object-cover rounded-lg"/>
        `;
    }
}

// 브라우저 환경에서 전역으로 노출
if (typeof window !== 'undefined') {
    window.UIHelper = UIHelper;
}
