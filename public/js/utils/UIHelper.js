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
    
    // ============================================
    // 스토리북 섹션 렌더링 함수들
    // ============================================
    
    /**
     * 스토리북 헤더 섹션 렌더링
     */
    static renderStorybookHeader(storybook) {
        return `
            <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
                <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0 mb-4">
                    <div class="flex-1">
                        <h2 class="text-2xl md:text-4xl font-bold text-purple-600 mb-2">${storybook.title}</h2>
                        <p class="text-sm md:text-base text-gray-600">
                            <i class="fas fa-child mr-1 md:mr-2"></i>${storybook.targetAge}세 
                            <i class="fas fa-palette ml-2 md:ml-4 mr-1 md:mr-2"></i><span class="hidden sm:inline">${storybook.artStyle}</span>
                            <i class="fas fa-file-alt ml-2 md:ml-4 mr-1 md:mr-2"></i>${storybook.pages.length}페이지
                        </p>
                        <!-- 카테고리 선택 -->
                        <div class="mt-3">
                            <label class="inline-block text-sm font-semibold text-gray-700 mr-2">
                                <i class="fas fa-tag mr-1"></i>카테고리:
                            </label>
                            <select 
                                onchange="updateStorybookCategory(this.value)"
                                class="inline-block px-3 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-800 text-sm"
                            >
                                <option value="" ${!storybook.category ? 'selected' : ''}>미지정</option>
                                <option value="세계 명작" ${storybook.category === '세계 명작' ? 'selected' : ''}>📚 세계 명작</option>
                                <option value="전래 동화" ${storybook.category === '전래 동화' ? 'selected' : ''}>🏮 전래 동화</option>
                                <option value="자연 관찰" ${storybook.category === '자연 관찰' ? 'selected' : ''}>🌿 자연 관찰</option>
                                <option value="기타" ${storybook.category === '기타' ? 'selected' : ''}>📖 기타</option>
                            </select>
                        </div>
                        <p class="text-xs text-gray-400 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            좌측 사이드바에서 제목 수정, 복사, 순서 변경이 가능합니다
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button 
                            onclick="openPreview()"
                            class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 md:px-5 py-2 md:py-3 rounded-lg font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg text-sm md:text-base whitespace-nowrap"
                        >
                            <i class="fas fa-book-open mr-1 md:mr-2"></i><span class="hidden sm:inline">미리보기</span><span class="sm:hidden">보기</span>
                        </button>
                        <button 
                            onclick="openRegenerateModal()"
                            class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 md:px-5 py-2 md:py-3 rounded-lg font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg text-sm md:text-base whitespace-nowrap"
                        >
                            <i class="fas fa-redo mr-1 md:mr-2"></i><span class="hidden sm:inline">다시 만들기</span><span class="sm:hidden">재생성</span>
                        </button>
                    </div>
                </div>
                <div class="bg-purple-50 p-4 md:p-6 rounded-lg mt-4 md:mt-6">
                    <h3 class="text-lg md:text-xl font-bold text-purple-600 mb-2">
                        <i class="fas fa-lightbulb mr-2"></i>주제 및 교훈
                    </h3>
                    <p class="text-sm md:text-base text-gray-700">${storybook.theme}</p>
                </div>
            </div>
        `;
    }
    
    /**
     * 배경음악 섹션 렌더링
     */
    static renderMusicSection(storybook) {
        return `
            <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
                <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
                    <div class="flex-1">
                        <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                            <i class="fas fa-music mr-2 text-pink-500"></i>
                            배경음악
                        </h3>
                        <p class="text-xs md:text-base text-gray-600">
                            <i class="fas fa-info-circle mr-2"></i>
                            <span class="hidden sm:inline">동화책을 읽을 때 재생될 배경음악을 선택하세요.</span>
                            <span class="sm:hidden">읽을 때 재생될 음악</span>
                        </p>
                    </div>
                    <button 
                        onclick="openBackgroundMusicModal()"
                        class="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-pink-600 hover:to-purple-600 transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                    >
                        <i class="fas fa-cog mr-1 md:mr-2"></i><span class="hidden sm:inline">배경음악 관리</span><span class="sm:hidden">관리</span>
                    </button>
                </div>
                
                <div class="bg-gradient-to-r from-pink-50 to-purple-50 p-4 md:p-6 rounded-xl border-2 border-pink-200">
                    <div id="selectedBackgroundMusic" class="text-sm md:text-base text-gray-700 mb-3">
                        <i class="fas fa-info-circle mr-1 text-pink-500"></i>배경음악을 선택하세요
                    </div>
                    <select 
                        id="backgroundMusicSelect" 
                        onchange="selectBackgroundMusic(this.value)"
                        class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm md:text-base focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                        <option value="">배경음악 없음</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    /**
     * 공통 버튼 렌더링
     */
    static renderButton(type, onclick, label, icon, options = {}) {
        const { fullWidth = false, id = '', disabled = false, hideOnMobile = false } = options;
        const widthClass = fullWidth ? 'flex-1' : '';
        const mobileClass = hideOnMobile ? 'hidden sm:inline' : '';
        
        let btnClass = '';
        switch(type) {
            case 'generate':
                btnClass = 'btn-generate';
                break;
            case 'upload':
                btnClass = 'btn-upload';
                break;
            case 'download':
                btnClass = 'btn-download';
                break;
            default:
                btnClass = 'bg-gray-600 hover:bg-gray-700';
        }
        
        return `
            <button 
                ${id ? `id="${id}"` : ''}
                onclick="${onclick}"
                class="${widthClass} ${btnClass} px-3 py-2 rounded-lg transition text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}"
                ${disabled ? 'disabled' : ''}
            >
                <i class="${icon} mr-1"></i><span class="${mobileClass}">${label}</span>
            </button>
        `;
    }
}

// 브라우저 환경에서 전역으로 노출
if (typeof window !== 'undefined') {
    window.UIHelper = UIHelper;
}
