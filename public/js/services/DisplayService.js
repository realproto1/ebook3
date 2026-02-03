/**
 * DisplayService.js - 동화책 화면 렌더링 관리
 * displayStorybook 함수를 작은 단위로 분리하여 관리합니다.
 */

class DisplayService {
    constructor() {
        this.imageSettings = null;
        console.log('✅ DisplayService.js 로드 완료');
    }

    /**
     * 초기화
     */
    init(imageSettings) {
        this.imageSettings = imageSettings;
    }

    /**
     * 캐릭터 섹션 렌더링
     */
    renderCharacterSection(storybook) {
        const createModelSelect = window.createModelSelect;
        
        return `
            <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
                <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
                    <div class="flex-1">
                        <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer flex items-center" onclick="toggleSection('character-section')">
                            <i id="character-section-icon" class="fas fa-chevron-down mr-2 text-sm transition-transform"></i>
                            <i class="fas fa-users mr-2 text-purple-500"></i>
                            캐릭터 레퍼런스
                        </h3>
                        <p class="text-xs md:text-base text-gray-600">
                            <i class="fas fa-info-circle mr-2"></i>
                            <span class="hidden sm:inline">각 캐릭터의 레퍼런스 이미지를 생성하면 삽화에서 일관된 모습을 유지할 수 있어요.</span>
                            <span class="sm:hidden">레퍼런스 이미지로 일관성 유지</span>
                        </p>
                        ${createModelSelect('character', this.imageSettings.characterModel || 'gemini-3-pro-image-preview', 'updateCharacterModel(this.value)')}
                    </div>
                    <div class="flex gap-2 md:gap-3">
                        <button 
                            onclick="generateAllCharacterReferences()"
                            class="bg-purple-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-purple-700 transition whitespace-nowrap text-sm md:text-base"
                        >
                            <i class="fas fa-images mr-1 md:mr-2"></i><span class="hidden sm:inline">모든 레퍼런스 생성</span><span class="sm:hidden">전체 생성</span>
                        </button>
                        <button 
                            onclick="downloadAllCharacterReferences()"
                            class="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-sm md:text-base"
                        >
                            <i class="fas fa-download mr-1 md:mr-2"></i><span class="hidden sm:inline">모두 다운로드</span><span class="sm:hidden">다운</span>
                        </button>
                        <button 
                            onclick="addNewCharacter()"
                            class="bg-green-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-green-700 transition whitespace-nowrap text-sm md:text-base"
                        >
                            <i class="fas fa-plus mr-1 md:mr-2"></i><span class="hidden sm:inline">캐릭터 추가</span><span class="sm:hidden">추가</span>
                        </button>
                    </div>
                </div>
                <div id="character-section-content" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    ${this._renderCharacterCards(storybook)}
                </div>
            </div>
        `;
    }

    /**
     * 캐릭터 카드 렌더링 (내부 함수)
     */
    _renderCharacterCards(storybook) {
        return storybook.characters.map((char, idx) => {
            const history = char.imageHistory || [];
            
            return `
                <div class="character-card card rounded-xl p-4 md:p-6">
                    <div class="flex justify-between items-start mb-3 md:mb-4">
                        <div class="flex-1">
                            <input 
                                type="text" 
                                id="char-name-${idx}" 
                                value="${char.name}"
                                onchange="updateCharacterName(${idx}, this.value)"
                                class="text-lg md:text-2xl font-bold mb-2 bg-transparent border-b-2 border-white text-white placeholder-white w-full"
                            />
                            <div class="flex gap-2 items-center mb-2">
                                <span class="bg-white text-purple-600 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                                    ${char.role}
                                </span>
                                ${char.age ? `<span class="bg-white bg-opacity-20 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                                    <i class="fas fa-birthday-cake mr-1"></i>${char.age}
                                </span>` : ''}
                                <div class="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded">
                                    <i class="fas fa-ruler-vertical text-white text-xs"></i>
                                    <input 
                                        type="number" 
                                        id="char-height-${idx}" 
                                        value="${char.height || 150}"
                                        onchange="updateCharacterHeight(${idx}, this.value)"
                                        class="w-12 bg-transparent text-white text-xs font-semibold text-center border-b border-white focus:outline-none"
                                        min="50"
                                        max="250"
                                    />
                                    <span class="text-white text-xs">cm</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onclick="deleteCharacter(${idx})"
                            class="text-white hover:text-red-300 ml-2"
                        >
                            <i class="fas fa-trash text-sm md:text-base"></i>
                        </button>
                    </div>
                    <p class="text-white text-xs md:text-sm mb-3 md:mb-4 opacity-90">${char.description.substring(0, 80)}...</p>
                    <div id="char-ref-${idx}" class="mb-3 md:mb-4 min-h-[150px] md:min-h-[200px] bg-white bg-opacity-20 rounded-lg overflow-hidden">
                        ${char.referenceImage ? `
                            <div class="flex gap-2 h-[150px] md:h-[200px]">
                                <div class="flex-1 relative group">
                                    <img src="${char.referenceImage}" alt="${char.name}" class="w-full h-full object-cover rounded-lg"/>
                                    <button 
                                        onclick="downloadImage('${char.referenceImage}', '${char.name}_레퍼런스.png')"
                                        class="absolute top-2 right-2 bg-white bg-opacity-90 text-purple-600 w-10 h-10 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                        title="다운로드"
                                    >
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                                ${history.length > 0 ? `
                                    <div class="w-20 overflow-y-auto space-y-2 p-1" style="scrollbar-width: thin;">
                                        ${history.map((url, histIdx) => `
                                            <div class="relative group cursor-pointer border-2 border-transparent hover:border-white rounded transition" onclick="selectCharacterImageFromHistory(${idx}, ${histIdx})" title="이전 버전 ${histIdx + 1}">
                                                <img src="${url}" alt="이전 ${histIdx + 1}" class="w-full h-16 object-cover rounded"/>
                                                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                                                    <i class="fas fa-check text-white opacity-0 group-hover:opacity-100 transition text-xs"></i>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="flex items-center justify-center h-full text-white opacity-50">
                                <div class="text-center">
                                    <i class="fas fa-image text-4xl mb-2"></i>
                                    <p class="text-xs">레퍼런스 생성 대기중</p>
                                </div>
                            </div>
                        `}
                    </div>
                    <div class="flex gap-2">
                        <button 
                            onclick="generateCharacterReference(${idx})"
                            class="flex-1 bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition text-sm"
                        >
                            <i class="fas fa-magic mr-2"></i>${char.referenceImage ? '재생성' : '생성'}
                        </button>
                        <button 
                            onclick="openCharacterUploadModal(${idx})"
                            class="flex-1 bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition text-sm"
                        >
                            <i class="fas fa-upload mr-2"></i>업로드
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 표지 섹션 렌더링
     */
    renderCoverSection(storybook) {
        const createModelSelect = window.createModelSelect;
        const buildCoverPrompt = window.buildCoverPrompt;
        
        return `
            <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
                <div class="mb-4 md:mb-6">
                    <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer flex items-center" onclick="toggleSection('cover-section')">
                        <i id="cover-section-icon" class="fas fa-chevron-down mr-2 text-sm transition-transform"></i>
                        <i class="fas fa-book-open mr-2 text-indigo-500"></i>
                        표지 이미지
                    </h3>
                    <p class="text-xs md:text-base text-gray-600">
                        <i class="fas fa-info-circle mr-2"></i>
                        <span class="hidden sm:inline">동화책의 첫인상을 결정하는 표지 이미지를 생성해요. 캐릭터를 선택하면 참조해서 그려요.</span>
                        <span class="sm:hidden">표지 이미지 생성</span>
                    </p>
                    ${createModelSelect('cover', this.imageSettings.coverModel || 'gemini-3-pro-image-preview', 'updateCoverModel(this.value)')}
                </div>
                <div id="cover-section-content">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div>
                            <div class="mb-4">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-expand-arrows-alt mr-2"></i>비율 선택:
                                </label>
                                <select 
                                    id="cover-aspect-ratio"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="4:3" ${storybook.coverAspectRatio === '4:3' ? 'selected' : ''}>4:3 (가로)</option>
                                    <option value="3:4" ${storybook.coverAspectRatio === '3:4' ? 'selected' : ''}>3:4 (세로, 책 표지)</option>
                                    <option value="16:9" ${storybook.coverAspectRatio === '16:9' ? 'selected' : ''}>16:9 (와이드)</option>
                                    <option value="9:16" ${storybook.coverAspectRatio === '9:16' ? 'selected' : ''}>9:16 (세로 긴)</option>
                                    <option value="1:1" ${storybook.coverAspectRatio === '1:1' ? 'selected' : ''}>1:1 (정사각형)</option>
                                </select>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-users mr-2"></i>참조 캐릭터 선택:
                                </label>
                                <div class="space-y-2">
                                    ${storybook.characters.map((char, idx) => `
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                ${(storybook.coverCharacterRefs || []).includes(idx) ? 'checked' : ''}
                                                onchange="toggleCoverCharacterRef(${idx}, this.checked)"
                                                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span class="text-sm text-gray-700">${char.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-edit mr-2"></i>표지 프롬프트:
                                </label>
                                <textarea 
                                    id="cover-prompt"
                                    rows="8"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    placeholder="표지에 대한 설명을 입력하세요..."
                                >${storybook.coverPrompt || buildCoverPrompt(storybook)}</textarea>
                                <button 
                                    onclick="resetCoverPrompt()"
                                    class="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    <i class="fas fa-redo mr-1"></i>기본 프롬프트로 초기화
                                </button>
                            </div>
                            <div class="flex gap-2">
                                <button 
                                    onclick="generateCoverImage()"
                                    class="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                                >
                                    <i class="fas fa-magic mr-2"></i>${storybook.coverImage ? '재생성' : '생성'}
                                </button>
                                <button 
                                    onclick="openCoverUploadModal()"
                                    class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                                >
                                    <i class="fas fa-upload mr-2"></i>업로드
                                </button>
                            </div>
                        </div>
                        <div>
                            <div class="mb-2">
                                <span class="block text-sm font-semibold text-gray-700">
                                    <i class="fas fa-image mr-2"></i>미리보기:
                                </span>
                            </div>
                            <div id="cover-image-display" class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl min-h-[300px] md:min-h-[400px] overflow-hidden shadow-lg">
                                ${storybook.coverImage ? '' : `
                                    <div class="flex items-center justify-center h-full">
                                        <div class="text-center p-6">
                                            <i class="fas fa-book-open text-6xl text-white opacity-50 mb-4"></i>
                                            <p class="text-white text-sm">표지 이미지 생성 대기중</p>
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 메인 렌더링 함수
     */
    renderStorybook(storybook) {
        const UIHelper = window.UIHelper;
        
        console.log('📺 displayStorybook 호출:', {
            title: storybook.title,
            coverImage: storybook.coverImage,
            historyCount: (storybook.coverImageHistory || []).length
        });
        
        let html = '';
        
        // 헤더
        html += UIHelper.renderStorybookHeader(storybook);
        
        // 배경음악
        html += UIHelper.renderMusicSection(storybook);
        
        // 캐릭터 섹션
        html += this.renderCharacterSection(storybook);
        
        // 표지 섹션
        html += this.renderCoverSection(storybook);
        
        // Key Object 섹션 (임시)
        html += this.renderKeyObjectSection(storybook);
        
        // 페이지 섹션 (임시)
        html += this.renderPageSection(storybook);
        
        return html;
    }
    
    /**
     * Key Object 섹션 렌더링 (임시 플레이스홀더)
     */
    renderKeyObjectSection(storybook) {
        return `
            <div class="bg-white rounded-3xl shadow-2xl p-10 mb-8">
                <h3 class="text-3xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-cube mr-2 text-orange-500"></i>
                    핵심 사물 (Key Objects)
                </h3>
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <i class="fas fa-construction text-yellow-600 text-4xl mb-3"></i>
                    <p class="text-lg text-gray-700 font-semibold">⚠️ 이 섹션은 아직 구현 중입니다</p>
                    <p class="text-sm text-gray-600 mt-2">DisplayService 완성 후 사용 가능합니다.</p>
                </div>
            </div>
        `;
    }
    
    /**
     * 페이지 섹션 렌더링 (임시 플레이스홀더)
     */
    renderPageSection(storybook) {
        return `
            <div class="bg-white rounded-3xl shadow-2xl p-10 mb-8">
                <h3 class="text-3xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-book mr-2 text-blue-500"></i>
                    페이지별 편집
                </h3>
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <i class="fas fa-construction text-yellow-600 text-4xl mb-3"></i>
                    <p class="text-lg text-gray-700 font-semibold">⚠️ 이 섹션은 아직 구현 중입니다</p>
                    <p class="text-sm text-gray-600 mt-2">DisplayService 완성 후 사용 가능합니다.</p>
                    <div class="mt-4 text-left bg-white p-4 rounded">
                        <p class="text-sm font-semibold mb-2">페이지 목록:</p>
                        ${storybook.pages.map((page, idx) => `
                            <div class="text-xs text-gray-600 mb-1">
                                <i class="fas fa-file-alt mr-2"></i>페이지 ${idx + 1}: ${page.text?.substring(0, 50) || '(내용 없음)'}...
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// 전역 인스턴스 생성
window.displayService = new DisplayService();
