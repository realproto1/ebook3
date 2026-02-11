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
                            <i class="fas fa-info-circle ml-2 text-gray-400 text-sm cursor-pointer hover:text-purple-500" 
                               onclick="event.stopPropagation(); const el = document.getElementById('character-info'); el.style.display = el.style.display === 'none' ? 'block' : 'none';"
                               title="도움말"></i>
                        </h3>
                        <p id="character-info" class="text-xs md:text-sm text-gray-600 mb-2" style="display: none;">
                            <i class="fas fa-lightbulb mr-1 text-yellow-500"></i>
                            각 캐릭터의 레퍼런스 이미지를 생성하면 삽화에서 일관된 모습을 유지할 수 있어요.
                        </p>
                        ${createModelSelect('character', this.imageSettings.characterModel || 'gemini-3-pro-image-preview', 'updateCharacterModel(this.value)')}
                    </div>
                    <div class="flex gap-2 md:gap-3">
                        <button 
                            onclick="generateAllCharacterReferences()"
                            class="btn-generate px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                        >
                            <i class="fas fa-images mr-1 md:mr-2"></i><span class="hidden sm:inline">모든 레퍼런스 생성</span><span class="sm:hidden">전체 생성</span>
                        </button>
                        <button 
                            onclick="downloadAllCharacterReferences()"
                            class="btn-download px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                        >
                            <i class="fas fa-download mr-1 md:mr-2"></i><span class="hidden sm:inline">모두 다운로드</span><span class="sm:hidden">다운</span>
                        </button>
                        <button 
                            onclick="addNewCharacter()"
                            class="btn-upload px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
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
                    <textarea 
                        id="char-desc-${idx}"
                        onchange="updateCharacterDescription(${idx}, this.value)"
                        class="w-full text-white text-xs md:text-sm mb-3 md:mb-4 opacity-90 bg-white bg-opacity-10 border border-white border-opacity-30 rounded p-2 focus:outline-none focus:border-opacity-60"
                        rows="2"
                        placeholder="캐릭터 설명을 입력하세요..."
                    >${char.description}</textarea>
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
                            id="generate-char-${idx}-btn"
                            onclick="generateCharacterReference(${idx})"
                            class="flex-1 btn-generate px-3 py-2 rounded-lg transition text-sm font-semibold"
                        >
                            <i class="fas fa-magic mr-1"></i>${char.referenceImage ? '재생성' : '생성'}
                        </button>
                        <button 
                            onclick="openCharacterUploadModal(${idx})"
                            class="flex-1 btn-upload px-3 py-2 rounded-lg transition text-sm font-semibold"
                        >
                            <i class="fas fa-upload mr-1"></i>업로드
                        </button>
                        ${char.referenceImage ? `
                        <button 
                            onclick="downloadImage('${char.referenceImage}', '${char.name}_레퍼런스.png')"
                            class="btn-download px-3 py-2 rounded-lg transition text-sm font-semibold"
                            title="다운로드"
                        >
                            <i class="fas fa-download"></i>
                        </button>
                        ` : ''}
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
                        <i class="fas fa-info-circle ml-2 text-gray-400 text-sm cursor-pointer hover:text-indigo-500" 
                           onclick="event.stopPropagation(); const el = document.getElementById('cover-info'); el.style.display = el.style.display === 'none' ? 'block' : 'none';"
                           title="도움말"></i>
                    </h3>
                    <p id="cover-info" class="text-xs md:text-sm text-gray-600 mb-2" style="display: none;">
                        <i class="fas fa-lightbulb mr-1 text-yellow-500"></i>
                        동화책의 첫인상을 결정하는 표지 이미지를 생성해요. 캐릭터를 선택하면 참조해서 그려요.
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
                                    id="generate-cover-btn"
                                    onclick="generateCoverImage()"
                                    class="flex-1 btn-generate px-6 py-3 rounded-lg transition font-semibold shadow-lg"
                                >
                                    <i class="fas fa-magic mr-1"></i>${storybook.coverImage ? '재생성' : '생성'}
                                </button>
                                <button 
                                    onclick="openCoverUploadModal()"
                                    class="flex-1 btn-upload px-6 py-3 rounded-lg transition font-semibold shadow-lg"
                                >
                                    <i class="fas fa-upload mr-1"></i>업로드
                                </button>
                                ${storybook.coverImage ? `
                                <button 
                                    onclick="downloadImage('${storybook.coverImage}', '${storybook.title}_표지.png')"
                                    class="btn-download px-6 py-3 rounded-lg transition font-semibold shadow-lg"
                                    title="표지 다운로드"
                                >
                                    <i class="fas fa-download"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        <div>
                            <div class="mb-2">
                                <span class="block text-sm font-semibold text-gray-700">
                                    <i class="fas fa-image mr-2"></i>미리보기:
                                </span>
                            </div>
                            <div id="cover-image-display" class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl min-h-[300px] md:min-h-[400px] overflow-hidden shadow-lg">
                                ${storybook.coverImage ? `
                                    <div class="flex gap-2 h-full">
                                        <!-- 메인 표지 -->
                                        <div class="flex-1 relative group">
                                            <img src="${storybook.coverImage}" 
                                                 alt="${storybook.title} 표지" 
                                                 class="w-full h-full object-cover rounded-lg"/>
                                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                                <h3 class="text-white font-bold text-lg">${storybook.title}</h3>
                                                ${storybook.subtitle ? `<p class="text-white/80 text-sm">${storybook.subtitle}</p>` : ''}
                                            </div>
                                        </div>
                                        
                                        ${(storybook.coverHistory && storybook.coverHistory.length > 0) ? `
                                        <!-- 히스토리 -->
                                        <div class="w-24 overflow-y-auto space-y-2">
                                            ${storybook.coverHistory.map((url, idx) => `
                                                <div class="relative group cursor-pointer border-2 border-transparent hover:border-purple-400 rounded transition" 
                                                     onclick="selectCoverFromHistory(${idx})">
                                                    <img src="${url}" alt="이전 표지 ${idx + 1}" class="w-full h-32 object-cover rounded"/>
                                                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                                                        <i class="fas fa-check text-white opacity-0 group-hover:opacity-100 transition"></i>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        ` : ''}
                                    </div>
                                ` : `
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
        
        console.log('🔍 UIHelper 상태:', {
            exists: !!UIHelper,
            type: typeof UIHelper,
            hasRenderStorybookHeader: !!(UIHelper && UIHelper.renderStorybookHeader),
            hasRenderMusicSection: !!(UIHelper && UIHelper.renderMusicSection)
        });
        
        if (!UIHelper) {
            console.error('❌ UIHelper를 찾을 수 없습니다!');
            return '<div class="p-10 text-center text-red-600"><h2>오류: UIHelper를 로드할 수 없습니다</h2></div>';
        }
        
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
        
        console.log('✅ HTML 생성 완료:', {
            htmlLength: html.length,
            htmlPreview: html.substring(0, 200) + '...'
        });
        
        return html;
    }
    
    /**
     * Key Object 섹션 렌더링 (임시 플레이스홀더)
     */
    renderKeyObjectSection(storybook) {
        const createModelSelect = window.createModelSelect;
        const imageSettings = this.imageSettings;
        
        return `
        <!-- Key Objects 섹션 -->
        <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
            <!-- 제목과 모델 선택 -->
            <div class="mb-4 md:mb-6">
                <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer flex items-center" onclick="toggleSection('keyobject-section')">
                    <i id="keyobject-section-icon" class="fas fa-chevron-right mr-2 text-sm transition-transform"></i>
                    <i class="fas fa-cube mr-2 text-orange-500"></i>
                    핵심 사물 (Key Objects)
                    <i class="fas fa-info-circle ml-2 text-gray-400 text-sm cursor-pointer hover:text-orange-500" 
                       onclick="event.stopPropagation(); const el = document.getElementById('keyobject-info'); el.style.display = el.style.display === 'none' ? 'block' : 'none';"
                       title="도움말"></i>
                </h3>
                <p id="keyobject-info" class="text-xs md:text-sm text-gray-600 mb-2" style="display: none;">
                    <i class="fas fa-lightbulb mr-1 text-yellow-500"></i>
                    스토리에서 중요한 물건들을 미리 생성하면 삽화에서 일관되게 표현할 수 있어요.
                </p>
                ${createModelSelect('keyobject', imageSettings.keyObjectModel || 'gemini-3-pro-image-preview', 'updateKeyObjectModel(this.value)')}
            </div>
            
            <!-- 버튼 그룹 -->
            <div class="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
                <button 
                    onclick="generateKeyObjectsForStorybook()"
                    class="btn-generate px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                >
                    <i class="fas fa-magic mr-1 md:mr-2"></i><span class="hidden sm:inline">핵심 사물 새로 생성</span><span class="sm:hidden">사물 생성</span>
                </button>
                <button 
                    id="generate-all-keyobject-btn"
                    onclick="generateAllKeyObjectImages()"
                    class="btn-generate px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                >
                    <i class="fas fa-images mr-1 md:mr-2"></i><span class="hidden sm:inline">모든 이미지 생성</span><span class="sm:hidden">전체 생성</span>
                </button>
                <button 
                    onclick="downloadAllKeyObjectImages()"
                    class="btn-download px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                >
                    <i class="fas fa-download mr-1 md:mr-2"></i><span class="hidden sm:inline">모두 다운로드</span><span class="sm:hidden">다운</span>
                </button>
                <button 
                    onclick="bulkUploadKeyObjectImages()"
                    class="btn-upload px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                >
                    <i class="fas fa-upload mr-1 md:mr-2"></i><span class="hidden sm:inline">일괄 업로드</span><span class="sm:hidden">업로드</span>
                </button>
                <button 
                    onclick="addNewKeyObject()"
                    class="btn-upload px-3 md:px-6 py-2 md:py-3 rounded-lg transition whitespace-nowrap text-sm md:text-base font-semibold shadow-lg"
                >
                    <i class="fas fa-plus mr-1 md:mr-2"></i><span class="hidden sm:inline">사물 추가</span><span class="sm:hidden">추가</span>
                </button>
            </div>

            <div id="keyobject-section-content" class="hidden">
            ${storybook.key_objects && storybook.key_objects.length > 0 ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                ${storybook.key_objects.map((obj, idx) => {
                    const objImgData = storybook.keyObjectImages && storybook.keyObjectImages[idx];
                    // objImgData는 문자열(URL) 또는 객체 { imageUrl: ... } 모두 지원
                    const objImg = typeof objImgData === 'string' ? objImgData : (objImgData?.imageUrl || null);
                    const sizeIcon = obj.size === 'small' ? 'fa-hand-holding' : obj.size === 'large' ? 'fa-building' : 'fa-box';
                    const sizeColor = obj.size === 'small' ? 'text-blue-600' : obj.size === 'large' ? 'text-red-600' : 'text-yellow-600';
                    return `
                    <div class="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-xl border-2 border-orange-200">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <input 
                                        type="text" 
                                        id="keyobj-name-${idx}" 
                                        value="${obj.name}"
                                        onblur="updateKeyObjectField(${idx}, 'name', this.value)"
                                        class="font-bold text-gray-700 bg-transparent border-b border-orange-300 focus:border-orange-500 focus:outline-none w-full"
                                        placeholder="영어 이름"
                                    />
                                    <i class="${sizeIcon} ${sizeColor}" title="${obj.size}"></i>
                                </div>
                                <input 
                                    type="text" 
                                    id="keyobj-korean-${idx}" 
                                    value="${obj.korean}"
                                    onblur="updateKeyObjectField(${idx}, 'korean', this.value)"
                                    class="text-sm text-gray-600 bg-transparent border-b border-orange-200 focus:border-orange-400 focus:outline-none w-full mb-2"
                                    placeholder="한글 이름"
                                />
                                <div class="flex items-center gap-2 mb-2">
                                    <select 
                                        id="keyobj-size-${idx}"
                                        onchange="updateKeyObjectField(${idx}, 'size', this.value)"
                                        class="flex-1 text-xs bg-white border border-orange-200 rounded px-2 py-1"
                                    >
                                        <option value="small" ${obj.size === 'small' ? 'selected' : ''}>Small</option>
                                        <option value="medium" ${obj.size === 'medium' ? 'selected' : ''}>Medium</option>
                                        <option value="large" ${obj.size === 'large' ? 'selected' : ''}>Large</option>
                                    </select>
                                    <div class="flex items-center gap-1">
                                        <input 
                                            type="number" 
                                            id="keyobj-size-cm-${idx}" 
                                            value="${obj.sizeCm || (obj.size === 'small' ? 10 : obj.size === 'large' ? 200 : 100)}"
                                            onblur="updateKeyObjectField(${idx}, 'sizeCm', parseInt(this.value))"
                                            class="w-12 text-xs bg-white border border-orange-200 rounded px-1 py-1 text-center"
                                            min="1"
                                            max="1000"
                                        />
                                        <span class="text-xs text-gray-600">cm</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onclick="deleteKeyObject(${idx})"
                                class="text-orange-600 hover:text-orange-800 ml-2"
                                title="삭제"
                            >
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                        <div id="keyobj-img-${idx}" class="bg-white rounded-lg overflow-hidden mb-2 min-h-[120px]">
                            ${objImg ? `
                                <div class="flex gap-2">
                                    <div class="flex-1 relative">
                                        <img src="${objImg}" alt="${obj.name}" class="w-full h-32 object-contain bg-gray-50" />
                                    </div>
                                    ${(obj.imageHistory && obj.imageHistory.length > 0) ? `
                                        <div class="w-16 overflow-y-auto space-y-1 p-1 bg-gray-100">
                                            ${obj.imageHistory.map((url, histIdx) => `
                                                <div class="relative group cursor-pointer border-2 border-transparent hover:border-orange-400 rounded transition" 
                                                     onclick="selectKeyObjectImageFromHistory(${idx}, ${histIdx})" 
                                                     title="이전 버전 ${histIdx + 1}">
                                                    <img src="${url}" alt="이전 ${histIdx + 1}" class="w-full h-12 object-contain bg-white rounded"/>
                                                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition rounded flex items-center justify-center">
                                                        <i class="fas fa-check text-orange-500 opacity-0 group-hover:opacity-100 transition text-xs"></i>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `
                                <div class="flex items-center justify-center h-32 bg-gray-50">
                                    <i class="fas fa-image text-3xl text-gray-300"></i>
                                </div>
                            `}
                        </div>
                        <textarea 
                            id="keyobj-desc-${idx}"
                            onblur="updateKeyObjectField(${idx}, 'description', this.value)"
                            class="w-full text-xs bg-white border border-orange-200 rounded p-2 mb-2 resize-none"
                            rows="2"
                            placeholder="설명..."
                        >${obj.description || ''}</textarea>
                        <div class="flex gap-2">
                            <button 
                                id="generate-keyobj-${idx}-btn"
                                onclick="generateSingleKeyObjectImage(${idx})"
                                class="flex-1 bg-orange-500 text-white text-xs py-1.5 px-2 rounded hover:bg-orange-600 transition"
                            >
                                <i class="fas fa-magic mr-1"></i>${objImg ? '재생성' : '생성'}
                            </button>
                            <button 
                                onclick="downloadImage('${objImg}', '${obj.name}_keyobject.png')"
                                class="bg-green-500 text-white text-xs py-1.5 px-2 rounded hover:bg-green-600 transition ${!objImg ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${!objImg ? 'disabled' : ''}
                            >
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            ` : `
                <div class="text-center py-10 text-gray-500">
                    <i class="fas fa-cube text-5xl mb-4 opacity-50"></i>
                    <p class="text-lg">아직 핵심 사물이 없습니다.</p>
                    <p class="text-sm mt-2">"사물 추가" 버튼을 눌러 핵심 사물을 추가하세요.</p>
                </div>
            `}
            </div>
        </div>
        `;
    }
    renderPageSection(storybook) {
        const createModelSelect = window.createModelSelect;
        const createTTSModelSelect = window.createTTSModelSelect;
        const imageSettings = this.imageSettings;
        const currentLanguage = window.currentLanguage || 'ko';
        
        // 페이지 카드 렌더링을 별도 함수로
        const renderPageCard = (page, idx) => {
            // 현재 언어의 텍스트 가져오기
            let displayText = page.text || '';
            let displayTTSAudio = null;
            
            // TTS 오디오 가져오기
            if (currentLanguage === 'ko') {
                // 한국어: ttsAudio.ko.url 또는 하위 호환용 audioUrl
                displayTTSAudio = page.ttsAudio?.ko?.url || page.audioUrl || page.tts_audio || null;
            } else {
                // 다른 언어: pageNumber로 찾기 (배열 인덱스가 아님!)
                console.log(`🔍 페이지 ${page.pageNumber} 번역 찾기:`, {
                    currentLanguage,
                    hasTranslations: !!storybook.translations,
                    hasCurrentLang: !!storybook.translations?.[currentLanguage],
                    translationsArray: storybook.translations?.[currentLanguage]
                });
                
                if (storybook.translations && storybook.translations[currentLanguage]) {
                    const translatedPage = storybook.translations[currentLanguage].find(
                        p => p.pageNumber === page.pageNumber
                    );
                    console.log(`   → 찾은 번역:`, translatedPage);
                    
                    if (translatedPage) {
                        displayText = translatedPage.text || '';
                        displayTTSAudio = translatedPage.tts_audio || null;
                        console.log(`   ✅ 번역 텍스트 적용: "${displayText.substring(0, 50)}..."`);
                    } else {
                        console.warn(`   ⚠️ 페이지 ${page.pageNumber} 번역을 찾지 못함`);
                    }
                }
            }
            
            const ttsSection = displayTTSAudio ? 
                `<div class="bg-white rounded-lg p-3 border border-green-200">
                    <audio id="tts-player-${idx}" controls class="w-full" style="height: 32px;">
                        <source src="${displayTTSAudio}" type="audio/mpeg">
                    </audio>
                </div>` :
                `<div class="bg-gray-100 rounded-lg p-3 text-center text-gray-500 text-sm">
                    <i class="fas fa-microphone-slash mr-1"></i>TTS 음성이 없습니다
                </div>`;
                
            const illustrationSection = page.illustrationImage ?
                `<div class="relative group">
                    <img src="${page.illustrationImage}" alt="페이지 ${idx + 1}" class="w-full h-full object-cover" />
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                        <button 
                            onclick="downloadImage('${page.illustrationImage}', 'page-${idx + 1}-illustration.png')"
                            class="bg-white text-purple-600 p-2 rounded-lg shadow-lg hover:bg-purple-50 transition"
                            title="다운로드"
                        >
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>` :
                `<div class="flex items-center justify-center h-[200px] text-gray-400">
                    <div class="text-center">
                        <i class="fas fa-image text-4xl mb-2"></i>
                        <p class="text-sm">삽화 생성 대기중</p>
                    </div>
                </div>`;
            
            return `
            <div class="border-2 border-purple-200 rounded-xl p-6 bg-gradient-to-br from-purple-50 to-pink-50"
                 draggable="true"
                 data-page-index="${idx}"
                 ondragstart="handleDragStart(event)"
                 ondragover="handleDragOver(event)"
                 ondragenter="handleDragEnter(event)"
                 ondragleave="handleDragLeave(event)"
                 ondragend="handleDragEnd(event)"
                 ondrop="handleDrop(event)">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xl font-bold text-purple-800 flex items-center gap-2">
                        <i class="fas fa-grip-vertical text-gray-400 cursor-move" title="드래그하여 순서 변경"></i>
                        <i class="fas fa-file-alt"></i>
                        페이지 ${idx + 1}
                    </h4>
                    <div class="flex gap-2">
                        <button 
                            onclick="deletePage(${idx})"
                            class="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50 transition text-sm"
                            title="페이지 삭제"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- 텍스트 편집 영역 -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-align-left mr-1"></i>텍스트:
                            </label>
                            <textarea 
                                id="page-text-${currentLanguage}-${idx}"
                                onblur="updatePageText(${idx}, this.value, '${currentLanguage}')"
                                class="w-full p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows="4"
                                placeholder="페이지 텍스트를 입력하세요..."
                            >${displayText}</textarea>
                        </div>
                        
                        <!-- TTS 영역 -->
                        <div class="border-t pt-4">
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-sm font-semibold text-gray-700">
                                    <i class="fas fa-volume-up mr-1"></i>TTS 음성:
                                </label>
                                ${createTTSModelSelect(imageSettings.ttsModel || 'Aoede', idx)}
                            </div>
                            
                            <div class="flex gap-2 mb-2">
                                ${UIHelper.renderButton('generate', `generatePageTTS(${idx})`, displayTTSAudio ? '재생성' : '생성', 'fas fa-magic', { fullWidth: true, id: `tts-btn-${idx}` })}
                                ${UIHelper.renderButton('upload', `uploadPageTTS(${idx})`, '업로드', 'fas fa-upload', { fullWidth: true, id: `tts-upload-btn-${idx}` })}
                                ${displayTTSAudio ? UIHelper.renderButton('download', `downloadPageTTS(${idx})`, '', 'fas fa-download') : ''}
                                ${displayTTSAudio ? `<button id="tts-delete-btn-${idx}" onclick="deletePageTTS(${idx})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition text-sm" title="TTS 삭제"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                            
                            ${ttsSection}
                        </div>
                    </div>
                    
                    <!-- 삽화 영역 -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-image mr-1"></i>삽화:
                            </label>
                            
                            <div class="flex gap-2 mb-2">
                                <button 
                                    id="generate-illust-${idx}-btn"
                                    onclick="generateIllustration(${idx})"
                                    class="flex-1 btn-generate px-3 py-2 rounded-lg transition text-sm font-semibold"
                                >
                                    <i class="fas fa-magic mr-1"></i>${page.illustrationImage ? '재생성' : '생성'}
                                </button>
                                <button 
                                    onclick="uploadIllustration(${idx})"
                                    class="flex-1 btn-upload px-3 py-2 rounded-lg transition text-sm font-semibold"
                                >
                                    <i class="fas fa-upload mr-1"></i>업로드
                                </button>
                                ${page.illustrationImage ? `
                                <button 
                                    onclick="downloadIllustration(${idx})"
                                    class="btn-download px-3 py-2 rounded-lg transition text-sm font-semibold"
                                    title="삽화 다운로드"
                                >
                                    <i class="fas fa-download"></i>
                                </button>
                                ` : ''}
                            </div>
                            
                            <div id="illustration-${idx}" class="bg-white rounded-lg overflow-hidden border-2 border-purple-200 min-h-[200px]">
                                ${illustrationSection}
                            </div>
                        </div>
                        
                        <!-- 삽화 프롬프트 -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-wand-magic-sparkles mr-1"></i>삽화 프롬프트:
                            </label>
                            <textarea 
                                id="page-illust-prompt-${idx}"
                                onblur="updatePageIllustrationPrompt(${idx}, this.value)"
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                rows="3"
                                placeholder="삽화 프롬프트를 입력하세요..."
                            >${page.illustrationPrompt || ''}</textarea>
                        </div>
                        
                        <!-- 캐릭터 레퍼런스 선택 -->
                        ${storybook.characters && storybook.characters.length > 0 ? `
                        <div class="mt-3">
                            <button 
                                onclick="togglePageSection('ref-chars-${idx}')"
                                class="w-full flex items-center justify-between text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 p-2 rounded-lg transition"
                            >
                                <span><i class="fas fa-users mr-1"></i>캐릭터 레퍼런스 (선택)</span>
                                <i id="ref-chars-${idx}-icon" class="fas fa-chevron-down text-xs transition-transform"></i>
                            </button>
                            <div id="ref-chars-${idx}-content" class="hidden mt-2 bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
                                <p class="text-[10px] text-gray-600 mb-2"><i class="fas fa-info-circle mr-1"></i>삽화 생성 시 참조할 캐릭터를 선택하세요</p>
                                <div class="grid grid-cols-2 gap-2">
                                    ${storybook.characters.map((char, charIdx) => {
                                        if (!char.referenceImage) return '';
                                        return `
                                        <label class="relative cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                id="page-char-ref-${idx}-${charIdx}"
                                                onchange="togglePageCharacterRef(${idx}, ${charIdx}, this.checked)"
                                                class="absolute top-2 left-2 w-4 h-4 z-10"
                                                ${page.characterRefs && page.characterRefs.includes(charIdx) ? 'checked' : ''}
                                            />
                                            <div class="border-2 rounded-lg overflow-hidden transition ${page.characterRefs && page.characterRefs.includes(charIdx) ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300 group-hover:border-purple-400'}">
                                                <img 
                                                    src="${char.referenceImage}" 
                                                    alt="${char.name}"
                                                    class="w-full h-20 object-cover"
                                                />
                                                <div class="bg-white px-2 py-1 text-center">
                                                    <p class="text-[10px] font-semibold text-gray-700 truncate">${char.name}</p>
                                                </div>
                                            </div>
                                        </label>
                                        `;
                                    }).join('') || '<p class="text-gray-400 text-[10px] col-span-2 text-center py-2">레퍼런스 이미지가 있는 캐릭터가 없습니다</p>'}
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        };
        
        // 언어 탭 HTML 생성
        let availableLanguages = storybook.languages || [];
        if (storybook.translations && typeof storybook.translations === 'object') {
            const translationLangs = Object.keys(storybook.translations);
            availableLanguages = ['ko', ...translationLangs].filter((v, i, a) => a.indexOf(v) === i);
        }
        if (availableLanguages.length === 0) {
            availableLanguages = ['ko'];
        }
        
        const languageNames = {
            'ko': '🇰🇷 한국어',
            'en': '🇺🇸 English',
            'zh': '🇨🇳 中文',
            'ja': '🇯🇵 日본어',
            'es': '🇪🇸 Español',
            'fr': '🇫🇷 Français'
        };
        
        const languageTabs = availableLanguages.map(lang => {
            const isActive = lang === currentLanguage;
            return `
                <button 
                    onclick="switchLanguage('${lang}')"
                    class="px-6 py-3 font-semibold transition-all relative ${isActive ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
                    style="${isActive ? 'border-bottom: 3px solid rgb(147, 51, 234); margin-bottom: -1px;' : ''}"
                >
                    ${languageNames[lang] || lang}
                </button>
            `;
        }).join('');
        
        const addLanguageOptions = ['en', 'zh', 'ja', 'es', 'fr']
            .filter(lang => !availableLanguages.includes(lang))
            .map(lang => `
                <button 
                    onclick="addLanguageFromTab('${lang}')"
                    class="w-full text-left px-3 py-2 hover:bg-purple-50 rounded text-sm transition"
                >
                    ${languageNames[lang]}
                </button>
            `).join('');
        
        return `
        <!-- 페이지 섹션 -->
        <div class="bg-white rounded-3xl shadow-2xl p-10 mb-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-3xl font-bold text-gray-800 cursor-pointer flex items-center" onclick="toggleSection('pages-section')">
                    <i id="pages-section-icon" class="fas fa-chevron-down mr-2 text-sm transition-transform"></i>
                    <i class="fas fa-book mr-2 text-purple-500"></i>
                    스토리 페이지 (${storybook.pages.length}페이지)
                </h3>
                
                <!-- 동영상 생성 버튼 -->
                <button 
                    onclick="openVideoGenerationModal()"
                    class="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:from-red-600 hover:to-pink-700 transition shadow-lg flex items-center gap-2"
                >
                    <i class="fas fa-video"></i>
                    <span>동영상 생성</span>
                </button>
            </div>
            
            <div class="mb-6 space-y-4">
                <div class="flex items-center gap-4">
                    <label class="text-sm text-gray-600">이미지 모델:</label>
                    ${createModelSelect('illustration', imageSettings.illustrationModel || 'gemini-3-pro-image-preview', 'updateIllustrationModel(this.value)')}
                </div>
                
                <!-- 언어 탭 -->
                <div class="border-b border-gray-200 -mx-10 px-10 mb-6">
                    <div class="flex items-center justify-between gap-1">
                        <div class="flex items-center gap-1">
                            ${languageTabs}
                            
                            <div class="relative ml-2">
                                <button 
                                    onclick="toggleAddLanguageDropdown()"
                                    class="px-4 py-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-semibold text-sm border-2 border-dashed border-gray-300 hover:border-purple-400"
                                >
                                    <i class="fas fa-plus mr-1"></i>언어 추가
                                </button>
                                
                                <div id="add-language-dropdown" class="hidden absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[200px]">
                                    <div class="p-3">
                                        <p class="text-xs text-gray-600 mb-2">추가할 언어 선택</p>
                                        ${addLanguageOptions}
                                        ${availableLanguages.length >= 6 ? '<p class="text-xs text-gray-500 p-2">모든 언어가 추가되었습니다</p>' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 mt-4 pb-4">
                        <button id="translate-all-btn" onclick="translateAllPages()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2">
                            <i class="fas fa-language"></i>전체 번역
                        </button>
                        <button id="generate-all-tts-btn" onclick="generateAllTTS()" class="btn-generate px-4 py-2 rounded-lg transition text-sm font-semibold shadow-lg flex items-center gap-2">
                            <i class="fas fa-volume-up"></i>전체 TTS 생성
                        </button>
                        <button id="batch-tts-upload-btn" onclick="openBatchTTSUpload()" class="btn-upload px-4 py-2 rounded-lg transition text-sm font-semibold shadow-lg flex items-center gap-2">
                            <i class="fas fa-upload"></i>전체 TTS 업로드
                        </button>
                        <button id="download-all-text-btn" onclick="downloadAllText()" class="btn-download px-4 py-2 rounded-lg transition text-sm font-semibold shadow-lg flex items-center gap-2">
                            <i class="fas fa-download"></i>전체 텍스트 다운로드
                        </button>
                    </div>
                </div>
                
                <div class="flex gap-2 flex-wrap">
                    <button id="generate-all-illust-btn" onclick="generateAllIllustrationsSequential()" class="btn-generate px-4 py-2 rounded-lg transition text-sm font-semibold shadow-lg">
                        <i class="fas fa-image mr-1"></i>모든 삽화 생성
                    </button>
                    <button id="download-all-illust-btn" onclick="downloadAllIllustrations()" class="btn-download px-4 py-2 rounded-lg transition text-sm font-semibold shadow-lg">
                        <i class="fas fa-download mr-1"></i>모든 삽화 다운로드
                    </button>
                    <button id="batch-illust-upload-btn" onclick="openBatchIllustrationUpload()" class="btn-upload px-4 py-2 rounded-lg transition text-sm font-semibold shadow-lg">
                        <i class="fas fa-upload mr-1"></i>일괄 삽화 업로드
                    </button>
                </div>
            </div>
            
            <div id="pages-section-content">
                <div id="pages-container" class="space-y-6">
                    ${storybook.pages.map((page, idx) => renderPageCard(page, idx)).join('')}
                </div>
                
                <div class="mt-6 flex justify-center">
                    <button onclick="addNewPage()" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold">
                        <i class="fas fa-plus mr-2"></i>페이지 추가
                    </button>
                </div>
            </div>
        </div>
        `;
    }
}

// 전역 인스턴스 생성
window.displayService = new DisplayService();
