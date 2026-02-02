/**
 * EditorController
 * - 에디터 UI 관리
 * - 모달 제어
 * - 상태 업데이트
 * - 이벤트 핸들러
 */

class EditorController {
    constructor() {
        this.currentStorybook = null;
        this.currentLanguage = 'ko';
        this.imageSettings = { ...DEFAULT_IMAGE_SETTINGS };
        this.isGenerating = false;
    }

    /**
     * 초기화
     */
    async init() {
        try {
            // 이미지 설정 로드
            this.loadImageSettings();
            
            // 동화책 목록 로드
            await this.loadStorybookList();
            
            console.log('✅ EditorController 초기화 완료');
        } catch (error) {
            console.error('EditorController 초기화 실패:', error);
        }
    }

    /**
     * 동화책 목록 로드
     */
    async loadStorybookList() {
        try {
            const storybooks = await storyService.fetchAll();
            this.renderStorybookList(storybooks);
            return storybooks;
        } catch (error) {
            console.error('동화책 목록 로드 실패:', error);
            this.showError('동화책 목록을 불러올 수 없습니다.');
            throw error;
        }
    }

    /**
     * 동화책 목록 렌더링
     * @param {Array} storybooks
     */
    renderStorybookList(storybooks) {
        const container = DOM.id('storybook-list');
        if (!container) return;

        if (storybooks.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">동화책이 없습니다.</div>';
            return;
        }

        container.innerHTML = storybooks.map(book => this.createStorybookCard(book)).join('');
    }

    /**
     * 동화책 카드 HTML 생성
     * @param {Storybook} book
     * @returns {string}
     */
    createStorybookCard(book) {
        const completionRate = book.calculateCompletionRate();
        const statusColor = book.status === 'completed' ? 'green' : 
                           book.status === 'generating' ? 'yellow' : 'gray';

        return `
            <div class="storybook-card bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition"
                 onclick="editorController.openStorybook('${book.id}')">
                <div class="flex items-start justify-between mb-2">
                    <h3 class="text-lg font-bold text-gray-800">${DOM.escape(book.title)}</h3>
                    <span class="px-2 py-1 text-xs rounded bg-${statusColor}-100 text-${statusColor}-700">
                        ${this.getStatusLabel(book.status)}
                    </span>
                </div>
                <p class="text-sm text-gray-600 mb-3">${DOM.escape(book.author || '작가 미상')}</p>
                <div class="flex items-center justify-between text-sm text-gray-500">
                    <span><i class="fas fa-file-alt"></i> ${book.pages.length}페이지</span>
                    <span><i class="fas fa-chart-line"></i> ${completionRate}%</span>
                </div>
                <div class="mt-2 bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 rounded-full h-2" style="width: ${completionRate}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * 상태 라벨 가져오기
     * @param {string} status
     * @returns {string}
     */
    getStatusLabel(status) {
        const labels = {
            draft: '작성 중',
            generating: '생성 중',
            completed: '완료'
        };
        return labels[status] || status;
    }

    /**
     * 동화책 열기
     * @param {string} id
     */
    async openStorybook(id) {
        try {
            const storybook = await storyService.fetchById(id);
            this.currentStorybook = storybook;
            this.renderEditor(storybook);
        } catch (error) {
            console.error('동화책 열기 실패:', error);
            this.showError('동화책을 불러올 수 없습니다.');
        }
    }

    /**
     * 에디터 렌더링
     * @param {Storybook} storybook
     */
    renderEditor(storybook) {
        // 에디터 뷰로 전환
        this.showView('editor');
        
        // 제목 업데이트
        const titleEl = DOM.id('editor-title');
        if (titleEl) {
            titleEl.textContent = storybook.title;
        }

        // 페이지 렌더링
        this.renderPages(storybook.pages);
        
        // 캐릭터 렌더링
        this.renderCharacters(storybook.characters);
        
        // Key Objects 렌더링
        this.renderKeyObjects(storybook.key_objects);
    }

    /**
     * 페이지 렌더링
     * @param {Array} pages
     */
    renderPages(pages) {
        const container = DOM.id('pages-container');
        if (!container) return;

        container.innerHTML = pages.map((page, index) => 
            this.createPageCard(page, index)
        ).join('');
    }

    /**
     * 페이지 카드 HTML 생성
     * @param {Object} page
     * @param {number} index
     * @returns {string}
     */
    createPageCard(page, index) {
        return `
            <div class="page-card bg-white rounded-lg shadow p-4 mb-4">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-gray-800">페이지 ${index + 1}</h4>
                    <div class="flex gap-2">
                        <button onclick="editorController.editPage(${index})" 
                                class="text-blue-600 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="editorController.deletePage(${index})" 
                                class="text-red-600 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-700 mb-3">${DOM.escape(page.text || '내용 없음')}</div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="text-center">
                        ${page.image_url 
                            ? `<img src="${page.image_url}" class="w-full h-32 object-cover rounded" alt="삽화">` 
                            : '<div class="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-gray-500"><i class="fas fa-image"></i></div>'
                        }
                        <button onclick="editorController.generateIllustration(${index})" 
                                class="mt-2 text-sm text-blue-600 hover:underline">
                            ${page.image_url ? '재생성' : '삽화 생성'}
                        </button>
                    </div>
                    <div class="text-center">
                        ${page.audio_url 
                            ? '<div class="w-full h-32 bg-green-100 rounded flex items-center justify-center"><i class="fas fa-volume-up text-green-600 text-4xl"></i></div>' 
                            : '<div class="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-gray-500"><i class="fas fa-microphone"></i></div>'
                        }
                        <button onclick="editorController.generateTTS(${index})" 
                                class="mt-2 text-sm text-blue-600 hover:underline">
                            ${page.audio_url ? '재생성' : 'TTS 생성'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 캐릭터 렌더링
     * @param {Array} characters
     */
    renderCharacters(characters) {
        const container = DOM.id('characters-container');
        if (!container) return;

        container.innerHTML = characters.map((char, index) => 
            this.createCharacterCard(char, index)
        ).join('');
    }

    /**
     * 캐릭터 카드 HTML 생성
     * @param {Object} character
     * @param {number} index
     * @returns {string}
     */
    createCharacterCard(character, index) {
        return `
            <div class="character-card bg-white rounded-lg shadow p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-bold">${DOM.escape(character.name)}</h4>
                    <button onclick="editorController.deleteCharacter(${index})" 
                            class="text-red-600 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${character.image_url 
                    ? `<img src="${character.image_url}" class="w-full h-48 object-cover rounded mb-2" alt="${character.name}">` 
                    : '<div class="w-full h-48 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-500"><i class="fas fa-user text-4xl"></i></div>'
                }
                <button onclick="editorController.generateCharacter(${index})" 
                        class="w-full text-sm text-blue-600 hover:underline">
                    ${character.image_url ? '재생성' : '이미지 생성'}
                </button>
            </div>
        `;
    }

    /**
     * Key Objects 렌더링
     * @param {Array} keyObjects
     */
    renderKeyObjects(keyObjects) {
        const container = DOM.id('key-objects-container');
        if (!container) return;

        container.innerHTML = keyObjects.map((obj, index) => 
            this.createKeyObjectCard(obj, index)
        ).join('');
    }

    /**
     * Key Object 카드 HTML 생성
     * @param {Object} keyObject
     * @param {number} index
     * @returns {string}
     */
    createKeyObjectCard(keyObject, index) {
        return `
            <div class="key-object-card bg-white rounded-lg shadow p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-semibold text-sm">${DOM.escape(keyObject.korean || keyObject.name)}</span>
                    <button onclick="editorController.deleteKeyObject(${index})" 
                            class="text-red-600 hover:text-red-700 text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${keyObject.image_url 
                    ? `<img src="${keyObject.image_url}" class="w-full h-32 object-cover rounded" alt="${keyObject.name}">` 
                    : '<div class="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-gray-500"><i class="fas fa-image"></i></div>'
                }
            </div>
        `;
    }

    /**
     * 뷰 전환
     * @param {string} viewName - 'list', 'editor', 'settings'
     */
    showView(viewName) {
        const views = ['list-view', 'editor-view', 'settings-view'];
        views.forEach(view => {
            const el = DOM.id(view);
            if (el) {
                el.style.display = view === `${viewName}-view` ? 'block' : 'none';
            }
        });
    }

    /**
     * 모달 열기
     * @param {string} modalId
     */
    openModal(modalId) {
        const modal = DOM.id(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    /**
     * 모달 닫기
     * @param {string} modalId
     */
    closeModal(modalId) {
        const modal = DOM.id(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    /**
     * 성공 메시지 표시
     * @param {string} message
     */
    showSuccess(message) {
        // 간단한 토스트 메시지
        const toast = DOM.create('div', {
            class: 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50',
            style: { animation: 'slideInRight 0.3s ease-out' }
        }, message);

        document.body.appendChild(toast);

        setTimeout(() => {
            DOM.fadeOut(toast, 300, () => {
                DOM.remove(toast);
            });
        }, 3000);
    }

    /**
     * 에러 메시지 표시
     * @param {string} message
     */
    showError(message) {
        const toast = DOM.create('div', {
            class: 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50',
            style: { animation: 'slideInRight 0.3s ease-out' }
        }, message);

        document.body.appendChild(toast);

        setTimeout(() => {
            DOM.fadeOut(toast, 300, () => {
                DOM.remove(toast);
            });
        }, 5000);
    }

    /**
     * 로딩 표시
     * @param {boolean} show
     */
    showLoading(show) {
        let loader = DOM.id('global-loader');
        
        if (show && !loader) {
            loader = DOM.create('div', {
                id: 'global-loader',
                class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
            }, `
                <div class="bg-white rounded-lg p-8 text-center">
                    <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                    <p class="text-gray-700">처리 중입니다...</p>
                </div>
            `);
            loader.innerHTML = `
                <div class="bg-white rounded-lg p-8 text-center">
                    <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                    <p class="text-gray-700">처리 중입니다...</p>
                </div>
            `;
            document.body.appendChild(loader);
        } else if (!show && loader) {
            DOM.remove(loader);
        }
    }

    /**
     * 이미지 설정 로드
     */
    loadImageSettings() {
        const saved = Storage.get('imageSettings');
        if (saved) {
            this.imageSettings = { ...DEFAULT_IMAGE_SETTINGS, ...saved };
        }
    }

    /**
     * 이미지 설정 저장
     */
    saveImageSettings() {
        Storage.set('imageSettings', this.imageSettings);
    }

    /**
     * 현재 동화책 가져오기
     * @returns {Storybook|null}
     */
    getCurrentStorybook() {
        return this.currentStorybook;
    }

    /**
     * 현재 동화책 설정
     * @param {Storybook} storybook
     */
    setCurrentStorybook(storybook) {
        this.currentStorybook = storybook;
    }
}

// 싱글톤 인스턴스 생성
const editorController = new EditorController();

// 전역으로 export
if (typeof window !== 'undefined') {
    window.EditorController = EditorController;
    window.editorController = editorController;
}
