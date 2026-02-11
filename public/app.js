/**
 * app.js - 탱고북 동화책 생성 에디터
 * 리팩토링: 모듈 통합 버전
 */

// ============================================
// 모듈 Import (author.html에서 전역으로 로드)
// ============================================

// author.html에서 로드한 모듈 사용
// 전역 변수로 이미 로드됨 (window.api, window.imageService 등)

// 로그로 모듈 로드 확인
if (window.api) {
    console.log('✅ app.js: 모듈 연결 성공');
    console.log('📦 로드된 모듈:', {
        api: !!window.api,
        Storage: !!window.Storage,
        audioPlayer: !!window.audioPlayer,
        DOM: !!window.DOM,
        storyService: !!window.storyService,
        imageService: !!window.imageService,
        ttsService: !!window.ttsService
    });
    
    // IIFE로 감싸서 지역 변수 사용 (전역 충돌 방지)
    (function() {
        // 지역 변수로 alias 생성
        const api = window.api;
        const Storage = window.Storage;
        const audioPlayer = window.audioPlayer;
        const DOM = window.DOM;
        const UIHelper = window.UIHelper;
        const storyService = window.storyService;
        const imageService = window.imageService;
        const ttsService = window.ttsService;
        
        // StorybookManager 초기화
        const storybookManager = new window.StorybookManager({
            api,
            storage: Storage,
            storyService
        });
        
        // PageManager 초기화
        const pageManager = new window.PageManager({
            storybookManager
        });
        
        // CharacterManager 초기화
        const characterManager = new window.CharacterManager({
            api,
            storybookManager
        });
        
        // QuizService 초기화
        const quizService = new window.QuizService();
        quizService.init({ api });
        
        // MusicService 초기화
        const musicService = new window.MusicService();
        musicService.init({ api });
        
        // TranslationService 초기화
        const translationService = new window.TranslationService();
        translationService.init({ api });
        
        // DownloadService 초기화
        const downloadService = new window.DownloadService();
        downloadService.init({ api });
        
        // SettingsService 초기화
        const settingsService = new window.SettingsService();
        settingsService.init();
        
        // ValidationService 초기화
        const validationService = new window.ValidationService();
        validationService.init();
        
        // CoverService 초기화
        const coverService = window.coverService;
        
        // UploadService 초기화
        const uploadService = window.uploadService;

// ============================================
// 전역 변수
// ============================================
let storybooks = [];
let folders = []; // 폴더 목록 { id, name, storybookIds: [] }
let currentStorybook = null;
window.currentLanguage = 'ko'; // 현재 표시 중인 언어 (기본: 한국어) - 전역으로 노출
let backgroundMusicList = []; // 배경음악 목록
// imageSettings는 이제 settingsService.settings로 대체됨
let imageSettings = settingsService.getSettings();

// ============================================
// 공통 헬퍼 함수
// ============================================

/**
 * 로딩 UI 표시
 */
function showLoadingUI(element, message = 'AI가 작업 중...') {
    if (!element) return;
    element.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-3">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
            <p class="text-white text-sm font-semibold">${message}</p>
            <p class="text-white text-xs opacity-75 mt-1">실패 시 자동으로 재시도합니다</p>
        </div>
    `;
}

/**
 * 에러 UI 표시
 */
function showErrorUI(element, error) {
    if (!element) return;
    const errorMsg = error?.message || error || '알 수 없는 오류';
    element.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-3 bg-red-50">
            <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-2"></i>
            <p class="text-red-700 text-sm font-semibold text-center">${errorMsg}</p>
        </div>
    `;
}

/**
 * 동화책 저장 (간편 래퍼)
 */
async function saveCurrentStorybook() {
    try {
        // StorybookManager 사용
        await storybookManager.saveCurrentStorybook(currentStorybook);
        return true;
    } catch (error) {
        console.error('❌ 동화책 저장 실패:', error);
        return false;
    }
}

/**
 * 이미지 히스토리 관리 (최대 10개 유지)
 */
function manageImageHistory(historyArray, newImageUrl, oldImageUrl) {
    if (!historyArray) return [];
    
    // 기존 이미지가 있으면 히스토리에 추가
    if (oldImageUrl) {
        historyArray.unshift(oldImageUrl);
        
        // 10개 초과 시 가장 오래된 이미지 삭제
        if (historyArray.length > 10) {
            const oldestImageUrl = historyArray[10];
            
            // 서버에 삭제 요청 (비동기, 실패해도 계속 진행)
            if (oldestImageUrl && oldestImageUrl.includes('r2.dev')) {
                axios.delete('/api/cleanup-image', {
                    data: { imageUrl: oldestImageUrl }
                }).catch(err => {
                    console.warn('⚠️ 히스토리 이미지 삭제 실패:', err.message);
                });
            }
            
            // 배열에서 제거
            historyArray = historyArray.slice(0, 10);
            console.log('🗑️ 오래된 히스토리 이미지 정리 완료');
        }
    }
    
    return historyArray;
}

/**
 * 프로그레스 바 업데이트
 */
function updateProgressBar(percentage, message = '') {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText && message) {
        progressText.textContent = message;
    }
}

// ============================================
// 버튼 로딩 상태 관리 유틸리티
// ============================================

/**
 * 버튼을 로딩 상태로 변경
 * @param {HTMLElement|string} button - 버튼 요소 또는 ID
 * @param {string} loadingText - 로딩 중 표시할 텍스트
 */
function setButtonLoading(button, loadingText = '처리 중...') {
    const btn = typeof button === 'string' ? document.getElementById(button) : button;
    if (!btn) return;
    
    // 원래 내용 저장
    if (!btn.dataset.originalContent) {
        btn.dataset.originalContent = btn.innerHTML;
    }
    
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`;
}

/**
 * 버튼 로딩 상태 해제
 * @param {HTMLElement|string} button - 버튼 요소 또는 ID
 */
function resetButtonLoading(button) {
    const btn = typeof button === 'string' ? document.getElementById(button) : button;
    if (!btn) return;
    
    btn.disabled = false;
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
    
    if (btn.dataset.originalContent) {
        btn.innerHTML = btn.dataset.originalContent;
        delete btn.dataset.originalContent;
    }
}

/**
 * 여러 버튼을 로딩 상태로 변경
 * @param {string} selector - CSS 선택자
 * @param {string} loadingText - 로딩 중 표시할 텍스트
 */
function setButtonsLoading(selector, loadingText = '처리 중...') {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => setButtonLoading(btn, loadingText));
}

/**
 * 여러 버튼 로딩 상태 해제
 * @param {string} selector - CSS 선택자
 */
function resetButtonsLoading(selector) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => resetButtonLoading(btn));
}

// ============================================
// API 키 및 모델 설정
// ============================================
// API 키 가져오기 함수
function getAPIKey() {
    // localStorage에서 커스텀 API 키 확인
    const customApiKey = localStorage.getItem('gemini_api_key');
    if (customApiKey && customApiKey.trim()) {
        return customApiKey.trim();
    }
    
    // gemini-client.js의 전역 변수 확인
    if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY) {
        return GEMINI_API_KEY;
    }
    
    // 기본값 없음
    return null;
}

// 이미지 모델 목록 (이미지 생성 전용)
const IMAGE_MODELS = [
    { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro (Gemini 3 Pro) ⭐', description: '최고 품질, 네이티브 이미지 생성, 최대 14개 참조 이미지 지원' },
    { value: 'imagen-4', label: 'Imagen 4', description: 'Google 전문 이미지 생성 모델, 텍스트 렌더링 우수' }
];

// TTS 모델 목록 (Gemini TTS Voices)
const TTS_MODELS = [
    { value: 'Aoede', label: 'Aoede ⭐', description: '우아하고 부드러운 여성 목소리 (권장)' },
    { value: 'Kore', label: 'Kore', description: '밝고 경쾌한 여성 목소리' },
    { value: 'Puck', label: 'Puck', description: '명랑하고 활기찬 남성 목소리' },
    { value: 'Charon', label: 'Charon', description: '깊고 안정적인 남성 목소리' },
    { value: 'Fenrir', label: 'Fenrir', description: '차분하고 따뜻한 남성 목소리' }
];

// 모델 선택 HTML 생성 함수
function createModelSelect(sectionName, currentModel, onChangeFunction) {
    const modelOptions = IMAGE_MODELS.map(model => 
        `<option value="${model.value}" ${currentModel === model.value ? 'selected' : ''}>${model.label}</option>`
    ).join('');
    
    return `
        <div class="flex items-center gap-2">
            <i class="fas fa-robot text-gray-600"></i>
            <select 
                id="${sectionName}-model-select"
                onchange="${onChangeFunction}"
                class="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
                ${modelOptions}
            </select>
        </div>
    `;
}

// 캐릭터 레퍼런스 모델 변경
function updateCharacterModel(value) {
    imageSettings.characterModel = value;
    saveImageSettings();
    console.log('✅ 캐릭터 레퍼런스 모델 변경:', value);
}

// Key Object 모델 변경
function updateKeyObjectModel(value) {
    imageSettings.keyObjectModel = value;
    saveImageSettings();
    console.log('✅ Key Object 모델 변경:', value);
}

// 페이지 삽화 모델 변경
function updateIllustrationModel(value) {
    imageSettings.illustrationModel = value;
    saveImageSettings();
    console.log('✅ 페이지 삽화 모델 변경:', value);
}

// 8단어 학습 모델 변경
function updateVocabularyModel(value) {
    imageSettings.vocabularyModel = value;
    saveImageSettings();
    console.log('✅ 8단어 학습 모델 변경:', value);
}

// 표지 이미지 모델 변경
// ===== 표지 관련 함수들 (CoverGenerator로 위임) =====

function updateCoverModel(value) {
    window.coverGenerator?.updateModel(value);
}

function buildCoverPrompt(storybook) {
    return CoverGenerator.buildCoverPrompt(storybook);
}

function resetCoverPrompt() {
    window.coverGenerator?.resetPrompt();
}

function toggleCoverCharacterRef(charIndex, checked) {
    window.coverGenerator?.toggleCharacterRef(charIndex, checked);
}

// TTS 모델 선택 HTML 생성 (설명 포함)
function createTTSModelSelect(currentModel, pageIndex) {
    const modelOptions = TTS_MODELS.map(model => 
        `<option value="${model.value}" data-description="${model.description}" ${currentModel === model.value ? 'selected' : ''}>${model.label} - ${model.description}</option>`
    ).join('');
    
    // 현재 선택된 모델의 설명 찾기
    const currentModelInfo = TTS_MODELS.find(m => m.value === currentModel);
    const description = currentModelInfo ? currentModelInfo.description : '';
    
    return `
        <div class="flex flex-col gap-1.5">
            <select 
                id="tts-model-select-${pageIndex}"
                onchange="updatePageTTSModelDescription(${pageIndex}, this.value)"
                class="text-xs md:text-sm border-2 border-blue-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
                ${modelOptions}
            </select>
            <p id="tts-model-desc-${pageIndex}" class="text-[10px] md:text-xs text-gray-600 italic bg-blue-50 p-2 rounded border border-blue-200">
                <i class="fas fa-info-circle mr-1 text-blue-500"></i>${description}
            </p>
        </div>
    `;
}

// TTS 모델 변경
function updateTTSModel(value) {
    imageSettings.ttsModel = value;
    saveImageSettings();
    console.log('✅ TTS 모델 변경:', value);
}

// TTS 모델 설명 업데이트 (설정 모달용)
function updateTTSModelDescription(value) {
    const modelInfo = TTS_MODELS.find(m => m.value === value);
    const descElement = document.getElementById('ttsModelDescription');
    if (descElement && modelInfo) {
        descElement.innerHTML = `<i class="fas fa-info-circle mr-1 text-teal-500"></i>${modelInfo.description}`;
    }
}


// TTS 음성 설정 변경
function updateTTSVoiceConfig(value) {
    imageSettings.ttsVoiceConfig = value;
    saveImageSettings();
    console.log('✅ TTS 음성 설정 변경:', value);
}

// 페이지 TTS 생성
async function generatePageTTS(pageIndex) {
    // ✅ TTSGenerator 사용 (generateAllTTS와 동일)
    const generator = new TTSGenerator({
        storybook: currentStorybook,
        ttsService: ttsService || window.ttsService,
        imageSettings: imageSettings,
        language: window.currentLanguage,
        saveCallback: saveCurrentStorybook,
        updateCallback: () => displayStorybook(currentStorybook)
    });

    try {
        await generator.generate(pageIndex);
    } catch (error) {
        console.error('TTS 생성 실패:', error);
        showNotification('error', 'TTS 생성 실패', error.message);
    }
}

function openCoverUploadModal() {
    coverService.openCoverUploadModal();
}

function closeCoverUploadModal() {
    coverService.closeCoverUploadModal();
}

function switchCoverUploadTab(tab) {
    coverService.switchCoverUploadTab(tab);
}

async function uploadCover() {
    await coverService.uploadCover(currentStorybook, saveCurrentStorybook, displayStorybook);
}

/**
 * 표지 이미지 생성 (CoverGenerator 사용)
 */
async function generateCoverImage() {
    // 글로벌 CoverGenerator 인스턴스 생성 및 저장
    window.coverGenerator = new CoverGenerator({
        storybook: currentStorybook,
        imageService: imageService || window.imageService,
        imageSettings: imageSettings,
        saveCallback: saveCurrentStorybook,
        updateCallback: () => displayStorybook(currentStorybook)
    });

    return await window.coverGenerator.generate();
}

function selectCoverImageFromHistory(historyIndex) {
    window.coverGenerator?.selectFromHistory(historyIndex);
}

function selectCoverFromHistory(historyIndex) {
    window.coverGenerator?.selectFromHistory(historyIndex);
}

function updateCoverImageDisplay() {
    coverService.updateCoverImageDisplay(currentStorybook);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    loadImageSettings();
    await loadStorybooks(); // R2에서 불러올 때까지 대기
    renderBookList();
    
    // 모든 버튼 이벤트 리스너 등록
    const generateBtn = document.getElementById('generateStorybookBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateStorybook);
    }
    
    const showCreateFormBtn = document.getElementById('showCreateFormBtn');
    if (showCreateFormBtn) {
        showCreateFormBtn.addEventListener('click', showCreateForm);
    }
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }
    
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', openSettings);
    }
    
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }
    
    const executeRegenerateBtn = document.getElementById('executeRegenerateBtn');
    if (executeRegenerateBtn) {
        executeRegenerateBtn.addEventListener('click', executeRegenerate);
    }
    
    const closeRegenerateModalBtn = document.getElementById('closeRegenerateModalBtn');
    if (closeRegenerateModalBtn) {
        closeRegenerateModalBtn.addEventListener('click', closeRegenerateModal);
    }
    
    // 삽화 업로드 모달 이벤트
    const uploadIllustrationBtn = document.getElementById('uploadIllustrationBtn');
    if (uploadIllustrationBtn) {
        uploadIllustrationBtn.addEventListener('click', executeIllustrationUpload);
    }
    
    const closeIllustrationUploadModalBtn = document.getElementById('closeIllustrationUploadModalBtn');
    if (closeIllustrationUploadModalBtn) {
        closeIllustrationUploadModalBtn.addEventListener('click', closeIllustrationUploadModal);
    }
    
    // 모달 배경 클릭 시 닫기
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                closeSettings();
            }
        });
    }
    
    const regenerateModal = document.getElementById('regenerateModal');
    if (regenerateModal) {
        regenerateModal.addEventListener('click', (event) => {
            if (event.target === regenerateModal) {
                closeRegenerateModal();
            }
        });
    }
    
    const illustrationUploadModal = document.getElementById('illustrationUploadModal');
    if (illustrationUploadModal) {
        illustrationUploadModal.addEventListener('click', (event) => {
            if (event.target === illustrationUploadModal) {
                closeIllustrationUploadModal();
            }
        });
    }
});

// 모바일 사이드바 토글 함수
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
}

// 섹션 토글 함수
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const icon = document.getElementById(sectionId + '-icon');
    
    // 요소가 없으면 무시
    if (!content || !icon) {
        console.warn(`Section ${sectionId} not found`);
        return;
    }
    
    if (content.classList.contains('hidden')) {
        // 섹션 열기
        content.classList.remove('hidden');
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
    } else {
        // 섹션 닫기
        content.classList.add('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    }
}

// 페이지별 참조 섹션 토글
function togglePageSection(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const icon = document.getElementById(sectionId + '-icon');
    
    // 요소가 없으면 무시
    if (!content || !icon) {
        console.warn(`Page section ${sectionId} not found`);
        return;
    }
    
    if (content.classList.contains('hidden')) {
        // 섹션 열기
        content.classList.remove('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        // 섹션 닫기
        content.classList.add('hidden');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// 이미지 설정 관련 함수
// 설정 관련 함수들은 SettingsService로 이동됨
function loadImageSettings() {
    settingsService.loadSettings();
    imageSettings = settingsService.getSettings();
}

function saveImageSettings() {
    settingsService.saveSettings();
}

function openSettings() {
    settingsService.openSettingsModal();
}

function closeSettings(event) {
    settingsService.closeSettingsModal(event);
}

function saveSettings() {
    settingsService.saveSettingsFromUI();
    imageSettings = settingsService.getSettings(); // 동기화
}

function resetSettings() {
    settingsService.resetSettings();
    imageSettings = settingsService.getSettings(); // 동기화
}

// 스토리북 관리
async function loadStorybooks() {
    console.log('🔧 loadStorybooks() 시작');
    
    try {
        // StorybookManager 사용
        const books = await storybookManager.loadStorybooks();
        storybooks = books;
        storybookManager.storybooks = storybooks; // 동기화
        
        // 폴더 로드
        await loadFolders();
        
        // 화면 업데이트
        console.log('🎨 화면 업데이트 중...');
        renderBookList();
        console.log('✅ 화면 업데이트 완료');
    } catch (error) {
        console.error('❌ 동화책 로드 실패:', error);
    }
    
    console.log('🏁 loadStorybooks() 완료. 총 동화책:', storybooks.length, '권');
}

async function loadFolders() {
    try {
        const response = await axios.get('/api/folders');
        if (response.data.success) {
            folders = response.data.folders || [];
            console.log('📁 폴더 로드 완료:', folders.length, '개');
        }
    } catch (error) {
        console.log('📁 폴더 파일 없음 (첫 실행)');
        folders = [];
    }
}

async function saveFolders() {
    try {
        const response = await axios.post('/api/folders', { folders });
        if (response.data.success) {
            console.log('✅ 폴더 저장 완료');
        }
    } catch (error) {
        console.error('❌ 폴더 저장 실패:', error);
    }
}

function saveStorybooks() {
    // ❌ localStorage 완전 비활성화
    // R2만 사용하므로 localStorage 저장 불필요
    console.log('ℹ️ localStorage 저장 비활성화됨 (R2만 사용)');
}

function renderBookList() {
    console.log('📋 renderBookList 호출 - 동화책 개수:', storybooks.length);
    
    // 필터 적용 (검색 및 카테고리 필터 포함)
    applyBookFilters();
}

function selectStorybook(id) {
    const book = storybookManager.selectStorybook(id, (book) => {
        currentStorybook = book;
        window.currentStorybook = book; // 전역 참조 업데이트
        displayStorybook(book);
        renderBookList();
        document.getElementById('createForm').style.display = 'none';
        // 모바일에서 사이드바 자동 닫기
        closeMobileSidebar();
    });
    
    if (book) {
        currentStorybook = book;
        window.currentStorybook = book; // 전역 참조 업데이트
        storybookManager.currentStorybook = book; // 동기화
    }
}

async function deleteStorybook(id) {
    // 동화책 정보 가져오기
    const storybook = storybooks.find(b => b.id === id);
    const title = storybook ? storybook.title : '이 동화책';
    
    try {
        // StorybookManager 사용
        const deleted = await storybookManager.deleteStorybook(id, title);
        
        if (deleted) {
            // 메모리 동기화
            storybooks = storybookManager.storybooks;
            
            // 화면 업데이트
            saveStorybooks();
            renderBookList();
            
            // 현재 선택된 동화책이면 화면 리셋
            if (currentStorybook && currentStorybook.id === id) {
                currentStorybook = null;
                storybookManager.currentStorybook = null;
                document.getElementById('storybookResult').classList.add('hidden');
                document.getElementById('createForm').style.display = 'block';
            }
            
            showNotification('success', `"${title}"이(가) 삭제되었습니다.`);
        }
    } catch (error) {
        console.error('❌ 삭제 오류:', error);
        showNotification('error', '동화책 삭제에 실패했습니다.');
    }
}

// 동화책 제목 업데이트 (사이드바)
async function updateBookTitleInList(id, newTitle) {
    if (!newTitle.trim()) {
        showNotification('warning', '제목을 입력해주세요.');
        renderBookList();
        return;
    }
    
    const book = storybooks.find(b => b.id === id);
    if (!book) return;
    
    const oldTitle = book.title;
    book.title = newTitle.trim();
    
    // 현재 열려있는 동화책이면 업데이트
    if (currentStorybook && currentStorybook.id === id) {
        currentStorybook.title = newTitle.trim();
        displayStorybook(currentStorybook);
    }
    
    saveStorybooks();
    
    // R2에도 업데이트
    try {
        console.log(`💾 R2에 제목 변경 저장: "${oldTitle}" → "${newTitle.trim()}"`);
        await saveToR2(book);
        console.log(`✅ R2 저장 완료`);
    } catch (error) {
        console.error('❌ R2 저장 오류:', error);
    }
    
    console.log(`✅ 제목 변경: "${oldTitle}" → "${newTitle.trim()}"`);
    showNotification('success', '제목이 저장되었습니다!');
}

// ============================================
// 폴더 관리
// ============================================

function createFolder() {
    const name = prompt('폴더 이름을 입력하세요:');
    if (!name || !name.trim()) return;
    
    const folder = {
        id: Date.now().toString(),
        name: name.trim(),
        storybookIds: [],
        createdAt: new Date().toISOString()
    };
    
    folders.push(folder);
    saveFolders();
    renderBookList();
    showNotification('success', '폴더 생성 완료', `"${folder.name}" 폴더가 생성되었습니다.`);
}

function renameFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const newName = prompt('새 폴더 이름을 입력하세요:', folder.name);
    if (!newName || !newName.trim()) return;
    
    folder.name = newName.trim();
    saveFolders();
    renderBookList();
    showNotification('success', '폴더 이름 변경', `"${folder.name}"로 변경되었습니다.`);
}

function deleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const bookCount = folder.storybookIds.length;
    const message = bookCount > 0 
        ? `"${folder.name}" 폴더를 삭제하시겠습니까?\n\n폴더 안의 ${bookCount}개 동화책은 삭제되지 않고 목록으로 이동됩니다.`
        : `"${folder.name}" 폴더를 삭제하시겠습니까?`;
    
    if (!confirm(message)) return;
    
    folders = folders.filter(f => f.id !== folderId);
    saveFolders();
    renderBookList();
    showNotification('success', '폴더 삭제 완료', `"${folder.name}" 폴더가 삭제되었습니다.`);
}

function toggleFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    folder.isOpen = !folder.isOpen;
    renderBookList();
}

function addBookToFolder(bookId, folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    // 다른 폴더에서 제거
    folders.forEach(f => {
        f.storybookIds = f.storybookIds.filter(id => id !== bookId);
    });
    
    // 현재 폴더에 추가
    if (!folder.storybookIds.includes(bookId)) {
        folder.storybookIds.push(bookId);
    }
    
    saveFolders();
    renderBookList();
}

function removeBookFromFolder(bookId, folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    folder.storybookIds = folder.storybookIds.filter(id => id !== bookId);
    saveFolders();
    renderBookList();
}

// 드래그 앤 드롭 관련 변수
let draggedElement = null;
let draggedIndex = null;
let draggedBookId = null; // 드래그 중인 동화책 ID
let draggedType = null; // 'book' 또는 'folder'
let isDragging = false; // 드래그 중 플래그

// 전역으로 노출 (HTML 인라인 이벤트에서 사용)
window.draggedBookId = null;

// 드래그 시작
function handleDragStart(e) {
    draggedElement = e.currentTarget;
    
    // 페이지 드래그인지 동화책 드래그인지 확인
    if (e.currentTarget.dataset.pageIndex !== undefined) {
        draggedIndex = parseInt(e.currentTarget.dataset.pageIndex);
        draggedType = 'page';
        console.log('🖐️ 페이지 드래그 시작:', draggedIndex);
    } else {
        draggedIndex = parseInt(e.currentTarget.dataset.bookIndex);
        draggedBookId = e.currentTarget.dataset.bookId;
        window.draggedBookId = draggedBookId; // 전역 참조 업데이트
        draggedType = 'book';
        console.log('🖐️ 동화책 드래그 시작:', draggedIndex);
    }
    
    isDragging = true; // 드래그 시작
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

// 드래그 오버
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// 드래그 진입
function handleDragEnter(e) {
    if (e.currentTarget !== draggedElement) {
        e.currentTarget.classList.add('border-purple-500', 'bg-purple-50');
    }
}

// 드래그 떠남
function handleDragLeave(e) {
    e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
}

// 드롭
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    if (draggedElement !== e.currentTarget) {
        if (draggedType === 'page') {
            // 페이지 순서 변경
            const targetIndex = parseInt(e.currentTarget.dataset.pageIndex);
            
            if (!currentStorybook || !currentStorybook.pages) {
                console.error('❌ 현재 동화책이 없습니다');
                return false;
            }
            
            const draggedPage = currentStorybook.pages[draggedIndex];
            if (draggedPage) {
                currentStorybook.pages.splice(draggedIndex, 1);
                currentStorybook.pages.splice(targetIndex, 0, draggedPage);
                
                console.log(`✅ 페이지 순서 변경: ${draggedIndex + 1} → ${targetIndex + 1}`);
                
                saveCurrentStorybook();
                displayStorybook(currentStorybook);
                
                showNotification('success', '페이지 순서가 변경되었습니다!');
            }
        } else {
            // 동화책 순서 변경
            const targetIndex = parseInt(e.currentTarget.dataset.bookIndex);
            
            // undefined/null 항목 제거
            storybooks = storybooks.filter(b => b && b.id);
            
            // 배열에서 순서 변경
            const draggedBook = storybooks[draggedIndex];
            if (draggedBook && draggedBook.id) {
                storybooks.splice(draggedIndex, 1);
                storybooks.splice(targetIndex, 0, draggedBook);
                
                console.log(`✅ 동화책 순서 변경: ${draggedIndex} → ${targetIndex}`);
                
                saveStorybooks();
                renderBookList();
                
                showNotification('success', '순서가 변경되었습니다!');
            }
        }
    }
    
    e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
    return false;
}

// 드래그 종료
function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    isDragging = false; // 드래그 종료
    
    // 모든 요소의 하이라이트 제거
    if (draggedType === 'page') {
        document.querySelectorAll('[data-page-index]').forEach(item => {
            item.classList.remove('border-purple-500', 'bg-purple-50');
        });
    } else {
        document.querySelectorAll('.book-item').forEach(item => {
            item.classList.remove('border-purple-500', 'bg-purple-50');
        });
    }
    
    draggedElement = null;
    draggedIndex = null;
    draggedBookId = null; // 드래그 중인 동화책 ID 초기화
    window.draggedBookId = null; // 전역 참조 초기화
    draggedType = null;
}

// 동화책 제목 업데이트 (메인 페이지)
function updateStorybookTitle(newTitle) {
    if (!currentStorybook || !newTitle.trim()) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    const oldTitle = currentStorybook.title;
    currentStorybook.title = newTitle.trim();
    
    // storybooks 배열에서도 업데이트
    const index = storybooks.findIndex(b => b.id === currentStorybook.id);
    if (index !== -1) {
        storybooks[index].title = newTitle.trim();
    }
    
    saveStorybooks();
    renderBookList();
    
    console.log(`✅ 제목 변경: "${oldTitle}" → "${newTitle.trim()}"`);
    
    // 제목 업데이트 알림
    showNotification('success', '제목이 저장되었습니다!');
}

// 뷰어 공개 상태 변경
async function togglePublicStatus(storybookId, isPublicOverride = null) {
    // 체크박스가 있으면 읽고, 없으면 파라미터 사용
    const checkbox = document.getElementById(`public-${storybookId}`);
    const isPublic = isPublicOverride !== null ? isPublicOverride : (checkbox ? checkbox.checked : false);
    
    try {
        console.log(`🔄 Toggling public status for ${storybookId}: ${isPublic}`);
        
        const response = await axios.put(
            `/api/storybooks/${storybookId}/public`,
            { isPublic: isPublic },
            {
                headers: {
                    'X-API-Key': getAPIKey()
                }
            }
        );
        
        if (response.data.success) {
            // storybooks 배열에서도 업데이트
            const storybook = storybooks.find(b => b.id === storybookId);
            if (storybook) {
                storybook.isPublic = isPublic;
                storybook.publishedAt = response.data.publishedAt;
            }
            
            // currentStorybook도 업데이트
            if (currentStorybook && currentStorybook.id === storybookId) {
                currentStorybook.isPublic = isPublic;
                currentStorybook.publishedAt = response.data.publishedAt;
            }
            
            // 목록 다시 렌더링
            renderBookList();
            
            // 알림 표시
            showNotification(
                'success',
                isPublic 
                    ? '✅ 동화책이 뷰어에 공개되었습니다!' 
                    : 'ℹ️ 동화책이 비공개로 전환되었습니다.'
            );
        }
    } catch (error) {
        console.error('❌ 공개 상태 변경 실패:', error);
        
        // 체크박스 원상복구
        if (checkbox) {
            checkbox.checked = !isPublic;
        }
        
        showNotification(
            'error',
            '❌ 공개 상태 변경에 실패했습니다: ' + (error.response?.data?.error || error.message)
        );
    }
}

// 동화책 복사 (현재 동화책)
function duplicateStorybook() {
    if (!currentStorybook) {
        alert('복사할 동화책이 없습니다.');
        return;
    }
    duplicateStorybookById(currentStorybook.id);
}

// ID로 동화책 복사 (사이드바에서 호출)
async function duplicateStorybookById(id) {
    try {
        // StorybookManager 사용
        const duplicate = await storybookManager.duplicateStorybook(id);
        
        if (duplicate) {
            // 메모리 동기화
            storybooks = storybookManager.storybooks;
            
            // 화면 업데이트
            saveStorybooks();
            renderBookList();
            
            // 새 동화책 선택
            selectStorybook(duplicate.id);
            
            showNotification('success', '동화책 복사 완료', `"${duplicate.title}"이(가) 생성되었습니다.`);
        }
    } catch (error) {
        console.error('❌ 복사 오류:', error);
        showNotification('error', '동화책 복사에 실패했습니다.');
    }
}

// 알림 표시 함수
function showNotification(type, title, message) {
    const colors = {
        success: 'bg-green-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500'
    };
    
    const icons = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in max-w-sm`;
    notification.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="fas ${icons[type] || icons.info} text-xl mt-0.5"></i>
            <div>
                <strong class="block">${title}</strong>
                ${message ? `<span class="text-sm block mt-1">${message}</span>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 모달 표시 함수
function showModal(title, content) {
    // 기존 모달 제거
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 class="text-2xl font-bold text-gray-800">${title}</h2>
                <button 
                    onclick="document.getElementById('custom-modal').remove()"
                    class="text-gray-400 hover:text-gray-600 transition"
                >
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="px-6 py-6">
                ${content}
            </div>
            <div class="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end rounded-b-2xl border-t border-gray-200">
                <button 
                    onclick="document.getElementById('custom-modal').remove()"
                    class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                    닫기
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 그림체 선택 변경 핸들러
function handleArtStyleChange() {
    const select = document.getElementById('artStyleSelect');
    const customInput = document.getElementById('artStyleCustom');
    
    if (select.value === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
}

function showCreateForm() {
    document.getElementById('createForm').style.display = 'block';
    document.getElementById('storybookResult').classList.add('hidden');
    currentStorybook = null;
    renderBookList();
    // 모바일에서 사이드바 자동 닫기
    closeMobileSidebar();
}

// 동화책 생성
async function generateStorybook() {
    const title = document.getElementById('bookTitle').value.trim();
    const targetAge = document.getElementById('targetAge').value;
    const totalPages = parseInt(document.getElementById('totalPages').value) || 0; // 0 = AI 자동 결정
    const geminiModel = document.getElementById('geminiModel').value; // AI 모델 선택
    const artStyleSelect = document.getElementById('artStyleSelect').value;
    const artStyleCustom = document.getElementById('artStyleCustom').value.trim();
    const referenceContent = document.getElementById('referenceContent').value.trim();
    
    // 언어는 무조건 한국어만 (UI에서 제거됨)
    const selectedLanguages = ['ko'];
    
    // 이미지 AI 모델은 기본값 사용 (UI에서 제거됨)
    // imageSettings.imageModel은 기존 값 유지
    
    // 그림체 결정: custom이면 직접 입력값 사용, 아니면 선택값 사용
    const artStyle = artStyleSelect === 'custom' ? artStyleCustom : artStyleSelect;

    if (!title) {
        alert('동화책 제목을 입력해주세요.');
        return;
    }
    
    if (artStyleSelect === 'custom' && !artStyleCustom) {
        alert('그림체를 입력해주세요.');
        return;
    }
    
    // 페이지 수 검증 (0은 자동, 1-30은 사용자 지정)
    if (totalPages < 0 || totalPages > 30) {
        alert('페이지 수는 0(자동) 또는 1-30 사이여야 합니다.');
        return;
    }

    document.getElementById('createForm').style.display = 'none';
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('storybookResult').classList.add('hidden');

    try {
        const response = await axios.post('/api/generate-storybook', {
            title,
            targetAge,
            totalPages,
            geminiModel, // AI 모델 전달
            artStyle,
            languages: selectedLanguages, // 선택된 언어 전달
            referenceContent: referenceContent || null
        });

        if (response.data.success) {
            // 동화책 데이터 준비
            const tempStorybook = response.data.storybook;
            tempStorybook.languages = selectedLanguages;
            
            console.log('✅ 동화책 생성 성공:', tempStorybook.title);
            console.log('📝 선택된 언어:', selectedLanguages);
            
            // 생성 폼 숨기기
            document.getElementById('createForm').style.display = 'none';
            
            // Review 모달 열기
            openReviewModal(tempStorybook);
        } else {
            alert(response.data.error || '동화책 생성에 실패했습니다.');
            document.getElementById('createForm').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = '동화책 생성 중 오류가 발생했습니다.';
        
        if (error.response && error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        alert(errorMessage + '\n\n잠시 후 다시 시도해주세요.');
        document.getElementById('createForm').style.display = 'block';
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

// 사용 가능한 언어 목록 가져오기
function getAvailableLanguages() {
    if (!currentStorybook) return ['ko'];
    
    const langs = new Set(['ko']); // 한국어는 기본
    
    // languages 배열에서 가져오기
    if (currentStorybook.languages && Array.isArray(currentStorybook.languages)) {
        currentStorybook.languages.forEach(lang => langs.add(lang));
    }
    
    // translations 객체에서 가져오기
    if (currentStorybook.translations && typeof currentStorybook.translations === 'object') {
        Object.keys(currentStorybook.translations).forEach(lang => langs.add(lang));
    }
    
    return Array.from(langs);
}

// 언어 추가 드롭다운 토글
function toggleAddLanguageDropdown() {
    const dropdown = document.getElementById('add-language-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// 탭에서 언어 추가
async function addLanguageFromTab(targetLang) {
    // 드롭다운 닫기
    const dropdown = document.getElementById('add-language-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
    
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    // 이미 번역된 언어인지 확인
    const available = getAvailableLanguages();
    if (available.includes(targetLang)) {
        alert('이미 해당 언어로 번역되어 있습니다.');
        return;
    }
    
    const langNames = {
        en: 'English',
        zh: '中文',
        ja: '日本語',
        es: 'Español',
        fr: 'Français'
    };
    
    const langName = langNames[targetLang] || targetLang;
    
    if (!confirm(`${langName} 언어를 추가하시겠습니까?\n\n빈 페이지가 생성되고, 각 페이지별로 개별 번역할 수 있습니다.`)) {
        return;
    }
    
    // 1. 즉시 빈 페이지 생성
    if (!currentStorybook.translations) {
        currentStorybook.translations = {};
    }
    
    // 빈 텍스트로 페이지 초기화
    currentStorybook.translations[targetLang] = currentStorybook.pages.map(page => ({
        pageNumber: page.pageNumber,
        text: ''  // 빈 텍스트
    }));
    
    // languages 배열 업데이트
    if (!currentStorybook.languages) {
        currentStorybook.languages = ['ko'];
    }
    if (!currentStorybook.languages.includes(targetLang)) {
        currentStorybook.languages.push(targetLang);
    }
    
    // 저장
    saveCurrentStorybook();
    
    // 새 언어로 전환
    window.currentLanguage = targetLang;
    
    // UI 업데이트
    displayStorybook(currentStorybook);
    
    alert(`✅ ${langName} 언어가 추가되었습니다!\n\n각 페이지의 [번역] 버튼을 눌러 개별 번역하세요.`);
}

// 언어 추가 및 번역
async function addLanguageTranslation() {
    const selectEl = document.getElementById('add-language-select');
    const targetLang = selectEl.value;
    
    if (!targetLang) {
        alert('번역할 언어를 선택해주세요.');
        return;
    }
    
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    // 이미 번역된 언어인지 확인
    const available = translationService.getAvailableLanguages(currentStorybook);
    if (available.includes(targetLang)) {
        alert('이미 해당 언어로 번역되어 있습니다.');
        return;
    }
    
    const langName = translationService.getLanguageName(targetLang);
    const estimatedTime = Math.ceil(currentStorybook.pages.length * 2);
    
    if (!confirm(`${langName}로 번역하시겠습니까?\n\n예상 소요 시간: 약 ${estimatedTime}초\n${currentStorybook.pages.length}개 페이지의 텍스트가 번역됩니다.`)) {
        return;
    }
    
    try {
        // 로딩 표시
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>번역 중...';
        button.disabled = true;
        
        // TranslationService 호출
        const result = await translationService.translateStorybook(currentStorybook, targetLang);
        
        // 저장
        saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        // 새로 추가된 언어로 전환
        window.currentLanguage = targetLang;
        displayStorybook(currentStorybook);
        
        showNotification('success', '번역 완료!', `${langName} 번역이 완료되었습니다.`);
        
        // 버튼 복원
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('❌ Translation error:', error);
        alert('번역 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
        
        // 버튼 복원
        const button = event.target;
        button.innerHTML = '<i class="fas fa-language mr-1"></i>번역';
        button.disabled = false;
    }
}

// 새 페이지 추가
function addNewPage() {
    if (!currentStorybook) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    try {
        // PageManager 사용
        const result = pageManager.addNewPage(currentStorybook);
        
        if (result) {
            // 저장
            saveCurrentStorybook();
            
            // UI 업데이트
            displayStorybook(currentStorybook);
            
            // 성공 메시지
            alert(`✅ 페이지 ${result.page.pageNumber}가 추가되었습니다!`);
            
            // 새로 추가된 페이지로 스크롤
            setTimeout(() => {
                const newPageElement = document.querySelector(`[data-page-index="${result.pageIndex}"]`);
                if (newPageElement) {
                    newPageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    } catch (error) {
        console.error('❌ 페이지 추가 실패:', error);
        alert(error.message);
    }
}

/**
 * displayStorybook - 동화책 화면 렌더링 (DisplayService 래퍼)
 * 원래 1,253줄의 거대한 함수였으나, DisplayService로 분리하여 유지보수성 향상
 */
function displayStorybook(storybook) {
    if (!storybook) {
        console.warn('⚠️ displayStorybook: storybook이 null입니다');
        return;
    }
    
    // DisplayService로 HTML 생성
    const displayService = window.displayService;
    if (!displayService) {
        console.error('❌ DisplayService가 로드되지 않았습니다');
        return;
    }
    
    // imageSettings 전달
    displayService.init(imageSettings);
    
    // HTML 렌더링
    const html = displayService.renderStorybook(storybook);
    
    console.log('📝 HTML 렌더링 결과:', {
        htmlLength: html.length,
        htmlType: typeof html,
        hasContent: html.length > 0
    });
    
    // DOM에 삽입
    const resultDiv = document.getElementById('storybookResult');
    console.log('🎯 DOM 타겟:', {
        found: !!resultDiv,
        id: resultDiv?.id,
        currentContent: resultDiv?.innerHTML.substring(0, 100)
    });
    
    if (resultDiv) {
        // hidden 클래스 제거하여 표시
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = html;
        console.log('✅ DOM에 HTML 삽입 완료');
    } else {
        console.error('❌ storybookResult 요소를 찾을 수 없습니다!');
    }
    
    // 표지 이미지 업데이트 (히스토리 포함)
    if (typeof updateCoverImageDisplay === 'function') {
        updateCoverImageDisplay();
    }
    
    // UI 후처리 (select 값 업데이트 등)
    setTimeout(() => {
        // Gemini TTS 모델 select 초기화
        const globalTTSModelSelect = document.getElementById('global-gemini-tts-model');
        if (globalTTSModelSelect) {
            globalTTSModelSelect.value = imageSettings.geminiTTSModel || 'gemini-2.5-flash-preview-tts';
        }
        
        // 배경음악 드롭다운 업데이트
        if (typeof loadBackgroundMusicList === 'function') {
            loadBackgroundMusicList().catch(err => {
                console.warn('⚠️ 배경음악 리스트 로드 실패:', err);
            });
        }
        
        // TTS 음성 select 초기화
        const pageTTSModelSelect = document.getElementById('page-tts-model');
        if (pageTTSModelSelect) {
            pageTTSModelSelect.value = imageSettings.ttsModel || 'Aoede';
        }
        
        // 배경음악 select 업데이트
        if (typeof updateBackgroundMusicSelect === 'function') {
            updateBackgroundMusicSelect();
        }
        const bgmSelectEl = document.getElementById('backgroundMusicSelect');
        if (bgmSelectEl && storybook.backgroundMusicId) {
            bgmSelectEl.value = storybook.backgroundMusicId;
            
            const music = backgroundMusicList.find(m => m.id === storybook.backgroundMusicId);
            if (music) {
                const selectedMusicEl = document.getElementById('selectedBackgroundMusic');
                if (selectedMusicEl) {
                    selectedMusicEl.innerHTML = `
                        <i class="fas fa-check-circle text-green-600 mr-1"></i>
                        선택됨: <strong>${music.title}</strong>
                    `;
                }
            }
        }
    }, 100);
}

// 캐릭터 관리 함수
function updateCharacterName(charIndex, newName) {
    if (newName.trim()) {
        currentStorybook.characters[charIndex].name = newName.trim();
        saveCurrentStorybook();
    }
}

function updateCharacterHeight(charIndex, height) {
    const heightNum = parseInt(height);
    if (heightNum >= 50 && heightNum <= 250) {
        currentStorybook.characters[charIndex].height = heightNum;
        saveCurrentStorybook();
        console.log(`✅ Character height updated: ${currentStorybook.characters[charIndex].name} = ${heightNum}cm`);
    }
}

function updateCharacterDescription(charIndex, description) {
    if (description.trim()) {
        currentStorybook.characters[charIndex].description = description.trim();
        saveCurrentStorybook();
        console.log(`✅ Character description updated: ${currentStorybook.characters[charIndex].name}`);
    }
}

function deleteCharacter(charIndex) {
    try {
        const deleted = characterManager.deleteCharacter(currentStorybook, charIndex);
        if (deleted) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
        }
    } catch (error) {
        console.error('❌ 캐릭터 삭제 실패:', error);
        alert(error.message);
    }
}

function addNewCharacter() {
    try {
        const character = characterManager.addCharacter(currentStorybook);
        if (character) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            alert(`"${character.name}" 캐릭터가 추가되었습니다!`);
        }
    } catch (error) {
        console.error('❌ 캐릭터 추가 실패:', error);
        alert(error.message);
    }
}

function updatePageText(pageIndex, newText) {
    console.log(`🔄 updatePageText 호출: 페이지 ${pageIndex + 1}, 텍스트 길이: ${newText.length}`);
    
    if (newText.trim()) {
        const text = newText.trim();
        
        // 현재 언어가 한국어면 기본 text에 저장
        if (window.currentLanguage === 'ko') {
            const oldText = currentStorybook.pages[pageIndex].text;
            currentStorybook.pages[pageIndex].text = text;
            console.log(`📝 한국어 텍스트 업데이트: "${oldText?.substring(0, 30)}..." → "${text.substring(0, 30)}..."`);
        } else {
            // 다른 언어면 translations에 저장
            if (!currentStorybook.translations) {
                currentStorybook.translations = {};
            }
            if (!currentStorybook.translations[window.currentLanguage]) {
                // 기존 pages를 복사해서 translations 초기화
                currentStorybook.translations[window.currentLanguage] = currentStorybook.pages.map(p => ({
                    pageNumber: p.pageNumber,
                    text: p.text || ''
                }));
            }
            
            // 해당 페이지의 번역 텍스트 업데이트
            const translatedPage = currentStorybook.translations[window.currentLanguage].find(p => p.pageNumber === currentStorybook.pages[pageIndex].pageNumber);
            if (translatedPage) {
                const oldText = translatedPage.text;
                translatedPage.text = text;
                console.log(`📝 ${window.currentLanguage} 번역 텍스트 업데이트: "${oldText?.substring(0, 30)}..." → "${text.substring(0, 30)}..."`);
            }
        }
        
        saveCurrentStorybook();
        console.log(`✅ 페이지 ${pageIndex + 1} 텍스트 저장 완료 (${window.currentLanguage})`);
        console.log(`💾 저장된 텍스트:`, currentStorybook.pages[pageIndex].text?.substring(0, 50));
    } else {
        console.warn(`⚠️ 빈 텍스트는 저장하지 않음: 페이지 ${pageIndex + 1}`);
    }
}

// 디바운스된 텍스트 업데이트 (타이핑 중 자동 저장)
let textUpdateTimeouts = {};
function debouncedUpdatePageText(pageIndex, newText) {
    // 기존 타이머 취소
    if (textUpdateTimeouts[pageIndex]) {
        clearTimeout(textUpdateTimeouts[pageIndex]);
    }
    
    // 1초 후 저장
    textUpdateTimeouts[pageIndex] = setTimeout(() => {
        updatePageText(pageIndex, newText);
    }, 1000);
}


// 장면 통합 설명 업데이트
function updateSceneCombined(pageIndex, combinedText) {
    if (!combinedText || !combinedText.trim()) return;
    
    const text = combinedText.trim();
    currentStorybook.pages[pageIndex].scene_description = text;
    
    // scene_structure는 더 이상 별도로 관리하지 않음
    // 모든 정보를 scene_description에 통합
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} 장면 설명 업데이트됨`);
}

// 장면 구조 필드 업데이트 (캐릭터/배경/분위기)
function updateSceneStructure(pageIndex, field, value) {
    if (!currentStorybook.pages[pageIndex].scene_structure) {
        currentStorybook.pages[pageIndex].scene_structure = {};
    }
    currentStorybook.pages[pageIndex].scene_structure[field] = value.trim();
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} ${field} 업데이트: ${value}`);
}

// 페이지별 캐릭터 레퍼런스 토글
function togglePageCharacterRef(pageIndex, charIndex, checked) {
    if (!currentStorybook.pages[pageIndex].characterRefs) {
        currentStorybook.pages[pageIndex].characterRefs = [];
    }
    
    const refs = currentStorybook.pages[pageIndex].characterRefs;
    if (checked) {
        if (!refs.includes(charIndex)) {
            refs.push(charIndex);
        }
    } else {
        const idx = refs.indexOf(charIndex);
        if (idx > -1) {
            refs.splice(idx, 1);
        }
    }
    
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} 캐릭터 레퍼런스 업데이트:`, refs);
}

// TTS 설정 업데이트
function updateTTSConfig(pageIndex, config) {
    if (!config || !config.trim()) return;
    
    currentStorybook.pages[pageIndex].ttsConfig = config.trim();
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} TTS 설정 업데이트: ${config}`);
}

// 전체 페이지용 Gemini TTS 모델 업데이트
function updatePageGeminiTTSModel(value) {
    imageSettings.geminiTTSModel = value;
    console.log(`✅ Gemini TTS 모델 변경:`, value);
    
    // 알림 표시
    const modelName = value.replace('gemini-', 'Gemini ').replace('-tts', ' TTS');
    showNotification(`Gemini TTS 모델이 ${modelName}로 변경되었습니다`, 'success');
}

// 전체 페이지용 TTS 음성 업데이트 (모든 TTS 생성 시 사용)
function updateGlobalTTSModel(value) {
    imageSettings.ttsModel = value;
    console.log(`✅ 전체 페이지 TTS 음성 변경:`, value);
    
    // 알림 표시
    showNotification(`TTS 음성이 ${value}로 변경되었습니다`, 'success');
}

// 페이지별 TTS 모델 업데이트 (설명 동적 업데이트)
function updatePageTTSModelDescription(pageIndex, value) {
    currentStorybook.pages[pageIndex].ttsModel = value;
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} TTS 모델 변경:`, value);
    
    // 선택한 모델의 설명을 동적으로 업데이트 (전체 리렌더링 안 함)
    const modelInfo = TTS_MODELS.find(m => m.value === value);
    const descElement = document.getElementById(`tts-model-desc-${pageIndex}`);
    if (descElement && modelInfo) {
        descElement.innerHTML = `<i class="fas fa-info-circle mr-1 text-blue-500"></i>${modelInfo.description}`;
    }
}

// 기존 함수명 유지 (호환성)
function updatePageTTSModel(pageIndex, value) {
    updatePageTTSModelDescription(pageIndex, value);
}

// 학습 단어 프롬프트 업데이트
function updateVocabularyPrompt(value) {
    currentStorybook.vocabularyPrompt = value.trim();
    saveCurrentStorybook();
    console.log('✅ 학습 단어 프롬프트 업데이트:', value);
}

// ============================================
// 업로드 관련 함수들 (UploadService 래퍼)
// ============================================

function openIllustrationUploadModal(pageIndex) {
    uploadService.openIllustrationUploadModal(pageIndex);
}

function closeIllustrationUploadModal() {
    uploadService.closeIllustrationUploadModal();
}

function openCharacterUploadModal(charIndex) {
    uploadService.openCharacterUploadModal(charIndex);
}

function closeCharacterUploadModal() {
    uploadService.closeCharacterUploadModal();
}

function switchCharacterUploadTab(tab) {
    uploadService.switchCharacterUploadTab(tab);
}

function openCoverImageUploadModal() {
    uploadService.openCoverImageUploadModal();
}

function openTTSUploadModal(pageIndex) {
    uploadService.openTTSUploadModal(pageIndex);
}

function closeTTSUploadModal() {
    uploadService.closeTTSUploadModal();
}

function switchTTSUploadTab(tab) {
    uploadService.switchTTSUploadTab(tab);
}

async function uploadTTSAudio() {
    await uploadService.uploadTTSAudio(currentStorybook, window.currentLanguage, saveCurrentStorybook, displayStorybook);
}

function switchUploadTab(tab) {
    uploadService.switchUploadTab(tab);
}

function openBatchUploadModal() {
    uploadService.openBatchUploadModal(currentStorybook);
}

function cancelBatchUpload() {
    uploadService.cancelBatchUpload();
}

// 캐릭터 업로드 실행 (모달 내부에서 호출)
async function uploadCharacter() {
    await uploadService.uploadIllustration(currentStorybook, saveCurrentStorybook, displayStorybook);
}


// 삽화 히스토리에서 선택
function selectIllustrationFromHistory(pageIndex, historyIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) return;
    
    const page = currentStorybook.pages[pageIndex];
    const history = page.illustrationHistory || [];
    
    if (historyIndex >= history.length) return;
    
    const selectedImage = history[historyIndex];
    
    // 현재 이미지를 히스토리 맨 앞에 추가
    history.splice(historyIndex, 1); // 선택된 항목 제거
    history.unshift(page.illustrationImage); // 현재 이미지를 맨 앞에 추가
    
    // 선택된 이미지를 현재 이미지로 설정
    page.illustrationImage = selectedImage;
    
    // 10개 제한 유지
    if (history.length > 10) {
        history.splice(10);
    }
    
    page.illustrationHistory = history;
    
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('success', '이미지 변경', '이전 버전으로 변경되었습니다.');
}

// 오디오 다운로드
async function downloadAudio(audioUrl, filename) {
    try {
        const downloadUrl = `/api/download-image?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`;
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('success', '다운로드 완료', filename + '이 다운로드되었습니다.');
    } catch (error) {
        console.error('다운로드 오류:', error);
        alert('다운로드 실패: ' + error.message);
    }
}

// 모든 오디오 다운로드
async function downloadAllAudio() {
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    // 현재 언어의 TTS가 있는 페이지만 필터링
    const pagesWithAudio = currentStorybook.pages.filter(page => getPageTTS(page, window.currentLanguage));
    
    if (pagesWithAudio.length === 0) {
        alert('생성된 TTS가 없습니다. 먼저 TTS를 생성해주세요.');
        return;
    }
    
    // 언어 이름 가져오기
    const languageNames = {
        ko: '한국어',
        en: 'English',
        zh: '中文',
        ja: '日本語',
        es: 'Español',
        fr: 'Français'
    };
    const langName = languageNames[window.currentLanguage] || window.currentLanguage;
    
    if (!confirm(`${langName} TTS ${pagesWithAudio.length}개의 오디오 파일을 다운로드하시겠습니까?`)) {
        return;
    }
    
    let downloadCount = 0;
    
    for (let i = 0; i < pagesWithAudio.length; i++) {
        const page = pagesWithAudio[i];
        const audioUrl = getPageTTS(page, window.currentLanguage);
        const filename = `${currentStorybook.title}_${window.currentLanguage}_페이지_${page.pageNumber}.wav`;
        
        try {
            await downloadAudio(audioUrl, filename);
            downloadCount++;
            
            // 다운로드 간 약간의 지연 (브라우저 제한 방지)
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`페이지 ${page.pageNumber} 다운로드 실패:`, error);
        }
    }
    
    showNotification('success', '일괄 다운로드 완료', `${langName} ${downloadCount}개의 오디오 파일이 다운로드되었습니다.`);
}

// 전체 TTS 일괄 업로드
async function openBatchTTSUploadModal() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('동화책 페이지가 없습니다.');
        return;
    }
    
    // 파일 입력 요소 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
            return;
        }
        
        // 페이지를 페이지 번호순으로 정렬 (이미 정렬되어 있지만 확인)
        const sortedPages = [...currentStorybook.pages].sort((a, b) => a.pageNumber - b.pageNumber);
        
        // 파일을 이름순으로 정렬 (가나다순)
        files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        
        // 개수 확인
        if (files.length !== sortedPages.length) {
            const proceed = confirm(
                `⚠️ 파일 개수(${files.length}개)와 페이지 개수(${sortedPages.length}개)가 일치하지 않습니다.\n\n` +
                `순서대로 매칭:\n` +
                sortedPages.slice(0, Math.min(files.length, 5)).map((page, i) => 
                    `${i + 1}. ${files[i]?.name || '없음'} → 페이지 ${page.pageNumber}`
                ).join('\n') +
                (sortedPages.length > 5 ? `\n...\n` : '') +
                `\n계속하시겠습니까?`
            );
            
            if (!proceed) {
                return;
            }
        }
        
        await batchUploadTTSFiles(files, sortedPages);
    };
    
    input.click();
}

// TTS 파일 일괄 업로드 실행
async function batchUploadTTSFiles(files, sortedPages) {
    console.log(`📤 TTS 일괄 업로드 시작: ${files.length}개 파일`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 진행 상황 표시
    showNotification('info', '업로드 중', `TTS 파일을 업로드하는 중입니다... (0/${files.length})`);
    
    for (let i = 0; i < Math.min(files.length, sortedPages.length); i++) {
        const file = files[i];
        const page = sortedPages[i];
        
        try {
            console.log(`📤 업로드 중 (${i + 1}/${files.length}): ${file.name} → 페이지 ${page.pageNumber}`);
            
            // 파일을 Base64로 변환
            const base64Audio = await fileToBase64(file);
            
            // 서버에 업로드
            const response = await axios.post('/api/upload-audio', {
                audioData: base64Audio,
                filename: `${currentStorybook.id}_page_${page.pageNumber}.wav`,
                storybookId: currentStorybook.id,
                storybookTitle: currentStorybook.title
            });
            
            if (response.data.success && response.data.audioUrl) {
                // 해당 페이지의 audioUrl 업데이트
                const pageIndex = currentStorybook.pages.findIndex(p => p.pageNumber === page.pageNumber);
                if (pageIndex !== -1) {
                    currentStorybook.pages[pageIndex].audioUrl = response.data.audioUrl;
                    
                    // 즉시 저장 및 UI 업데이트
                    saveCurrentStorybook();
                    
                    // 해당 페이지의 TTS 버튼 영역만 업데이트
                    const ttsButtonDiv = document.querySelector(`#page-card-${pageIndex} .tts-button-area`);
                    if (ttsButtonDiv) {
                        ttsButtonDiv.innerHTML = `
                            <div class="flex items-center gap-2 text-sm text-green-600">
                                <i class="fas fa-check-circle"></i>
                                <span>TTS 업로드 완료</span>
                            </div>
                        `;
                    }
                }
                
                successCount++;
                console.log(`✅ 페이지 ${page.pageNumber} 업로드 성공`);
            } else {
                throw new Error(response.data.error || '업로드 실패');
            }
            
            // 진행 상황 업데이트
            showNotification('info', '업로드 중', `TTS 파일을 업로드하는 중입니다... (${i + 1}/${files.length})`);
            
        } catch (error) {
            console.error(`❌ 페이지 ${page.pageNumber} 업로드 실패:`, error);
            failCount++;
        }
    }
    
    // 저장 및 UI 업데이트
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    // 결과 알림
    if (failCount === 0) {
        showNotification('success', '업로드 완료!', `${successCount}개의 TTS 파일이 성공적으로 업로드되었습니다.`);
    } else {
        showNotification('warning', '업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
    }
    
    console.log(`✅ TTS 일괄 업로드 완료 - 성공: ${successCount}, 실패: ${failCount}`);
}

// 전체 삽화 텍스트 다운로드
async function downloadAllIllustrationTexts() {
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    if (!confirm(`${currentStorybook.pages.length}개 페이지의 텍스트를 다운로드하시겠습니까?`)) {
        return;
    }
    
    // 텍스트 파일 생성 (페이지 텍스트만)
    let content = `동화책: ${currentStorybook.title}\n`;
    content += `생성 일시: ${new Date().toLocaleString('ko-KR')}\n`;
    content += `총 페이지: ${currentStorybook.pages.length}\n`;
    content += `=`.repeat(80) + '\n\n';
    
    currentStorybook.pages.forEach((page, idx) => {
        content += `📖 페이지 ${page.pageNumber}\n`;
        content += `${page.text || '(텍스트 없음)'}\n\n`;
    });
    
    // Blob 생성 및 다운로드
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_페이지텍스트.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('success', '다운로드 완료', `${currentStorybook.pages.length}개 페이지의 텍스트가 다운로드되었습니다.`);
}

// 단어 업데이트 함수
function updateVocabularyWord(wordIndex, newValue, field = 'word') {
    if (newValue.trim()) {
        const vocab = currentStorybook.educational_content.vocabulary[wordIndex];
        
        // 객체 형식인지 확인
        if (typeof vocab === 'object') {
            vocab[field] = newValue.trim();
        } else {
            // 문자열이면 객체로 변환
            if (field === 'word') {
                currentStorybook.educational_content.vocabulary[wordIndex] = {
                    word: newValue.trim(),
                    korean: ''
                };
            }
        }
        
        // 해당 단어의 이미지도 업데이트 (있다면)
        if (currentStorybook.vocabularyImages && currentStorybook.vocabularyImages[wordIndex]) {
            const word = typeof currentStorybook.educational_content.vocabulary[wordIndex] === 'object' 
                ? currentStorybook.educational_content.vocabulary[wordIndex].word 
                : currentStorybook.educational_content.vocabulary[wordIndex];
            currentStorybook.vocabularyImages[wordIndex].word = word;
        }
        
        saveCurrentStorybook();
    }
}

// 한 번에 모든 캐릭터 레퍼런스 생성 (병렬 처리)
async function generateAllCharacterReferences() {
    const toGenerate = currentStorybook.characters.filter(char => !char.referenceImage);
    
    if (toGenerate.length === 0) {
        alert('모든 캐릭터 레퍼런스가 이미 생성되었습니다.');
        return;
    }
    
    if (!confirm(`${toGenerate.length}개의 캐릭터 레퍼런스를 동시에 생성하시겠습니까?\n\n예상 소요 시간: 약 8초`)) {
        return;
    }
    
    // 모든 캐릭터의 로딩 상태 표시
    currentStorybook.characters.forEach((char, i) => {
        if (!char.referenceImage) {
            const refDiv = document.getElementById(`char-ref-${i}`);
            if (refDiv) {
                refDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-3"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div><p class="text-white text-sm font-semibold">AI가 이미지 생성 중...</p><p class="text-white text-xs opacity-75 mt-1">실패 시 자동으로 재시도합니다</p></div>';
            }
        }
    });
    
    try {
        // ✨ ImageService를 사용한 병렬 캐릭터 생성
        const service = imageService || window.imageService;
        if (!service) {
            throw new Error('ImageService가 로드되지 않았습니다. 페이지를 새로고침 해주세요.');
        }
        
        const promises = currentStorybook.characters.map(async (char, i) => {
            if (char.referenceImage) {
                return { index: i, success: true, imageUrl: char.referenceImage, skipped: true };
            }
            
            try {
                const promptTextarea = document.getElementById(`char-prompt-${i}`);
                const customPrompt = promptTextarea ? promptTextarea.value.trim() : char.description;
                
                console.log(`🎨 캐릭터 "${char.name}" 이미지 생성 시작 (배치 생성)`);
                
                // ✨ ImageService 사용!
                const result = await service.generateCharacter({
                    name: char.name,
                    description: customPrompt,
                    age: char.age
                }, {
                    model: imageSettings.characterModel || 'gemini-3-pro-image-preview',
                    artStyle: currentStorybook.artStyle || '디즈니 스타일',
                    aspectRatio: '16:9',
                    storybookId: currentStorybook.id,
                    storybookTitle: currentStorybook.title
                });
                
                if (result.success && result.imageUrl) {
                    currentStorybook.characters[i].referenceImage = result.imageUrl;
                    console.log(`✅ 캐릭터 "${char.name}" 이미지 생성 완료`);
                    return { index: i, success: true, imageUrl: result.imageUrl };
                } else {
                    throw new Error(result.error || '이미지 URL을 받지 못했습니다.');
                }
            } catch (error) {
                console.error(`❌ 캐릭터 ${i} 생성 실패:`, error);
                const errorMessage = error.message || '이미지 생성 실패';
                return { index: i, success: false, error: errorMessage };
            }
        });
        
        const results = await Promise.all(promises);
        
        // 결과 저장
        saveCurrentStorybook();
        
        // 각 캐릭터의 이미지 div만 업데이트 (텍스트 필드는 유지)
        results.forEach(result => {
            if (result.success) {
                const refDiv = document.getElementById(`char-ref-${result.index}`);
                if (refDiv) {
                    const char = currentStorybook.characters[result.index];
                    refDiv.innerHTML = `<img src="${result.imageUrl}" alt="${char.name}" class="w-full h-full object-cover rounded-lg"/>`;
                    
                    // 다운로드 버튼 추가
                    const charCard = refDiv.closest('.character-card');
                    if (charCard) {
                        const existingDownloadBtn = charCard.querySelector('.download-char-btn');
                        if (!existingDownloadBtn) {
                            const promptTextarea = charCard.querySelector(`#char-prompt-${result.index}`);
                            if (promptTextarea) {
                                const downloadBtn = document.createElement('button');
                                downloadBtn.className = 'w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition mb-2 download-char-btn';
                                downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>이미지 다운로드';
                                downloadBtn.onclick = () => downloadImage(result.imageUrl, `캐릭터_${char.name}.png`);
                                promptTextarea.parentNode.insertBefore(downloadBtn, promptTextarea);
                            }
                        }
                    }
                }
            } else if (!result.success) {
                // 실패한 경우 에러 표시
                const refDiv = document.getElementById(`char-ref-${result.index}`);
                if (refDiv) {
                    refDiv.innerHTML = `
                        <div class="p-4 text-center">
                            <p class="text-white text-xs mt-2">⚠️ 이미지 생성 실패</p>
                            <p class="text-white text-xs opacity-75 mt-1">${result.error}</p>
                            <button onclick="generateCharacterReference(${result.index})" class="mt-2 px-3 py-1 bg-white text-purple-600 rounded text-xs">재시도</button>
                        </div>
                    `;
                }
            }
        });
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount > 0) {
            alert(`캐릭터 레퍼런스 생성/재생성 완료!\n성공: ${successCount}개\n실패: ${failCount}개`);
        } else {
            alert(`모든 캐릭터 레퍼런스 생성/재생성이 완료되었습니다! (${successCount}개)`);
        }
    } catch (error) {
        console.error('Batch generation error:', error);
        alert('배치 생성 중 오류가 발생했습니다: ' + error.message);
        // 에러 시에도 UI 전체를 다시 그리지 않음
    }
}

/**
 * 캐릭터 레퍼런스 생성 (ImageService 사용)
 */
/**
 * 캐릭터 레퍼런스 생성 (CharacterReferenceGenerator 사용)
 */
async function generateCharacterReference(charIndex) {
    const generator = new CharacterReferenceGenerator({
        storybook: currentStorybook,
        imageService: imageService || window.imageService,
        imageSettings: imageSettings,
        saveCallback: saveCurrentStorybook
    });

    return await generator.generate(charIndex);
}

// 캐릭터 이미지를 히스토리와 함께 렌더링
function renderCharacterImageWithHistory(charIndex) {
    const character = currentStorybook.characters[charIndex];
    const refDiv = document.getElementById(`char-ref-${charIndex}`);
    
    if (!character.referenceImage) {
        refDiv.innerHTML = '<p class="text-white text-xs md:text-sm text-center p-4">이미지 생성 대기중</p>';
        return;
    }
    
    const history = character.imageHistory || [];
    
    let html = `
        <div class="flex gap-2 h-full">
            <!-- 메인 이미지 -->
            <div class="flex-1 relative group">
                <img src="${character.referenceImage}" alt="${character.name}" class="w-full h-full object-cover rounded-lg"/>
                <button 
                    onclick="downloadImage('${character.referenceImage}', '캐릭터_${character.name}.png')"
                    class="absolute top-2 right-2 bg-white bg-opacity-90 text-purple-600 w-10 h-10 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                    title="다운로드"
                >
                    <i class="fas fa-download"></i>
                </button>
            </div>
    `;
    
    if (history.length > 0) {
        html += `
            <!-- 히스토리 -->
            <div class="w-20 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-100">
                ${history.map((url, idx) => `
                    <div class="relative group cursor-pointer border-2 border-transparent hover:border-purple-400 rounded transition" onclick="selectCharacterImageFromHistory(${charIndex}, ${idx})">
                        <img src="${url}" alt="이전 ${idx + 1}" class="w-full h-16 object-cover rounded"/>
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                            <i class="fas fa-check text-white opacity-0 group-hover:opacity-100 transition"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    html += `</div>`;
    refDiv.innerHTML = html;
}

// 히스토리에서 이미지 선택
function selectCharacterImageFromHistory(charIndex, historyIndex) {
    const character = currentStorybook.characters[charIndex];
    const selectedImage = character.imageHistory[historyIndex];
    
    // 현재 이미지를 히스토리에 추가
    character.imageHistory.splice(historyIndex, 1); // 선택된 항목 제거
    character.imageHistory.unshift(character.referenceImage); // 현재 이미지를 맨 앞에 추가
    
    // 선택한 이미지를 현재 이미지로 설정
    character.referenceImage = selectedImage;
    
    saveCurrentStorybook();
    renderCharacterImageWithHistory(charIndex);
    
    showNotification('✅ 이미지가 변경되었습니다.', 'success');
}

/**
 * Key Object 이미지 히스토리에서 선택
 */
function selectKeyObjectImageFromHistory(objIndex, historyIndex) {
    const keyObject = currentStorybook.key_objects[objIndex];
    
    if (!keyObject || !keyObject.imageHistory || !currentStorybook.keyObjectImages) {
        return;
    }
    
    const selectedImage = keyObject.imageHistory[historyIndex];
    const currentImage = currentStorybook.keyObjectImages[objIndex];
    
    // 현재 이미지를 히스토리에 추가
    keyObject.imageHistory.splice(historyIndex, 1); // 선택된 항목 제거
    keyObject.imageHistory.unshift(currentImage); // 현재 이미지를 맨 앞에 추가
    
    // 선택한 이미지를 현재 이미지로 설정
    currentStorybook.keyObjectImages[objIndex] = selectedImage;
    
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('✅ Key Object 이미지가 변경되었습니다.', 'success');
}

/**
 * 표지 이미지 히스토리에서 선택
 */
function selectCoverFromHistory(historyIndex) {
    if (!currentStorybook.coverHistory || !currentStorybook.coverImage) {
        return;
    }
    
    const selectedImage = currentStorybook.coverHistory[historyIndex];
    const currentImage = currentStorybook.coverImage;
    
    // 현재 이미지를 히스토리에 추가
    currentStorybook.coverHistory.splice(historyIndex, 1); // 선택된 항목 제거
    currentStorybook.coverHistory.unshift(currentImage); // 현재 이미지를 맨 앞에 추가
    
    // 선택한 이미지를 현재 이미지로 설정
    currentStorybook.coverImage = selectedImage;
    
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('✅ 표지 이미지가 변경되었습니다.', 'success');
}

// 병렬/순차 생성 모드 설명 표시
function showGenerationModeHelp(mode) {
    const helpContent = mode === 'parallel' ? `
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-blue-600 mb-3">
                <i class="fas fa-bolt mr-2"></i>병렬 생성 (빠르게)
            </h3>
            
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">✨ 특징</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>모든 페이지를 <strong>동시에</strong> 생성</li>
                    <li>캐릭터 레퍼런스만 참조</li>
                    <li>빠른 속도로 전체 완성</li>
                </ul>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">⚡ 추천 상황</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li><strong>초안 확인:</strong> 스토리 전개와 장면 구성을 빠르게 확인</li>
                    <li><strong>테스트 생성:</strong> 그림체나 설정을 테스트</li>
                    <li><strong>시간 제약:</strong> 빠른 결과가 필요할 때</li>
                    <li><strong>독립적인 장면:</strong> 각 페이지가 독립적일 때</li>
                </ul>
            </div>
            
            <div class="bg-yellow-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">⚠️ 주의사항</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>장면 간 연속성이 약할 수 있음</li>
                    <li>캐릭터 포즈나 분위기 변화가 급격할 수 있음</li>
                </ul>
            </div>
            
            <div class="text-center text-sm text-gray-600 mt-4">
                <i class="fas fa-clock mr-1"></i>
                예상 시간: 약 <strong>${Math.ceil(currentStorybook.pages.filter(p => !p.illustrationImage).length / 5) * 8}초</strong>
            </div>
        </div>
    ` : `
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-indigo-600 mb-3">
                <i class="fas fa-layer-group mr-2"></i>순차 생성 (정확하게)
            </h3>
            
            <div class="bg-indigo-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">✨ 특징</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>페이지를 <strong>하나씩 순서대로</strong> 생성</li>
                    <li>각 페이지가 <strong>바로 전 페이지를 자동 참조</strong></li>
                    <li>캐릭터 레퍼런스 + 전 페이지 이미지 조합</li>
                </ul>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">🎯 추천 상황</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li><strong>최종 출판물:</strong> 출판하거나 공유할 완성본</li>
                    <li><strong>연속성 중요:</strong> 인어공주처럼 변신 스토리나 시간 흐름</li>
                    <li><strong>일관성 중시:</strong> 캐릭터 포즈, 색감, 분위기의 연속성</li>
                    <li><strong>프로페셔널:</strong> 전문적인 품질이 필요할 때</li>
                </ul>
            </div>
            
            <div class="bg-purple-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">🌟 장점</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>높은 시각적 연속성</li>
                    <li>자연스러운 장면 전환</li>
                    <li>스토리 몰입도 향상</li>
                </ul>
            </div>
            
            <div class="text-center text-sm text-gray-600 mt-4">
                <i class="fas fa-clock mr-1"></i>
                예상 시간: 약 <strong>${currentStorybook.pages.filter(p => !p.illustrationImage).length * 8}초</strong>
            </div>
        </div>
    `;
    
    showModal('생성 모드 가이드', helpContent);
}

// 한 번에 모든 삽화 생성 - 병렬 (빠르게)
async function generateAllIllustrationsParallel() {
    const hasCharacterReferences = currentStorybook.characters.some(char => char.referenceImage);
    if (!hasCharacterReferences) {
        alert('먼저 캐릭터 레퍼런스 이미지를 생성해주세요!');
        return;
    }
    
    const pagesToGenerate = currentStorybook.pages.filter(page => !page.illustrationImage);
    
    if (pagesToGenerate.length === 0) {
        alert('이미 모든 페이지의 삽화가 생성되었습니다.');
        return;
    }
    
    const estimatedTime = Math.ceil(pagesToGenerate.length / 5) * 8; // 병렬로 약 5개씩 동시 처리
    if (!confirm(`${pagesToGenerate.length}개의 삽화를 병렬로 생성하시겠습니까?\n\n⚡ 빠른 생성: 모든 페이지를 동시에 생성합니다.\n⚠️ 주의: 연속성이 순차 생성보다 약할 수 있습니다.\n\n예상 소요 시간: 약 ${estimatedTime}초`)) {
        return;
    }
    
    // 캐릭터 레퍼런스 준비 (전체 캐릭터 객체 사용)
    const characterReferences = currentStorybook.characters
        .filter(char => char.referenceImage);
    
    // 모든 페이지의 로딩 상태 표시
    currentStorybook.pages.forEach((page, i) => {
        if (!page.illustrationImage) {
            const illustrationDiv = document.getElementById(`illustration-${i}`);
            if (illustrationDiv) {
                illustrationDiv.innerHTML = '<div class="min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg"><div class="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mb-4"></div><p class="text-blue-800 text-base font-bold">⚡ 생성 중...</p><p class="text-blue-600 text-sm mt-2">병렬 생성 (빠르게)</p><p class="text-blue-500 text-xs mt-1">페이지 ' + (i + 1) + '</p></div>';
            }
        }
    });
    
    try {
        const promises = [];
        
        // 병렬로 모든 페이지 생성
        for (let i = 0; i < currentStorybook.pages.length; i++) {
            const page = currentStorybook.pages[i];
            
            // 이미 이미지가 있으면 건너뛰기
            if (page.illustrationImage) {
                continue;
            }
            
            const generatePromise = (async (pageIndex) => {
                try {
                    const sceneCombinedElem = document.getElementById(`scene-combined-${pageIndex}`);
                    const sceneDesc = sceneCombinedElem ? sceneCombinedElem.value : page.scene_description;
                    const artStyleElem = document.getElementById(`artstyle-${pageIndex}`);
                    const artStyle = artStyleElem ? artStyleElem.value : (page.artStyle || currentStorybook.artStyle);
                    
                    // scene-combined에서 장면 구조 파싱 (또는 기존 값 사용)
                    const sceneStructure = {
                        characters: page.scene_structure?.characters || '',
                        background: page.scene_structure?.background || '',
                        atmosphere: page.scene_structure?.atmosphere || ''
                    };
                    
                    // 클라이언트에서 직접 Gemini API 호출
                    const pageData = {
                        ...page,
                        scene_description: sceneDesc,
                        scene_structure: sceneStructure
                    };
                    
                    const prompt = buildIllustrationPrompt(pageData, artStyle, characterReferences, imageSettings, '');
                    
                    // 🎯 페이지에 등장하는 캐릭터 자동 감지
                    const pageText = page.text || '';
                    const sceneCharacters = (sceneStructure && sceneStructure.characters) || '';
                    const allText = `${pageText} ${sceneCharacters}`.toLowerCase();
                    
                    // 이 페이지에 등장하는 캐릭터만 필터링
                    const relevantCharacters = characterReferences.filter(char => {
                        const charName = char.name.toLowerCase();
                        return allText.includes(charName) || 
                               allText.includes(char.description.toLowerCase().split(' ')[0]);
                    });
                    
                    // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
                    const filteredCharacterRefs = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;
                    
                    // 레퍼런스 이미지 URL만 추출 (R2 URL 사용)
                    const refImageUrls = filteredCharacterRefs
                        .map(char => char.referenceImage)
                        .filter(url => url); // null/undefined 제거
                    
                    console.log(`📸 캐릭터 레퍼런스 이미지: ${refImageUrls.length}개`, refImageUrls);
                    
                    // ImageService를 통해 삽화 생성
                    const service = imageService || window.imageService;
                    if (!service) {
                        throw new Error('ImageService가 로드되지 않았습니다.');
                    }
                    
                    // ✅ 재생성 시 페이지에 저장된 설정 우선 사용
                    const isRegeneration = !!page.illustrationImage;
                    const apiOptions = {
                        model: (isRegeneration && page.illustrationModel) || imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
                        aspectRatio: (isRegeneration && page.aspectRatio) || imageSettings.aspectRatio || '16:9',
                        artStyle: artStyle,
                        storybookId: currentStorybook.id,
                        storybookTitle: currentStorybook.title,
                        additionalPrompt: (isRegeneration && page.additionalPrompt) || imageSettings.additionalPrompt || ''
                    };
                    console.log(`🎨 삽화 생성 - 재생성: ${isRegeneration}, 모델: ${apiOptions.model}, 비율: ${apiOptions.aspectRatio}`);
                    
                    const result = await service.generateIllustration(pageData, refImageUrls, apiOptions);
                    
                    if (result && result.success && result.imageUrl) {
                        const page = currentStorybook.pages[pageIndex];
                        
                        // 기존 이미지가 있으면 히스토리에 추가
                        if (page.illustrationImage) {
                            if (!page.illustrationHistory) {
                                page.illustrationHistory = [];
                            }
                            page.illustrationHistory.unshift(page.illustrationImage);
                            
                            // 히스토리 10개 제한
                            if (page.illustrationHistory.length > 10) {
                                page.illustrationHistory.splice(10);
                            }
                        }
                        
                        currentStorybook.pages[pageIndex].illustrationImage = result.imageUrl;
                        currentStorybook.pages[pageIndex].scene_description = sceneDesc;
                        currentStorybook.pages[pageIndex].scene_structure = sceneStructure;
                        // ✅ 이미지 생성 설정 저장 (재생성 시 동일한 설정 사용)
                        currentStorybook.pages[pageIndex].illustrationModel = apiOptions.model;
                        currentStorybook.pages[pageIndex].aspectRatio = apiOptions.aspectRatio;
                        currentStorybook.pages[pageIndex].additionalPrompt = apiOptions.additionalPrompt;
                        console.log(`💾 이미지 생성 설정 저장: 모델=${apiOptions.model}, 비율=${apiOptions.aspectRatio}`);
                        currentStorybook.pages[pageIndex].artStyle = artStyle;
                        
                        // 성공 표시
                        const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);
                        if (illustrationDiv) {
                        // \u2705 UIHelper\ub85c \ud788\uc2a4\ud1a0\ub9ac \ud3ec\ud568\ud558\uc5ec \ub80c\ub354\ub9c1\n                        if (UIHelper) {\n                            UIHelper.renderIllustration(illustrationDiv, result.imageUrl, {\n                                pageIndex: pageIndex,\n                                storybookTitle: currentStorybook.title,\n                                history: page.illustrationHistory || []\n                            });\n                        } else {\n                            illustrationDiv.innerHTML = `<img src="${result.imageUrl}" alt="Page ${page.pageNumber}" class="w-full h-full object-cover rounded-lg"/>`;\n                        }
                        }
                        
                        return { success: true, pageIndex };
                    } else {
                        throw new Error(result.error || '이미지 생성 실패');
                    }
                } catch (error) {
                    console.error(`❌ 삽화 ${pageIndex} 생성 실패:`, error);
                    
                    // 서버 응답에서 상세 에러 메시지 추출
                    let errorMessage = '이미지 생성 실패';
                    if (error.response && error.response.data) {
                        if (error.response.data.error) {
                            errorMessage = error.response.data.error;
                            console.error('📡 서버 에러 메시지:', errorMessage);
                        } else if (error.response.data.message) {
                            errorMessage = error.response.data.message;
                            console.error('📡 서버 에러 메시지:', errorMessage);
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    // 실패 표시
                    const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);
                    if (illustrationDiv) {
                        illustrationDiv.innerHTML = `
                            <div class="p-6 text-center">
                                <p class="text-red-600 text-sm mb-2 font-bold">⚠️ 생성 실패</p>
                                <p class="text-gray-700 text-xs">${errorMessage}</p>
                            </div>
                        `;
                    }
                    
                    return { success: false, pageIndex, error: error.message };
                }
            })(i);
            
            promises.push(generatePromise);
        }
        
        // 모든 병렬 생성 완료 대기
        const results = await Promise.all(promises);
        
        // 결과 저장
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount > 0) {
            alert(`삽화 생성 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개\n\n실패한 페이지는 개별적으로 재시도해주세요.`);
        } else {
            showNotification('success', '모든 삽화 생성 완료! ⚡', `${successCount}개의 페이지 삽화가 병렬로 생성되었습니다.`);
        }
    } catch (error) {
        console.error('Parallel generation error:', error);
        alert('병렬 생성 중 오류가 발생했습니다: ' + error.message);
        displayStorybook(currentStorybook);
    }
}

// 한 번에 모든 삽화 생성 - 순차 (정확하게)
/**
 * 모든 삽화 순차 생성 (IllustrationGenerator 사용)
 */
async function generateAllIllustrationsSequential() {
    const generator = new IllustrationGenerator({
        storybook: currentStorybook,
        imageService: imageService || window.imageService,
        imageSettings: imageSettings,
        uiHelper: UIHelper,
        saveCallback: saveCurrentStorybook,
        updateCallback: () => displayStorybook(currentStorybook)
    });

    await generator.generateAll();
}

// 모든 TTS 생성 (순차적)
/**
 * 모든 페이지 TTS 순차 생성 (간소화 버전)
 */
/**
 * 모든 TTS 순차 생성 (TTSGenerator 사용)
 */
async function generateAllTTS() {
    const generator = new TTSGenerator({
        storybook: currentStorybook,
        ttsService: ttsService || window.ttsService,
        imageSettings: imageSettings,
        language: window.currentLanguage,
        saveCallback: saveCurrentStorybook,
        updateCallback: () => displayStorybook(currentStorybook)
    });

    await generator.generateAll();
}

// 페이지 삽화 생성
/**
 * 삽화 생성 (간소화 버전)
 */
async function generateIllustration(pageIndex) {
    // IllustrationGenerator 사용
    const generator = new IllustrationGenerator({
        storybook: currentStorybook,
        imageService: window.imageService,
        imageSettings: imageSettings,
        uiHelper: window.UIHelper,
        saveCallback: saveCurrentStorybook,
        updateCallback: () => displayStorybook(currentStorybook)
    });

    try {
        const result = await generator.generate(pageIndex);
        return result;
    } catch (error) {
        console.error('삽화 생성 실패:', error);
        return { success: false, error: error.message };
    }
}

function saveCurrentStorybook() {
    const index = storybooks.findIndex(b => b.id === currentStorybook.id);
    if (index !== -1) {
        storybooks[index] = currentStorybook;
    } else {
        storybooks.push(currentStorybook);
    }
    
    // ❌ localStorage 저장 제거
    // saveStorybooks(); // 더 이상 호출하지 않음
    
    renderBookList();
    
    // ✅ R2에만 저장 (비동기, 백그라운드)
    saveToR2(currentStorybook).catch(error => {
        console.error('R2 저장 실패:', error);
    });
}

// R2에 동화책 저장 (서버 API 호출) - 재시도 로직 포함
async function saveToR2(storybook, retryCount = 0) {
    try {
        // StorybookManager 사용
        await storybookManager.saveToR2(storybook, retryCount);
        
        // 공개된 동화책이면 뷰어 메타데이터도 업데이트
        if (storybook.isPublic) {
            console.log('🔄 공개 동화책 - 뷰어 메타데이터 업데이트 중...');
            try {
                const metaResponse = await axios.post('/api/viewer/refresh-metadata');
                if (metaResponse.data.success) {
                    console.log('✅ 뷰어 메타데이터 업데이트 완료');
                }
            } catch (metaError) {
                console.warn('⚠️ 뷰어 메타데이터 업데이트 실패:', metaError.message);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ saveToR2 실패:', error);
        throw error;
    }
}

// 미리보기 함수
function openPreview() {
    if (!currentStorybook) {
        alert('동화책이 없습니다.');
        return;
    }
    
    // 삽화가 있는 페이지만 필터링
    const pagesWithImages = currentStorybook.pages.filter(page => page.illustrationImage);
    
    if (pagesWithImages.length === 0) {
        alert('먼저 삽화를 생성해주세요!');
        return;
    }
    
    // 미리보기 데이터를 localStorage에 임시 저장
    const previewData = {
        title: currentStorybook.title,
        pages: pagesWithImages.map(page => ({
            pageNumber: page.pageNumber,
            text: page.text || '',
            illustrationImage: page.illustrationImage
        }))
    };
    
    localStorage.setItem('preview_data', JSON.stringify(previewData));
    
    // 새 창으로 미리보기 열기
    window.open('/preview.html', '_blank', 'width=1200,height=800');
}

// 다운로드 함수들
// 모든 캐릭터 레퍼런스 다운로드
async function downloadAllCharacterReferences() {
    try {
        await downloadService.downloadAllCharacterReferences(currentStorybook);
        const count = currentStorybook.characters.filter(c => c.referenceImage).length;
        showNotification('success', '다운로드 완료', `${count}개의 캐릭터 레퍼런스를 다운로드했습니다.`);
    } catch (error) {
        console.error('❌ 다운로드 실패:', error);
        alert(error.message);
    }
}

async function downloadAllIllustrations() {
    const images = currentStorybook.pages
        .filter(page => page.illustrationImage)
        .map((page, idx) => ({
            url: page.illustrationImage,
            filename: `${currentStorybook.title}_page_${page.pageNumber}.png`
        }));
    
    if (images.length === 0) {
        alert('다운로드할 삽화가 없습니다.');
        return;
    }
    
    for (const img of images) {
        try {
            const downloadUrl = `/api/download-image?url=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.filename)}`;
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = img.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error('Download error:', error);
        }
    }
    
    showNotification('success', '다운로드 완료', `${images.length}개의 삽화를 다운로드했습니다.`);
}

function downloadAllText() {
    try {
        downloadService.downloadAllText(currentStorybook);
        showNotification('success', '다운로드 완료', '전체 텍스트를 다운로드했습니다.');
    } catch (error) {
        console.error('❌ 다운로드 실패:', error);
        alert(error.message);
    }
}

// 전체 이미지 URL 다운로드
function downloadAllImageUrls() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('다운로드할 이미지가 없습니다.');
        return;
    }
    
    let urlContent = '';
    
    // 페이지별 이미지 URL (URL만 한 줄씩)
    currentStorybook.pages.forEach((page) => {
        if (page.illustrationImage) {
            urlContent += `${page.illustrationImage}\n`;
        }
    });
    
    const imageCount = currentStorybook.pages.filter(p => p.illustrationImage).length;
    
    const blob = new Blob([urlContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_이미지_URL.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('success', '다운로드 완료', `${imageCount}개의 이미지 URL을 다운로드했습니다.`);
}

// 전체 텍스트 번역 함수
async function translateAllText() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('번역할 텍스트가 없습니다.');
        return;
    }
    
    const targetLanguage = document.getElementById('translationLanguage').value;
    const languageNames = {
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch',
        'vi': 'Tiếng Việt',
        'th': 'ไทย'
    };
    
    if (!confirm(`모든 페이지를 ${languageNames[targetLanguage]}로 번역하시겠습니까?\n\n이 작업은 약 ${Math.ceil(currentStorybook.pages.length * 2)}초 정도 소요됩니다.`)) {
        return;
    }
    
    // 로딩 표시
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'translation-loading';
    loadingDiv.className = 'fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingDiv.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md">
            <div class="flex flex-col items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                <p class="text-lg font-semibold text-gray-800 mb-2">텍스트 번역 중...</p>
                <p class="text-sm text-gray-600">잠시만 기다려주세요</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    try {
        const response = await axios.post('/api/translate-storybook', {
            storybook: currentStorybook,
            targetLanguage: targetLanguage
        });
        
        if (response.data.success) {
            // 번역된 내용으로 업데이트
            currentStorybook.pages = response.data.translatedPages;
            currentStorybook.title = response.data.translatedTitle;
            
            if (response.data.translatedTheme) {
                currentStorybook.theme = response.data.translatedTheme;
            }
            
            // 저장 및 표시
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            
            showNotification('success', '번역 완료!', `모든 텍스트가 ${languageNames[targetLanguage]}로 번역되었습니다.`);
        } else {
            throw new Error(response.data.error || '번역 실패');
        }
    } catch (error) {
        console.error('Translation error:', error);
        alert('번역 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
    } finally {
        // 로딩 제거
        if (document.getElementById('translation-loading')) {
            document.getElementById('translation-loading').remove();
        }
    }
}


async function downloadImage(imageUrl, filename) {
    try {
        await downloadService.downloadImage(imageUrl, filename);
    } catch (error) {
        console.error('Download error:', error);
        alert('이미지 다운로드에 실패했습니다.');
    }
}

// 참조 이미지 토글
function toggleReferenceImage(currentPageIdx, refPageIdx) {
    const checkbox = document.getElementById(`ref-check-${currentPageIdx}-${refPageIdx}`);
    const img = document.getElementById(`ref-img-${currentPageIdx}-${refPageIdx}`);
    
    if (checkbox && img) {
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            img.classList.remove('border-gray-300');
            img.classList.add('border-blue-500', 'ring-2', 'ring-blue-300');
        } else {
            img.classList.add('border-gray-300');
            img.classList.remove('border-blue-500', 'ring-2', 'ring-blue-300');
        }
    }
}

// 선택된 참조 이미지 가져오기
function getSelectedReferenceImages(pageIndex) {
    const selectedImages = [];
    
    // 1. 다른 페이지의 참조 이미지
    const pageCheckboxes = document.querySelectorAll(`input[id^="ref-check-${pageIndex}-"]:checked`);
    
    pageCheckboxes.forEach(checkbox => {
        const refPageIdx = parseInt(checkbox.id.split('-').pop());
        const refPage = currentStorybook.pages[refPageIdx];
        
        if (refPage && refPage.illustrationImage) {
            selectedImages.push({
                type: 'page',
                pageNumber: refPage.pageNumber,
                imageUrl: refPage.illustrationImage
            });
        }
    });
    
    // 2. Key Object 참조 이미지
    const keyObjCheckboxes = document.querySelectorAll(`input[id^="ref-keyobj-check-${pageIndex}-"]:checked`);
    
    keyObjCheckboxes.forEach(checkbox => {
        const objIdx = parseInt(checkbox.id.split('-').pop());
        const keyObjImage = currentStorybook.keyObjectImages && currentStorybook.keyObjectImages[objIdx];
        
        if (keyObjImage && keyObjImage.imageUrl) {
            selectedImages.push({
                type: 'key_object',
                name: keyObjImage.name,
                korean: keyObjImage.korean,
                imageUrl: keyObjImage.imageUrl
            });
        }
    });
    
    console.log(`📸 페이지 ${pageIndex + 1} - 선택된 참조 이미지:`, selectedImages.length, 
                `(페이지: ${selectedImages.filter(img => img.type === 'page').length}, Key Objects: ${selectedImages.filter(img => img.type === 'key_object').length})`);
    return selectedImages;
}


// 단어 이미지 생성 - 개별 단어 (캐릭터와 사물 일관성 강화)
async function generateSingleVocabularyImage(wordIndex) {
    if (!currentStorybook.educational_content || !currentStorybook.educational_content.vocabulary) {
        alert('단어 목록이 없습니다.');
        return;
    }
    
    const vocabItem = currentStorybook.educational_content.vocabulary[wordIndex];
    const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
    const korean = typeof vocabItem === 'object' ? vocabItem.korean : '';
    const vocabImgDiv = document.getElementById(`vocab-img-${wordIndex}`);
    
    // 로딩 UI 표시
    if (UIHelper) {
        UIHelper.showLoadingUI(vocabImgDiv, '생성 중...');
    } else {
        vocabImgDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-4"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-2"></div><p class="text-gray-600 text-xs">생성 중...</p></div>';
    }
    
    try {
        // ⭐ 1. Key Objects에서 매칭 확인 (정확한 매칭만) - 우선 확인!
        // 8단어 이미지는 Key Object만 참조 (캐릭터 레퍼런스 제외)
        const matchingKeyObject = currentStorybook.key_objects && currentStorybook.key_objects.find((obj, idx) => {
            const hasImage = currentStorybook.keyObjectImages && currentStorybook.keyObjectImages[idx] && currentStorybook.keyObjectImages[idx].imageUrl;
            if (!hasImage) return false;
            
            const objNameLower = obj.name.toLowerCase().trim();
            const objKoreanLower = obj.korean.toLowerCase().trim();
            const wordLower = word.toLowerCase().trim();
            const koreanLower = korean.toLowerCase().trim();
            
            // 정확히 일치하는 경우만 매칭
            return objNameLower === wordLower || objKoreanLower === koreanLower;
        });
        
        const matchingKeyObjectIndex = matchingKeyObject ? currentStorybook.key_objects.indexOf(matchingKeyObject) : -1;
        
        // ⭐ 2. 매칭되는 Key Object 이미지가 있으면 재사용
        if (matchingKeyObject && matchingKeyObjectIndex >= 0) {
            const keyObjImage = currentStorybook.keyObjectImages[matchingKeyObjectIndex];
            if (keyObjImage && keyObjImage.imageUrl) {
                console.log(`✅ Reusing Key Object image for "${word}" (${korean}): ${matchingKeyObject.name}`);
                
                const imageUrl = keyObjImage.imageUrl;
                
                if (!currentStorybook.vocabularyImages) {
                    currentStorybook.vocabularyImages = new Array(currentStorybook.educational_content.vocabulary.length).fill(null);
                }
                
                currentStorybook.vocabularyImages[wordIndex] = {
                    word: word,
                    korean: korean,
                    imageUrl: imageUrl,
                    success: true,
                    isKeyObject: true,
                    reused: true
                };
                
                // ⭐ vocabulary 객체에도 image 필드 추가 (게임용)
                if (typeof currentStorybook.educational_content.vocabulary[wordIndex] === 'object') {
                    currentStorybook.educational_content.vocabulary[wordIndex].image = imageUrl;
                    console.log(`✅ Added reused image URL to vocabulary[${wordIndex}].image: ${imageUrl}`);
                }
                
                saveCurrentStorybook();
                
                // UIHelper로 렌더링
                if (UIHelper) {
                    UIHelper.renderVocabularyImage(vocabImgDiv, imageUrl, {
                        word: word,
                        korean: korean,
                        isKeyObject: true,
                        reused: true
                    });
                } else {
                    const badge = '<span class="absolute top-1 right-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">핵심사물</span>';
                    vocabImgDiv.innerHTML = `<div class="relative w-full h-full">${badge}<img src="${imageUrl}" alt="${word}" class="w-full h-full object-cover rounded-lg"/></div>`;
                }
                
                console.log(`✅ Vocabulary image reused from Key Object: ${word}`);
                return { index: wordIndex, success: true, imageUrl: imageUrl, reused: true };
            }
        }
        
        // ⭐ 4. 매칭되는 이미지가 없으면 새로 생성
        console.log(`🎨 Generating new image for "${word}" (${korean})`);
        
        // 이 단어가 주요 사물인지 확인 (scene_structure)
        const allKeyObjects = [];
        currentStorybook.pages.forEach(page => {
            if (page.scene_structure && page.scene_structure.key_objects) {
                allKeyObjects.push(page.scene_structure.key_objects);
            }
        });
        const isKeyObject = allKeyObjects.some(objDesc => 
            objDesc && objDesc.toLowerCase().includes(korean.toLowerCase())
        );
        
        let prompt;
        let referenceImages = [];
        
        // 8단어 이미지는 Key Object만 참조하므로 캐릭터 매칭 로직 제거됨
        // 주요 사물인 경우 - scene_structure의 key_objects 설명 활용
        if (isKeyObject) {
            console.log(`🔑 Key object found for "${word}" (${korean})`);
            
            // key_objects에서 관련 설명 찾기
            const objectDescription = allKeyObjects.find(objDesc => 
                objDesc && objDesc.toLowerCase().includes(korean.toLowerCase())
            );
            
            prompt = `Create a simple, clear, educational illustration for a children's vocabulary learning card showing an important story object.

**Object to Illustrate:** ${word}${korean ? ` (${korean})` : ''}

**Object Description from Story:**
${objectDescription || '이 동화에서 중요한 역할을 하는 사물입니다.'}

**Art Style:** ${currentStorybook.artStyle} style for children's book illustration.

**Requirements:**
- Show the object clearly and simply
- Clean white background
- **Match the visual description from the story above**
- Bright, vibrant colors
- Child-friendly, appealing design
- Age-appropriate for 4-8 years old
- Focus on the object's distinctive features as described
- Make it consistent with how it appears in the storybook illustrations

**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, or captions in the image. Show ONLY the visual representation.

Create a single, clear object illustration that matches the storybook's visual style.`;
        }
        // 일반 단어인 경우 - 기본 프롬프트
        else {
            console.log(`📝 General word: "${word}" (${korean})`);
            
            // vocabularyPrompt 참조
            const customPrompt = currentStorybook.vocabularyPrompt ? `\n\n**Additional Requirements:**\n${currentStorybook.vocabularyPrompt}` : '';
            
            prompt = `Create a simple, clear educational illustration of: ${word}${korean ? ` (${korean})` : ''}

Requirements:
- Single object or concept clearly shown
- Clean, white background
- High contrast and vibrant colors
- Professional, educational style
- Suitable for children ages 4-8
- Art style: ${currentStorybook.artStyle}${customPrompt}

**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, or captions in the image. Show ONLY the visual representation of the word.

Example: For "Apple", show only a red apple fruit. No text.`;
        }

        // ImageService를 통해 이미지 생성
        const service = imageService || window.imageService;
        if (!service) {
            throw new Error('ImageService가 로드되지 않았습니다.');
        }
        
        const result = await service.generateVocabulary({
            word: word,
            korean: korean,
            prompt: prompt
        }, {
            model: imageSettings.vocabularyModel || 'gemini-3-pro-image-preview',
            aspectRatio: '1:1',
            storybookId: currentStorybook.id,
            storybookTitle: currentStorybook.title,
            onStart: (element) => {
                if (element) {
                    element.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-4"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-2"></div><p class="text-gray-600 text-xs">생성 중...</p></div>';
                }
            }
        });
        
        if (result && result.success && result.imageUrl) {
            const imageUrl = result.imageUrl;
            
            // vocabularyImages 배열 초기화
            if (!currentStorybook.vocabularyImages) {
                currentStorybook.vocabularyImages = new Array(currentStorybook.educational_content.vocabulary.length).fill(null);
            }
            
            currentStorybook.vocabularyImages[wordIndex] = {
                word: word,
                korean: korean,
                imageUrl: imageUrl,
                success: true,
                isCharacter: false,  // 8단어는 캐릭터 매칭 안 함
                isKeyObject: isKeyObject
            };
            
            // ⭐ vocabulary 객체에도 image 필드 추가 (게임용)
            if (typeof currentStorybook.educational_content.vocabulary[wordIndex] === 'object') {
                currentStorybook.educational_content.vocabulary[wordIndex].image = imageUrl;
                console.log(`✅ Added image URL to vocabulary[${wordIndex}].image: ${imageUrl}`);
            }
            
            saveCurrentStorybook();
            
            // UIHelper로 렌더링
            if (UIHelper) {
                UIHelper.renderVocabularyImage(vocabImgDiv, imageUrl, {
                    word: word,
                    korean: korean,
                    isKeyObject: isKeyObject,
                    reused: false
                });
            } else {
                const badge = isKeyObject ? '<span class="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">핵심사물</span>' : '';
                vocabImgDiv.innerHTML = `<div class="relative">${badge}<img src="${imageUrl}" alt="${word}" class="w-full h-full object-cover rounded-lg"/></div>`;
            }
            
            return { index: wordIndex, success: true, imageUrl: imageUrl };
        } else {
            const errorMsg = result?.error || 'ImageService에서 이미지 URL을 받지 못했습니다.';
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Vocabulary image generation error:', error);
        
        let errorMsg = error.message || '알 수 없는 오류';
        
        // 서버 에러 메시지 추출
        if (error.response && error.response.data && error.response.data.error) {
            errorMsg = error.response.data.error;
        }
        
        vocabImgDiv.innerHTML = `
            <div class="p-4 text-center">
                <i class="fas fa-exclamation-triangle text-red-600 text-xl mb-2"></i>
                <p class="text-red-600 text-xs font-bold mb-2">⚠️ 생성 실패</p>
                <p class="text-gray-500 text-xs mb-3">${errorMsg}</p>
                <button 
                    onclick="generateSingleVocabularyImage(${wordIndex})"
                    class="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                >
                    <i class="fas fa-redo mr-1"></i>재시도
                </button>
            </div>
        `;
        return { index: wordIndex, success: false, error: error.message };
    }
}

// 모든 단어 이미지 생성 (병렬)
/**
 * 모든 단어 이미지 병렬 생성 (간소화 버전)
 */
async function generateAllVocabularyImages() {
    const vocabulary = currentStorybook.educational_content?.vocabulary;
    
    if (!vocabulary || vocabulary.length === 0) {
        alert('단어 목록이 없습니다.');
        return;
    }
    
    if (!confirm(`${vocabulary.length}개의 단어 이미지를 병렬로 생성하시겠습니까?`)) {
        return;
    }
    
    console.log('🎨 모든 단어 이미지 병렬 생성 시작...');
    
    // 병렬 생성
    const results = await Promise.all(vocabulary.map((_, index) => generateSingleVocabularyImage(index)));
    
    // 결과 집계
    const successCount = results.filter(r => r?.success).length;
    const failCount = results.length - successCount;
    
    alert(failCount > 0 
        ? `단어 이미지 생성 완료!\n성공: ${successCount}개, 실패: ${failCount}개` 
        : `모든 단어 이미지 생성 완료! (${successCount}개)`
    );
}

// 모든 단어 이미지 다운로드
async function downloadAllVocabularyImages() {
    if (!currentStorybook.vocabularyImages || currentStorybook.vocabularyImages.length === 0) {
        alert('다운로드할 단어 이미지가 없습니다.');
        return;
    }
    
    const images = currentStorybook.vocabularyImages
        .filter(vocab => vocab && vocab.imageUrl)
        .map(vocab => ({
            url: vocab.imageUrl,
            filename: `단어_${vocab.word}.png`
        }));
    
    if (images.length === 0) {
        alert('다운로드할 단어 이미지가 없습니다.');
        return;
    }
    
    for (const img of images) {
        try {
            const downloadUrl = `/api/download-image?url=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.filename)}`;
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = img.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error('Download error:', error);
        }
    }
    
    showNotification('success', '다운로드 완료', `${images.length}개의 단어 이미지를 다운로드했습니다.`);
}

// 기존 함수 (호환성 유지)
async function generateVocabularyImages() {
    await generateAllVocabularyImages();
}

function viewVocabularyImage(index) {
    if (currentStorybook.vocabularyImages && currentStorybook.vocabularyImages[index]) {
        const vocabImg = currentStorybook.vocabularyImages[index];
        if (vocabImg && vocabImg.imageUrl) {
            window.open(vocabImg.imageUrl, '_blank');
        }
    }
}

// ===== 프롬프트 생성 함수들 =====

/**
 * 캐릭터 이미지 생성 프롬프트 빌드
 * @param {string} description - 캐릭터 설명
 * @param {string} artStyle - 그림체 스타일
 * @param {object} settings - 이미지 설정
 * @param {boolean} isRegeneration - 재생성 여부 (기존 이미지가 있는 경우)
 * @returns {string} - 완성된 프롬프트
 */
function buildCharacterPrompt(description, artStyle, settings, isRegeneration = false) {
    const noTextPrompt = settings.enforceNoText ? 
        '\n\n**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, captions, or titles anywhere in the image. Absolutely NO TEXT of any kind.' : 
        '\n\n**NO TEXT:** Do NOT include any text, labels, words, letters, or captions in the image.';
    
    // 재생성 안내 (기존 이미지가 있는 경우)
    const regenerationNote = isRegeneration ? 
        '\n\n**🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:**\n' +
        '**YOU MUST USE THE PROVIDED REFERENCE IMAGE AS YOUR PRIMARY GUIDE.**\n' +
        '1. CAREFULLY ANALYZE the reference image to understand:\n' +
        '   - Current character design, facial features, body proportions\n' +
        '   - Exact colors (clothing, hair, skin tone, accessories)\n' +
        '   - Art style, line work, and shading technique\n' +
        '   - Overall visual identity and character personality\n' +
        '2. MAINTAIN these exact elements from the reference:\n' +
        '   - Core character design and recognizability\n' +
        '   - Color palette (unless explicitly changed in description)\n' +
        '   - Art style consistency\n' +
        '3. ONLY modify what is explicitly mentioned in the updated character description below.\n' +
        '4. Keep everything else EXACTLY THE SAME as the reference image.\n' +
        '5. The goal is to make a recognizable update, not create a completely new character.\n\n' +
        '**Priority Order:**\n' +
        '1st: Reference Image (base design)\n' +
        '2nd: Updated Character Description (modifications only)\n' +
        '3rd: Art Style (already established in reference)' : 
        '';
    
    const prompt = `Create a professional character design reference sheet for a children's storybook character.

**Character Description:** ${description}
${regenerationNote}

**Art Style:** ${artStyle} style for children's book illustration, suitable for ages 4-8.

**Reference Sheet Layout:**
1. **Center (Front View):** Full-body front view of the character in a neutral standing pose. Show all details clearly.
2. **Side Views:** Three-quarter view and side profile showing the character's proportions and features from different angles.
3. **Expressions:** Three different facial expressions showing the character's personality and emotional range (happy, surprised, thoughtful).
4. **Details:** Clear, consistent details of clothing, colors, and distinctive features that make this character unique and recognizable.

**Background:** Clean white background with subtle grid or guidelines.

**Art Quality:** High-detail, professional children's book illustration quality. Vibrant, appealing colors. Clear, consistent character design suitable for multiple illustrations.

**Character Age Range:** Design appropriate for a children's storybook (ages 4-8).

**Image Aspect Ratio:** ${settings.aspectRatio}
${settings.additionalPrompt ? `\n\n**Additional Instructions:** ${settings.additionalPrompt}` : ''}
${noTextPrompt}`;

    return prompt;
}

/**
 * 페이지 삽화 이미지 생성 프롬프트 빌드
 * @param {object} page - 페이지 객체
 * @param {string} artStyle - 그림체 스타일
 * @param {Array<string>} characterReferences - 캐릭터 레퍼런스 이미지 URL 배열
 * @param {object} settings - 이미지 설정
 * @param {string} editNote - 수정사항 (선택)
 * @returns {string} - 완성된 프롬프트
 */
function buildIllustrationPrompt(page, artStyle, characterReferences, settings, editNote = '') {
    // 재생성 모드 확인
    const isRegeneration = !!page.illustrationImage;
    const hasEditNote = editNote && editNote.trim().length > 0;
    
    // 🎯 페이지에 등장하는 캐릭터 자동 감지
    const pageText = page.text || '';
    const sceneCharacters = (page.scene_structure && page.scene_structure.characters) || '';
    const editNoteText = editNote || '';
    
    // 모든 관련 텍스트 합치기
    const allText = `${pageText} ${sceneCharacters} ${editNoteText}`.toLowerCase();
    
    // 이 페이지에 등장하는 캐릭터만 필터링
    const relevantCharacters = characterReferences.filter(char => {
        const charName = char.name.toLowerCase();
        return allText.includes(charName) || 
               allText.includes(char.description.toLowerCase().split(' ')[0]);
    });
    
    // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
    const filteredCharacters = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;
    
    console.log(`👥 캐릭터 필터링: 전체 ${characterReferences.length}명 → 등장 ${filteredCharacters.length}명`);
    if (filteredCharacters.length < characterReferences.length) {
        console.log(`   등장 캐릭터: ${filteredCharacters.map(c => c.name).join(', ')}`);
    }
    
    // 🔄 재생성 모드: 이전 페이지 참조 제거, 현재 이미지 + editNote만 사용
    if (isRegeneration && hasEditNote) {
        console.log('🔄 재생성 모드: 이전 페이지 참조 제거, editNote 사용');
        
        // 캐릭터 정보
        let characterInfo = '';
        if (filteredCharacters.length > 0 && settings.enforceCharacterConsistency) {
            characterInfo = '\n\n**Character Consistency:**\nMatch character appearance from reference images (faces, clothing, proportions, colors).\n\n';
            filteredCharacters.forEach((char, index) => {
                if (char.referenceImage) {
                    characterInfo += `${index + 1}. ${char.name}: ${char.description}\n`;
                }
            });
        }
        
        const prompt = `Create a children's storybook illustration.

**🔄 REGENERATION with Modification:**
"${editNote}"

Use the current image reference to maintain visual style.
${characterInfo}
**Art Style:** ${artStyle}
**Aspect Ratio:** ${settings.aspectRatio}
**Target:** Children ages 4-8
${settings.additionalPrompt ? `\n**Additional:** ${settings.additionalPrompt}` : ''}

**NO TEXT:** Do not include any text or words in the image.`;

        return prompt;
    }
    
    // 장면 구조 정보 (강화)
    let sceneDetails = '';
    if (page.scene_structure) {
        const timeOfDay = page.scene_structure.time_of_day || '';
        const spatialLayout = page.scene_structure.spatial_layout || '';
        const background = page.scene_structure.background || '';
        const atmosphere = page.scene_structure.atmosphere || '';
        const characters = page.scene_structure.characters || '';
        
        sceneDetails = `\n\n**Scene Structure:**
- **Time:** ${timeOfDay}
- **Characters & Actions:** ${characters}
- **Spatial Layout:** ${spatialLayout}
- **Background:** ${background}
- **Atmosphere:** ${atmosphere}`;
    }
    
    // 캐릭터 레퍼런스 정보 (단순화)
    let characterInfo = '';
    if (filteredCharacters.length > 0 && settings.enforceCharacterConsistency) {
        characterInfo = '\n\n**Character Consistency:**\nMatch character appearance from reference images (faces, clothing, proportions, colors).\n\n';
        filteredCharacters.forEach((char, index) => {
            if (char.referenceImage) {
                characterInfo += `${index + 1}. ${char.name}: ${char.description}\n`;
            }
        });
    }
    
    // NO TEXT 프롬프트 (단순화)
    const noTextPrompt = '\n\n**NO TEXT:** Do not include any text, labels, or words in the image.';
    
    // 재생성 (editNote 없음)
    if (isRegeneration && !hasEditNote) {
        const prompt = `Create a children's storybook illustration.

**🔄 REGENERATION (Variation):**
Create a slight variation while maintaining the same scene.

**Scene Description:** ${page.scene_description}
${sceneDetails}
${characterInfo}
**Art Style:** ${artStyle}
**Aspect Ratio:** ${settings.aspectRatio}
**Target:** Children ages 4-8
${settings.additionalPrompt ? `\n**Additional:** ${settings.additionalPrompt}` : ''}
${noTextPrompt}`;

        return prompt;
    }
    
    // 신규 생성 (단순화)
    const prompt = `Create a children's storybook illustration.

**Scene Description:** ${page.scene_description}
${sceneDetails}
${characterInfo}
**Art Style:** ${artStyle}
**Aspect Ratio:** ${settings.aspectRatio}
**Target:** Children ages 4-8
${settings.additionalPrompt ? `\n**Additional:** ${settings.additionalPrompt}` : ''}
${noTextPrompt}`;

    return prompt;
}

// ===== 캐릭터 이미지 업로드 =====
// 캐릭터 레퍼런스 업로드 모달
let currentCharacterUploadIndex = null;
let currentCharacterUploadTab = 'file';


// 기존 uploadCharacterImage 함수 (사용하지 않음)
async function uploadCharacterImage_old(charIndex, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
    }
    
    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    try {
        const refDiv = document.getElementById(`char-ref-${charIndex}`);
        refDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-3"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div><p class="text-white text-sm font-semibold">이미지 업로드 중...</p></div>';
        
        // FileReader로 이미지를 Base64로 변환
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            
            // Blob URL로 변환 (로컬 저장용)
            const response = await fetch(base64);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // 캐릭터 레퍼런스 이미지 저장
            currentStorybook.characters[charIndex].referenceImage = blobUrl;
            saveCurrentStorybook();
            
            // UI 업데이트
            refDiv.innerHTML = `<img src="${blobUrl}" alt="${currentStorybook.characters[charIndex].name}" class="w-full h-full object-cover rounded-lg"/>`;
            
            // 다운로드 버튼 추가
            const charCard = refDiv.closest('.character-card');
            if (charCard) {
                const existingDownloadBtn = charCard.querySelector('.download-char-btn');
                if (!existingDownloadBtn) {
                    const promptTextarea = charCard.querySelector(`#char-prompt-${charIndex}`);
                    if (promptTextarea) {
                        const downloadBtn = document.createElement('button');
                        downloadBtn.className = 'w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition mb-2 download-char-btn';
                        downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>이미지 다운로드';
                        downloadBtn.onclick = () => downloadImage(blobUrl, `캐릭터_${currentStorybook.characters[charIndex].name}.png`);
                        promptTextarea.parentNode.insertBefore(downloadBtn, promptTextarea);
                    }
                }
            }
            
            console.log(`✅ 캐릭터 "${currentStorybook.characters[charIndex].name}" 이미지 업로드 완료`);
        };
        
        reader.onerror = () => {
            refDiv.innerHTML = '<div class="p-4 text-center"><p class="text-white text-xs">⚠️ 이미지 업로드 실패</p></div>';
            alert('이미지 업로드 중 오류가 발생했습니다.');
        };
        
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Upload error:', error);
        alert('이미지 업로드 중 오류가 발생했습니다: ' + error.message);
    }
}

// ===== 다시 만들기 모달 =====
function openRegenerateModal() {
    if (!currentStorybook) {
        alert('동화책이 생성되지 않았습니다.');
        return;
    }
    
    // 현재 값으로 모달 필드 채우기
    document.getElementById('regenerateTitle').value = currentStorybook.title;
    document.getElementById('regenerateAge').value = currentStorybook.targetAge;
    document.getElementById('regeneratePages').value = currentStorybook.pages.length;
    document.getElementById('regenerateArtStyle').value = currentStorybook.artStyle;
    document.getElementById('regenerateNotes').value = '';
    
    // 모달 표시
    document.getElementById('regenerateModal').classList.remove('hidden');
}

function closeRegenerateModal() {
    document.getElementById('regenerateModal').classList.add('hidden');
}

async function executeRegenerate() {
    const title = document.getElementById('regenerateTitle').value.trim();
    const targetAge = document.getElementById('regenerateAge').value;
    const totalPages = parseInt(document.getElementById('regeneratePages').value) || 0; // 0 = AI 자동 결정
    const geminiModel = document.getElementById('regenerateModel').value; // AI 모델 선택
    const artStyle = document.getElementById('regenerateArtStyle').value.trim();
    const notes = document.getElementById('regenerateNotes').value.trim();
    
    if (!title) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    // 페이지 수 검증 (0은 자동, 1-30은 사용자 지정)
    if (totalPages < 0 || totalPages > 30) {
        alert('페이지 수는 0(자동) 또는 1-30 사이여야 합니다.');
        return;
    }
    
    if (!confirm('현재 동화책의 캐릭터는 유지하고 스토리만 다시 생성하시겠습니까?')) {
        return;
    }
    
    try {
        // 모달 닫기
        closeRegenerateModal();
        
        // 로딩 표시
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('storybookResult').innerHTML = '';
        
        // 기존 캐릭터 정보 저장
        const existingCharacters = currentStorybook.characters;
        
        // 서버에 재생성 요청
        const response = await axios.post('/api/generate-storybook', {
            title: title,
            targetAge: targetAge,
            totalPages: totalPages,
            geminiModel: geminiModel, // AI 모델 전달
            artStyle: artStyle,
            languages: ['ko'], // 무조건 한국어만
            referenceContent: notes, // 수정 요청사항을 참고 내용으로 전달
            existingCharacters: existingCharacters.map(char => ({
                name: char.name,
                role: char.role,
                description: char.description
            }))
        });
        
        // 응답 형식 확인
        const newStorybook = response.data.storybook || response.data;
        
        // 기존 캐릭터의 레퍼런스 이미지 복원
        if (newStorybook && newStorybook.characters) {
            newStorybook.characters.forEach((char, index) => {
                if (existingCharacters[index] && existingCharacters[index].referenceImage) {
                    char.referenceImage = existingCharacters[index].referenceImage;
                }
            });
        }
        
        // 현재 동화책 업데이트
        currentStorybook = newStorybook;
        saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        // 로딩 숨기기
        document.getElementById('loading').classList.add('hidden');
        
        alert('동화책이 성공적으로 재생성되었습니다!');
    } catch (error) {
        console.error('Regeneration error:', error);
        document.getElementById('loading').classList.add('hidden');
        alert('동화책 재생성 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
    }
}

// ==================== 퀴즈 관련 함수 ====================

// 퀴즈 생성
async function generateQuiz(count = 5) {
    const quizContainer = document.getElementById('quiz-container');
    
    try {
        // 로딩 UI 렌더링
        quizService.renderLoadingUI(quizContainer, currentStorybook);
        
        // 퀴즈 생성
        const quizzes = await quizService.generateQuiz(currentStorybook, count);
        
        // quizzes 배열 초기화 (없으면)
        if (!currentStorybook.quizzes) {
            currentStorybook.quizzes = [];
        }
        
        // 새로운 퀴즈 추가
        currentStorybook.quizzes.push(...quizzes);
        
        // 저장
        saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
    } catch (error) {
        console.error('퀴즈 생성 오류:', error);
        alert(error.message);
        
        // 에러 UI 렌더링
        quizService.renderErrorUI(quizContainer, error);
    }
}

// 퀴즈 정답 보기
function showQuizAnswer(quizIndex) {
    const explanationDiv = document.getElementById(`quiz-explanation-${quizIndex}`);
    if (explanationDiv) {
        explanationDiv.classList.toggle('hidden');
    }
}

// 퀴즈 삭제
function deleteQuiz(quizIndex) {
    if (confirm('이 퀴즈를 삭제하시겠습니까?')) {
        currentStorybook.quizzes.splice(quizIndex, 1);
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
    }
}

// ==================== Key Objects 관련 함수 ====================

/**
 * 동화책의 핵심 사물(Key Objects)을 AI로 자동 생성
 */
async function generateKeyObjectsForStorybook() {
    if (!currentStorybook) {
        alert('동화책을 먼저 선택해주세요.');
        return;
    }

    const existingCount = currentStorybook.key_objects?.length || 0;
    
    if (existingCount > 0) {
        if (!confirm(`이미 ${existingCount}개의 핵심 사물이 있습니다.\n기존 핵심 사물을 모두 삭제하고 새로 생성하시겠습니까?`)) {
            return;
        }
    } else {
        if (!confirm(`이 동화책의 핵심 사물을 AI로 자동 생성하시겠습니까?\n\n동화책 내용을 분석하여 주요 사물 8개를 생성합니다.`)) {
            return;
        }
    }

    try {
        console.log('🎯 핵심 사물 자동 생성 시작:', currentStorybook.title);

        // 로딩 표시
        showNotification('info', '핵심 사물 생성 중...', '동화책 내용을 분석하고 있습니다. 잠시만 기다려주세요.');

        // API 호출
        const response = await api.post('/api/generate-key-objects', {
            storybookId: currentStorybook.id,
            title: currentStorybook.title,
            pages: currentStorybook.pages,
            targetAge: currentStorybook.targetAge,
            overwrite: existingCount > 0
        });

        if (response.success && response.keyObjects) {
            // Key Objects 저장
            currentStorybook.key_objects = response.keyObjects;
            currentStorybook.keyObjectImages = []; // 이미지는 나중에 생성
            
            saveCurrentStorybook();
            displayStorybook(currentStorybook);

            console.log('✅ 핵심 사물 생성 완료:', response.keyObjects.length, '개');
            showNotification('success', '핵심 사물 생성 완료!', `${response.keyObjects.length}개의 핵심 사물이 생성되었습니다.\n이제 "모든 이미지 생성" 버튼을 눌러 이미지를 만드세요.`);
        } else {
            throw new Error(response.message || '핵심 사물 생성 실패');
        }
    } catch (error) {
        console.error('❌ 핵심 사물 생성 오류:', error);
        showNotification('error', '생성 실패', `핵심 사물을 생성할 수 없습니다.\n\n오류: ${error.message}`);
    }
}

// Key Object 필드 업데이트
function updateKeyObjectField(objIndex, field, value) {
    if (!currentStorybook.key_objects || !currentStorybook.key_objects[objIndex]) return;
    
    currentStorybook.key_objects[objIndex][field] = value;
    saveCurrentStorybook();
}

// Key Object 단일 이미지 생성
/**
 * Key Object 이미지 생성 (KeyObjectGenerator 사용)
 */
async function generateSingleKeyObjectImage(objIndex) {
    const generator = new KeyObjectGenerator({
        storybook: currentStorybook,
        imageService: imageService || window.imageService,
        imageSettings: imageSettings,
        saveCallback: saveCurrentStorybook
    });

    return await generator.generate(objIndex);
}

/**
 * 모든 Key Object 이미지 생성 (KeyObjectGenerator 사용)
 */
async function generateAllKeyObjectImages() {
    console.log('🎯 generateAllKeyObjectImages 호출됨');
    console.log('📖 currentStorybook:', currentStorybook?.title);

    const generator = new KeyObjectGenerator({
        storybook: currentStorybook,
        imageService: imageService || window.imageService,
        imageSettings: imageSettings,
        saveCallback: saveCurrentStorybook
    });

    return await generator.generateAll();
}

// 모든 Key Object 이미지 다운로드
function downloadAllKeyObjectImages() {
    if (!currentStorybook || !currentStorybook.keyObjectImages) {
        alert('다운로드할 Key Object 이미지가 없습니다.');
        return;
    }
    
    const images = currentStorybook.keyObjectImages.filter(img => img && img.imageUrl);
    
    if (images.length === 0) {
        alert('다운로드할 Key Object 이미지가 없습니다.');
        return;
    }
    
    images.forEach((img, index) => {
        setTimeout(() => {
            downloadImage(img.imageUrl, `keyobject_${img.name}.png`);
        }, index * 500);
    });
    
    alert(`${images.length}개의 Key Object 이미지 다운로드를 시작합니다.`);
}

// Key Object 참조 토글 (페이지 삽화 생성 시)
function toggleKeyObjectReference(pageIndex, objIndex) {
    const checkbox = document.getElementById(`ref-keyobj-check-${pageIndex}-${objIndex}`);
    const img = document.getElementById(`ref-keyobj-${pageIndex}-${objIndex}`);
    
    if (checkbox && img) {
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            img.classList.remove('border-orange-300');
            img.classList.add('border-orange-600', 'border-4');
        } else {
            img.classList.remove('border-orange-600', 'border-4');
            img.classList.add('border-orange-300');
        }
    }
}

// Key Object 추가
async function addNewKeyObject() {
    try {
        const keyObject = await characterManager.addKeyObject(currentStorybook, getAPIKey);
        
        if (keyObject) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            
            if (keyObject.description.includes('🔄') === false) {
                showNotification('success', '핵심 사물 추가 완료!', `"${keyObject.name}"의 설명과 예문이 자동 생성되었습니다.`);
            }
        }
    } catch (error) {
        console.error('❌ Key Object 추가 실패:', error);
        alert(`설명 자동 생성에 실패했습니다.\n수동으로 설명과 예문을 입력해주세요.\n\n오류: ${error.message}`);
        
        // 실패해도 화면 업데이트
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
    }
}

// Key Object 삭제
function deleteKeyObject(objIndex) {
    try {
        const deleted = characterManager.deleteKeyObject(currentStorybook, objIndex);
        if (deleted) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            alert('Key Object가 삭제되었습니다.');
        }
    } catch (error) {
        console.error('❌ Key Object 삭제 실패:', error);
        alert(error.message);
    }
}

// 핵심 단어 이미지 일괄 업로드
async function bulkUploadKeyObjectImages() {
    if (!currentStorybook || !currentStorybook.key_objects || currentStorybook.key_objects.length === 0) {
        alert('핵심 사물이 없습니다. 먼저 핵심 사물을 추가해주세요.');
        return;
    }
    
    // 파일 입력 요소 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
            return;
        }
        
        // 핵심 사물을 가나다순으로 정렬
        const sortedKeyObjects = currentStorybook.key_objects
            .map((obj, idx) => ({ obj, originalIdx: idx }))
            .sort((a, b) => {
                const nameA = (a.obj.korean || a.obj.name).toLowerCase();
                const nameB = (b.obj.korean || b.obj.name).toLowerCase();
                return nameA.localeCompare(nameB, 'ko');
            });
        
        // 파일을 이름순으로 정렬
        files.sort((a, b) => a.name.localeCompare(b.name));
        
        if (files.length !== sortedKeyObjects.length) {
            const proceed = confirm(
                `⚠️ 파일 개수(${files.length}개)와 핵심 사물 개수(${sortedKeyObjects.length}개)가 일치하지 않습니다.\n\n` +
                `가나다순 매칭:\n` +
                sortedKeyObjects.slice(0, Math.min(files.length, 5)).map((item, i) => 
                    `${i + 1}. ${files[i]?.name || '없음'} → ${item.obj.korean || item.obj.name}`
                ).join('\n') +
                (sortedKeyObjects.length > 5 ? `\n...\n` : '') +
                `\n\n계속하시겠습니까?`
            );
            
            if (!proceed) {
                return;
            }
        }
        
        // 업로드 진행
        showNotification('info', '일괄 업로드 시작', `${files.length}개 파일 업로드 중...`);
        
        // keyObjectImages 배열 초기화
        if (!currentStorybook.keyObjectImages) {
            currentStorybook.keyObjectImages = [];
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < Math.min(files.length, sortedKeyObjects.length); i++) {
            const file = files[i];
            const { obj, originalIdx } = sortedKeyObjects[i];
            
            try {
                console.log(`📤 업로드 중 (${i + 1}/${files.length}): ${file.name} → ${obj.korean || obj.name}`);
                
                // Base64로 변환
                const base64 = await fileToBase64(file);
                
                // R2에 업로드
                const response = await axios.post('/api/upload-image', {
                    image: base64,
                    filename: `keyobject-${currentStorybook.id}-${originalIdx}-${Date.now()}.png`
                }, {
                    headers: {
                        'X-API-Key': getAPIKey()
                    }
                });
                
                if (response.data.success) {
                    // keyObjectImages 배열에 저장 (원래 인덱스 위치에)
                    currentStorybook.keyObjectImages[originalIdx] = {
                        imageUrl: response.data.url,
                        uploadedAt: new Date().toISOString()
                    };
                    
                    successCount++;
                    console.log(`✅ 업로드 성공: ${obj.korean || obj.name}`);
                } else {
                    failCount++;
                    console.error(`❌ 업로드 실패: ${obj.korean || obj.name}`);
                }
                
            } catch (error) {
                failCount++;
                console.error(`❌ 업로드 오류: ${obj.korean || obj.name}`, error);
            }
        }
        
        // 저장 및 화면 업데이트
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
        
        // 결과 알림
        if (failCount === 0) {
            showNotification('success', '일괄 업로드 완료!', `${successCount}개 이미지가 성공적으로 업로드되었습니다.`);
        } else {
            showNotification('warning', '일괄 업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
        }
    };
    
    input.click();
}

// 파일을 Base64로 변환하는 헬퍼 함수
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 모든 페이지의 참조 이미지 섹션 새로고침
function refreshAllPageReferenceImages() {
    console.log('🔄 Refreshing all page reference images...');
    
    // displayStorybook을 다시 호출하여 전체 UI 갱신
    // 이렇게 하면 모든 페이지의 Key Object 참조 이미지가 업데이트됨
    displayStorybook(currentStorybook);
}

// 8단어 TXT 다운로드
function downloadVocabularyTxt() {
    if (!currentStorybook || !currentStorybook.educational_content || !currentStorybook.educational_content.vocabulary) {
        alert('다운로드할 단어가 없습니다.');
        return;
    }
    
    const vocabulary = currentStorybook.educational_content.vocabulary;
    let txtContent = `========================================\n`;
    txtContent += `   ${currentStorybook.title} - 영어 단어 학습\n`;
    txtContent += `========================================\n\n`;
    txtContent += `대상 연령: ${currentStorybook.targetAge}세\n`;
    txtContent += `생성 일시: ${new Date(currentStorybook.createdAt).toLocaleString('ko-KR')}\n`;
    txtContent += `총 단어 수: ${vocabulary.length}개\n\n`;
    txtContent += `========================================\n\n`;
    
    vocabulary.forEach((vocabItem, index) => {
        const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
        const korean = typeof vocabItem === 'object' ? vocabItem.korean : '';
        const definition = typeof vocabItem === 'object' ? vocabItem.definition : '';
        const example = typeof vocabItem === 'object' ? vocabItem.example : '';
        
        txtContent += `${index + 1}. ${word}${korean ? ` (${korean})` : ''}\n`;
        txtContent += `${'='.repeat(50)}\n`;
        
        if (definition) {
            txtContent += `\n[설명]\n${definition}\n`;
        }
        
        if (example) {
            txtContent += `\n[예문]\n${example}\n`;
        }
        
        txtContent += `\n\n`;
    });
    
    txtContent += `========================================\n`;
    txtContent += `파일 생성: ${new Date().toLocaleString('ko-KR')}\n`;
    txtContent += `========================================\n`;
    
    // TXT 파일 다운로드
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_영어단어학습_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`✅ Vocabulary TXT downloaded: ${vocabulary.length} words`);
}

// ========================================
// Review 모달 관련 함수들
// ========================================

let reviewStorybookData = null;
let reviewSelectedLanguages = [];
let reviewDraggedElement = null;
let reviewDraggedLang = null;
let reviewDraggedPageIdx = null;

// Review 모달 열기
function openReviewModal(storybookData) {
    reviewStorybookData = storybookData;
    reviewSelectedLanguages = storybookData.languages || ['ko', 'en'];
    
    // UI 렌더링
    renderReviewHeader();
    renderReviewLanguageTabs();
    renderReviewLanguageContents();
    
    // 모달 표시
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    console.log('📖 Review 모달 열림:', storybookData.title);
}

// Review 모달 닫기
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
    
    console.log('📖 Review 모달 닫힘');
}

// Review 헤더 렌더링
function renderReviewHeader() {
    document.getElementById('reviewStoryTitle').textContent = reviewStorybookData.title;
    document.getElementById('reviewTargetAge').textContent = `${reviewStorybookData.targetAge}세 대상`;
    document.getElementById('reviewTotalPages').textContent = `${reviewStorybookData.pages?.length || 0}페이지`;
    
    // 카테고리 선택 초기화
    const categorySelect = document.getElementById('storybookCategory');
    if (categorySelect) {
        categorySelect.value = reviewStorybookData.category || '';
    }
}

// Review 언어 탭 렌더링
function renderReviewLanguageTabs() {
    const tabsContainer = document.getElementById('reviewLanguageTabs');
    const languageNames = {
        'ko': '🇰🇷 한국어',
        'en': '🇺🇸 English',
        'zh': '🇨🇳 中文',
        'ja': '🇯🇵 日本語',
        'es': '🇪🇸 Español',
        'fr': '🇫🇷 Français'
    };

    tabsContainer.innerHTML = reviewSelectedLanguages.map((lang, idx) => `
        <button 
            class="tab-button px-4 py-2 rounded-lg font-semibold border-2 border-purple-300 text-sm ${idx === 0 ? 'active' : ''}"
            onclick="switchReviewLanguage('${lang}')"
            data-lang="${lang}"
        >
            ${languageNames[lang] || lang}
        </button>
    `).join('');
}

// Review 언어별 콘텐츠 렌더링
function renderReviewLanguageContents() {
    const contentsContainer = document.getElementById('reviewLanguageContents');
    
    contentsContainer.innerHTML = reviewSelectedLanguages.map((lang, idx) => {
        // translations[lang] 또는 기본 pages 사용
        let pages = [];
        
        if (lang === 'ko') {
            // 한국어는 기본 pages 사용
            pages = reviewStorybookData.pages || [];
        } else {
            // 다른 언어는 translations[lang] 사용
            const translation = reviewStorybookData.translations?.[lang];
            
            if (translation && Array.isArray(translation) && translation.length > 0) {
                pages = translation;
            } else if (translation && typeof translation === 'object' && !Array.isArray(translation)) {
                // 객체 형태 translations (키: 페이지 인덱스)
                pages = Object.keys(translation)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(key => translation[key]);
            } else {
                // 번역이 없으면 빈 배열
                pages = [];
            }
        }
        
        // 페이지가 없는 경우 메시지 표시
        if (pages.length === 0) {
            return `
                <div class="language-content ${idx === 0 ? 'active' : ''}" data-lang="${lang}">
                    <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                        <i class="fas fa-exclamation-triangle text-yellow-600 text-2xl mb-2"></i>
                        <p class="text-yellow-800 font-semibold">
                            ${lang === 'ko' ? '텍스트가 없습니다.' : `${lang.toUpperCase()} 텍스트가 없습니다.`}
                        </p>
                        <p class="text-yellow-600 text-sm mt-1">
                            번역을 생성해주세요.
                        </p>
                    </div>
                    
                    <!-- 페이지 추가 버튼 -->
                    <div class="mt-3">
                        <button 
                            onclick="addReviewNewPage('${lang}')"
                            class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition shadow-md text-sm"
                        >
                            <i class="fas fa-plus mr-2"></i>
                            새 페이지 추가
                        </button>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="language-content ${idx === 0 ? 'active' : ''}" data-lang="${lang}">
                <div id="review-pages-container-${lang}" class="space-y-2">
                    ${pages.map((page, pageIdx) => {
                        // 페이지 텍스트 추출 (객체 또는 문자열)
                        let pageText = '';
                        let illustrationPrompt = '';
                        
                        if (typeof page === 'string') {
                            pageText = page;
                        } else if (page && typeof page === 'object') {
                            pageText = page.text || '';
                            // 한국어인 경우에만 장면 설명 가져오기 (번역본에는 없음)
                            if (lang === 'ko') {
                                illustrationPrompt = page.illustrationPrompt || '';
                            }
                        }
                        
                        return `
                        <div 
                            class="page-item bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-purple-300"
                            data-lang="${lang}"
                            data-page-idx="${pageIdx}"
                            draggable="true"
                            ondragstart="handleReviewDragStart(event)"
                            ondragover="handleReviewDragOver(event)"
                            ondrop="handleReviewDrop(event)"
                            ondragend="handleReviewDragEnd(event)"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-grip-vertical text-gray-400 cursor-move text-sm"></i>
                                    <h4 class="text-sm font-bold text-gray-700">
                                        <i class="fas fa-file-alt mr-1 text-purple-600 text-xs"></i>
                                        페이지 ${page.pageNumber || pageIdx + 1}
                                    </h4>
                                </div>
                                <button 
                                    onclick="deleteReviewPage('${lang}', ${pageIdx})"
                                    class="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition text-xs"
                                >
                                    <i class="fas fa-trash mr-1"></i>삭제
                                </button>
                            </div>
                            
                            <!-- 스토리 텍스트 -->
                            <div class="mb-2">
                                <label class="block text-xs font-semibold text-gray-600 mb-1">
                                    <i class="fas fa-book-open mr-1"></i>스토리 텍스트
                                </label>
                                <textarea
                                    id="review-page-text-${lang}-${pageIdx}"
                                    class="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition resize-y text-sm"
                                    rows="2"
                                    onchange="updateReviewPageText('${lang}', ${pageIdx}, this.value)"
                                >${pageText}</textarea>
                            </div>
                            
                            ${lang === 'ko' && illustrationPrompt ? `
                            <!-- 장면 설명 (한국어만) -->
                            <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-2">
                                <label class="block text-xs font-semibold text-blue-700 mb-1">
                                    <i class="fas fa-palette mr-1"></i>장면 설명
                                </label>
                                <textarea
                                    id="review-page-prompt-${lang}-${pageIdx}"
                                    class="w-full p-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-y text-xs bg-white"
                                    rows="2"
                                    onchange="updateReviewPagePrompt('${lang}', ${pageIdx}, this.value)"
                                >${illustrationPrompt}</textarea>
                            </div>
                            ` : ''}
                            
                            <p class="text-[10px] text-gray-400 mt-1">
                                <i class="fas fa-info-circle mr-1"></i>
                                텍스트 수정 후 다른 곳 클릭 시 자동 저장
                            </p>
                        </div>
                    `;
                    }).join('')}
                </div>
                
                <!-- 페이지 추가 버튼 -->
                <div class="mt-3">
                    <button 
                        onclick="addReviewNewPage('${lang}')"
                        class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition shadow-md text-sm"
                    >
                        <i class="fas fa-plus mr-2"></i>
                        새 페이지 추가
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Review 언어 전환
function switchReviewLanguage(lang) {
    // 탭 활성화
    document.querySelectorAll('#reviewLanguageTabs .tab-button').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 콘텐츠 표시
    document.querySelectorAll('#reviewLanguageContents .language-content').forEach(content => {
        if (content.dataset.lang === lang) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Review 페이지 텍스트 업데이트
function updateReviewPageText(lang, pageIdx, newText) {
    // 데이터 업데이트
    if (!reviewStorybookData.translations) {
        reviewStorybookData.translations = {};
    }
    if (!reviewStorybookData.translations[lang]) {
        reviewStorybookData.translations[lang] = reviewStorybookData.pages || [];
    }
    
    reviewStorybookData.translations[lang][pageIdx].text = newText.trim();
    
    console.log(`✅ Review 페이지 ${pageIdx + 1} (${lang}) 텍스트 업데이트됨`);
}

// Review 페이지 장면 설명 업데이트
function updateReviewPagePrompt(lang, pageIdx, newPrompt) {
    // 한국어 페이지만 장면 설명 수정 가능
    if (lang !== 'ko') return;
    
    // 실제 pages 데이터 업데이트
    if (reviewStorybookData.pages && reviewStorybookData.pages[pageIdx]) {
        reviewStorybookData.pages[pageIdx].illustrationPrompt = newPrompt.trim();
        console.log(`✅ Review 페이지 ${pageIdx + 1} 장면 설명 업데이트됨`);
    }
}

// Review 페이지 삭제
function deleteReviewPage(lang, pageIdx) {
    // PageManager 사용
    const deleted = pageManager.deleteReviewPage(reviewStorybookData, lang, pageIdx);
    
    if (deleted) {
        // UI 재렌더링
        renderReviewLanguageContents();
    }
}

// Review 새 페이지 추가
function addReviewNewPage(lang) {
    // PageManager 사용
    const result = pageManager.addReviewNewPage(reviewStorybookData, lang);
    
    if (result) {
        // UI 재렌더링
        renderReviewLanguageContents();
        
        // 새로 추가된 페이지로 스크롤
        setTimeout(() => {
            const newPageElement = document.querySelector(`#reviewLanguageContents [data-lang="${lang}"][data-page-idx="${result.pageIndex}"]`);
            if (newPageElement) {
                newPageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newPageElement.querySelector('textarea')?.focus();
            }
        }, 100);
    }
}

// Review 드래그 시작
function handleReviewDragStart(event) {
    reviewDraggedElement = event.target.closest('.page-item');
    reviewDraggedLang = reviewDraggedElement.dataset.lang;
    reviewDraggedPageIdx = parseInt(reviewDraggedElement.dataset.pageIdx);
    
    reviewDraggedElement.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', reviewDraggedElement.innerHTML);
}

// Review 드래그 오버
function handleReviewDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }
    event.dataTransfer.dropEffect = 'move';
    
    const target = event.target.closest('.page-item');
    if (target && target !== reviewDraggedElement) {
        target.classList.add('drag-over');
    }
    
    return false;
}

// Review 드롭
function handleReviewDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    
    const targetElement = event.target.closest('.page-item');
    if (!targetElement || targetElement === reviewDraggedElement) {
        return false;
    }
    
    const targetLang = targetElement.dataset.lang;
    const targetPageIdx = parseInt(targetElement.dataset.pageIdx);
    
    // 같은 언어 내에서만 순서 변경 가능
    if (reviewDraggedLang !== targetLang) {
        alert('같은 언어 내에서만 순서를 변경할 수 있습니다.');
        return false;
    }
    
    // 데이터 순서 변경
    const pages = reviewStorybookData.translations?.[reviewDraggedLang] || reviewStorybookData.pages || [];
    const [movedPage] = pages.splice(reviewDraggedPageIdx, 1);
    pages.splice(targetPageIdx, 0, movedPage);
    
    // 페이지 번호 재정렬
    pages.forEach((page, idx) => {
        page.pageNumber = idx + 1;
    });
    
    // UI 재렌더링
    renderReviewLanguageContents();
    
    console.log(`✅ Review 페이지 순서 변경: ${reviewDraggedPageIdx + 1} → ${targetPageIdx + 1}`);
    
    return false;
}

// Review 드래그 종료
function handleReviewDragEnd(event) {
    const allItems = document.querySelectorAll('#reviewLanguageContents .page-item');
    allItems.forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
}

// Review 검토 완료 (모달에서)
async function completeReviewFromModal() {
    if (!confirm('검토를 완료하고 저장하시겠습니까?')) {
        return;
    }

    // 로딩 표시
    const btn = document.getElementById('reviewCompleteBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>저장 중...';

    try {
        // currentStorybook 업데이트
        currentStorybook = reviewStorybookData;
        
        // 동화책 목록에서 찾아서 업데이트
        const index = storybooks.findIndex(s => s && s.id === currentStorybook.id);
        if (index !== -1) {
            storybooks[index] = currentStorybook;
        } else {
            storybooks.push(currentStorybook);
        }
        
        // localStorage에 저장
        saveStorybooks();
        
        // 모달 닫기
        closeReviewModal();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        renderBookList();
        
        showNotification('✅ 동화책이 저장되었습니다!', 'success');
        
        console.log('✅ Review 완료 및 저장됨');
    } catch (error) {
        console.error('Review 저장 오류:', error);
        alert(`❌ 저장에 실패했습니다.\n${error.message}`);
    } finally {
        // 항상 버튼 복구
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ========================================
// 언어 전환 관련 함수들
// ========================================

// 언어 전환
function switchLanguage(lang) {
    window.window.currentLanguage = lang;
    console.log(`🌐 언어 전환: ${lang}`);
    
    // 페이지 다시 렌더링
    if (currentStorybook) {
        displayStorybook(currentStorybook);
    }
}

// 현재 언어에 해당하는 페이지 텍스트 가져오기
function getPageText(page, lang) {
    if (!currentStorybook || !currentStorybook.translations) {
        return page.text || '';
    }
    
    const translations = currentStorybook.translations[lang];
    if (!translations || !Array.isArray(translations)) {
        return page.text || '';
    }
    
    // 페이지 번호로 찾기
    const translatedPage = translations.find(p => p.pageNumber === page.pageNumber);
    return translatedPage ? translatedPage.text : (page.text || '');
}

// 현재 언어에 해당하는 TTS URL 가져오기
function getPageTTS(page, lang) {
    if (!page) return null;
    
    // 한국어인 경우
    if (lang === 'ko') {
        return page.audioUrl || page.ttsAudio?.url || null;
    }
    
    // 다른 언어인 경우
    if (page.ttsAudio && page.ttsAudio[lang]) {
        return page.ttsAudio[lang].url || null;
    }
    
    return null;
}

// 동화책 뷰어 열기
function openReader(bookId) {
    console.log('📖 openReader 호출됨, bookId:', bookId);
    
    const book = storybooks.find(b => b.id === bookId);
    if (!book) {
        console.error('❌ 동화책을 찾을 수 없습니다. bookId:', bookId);
        alert('동화책을 찾을 수 없습니다.');
        return;
    }
    
    console.log('✅ 동화책 발견:', book.title);
    
    // localStorage quota 문제 해결: bookId만 저장
    try {
        localStorage.setItem('temp_reader_book_id', bookId);
        console.log('💾 localStorage에 bookId 저장 완료');
        // reader.html로 이동
        const newWindow = window.open('/reader.html', '_blank');
        if (!newWindow) {
            console.error('❌ 새 창 열기 실패 (팝업 차단?)');
            alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        } else {
            console.log('✅ reader.html 새 창 열기 성공');
        }
    } catch (e) {
        // localStorage 실패 시 URL 파라미터 사용
        console.error('❌ localStorage 오류:', e);
        const newWindow = window.open(`/reader.html?id=${bookId}`, '_blank');
        if (!newWindow) {
            console.error('❌ 새 창 열기 실패 (팝업 차단?)');
            alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        }
    }
}

// 퀴즈 페이지 열기
function openQuiz(bookId) {
    const book = storybooks.find(b => b.id === bookId);
    if (!book) {
        alert('동화책을 찾을 수 없습니다.');
        return;
    }
    
    // 퀴즈가 있는지 확인
    if (!book.educational_content || !book.educational_content.comprehension_questions || book.educational_content.comprehension_questions.length === 0) {
        if (confirm('이 동화책에는 아직 퀴즈가 없습니다.\n퀴즈를 생성하시겠습니까?')) {
            // 퀴즈 생성 페이지로 이동하거나 생성 함수 호출
            alert('퀴즈 생성 기능은 준비 중입니다.');
        }
        return;
    }
    
    // 퀴즈 데이터를 localStorage에 임시 저장
    localStorage.setItem('temp_quiz_book', JSON.stringify(book));
    
    // quiz.html로 이동
    window.open('/quiz.html', '_blank');
}

// 페이지별 번역 함수
async function translateSinglePage(pageIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) {
        alert('페이지를 찾을 수 없습니다.');
        return;
    }
    
    // 번역 버튼 찾기
    const translateBtn = document.querySelector(`[data-translate-page="${pageIndex}"]`);
    if (translateBtn) {
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>번역 중...';
    }
    
    try {
        // TranslationService 호출
        const result = await translationService.translateSinglePage(currentStorybook, pageIndex, window.currentLanguage);
        
        // ✅ 실시간 UI 업데이트 - 해당 페이지의 textarea만 업데이트 (전체 리렌더링 방지)
        const pageTextarea = document.querySelector(`textarea[onchange*="updatePageText(${pageIndex},"]`);
        if (pageTextarea) {
            pageTextarea.value = result.translatedText;
            console.log(`🔄 페이지 ${currentStorybook.pages[pageIndex].pageNumber} textarea 업데이트 완료`);
        }
        
        // 저장
        saveCurrentStorybook();
        
        // 버튼 복원
        if (translateBtn) {
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="fas fa-language mr-1"></i>번역';
        }
        
        showNotification('success', '번역 완료', `페이지 ${currentStorybook.pages[pageIndex].pageNumber} 번역이 완료되었습니다.`);
    } catch (error) {
        console.error('페이지 번역 실패:', error);
        alert(`번역 실패: ${error.message}`);
        
        // 버튼 복원
        if (translateBtn) {
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="fas fa-language mr-1"></i>번역';
        }
    }
}

// 모든 페이지 순차 번역
async function translateAllPages() {
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    if (window.currentLanguage === 'ko') {
        alert('한국어는 번역할 필요가 없습니다.');
        return;
    }
    
    const totalPages = currentStorybook.pages.length;
    
    if (!confirm(`모든 페이지를 ${window.currentLanguage}로 번역하시겠습니까?\n\n${totalPages}개 페이지가 순차적으로 번역됩니다.\n예상 소요 시간: 약 ${totalPages * 5}초`)) {
        return;
    }
    
    // 버튼 로딩 상태로 변경
    setButtonLoading('translate-all-btn', '번역 중...');
    
    let successCount = 0;
    let failCount = 0;
    
    console.log(`🌐 모든 페이지 번역 시작 (${totalPages}개 페이지)`);
    console.log('📋 번역 데이터 구조:', {
        hasTranslations: !!currentStorybook.translations,
        hasCurrentLang: !!currentStorybook.translations?.[window.currentLanguage],
        translationCount: currentStorybook.translations?.[window.currentLanguage]?.length || 0,
        currentLanguage: window.currentLanguage
    });
    
    for (let i = 0; i < currentStorybook.pages.length; i++) {
        const page = currentStorybook.pages[i];
        
        // 이미 번역된 페이지는 건너뛰기
        const translatedPage = currentStorybook.translations?.[window.currentLanguage]?.find(p => p.pageNumber === page.pageNumber);
        const hasTranslation = translatedPage && translatedPage.text && translatedPage.text.trim() !== '';
        
        console.log(`📄 페이지 ${page.pageNumber}: 번역=${hasTranslation}, 텍스트=${translatedPage?.text?.substring(0, 50)}...`);
        
        if (hasTranslation) {
            console.log(`⏭️ 페이지 ${page.pageNumber} 이미 번역됨, 건너뛰기`);
            successCount++;
            continue;
        }
        
        console.log(`🌐 페이지 ${page.pageNumber}/${totalPages} 번역 중...`);
        
        // 진행 상황 표시
        setButtonLoading('translate-all-btn', `번역 중... (${i + 1}/${totalPages})`);
        
        try {
            const sourceText = page.text;
            
            if (!sourceText || sourceText.trim() === '') {
                console.log(`⚠️ 페이지 ${page.pageNumber} 텍스트 없음, 건너뛰기`);
                continue;
            }
            
            const response = await axios.post('/api/translate-page', {
                text: sourceText,
                targetLanguage: window.currentLanguage,
                context: {
                    title: currentStorybook.title,
                    theme: currentStorybook.theme,
                    characters: currentStorybook.characters ? currentStorybook.characters.map(c => c.name).join(', ') : ''
                }
            }, {
                timeout: 30000  // 30초
            });
            
            if (response.data.success) {
                // translations 업데이트
                if (!currentStorybook.translations) {
                    currentStorybook.translations = {};
                }
                if (!currentStorybook.translations[window.currentLanguage]) {
                    currentStorybook.translations[window.currentLanguage] = currentStorybook.pages.map(p => ({
                        pageNumber: p.pageNumber,
                        text: ''
                    }));
                }
                
                // 해당 페이지 번역 텍스트 저장
                const translationPage = currentStorybook.translations[window.currentLanguage].find(p => p.pageNumber === page.pageNumber);
                if (translationPage) {
                    translationPage.text = response.data.translatedText;
                }
                
                // ✅ 실시간 UI 업데이트 - 해당 페이지의 textarea에 번역된 텍스트 표시
                const pageTextarea = document.querySelector(`textarea[onchange*="updatePageText(${i},"]`);
                if (pageTextarea) {
                    pageTextarea.value = response.data.translatedText;
                    console.log(`🔄 페이지 ${page.pageNumber} UI 업데이트 완료`);
                }
                
                successCount++;
                console.log(`✅ 페이지 ${page.pageNumber} 번역 완료`);
                
                // 중간 저장 (5페이지마다) - await 추가하여 저장 완료 대기
                if ((i + 1) % 5 === 0) {
                    await saveToR2(currentStorybook);
                    console.log(`💾 중간 저장 완료 (${i + 1}/${totalPages})`);
                }
                
            } else {
                throw new Error(response.data.error || '번역 실패');
            }
            
        } catch (error) {
            console.error(`❌ 페이지 ${page.pageNumber} 번역 실패:`, error);
            failCount++;
            
            // 3번 재시도
            let retryCount = 0;
            const maxRetries = 3;
            let retrySuccess = false;
            
            while (retryCount < maxRetries && !retrySuccess) {
                retryCount++;
                console.log(`🔄 페이지 ${page.pageNumber} 재시도 중... (${retryCount}/${maxRetries})`);
                
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
                    
                    const retryResponse = await axios.post('/api/translate-page', {
                        text: page.text,
                        targetLanguage: window.currentLanguage,
                        context: {
                            title: currentStorybook.title,
                            theme: currentStorybook.theme,
                            characters: currentStorybook.characters ? currentStorybook.characters.map(c => c.name).join(', ') : ''
                        }
                    }, {
                        timeout: 30000
                    });
                    
                    if (retryResponse.data.success) {
                        if (!currentStorybook.translations) {
                            currentStorybook.translations = {};
                        }
                        if (!currentStorybook.translations[window.currentLanguage]) {
                            currentStorybook.translations[window.currentLanguage] = currentStorybook.pages.map(p => ({
                                pageNumber: p.pageNumber,
                                text: ''
                            }));
                        }
                        
                        const translationPage = currentStorybook.translations[window.currentLanguage].find(p => p.pageNumber === page.pageNumber);
                        if (translationPage) {
                            translationPage.text = retryResponse.data.translatedText;
                        }
                        
                        // ✅ 실시간 UI 업데이트 - 재시도 성공 시에도 즉시 표시
                        const pageTextarea = document.querySelector(`textarea[onchange*="updatePageText(${i},"]`);
                        if (pageTextarea) {
                            pageTextarea.value = retryResponse.data.translatedText;
                            console.log(`🔄 페이지 ${page.pageNumber} UI 업데이트 완료 (재시도)`);
                        }
                        
                        retrySuccess = true;
                        failCount--; // 재시도 성공 시 실패 카운트 감소
                        successCount++;
                        console.log(`✅ 페이지 ${page.pageNumber} 재시도 성공!`);
                    }
                } catch (retryError) {
                    console.error(`❌ 재시도 ${retryCount} 실패:`, retryError);
                    
                    if (retryCount >= maxRetries) {
                        // 모든 재시도 실패 시에만 확인 요청
                        if (!confirm(`페이지 ${page.pageNumber} 번역이 ${maxRetries}번 모두 실패했습니다.\n\n계속 진행하시겠습니까?`)) {
                            // 최종 저장 후 종료
                            console.log('💾 중단 전 저장 중...');
                            await saveToR2(currentStorybook);
                            resetButtonLoading('translate-all-btn');
                            return;
                        }
                    }
                }
            }
        }
        
        // 다음 페이지 전 짧은 대기 (API 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 최종 저장 - R2에 확실히 저장될 때까지 대기
    console.log('💾 최종 저장 중...');
    await saveToR2(currentStorybook);
    console.log('✅ 최종 저장 완료');
    
    // UI 업데이트
    displayStorybook(currentStorybook);
    
    // 버튼 복원
    // 버튼 복원
    resetButtonLoading('translate-all-btn');
    
    // 완료 알림
    if (successCount > 0) {
        showNotification('success', '모든 번역 완료! 🌐', `${successCount}개의 페이지가 번역되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`);
        alert(`✅ 번역 완료!\n\n성공: ${successCount}개\n실패: ${failCount}개`);
    } else {
        alert('번역된 페이지가 없습니다.');
    }
    
    console.log(`✅ 모든 페이지 번역 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
}

// 동화책 카테고리 업데이트
function updateStorybookCategory(category) {
    if (!currentStorybook) {
        console.error('❌ 동화책이 선택되지 않았습니다.');
        return;
    }
    
    console.log(`📚 카테고리 업데이트: ${category}`);
    
    // 카테고리 저장
    currentStorybook.category = category;
    
    // R2에 자동 저장
    saveCurrentStorybook();
    
    // 성공 알림
    showNotification('success', '카테고리 저장 완료', `"${category || '미지정'}"로 설정되었습니다.`);
}

/**
 * 아트 스타일 업데이트
 */
function updateArtStyle(artStyle) {
    if (!currentStorybook) {
        console.error('❌ 동화책이 선택되지 않았습니다.');
        return;
    }
    
    const previousStyle = currentStorybook.artStyle;
    console.log(`🎨 아트 스타일 업데이트:`, { 이전: previousStyle, 새로운: artStyle });
    
    // 아트 스타일 저장
    currentStorybook.artStyle = artStyle;
    
    // 스타일 변경 플래그 설정 (이미지 재생성 시 참조)
    if (previousStyle && previousStyle !== artStyle) {
        currentStorybook._artStyleChanged = true;
        console.log('⚠️ 아트 스타일 변경됨: 이미지 재생성 시 기존 이미지 참조 제외');
    }
    
    // R2에 자동 저장
    saveCurrentStorybook();
    
    // 성공 알림
    showNotification('success', '아트 스타일 저장 완료', '이미지 생성 시 새로운 스타일이 적용됩니다.');
}

// 📚 검색 및 필터 기능
let currentCategoryFilter = '';  // 현재 선택된 카테고리
let currentSearchText = '';      // 현재 검색어
let currentVisibilityFilter = 'all'; // 현재 공개 여부 필터 (all|visible|hidden)
let currentSortOption = 'title'; // 현재 정렬 옵션 (title|completion|latest)
let sortAscending = true;        // 정렬 순서 (true: 오름차순, false: 내림차순)

// 카테고리별 필터링
function filterByCategory(category, event) {
    console.log(`📂 카테고리 필터: ${category || '전체'}`);
    
    currentCategoryFilter = category;
    
    // 버튼 활성화 상태 업데이트
    const buttons = document.querySelectorAll('.category-filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 클릭된 버튼 활성화
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // 필터 적용
    applyBookFilters();
}

// 공개 여부 필터링
function filterByVisibility(visibility, event) {
    console.log(`👁️ 공개 여부 필터: ${visibility === 'all' ? '전체' : visibility === 'visible' ? '보기 체크' : '보기 미체크'}`);
    
    currentVisibilityFilter = visibility;
    
    // 버튼 활성화 상태 업데이트
    const buttons = document.querySelectorAll('.visibility-filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 클릭된 버튼 활성화
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // 필터 적용
    applyBookFilters();
}

// 검색어 필터링
function filterBooks() {
    const searchInput = document.getElementById('searchInput');
    currentSearchText = searchInput.value.toLowerCase().trim();
    
    console.log(`🔍 검색: "${currentSearchText}"`);
    
    // 필터 적용
    applyBookFilters();
}

// 정렬 옵션 변경
function applySortOption(sortOption) {
    console.log(`🔄 정렬 옵션: ${sortOption}`);
    currentSortOption = sortOption;
    applyBookFilters();
}

// 정렬 순서 토글
function toggleSortOrder() {
    sortAscending = !sortAscending;
    
    // 아이콘 변경
    const icon = document.getElementById('sortOrderIcon');
    if (icon) {
        if (sortAscending) {
            icon.className = 'fas fa-sort-amount-down text-gray-600';
        } else {
            icon.className = 'fas fa-sort-amount-up text-gray-600';
        }
    }
    
    console.log(`🔄 정렬 순서: ${sortAscending ? '오름차순' : '내림차순'}`);
    applyBookFilters();
}

// 통합 필터 적용
function renderBookItemInFolder(book, index, folderId) {
    return `
        <div 
            class="book-item ${currentStorybook && currentStorybook.id === book.id ? 'active' : ''} p-2 rounded-lg mb-1 border border-gray-200 cursor-move bg-gray-50"
            draggable="true"
            data-book-id="${book.id}"
            data-book-index="${index}"
            data-folder-id="${folderId}"
            ondragstart="handleDragStart(event)"
            ondragover="handleDragOver(event)"
            ondragenter="handleDragEnter(event)"
            ondragleave="handleDragLeave(event)"
            ondrop="handleDrop(event)"
            ondragend="handleDragEnd(event)"
        >
            <div class="flex items-start gap-2 mb-1">
                <div class="text-gray-400 cursor-move mt-1" title="드래그하여 이동">
                    <i class="fas fa-grip-vertical text-xs"></i>
                </div>
                <div class="flex-1 min-w-0" onclick="selectStorybook('${book.id}')">
                    <div class="font-bold text-gray-800 text-xs truncate">${book.title}</div>
                    <p class="text-xs text-gray-500">
                        ${book.targetAge}세 · ${book.pages.length}p
                        ${book.isPublic ? '<span class="ml-2 text-green-600"><i class="fas fa-eye"></i> 공개</span>' : ''}
                    </p>
                </div>
                <div class="flex items-center gap-1">
                    <label class="flex items-center cursor-pointer" title="뷰어에 공개" onclick="event.stopPropagation();">
                        <input 
                            type="checkbox" 
                            ${book.isPublic ? 'checked' : ''}
                            onchange="togglePublicStatus('${book.id}', this.checked)"
                            class="w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        >
                    </label>
                    <button 
                        onclick="event.stopPropagation(); removeBookFromFolder('${book.id}', '${folderId}')"
                        class="text-gray-400 hover:text-red-600 px-1 text-xs"
                        title="폴더에서 제거"
                    >
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function applyBookFilters() {
    const listDiv = document.getElementById('bookList');
    const bookCountSpan = document.getElementById('bookCount');
    
    // undefined, null 항목 필터링
    const validBooks = storybooks.filter(book => book && book.id);
    
    // 필터링 로직
    const filteredBooks = validBooks.filter(book => {
        // 카테고리 매칭
        const categoryMatch = currentCategoryFilter === '' || 
                            (book.category || '') === currentCategoryFilter;
        
        // 검색어 매칭
        const searchMatch = currentSearchText === '' || 
                          (book.title || '').toLowerCase().includes(currentSearchText);
        
        // 공개 여부 매칭
        let visibilityMatch = true;
        if (currentVisibilityFilter === 'visible') {
            // isPublic이 true인 것만
            visibilityMatch = book.isPublic === true;
        } else if (currentVisibilityFilter === 'hidden') {
            // isPublic이 false이거나 undefined인 것
            visibilityMatch = book.isPublic !== true;
        }
        // 'all'인 경우 visibilityMatch는 true 유지
        
        return categoryMatch && searchMatch && visibilityMatch;
    });
    
    console.log(`✅ 필터링 결과: ${filteredBooks.length}개 (전체: ${validBooks.length}개)`);
    console.log(`   카테고리: "${currentCategoryFilter || '전체'}", 검색어: "${currentSearchText || '없음'}", 공개: "${currentVisibilityFilter}"`);
    
    // 결과 개수 업데이트
    if (bookCountSpan) {
        bookCountSpan.textContent = filteredBooks.length;
    }
    
    // 정렬 (드래그 중이 아닐 때만)
    if (!isDragging) {
        if (currentSortOption === 'title') {
            // 가나다순 (제목)
            filteredBooks.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                const result = titleA.localeCompare(titleB, 'ko');
                return sortAscending ? result : -result;
            });
        } else if (currentSortOption === 'completion') {
            // 완성도순
            filteredBooks.sort((a, b) => {
                const rateA = calculateCompletionRate(a);
                const rateB = calculateCompletionRate(b);
                const result = rateB - rateA; // 기본: 높은 순
                return sortAscending ? result : -result;
            });
        } else if (currentSortOption === 'latest') {
            // 최신순 (생성일)
            filteredBooks.sort((a, b) => {
                const timeA = a.id ? parseInt(a.id) : 0;
                const timeB = b.id ? parseInt(b.id) : 0;
                const result = timeB - timeA; // 기본: 최신 순
                return sortAscending ? result : -result;
            });
        }
        
        console.log(`📊 정렬 적용: ${currentSortOption} (${sortAscending ? '오름차순' : '내림차순'}, ${filteredBooks.length}개)`);
    } else {
        console.log(`⏸️ 정렬 건너뛰기 (드래그 중)`);
    }    
    // 빈 결과 처리
    if (filteredBooks.length === 0 && folders.length === 0) {
        const message = currentSearchText !== '' || currentCategoryFilter !== '' 
            ? '검색 결과가 없습니다.' 
            : '아직 만든 동화책이 없어요';
        listDiv.innerHTML = `<p class="text-gray-500 text-center py-4">${message}</p>`;
        return;
    }
    
    // 폴더에 없는 동화책 목록 (루트)
    const booksInFolders = new Set(folders.flatMap(f => f.storybookIds || []));
    const rootBooks = filteredBooks.filter(book => !booksInFolders.has(book.id));
    
    // 폴더 렌더링
    let html = '';
    
    // 폴더 생성 버튼
    html += `
        <button 
            onclick="createFolder()"
            class="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-2 rounded-lg mb-3 text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
        >
            <i class="fas fa-folder-plus"></i>
            새 폴더 만들기
        </button>
    `;
    
    // 각 폴더 렌더링
    folders.forEach(folder => {
        const folderBooks = filteredBooks.filter(book => (folder.storybookIds || []).includes(book.id));
        const isOpen = folder.isOpen !== false; // 기본값 true
        
        html += `
            <div class="mb-3 border border-gray-300 rounded-lg overflow-hidden">
                <div 
                    class="folder-header bg-indigo-50 p-3 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition"
                    onclick="toggleFolder('${folder.id}')"
                    ondragover="event.preventDefault(); event.currentTarget.classList.add('bg-indigo-200');"
                    ondragleave="event.currentTarget.classList.remove('bg-indigo-200');"
                    ondrop="event.preventDefault(); event.currentTarget.classList.remove('bg-indigo-200'); if(draggedBookId) addBookToFolder(draggedBookId, '${folder.id}');"
                >
                    <div class="flex items-center gap-2 flex-1">
                        <i class="fas fa-chevron-${isOpen ? 'down' : 'right'} text-indigo-600 text-sm"></i>
                        <i class="fas fa-folder text-indigo-600"></i>
                        <span class="font-semibold text-gray-800">${folder.name}</span>
                        <span class="text-xs text-gray-500">(${folderBooks.length})</span>
                    </div>
                    <div class="flex gap-1" onclick="event.stopPropagation();">
                        <button 
                            onclick="renameFolder('${folder.id}')"
                            class="text-indigo-600 hover:text-indigo-800 px-2 py-1 text-xs"
                            title="이름 변경"
                        >
                            <i class="fas fa-edit"></i>
                        </button>
                        <button 
                            onclick="deleteFolder('${folder.id}')"
                            class="text-red-600 hover:text-red-800 px-2 py-1 text-xs"
                            title="삭제"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${isOpen ? `
                    <div class="folder-content bg-white p-2">
                        ${folderBooks.length === 0 ? 
                            '<p class="text-gray-400 text-xs text-center py-2">폴더가 비어있습니다<br>동화책을 드래그하여 넣어보세요</p>' :
                            folderBooks.map((book, index) => renderBookItemInFolder(book, index, folder.id)).join('')
                        }
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    // 동화책 목록 렌더링 (폴더에 없는 것들)
    listDiv.innerHTML = html + rootBooks.map((book, index) => `
        <div 
            class="book-item ${currentStorybook && currentStorybook.id === book.id ? 'active' : ''} p-3 rounded-lg mb-2 border border-gray-200 cursor-move"
            draggable="true"
            data-book-id="${book.id}"
            data-book-index="${index}"
            ondragstart="handleDragStart(event)"
            ondragover="handleDragOver(event)"
            ondragenter="handleDragEnter(event)"
            ondragleave="handleDragLeave(event)"
            ondrop="handleDrop(event)"
            ondragend="handleDragEnd(event)"
        >
            <!-- 드래그 핸들 & 제목 -->
            <div class="flex items-start gap-2 mb-2">
                <div class="text-gray-400 cursor-move mt-1" title="드래그하여 순서 변경">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="flex-1 min-w-0" onclick="selectStorybook('${book.id}')">
                    <input 
                        type="text" 
                        value="${book.title}"
                        class="w-full font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 outline-none text-sm px-1 -ml-1"
                        onclick="event.stopPropagation(); this.select();"
                        onchange="updateBookTitleInList('${book.id}', this.value)"
                        onblur="this.classList.remove('border-purple-500')"
                        title="클릭하여 제목 수정"
                    />
                    <p class="text-xs text-gray-500 mt-1 px-1">
                        <i class="fas fa-child mr-1"></i>${book.targetAge}세 
                        <i class="fas fa-file-alt ml-2 mr-1"></i>${book.pages.length}p
                        ${book.category ? `<i class="fas fa-tag ml-2 mr-1"></i>${book.category}` : ''}
                    </p>
                </div>
            </div>
            
            <!-- 뷰어 공개 체크박스 -->
            <div class="flex items-center gap-2 mt-2 px-1 mb-2">
                <input 
                    type="checkbox" 
                    id="public-${book.id}"
                    ${book.isPublic ? 'checked' : ''}
                    onclick="togglePublicStatus('${book.id}')"
                    class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <label for="public-${book.id}" class="text-xs text-gray-600 cursor-pointer">
                    <i class="fas fa-globe mr-1"></i>뷰어에 공개
                </label>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="flex gap-1">
                <button 
                    onclick="checkStorybookStatus('${book.id}')" 
                    class="flex-1 ${getCompletionButtonColor(book)} text-white text-xs py-1.5 px-2 rounded transition"
                    title="완성도 확인"
                >
                    <i class="fas fa-check-circle mr-1"></i>확인
                </button>
                <button 
                    onclick="selectStorybook('${book.id}')" 
                    class="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs py-1.5 px-2 rounded hover:from-purple-600 hover:to-pink-600 transition"
                >
                    <i class="fas fa-edit mr-1"></i>편집
                </button>
                <button 
                    onclick="duplicateStorybookById('${book.id}')" 
                    class="bg-gradient-to-r from-green-500 to-teal-500 text-white text-xs py-1.5 px-2 rounded hover:from-green-600 hover:to-teal-600 transition"
                    title="복사"
                >
                    <i class="fas fa-copy"></i>
                </button>
                <button 
                    onclick="deleteStorybook('${book.id}')" 
                    class="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs py-1.5 px-2 rounded hover:from-red-600 hover:to-pink-600 transition"
                    title="삭제"
                >
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 동화책 완성도 계산 (간단 버전)
// 완성도 계산 (ValidationService 사용)
function calculateCompletionRate(book) {
    return validationService.calculateCompletionRate(book);
}

// 완성도 버튼 색상 (ValidationService 사용)
function getCompletionButtonColor(book) {
    return validationService.getCompletionButtonColor(book);
}

// 동화책 상태 확인 (ValidationService 사용)
function checkStorybookStatus(bookId) {
    validationService.checkStorybookStatus(bookId, storybooks);
}

// 상태 팝업 닫기
function closeStatusPopup() {
    const popup = document.getElementById('statusPopup');
    if (popup) {
        popup.remove();
    }
}

// 이미지 삭제 버튼 토글
function toggleImageDeleteButton(imageId) {
    // 모든 삭제 버튼 숨기기
    document.querySelectorAll('[id$="-delete-btn"]').forEach(btn => {
        if (!btn.id.startsWith(imageId)) {
            btn.classList.add('hidden');
        }
    });
    
    // 클릭된 이미지의 삭제 버튼 토글
    const deleteBtn = document.getElementById(`${imageId}-delete-btn`);
    if (deleteBtn) {
        deleteBtn.classList.toggle('hidden');
    }
}

// 외부 클릭 시 모든 삭제 버튼 숨기기
document.addEventListener('click', (e) => {
    // 이미지나 삭제 버튼이 아닌 곳을 클릭한 경우
    if (!e.target.closest('img') && !e.target.closest('[id$="-delete-btn"]')) {
        document.querySelectorAll('[id$="-delete-btn"]').forEach(btn => {
            btn.classList.add('hidden');
        });
    }
});

// 캐릭터 레퍼런스 이미지 삭제
async function deleteCharacterImage(charIndex) {
    try {
        const deleted = await characterManager.deleteCharacterImage(currentStorybook, charIndex);
        if (deleted) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            showNotification('success', '이미지 삭제 완료', '캐릭터 레퍼런스 이미지가 삭제되었습니다.');
        }
    } catch (error) {
        console.error('❌ 이미지 삭제 실패:', error);
        alert(error.message);
    }
}

// 핵심 단어 이미지 삭제
async function deleteKeyObjectImage(objIndex) {
    try {
        const deleted = await characterManager.deleteKeyObjectImage(currentStorybook, objIndex);
        if (deleted) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            showNotification('success', '이미지 삭제 완료', '핵심 단어 이미지가 삭제되었습니다.');
        }
    } catch (error) {
        console.error('❌ 이미지 삭제 실패:', error);
        alert(error.message);
    }
}

// 페이지 삽화 이미지 삭제
async function deletePageIllustration(pageIndex) {
    if (!confirm('이 페이지의 삽화를 삭제하시겠습니까?')) {
        return;
    }
    
    if (!currentStorybook.pages || !currentStorybook.pages[pageIndex]) {
        alert('페이지를 찾을 수 없습니다.');
        return;
    }
    
    // 이미지 삭제
    currentStorybook.pages[pageIndex].illustrationImage = null;
    
    // 저장 및 화면 갱신
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('success', '이미지 삭제 완료', '페이지 삽화가 삭제되었습니다.');
}

// ==================== 배경음악 관리 ====================

// 배경음악 모달 열기
async function openBackgroundMusicModal() {
    document.getElementById('backgroundMusicModal').classList.remove('hidden');
    document.getElementById('backgroundMusicModal').classList.add('flex');
    
    // 배경음악 목록 로드
    await loadBackgroundMusicList();
}

// 배경음악 모달 닫기
function closeBackgroundMusicModal() {
    document.getElementById('backgroundMusicModal').classList.add('hidden');
    document.getElementById('backgroundMusicModal').classList.remove('flex');
    
    // 입력 필드 초기화
    document.getElementById('bgmTitle').value = '';
    document.getElementById('bgmFile').value = '';
}

// 배경음악 목록 로드
async function loadBackgroundMusicList() {
    try {
        backgroundMusicList = await musicService.loadMusicList();
        renderBackgroundMusicList();
        updateBackgroundMusicSelect();
    } catch (error) {
        console.error('❌ 배경음악 목록 로드 오류:', error);
    }
}

// 배경음악 목록 렌더링
function renderBackgroundMusicList() {
    const listEl = document.getElementById('backgroundMusicList');
    musicService.renderMusicList(listEl);
}

// 배경음악 선택 드롭다운 업데이트
function updateBackgroundMusicSelect() {
    const selectEl = document.getElementById('backgroundMusicSelect');
    musicService.updateMusicSelect(selectEl, currentStorybook?.backgroundMusicId);
}

// 배경음악 업로드
async function uploadBackgroundMusic() {
    const title = document.getElementById('bgmTitle').value.trim();
    const fileInput = document.getElementById('bgmFile');
    const file = fileInput.files[0];
    
    try {
        await musicService.uploadMusic(title, file);
        
        alert('✅ 배경음악이 추가되었습니다!');
        
        // 입력 필드 초기화
        document.getElementById('bgmTitle').value = '';
        document.getElementById('bgmFile').value = '';
        
        // 목록 새로고침
        await loadBackgroundMusicList();
    } catch (error) {
        console.error('❌ 배경음악 업로드 오류:', error);
        alert('❌ 업로드 실패: ' + error.message);
    }
}

// ===== 동영상 생성 관련 함수들 =====

/**
 * 동영상 생성 모달 열기
 */
function openVideoGenerationModal() {
    if (!currentStorybook) {
        alert('동화책을 먼저 선택해주세요.');
        return;
    }
    
    // 기본값 설정
    document.getElementById('videoStartPage').value = 1;
    document.getElementById('videoEndPage').value = currentStorybook.pages.length;
    document.getElementById('videoStartPage').max = currentStorybook.pages.length;
    document.getElementById('videoEndPage').max = currentStorybook.pages.length;
    
    // 배경음악 리스트 로드
    loadBackgroundMusicList();
    
    // 모달 표시
    const modal = document.getElementById('videoGenerationModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * 배경음악 리스트 로드
 */
async function loadBackgroundMusicList() {
    try {
        const response = await axios.get('/api/background-music');
        const musicList = response.data.music || [];
        
        const select = document.getElementById('videoBackgroundMusicId');
        if (!select) return;
        
        // 기존 옵션 유지 (동화책 설정 음악 사용)
        select.innerHTML = '<option value="">동화책 설정 음악 사용</option>';
        
        // 배경음악 리스트 추가
        musicList.forEach(music => {
            const option = document.createElement('option');
            option.value = music.id;
            option.textContent = music.title;
            
            // 현재 동화책에 설정된 배경음악이면 선택
            if (currentStorybook && currentStorybook.backgroundMusicId === music.id) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        console.log('✅ 배경음악 리스트 로드 완료:', musicList.length, '개');
    } catch (error) {
        console.error('❌ 배경음악 리스트 로드 실패:', error);
    }
}

/**
 * 동영상 생성 모달 닫기
 */
function closeVideoGenerationModal() {
    const modal = document.getElementById('videoGenerationModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

/**
 * 동영상 생성 실행
 */
async function generateVideo() {
    if (!currentStorybook) {
        alert('동화책을 먼저 선택해주세요.');
        return;
    }
    
    // 입력값 가져오기
    const startPage = parseInt(document.getElementById('videoStartPage').value);
    const endPage = parseInt(document.getElementById('videoEndPage').value);
    const includeCover = document.getElementById('videoIncludeCover').checked;
    const coverDuration = parseInt(document.getElementById('videoCoverDuration').value);
    const includeBackgroundMusic = document.getElementById('videoIncludeBackgroundMusic').checked;
    const backgroundMusicId = document.getElementById('videoBackgroundMusicId').value; // 선택한 배경음악 ID
    const resolution = document.getElementById('videoResolution').value;
    const transition = document.getElementById('videoTransition').value;
    const pageGap = parseFloat(document.getElementById('videoPageGap').value);
    
    // 유효성 검사
    if (startPage < 1 || endPage > currentStorybook.pages.length || startPage > endPage) {
        alert('페이지 범위가 올바르지 않습니다.');
        return;
    }
    
    // 버튼 비활성화
    const btn = document.getElementById('generateVideoBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>동영상 생성 중...';
    
    try {
        console.log('🎬 동영상 생성 시작:', {
            storybookId: currentStorybook.id,
            startPage,
            endPage,
            includeCover,
            coverDuration,
            includeBackgroundMusic,
            backgroundMusicId: backgroundMusicId || '동화책 설정 음악',
            resolution,
            transition,
            pageGap
        });
        
        // API 호출
        const response = await api.post('/api/generate-video', {
            storybookId: currentStorybook.id,
            startPage,
            endPage,
            includeCover,
            coverDuration,
            includeBackgroundMusic,
            backgroundMusicId: backgroundMusicId || undefined, // 빈 문자열이면 undefined 전달
            resolution,
            transition,
            pageGap
        });
        
        if (response.success) {
            // 동영상 생성 완료 - 결과 모달 표시
            console.log('✅ 동영상 생성 완료:', response.videoUrl);
            
            // 생성 모달 닫기
            closeVideoGenerationModal();
            
            // 결과 모달 열기
            openVideoResultModal(response.videoUrl);
        } else {
            throw new Error(response.message || '동영상 생성 실패');
        }
    } catch (error) {
        console.error('❌ 동영상 생성 오류:', error);
        alert('❌ 동영상 생성 실패: ' + error.message);
    } finally {
        // 버튼 복원
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * 동영상 결과 모달 열기
 */
function openVideoResultModal(videoUrl) {
    // URL 저장
    window.currentVideoUrl = videoUrl;
    
    // URL 표시
    document.getElementById('videoResultUrl').textContent = videoUrl;
    
    // 모달 표시
    const modal = document.getElementById('videoResultModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * 동영상 결과 모달 닫기
 */
function closeVideoResultModal() {
    const modal = document.getElementById('videoResultModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // URL 초기화
    window.currentVideoUrl = null;
}

/**
 * 동영상 URL 복사
 */
async function copyVideoUrl() {
    const url = window.currentVideoUrl;
    if (!url) {
        alert('복사할 URL이 없습니다.');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(url);
        alert('✅ URL이 클립보드에 복사되었습니다!');
    } catch (err) {
        console.error('❌ 클립보드 복사 실패:', err);
        // 폴백: 텍스트 선택
        const urlEl = document.getElementById('videoResultUrl');
        const range = document.createRange();
        range.selectNode(urlEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        alert('⚠️ 자동 복사에 실패했습니다. URL을 선택했으니 Ctrl+C로 복사해주세요.');
    }
}

/**
 * 동영상 다운로드
 */
async function downloadVideoFromUrl() {
    const url = window.currentVideoUrl;
    if (!url) {
        alert('다운로드할 URL이 없습니다.');
        return;
    }
    
    try {
        // 파일명 추출
        const filename = url.split('/').pop() || 'video.mp4';
        
        // 로딩 표시
        const btn = document.querySelector('button[onclick="downloadVideoFromUrl()"]');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>다운로드 중...';
        }
        
        // fetch로 다운로드
        const response = await fetch(url);
        const blob = await response.blob();
        
        // blob URL 생성
        const blobUrl = window.URL.createObjectURL(blob);
        
        // a 태그로 다운로드
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // blob URL 해제
        window.URL.revokeObjectURL(blobUrl);
        
        // 버튼 복원
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('다운로드 오류:', error);
        alert('다운로드 실패: ' + error.message);
    }
}

// 배경음악 삭제
async function deleteBackgroundMusic(id) {
    if (!confirm('이 배경음악을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await musicService.deleteMusic(id);
        alert('✅ 배경음악이 삭제되었습니다.');
        await loadBackgroundMusicList();
    } catch (error) {
        console.error('❌ 배경음악 삭제 오류:', error);
        alert('❌ 삭제 실패: ' + error.message);
    }
}

// 배경음악 선택
function selectBackgroundMusic(musicId) {
    if (!currentStorybook) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    currentStorybook.backgroundMusicId = musicId || null;
    
    // 선택된 배경음악 정보 표시
    const selectedEl = document.getElementById('selectedBackgroundMusic');
    musicService.displaySelectedMusic(selectedEl, musicId);
    
    // 저장
    saveCurrentStorybook();
}

// ============================================
// 페이지 관련 함수
// ============================================

// 페이지 삭제
function deletePage(pageIndex) {
    if (!currentStorybook) return;
    if (!confirm(`페이지 ${pageIndex + 1}을(를) 삭제하시겠습니까?`)) return;
    
    currentStorybook.pages.splice(pageIndex, 1);
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
}

// 삽화 업로드
// 삽화 업로드 모달 열기
function uploadIllustration(pageIndex) {
    if (!currentStorybook) return;
    uploadService.openIllustrationUploadModal(pageIndex);
}

// 삽화 업로드 실행 (모달 내부에서 호출)
async function executeIllustrationUpload() {
    await uploadService.uploadIllustration(currentStorybook, saveCurrentStorybook, displayStorybook);
}

// 페이지 TTS 업로드
function uploadPageTTS(pageIndex) {
    if (!currentStorybook) return;
    uploadService.openTTSUploadModal(pageIndex);
}

// 페이지 삽화 프롬프트 업데이트
function updatePageIllustrationPrompt(pageIndex, prompt) {
    if (!currentStorybook) return;
    currentStorybook.pages[pageIndex].illustrationPrompt = prompt;
    saveCurrentStorybook();
}

// 일괄 삽화 업로드 모달 열기
function openBatchIllustrationUpload() {
    if (!currentStorybook) return;
    uploadService.openBatchUploadModal(currentStorybook);
}

// 일괄 TTS 업로드 모달 열기
function openBatchTTSUpload() {
    if (!currentStorybook) return;
    uploadService.openBatchTTSUploadModal(currentStorybook, window.currentLanguage);
}

// 페이지 삽화 다운로드
function downloadIllustration(pageIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) return;
    const page = currentStorybook.pages[pageIndex];
    if (!page.illustrationImage) {
        alert('다운로드할 삽화가 없습니다.');
        return;
    }
    
    const link = document.createElement('a');
    link.href = page.illustrationImage;
    link.download = `${currentStorybook.title}_page${page.pageNumber || pageIndex + 1}_illustration.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', '삽화 다운로드', '삽화가 다운로드되었습니다.');
}

// 페이지 TTS 다운로드
function downloadPageTTS(pageIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) return;
    const page = currentStorybook.pages[pageIndex];
    const currentLanguage = window.currentLanguage || 'ko';
    
    let audioUrl = null;
    if (currentLanguage === 'ko') {
        audioUrl = page.ttsAudio?.url || page.audioUrl || page.tts_audio;
    } else {
        audioUrl = page.ttsAudio?.[currentLanguage]?.url || null;
    }
    
    if (!audioUrl) {
        alert('다운로드할 TTS 오디오가 없습니다.');
        return;
    }
    
    // R2 URL에서 파일명 추출
    const filename = audioUrl.split('/').pop();
    
    // 프록시 엔드포인트를 통해 다운로드
    const proxyUrl = `/api/download-audio/${filename}`;
    
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = `${currentStorybook.title}_page${page.pageNumber || pageIndex + 1}_${currentLanguage}_tts.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', 'TTS 다운로드', 'TTS 오디오가 다운로드되었습니다.');
}

    // ============================================
    // 전역 함수 노출 (HTML onclick에서 사용)
    // ============================================
    
    // 핵심 변수 및 함수 (UploadService에서 사용)
    window.currentStorybook = currentStorybook;
    window.displayStorybook = displayStorybook;
    
    window.toggleSection = toggleSection;
    window.togglePageSection = togglePageSection;
    window.resetCoverPrompt = resetCoverPrompt;
    window.addNewCharacter = addNewCharacter;
    window.addNewKeyObject = addNewKeyObject;
    window.addNewPage = addNewPage;
    window.deleteKeyObject = deleteKeyObject;
    window.openCoverUploadModal = openCoverUploadModal;
    window.openBatchUploadModal = openBatchUploadModal;
    window.openBatchTTSUploadModal = openBatchTTSUploadModal;
    window.openTTSUploadModal = openTTSUploadModal;
    window.bulkUploadKeyObjectImages = bulkUploadKeyObjectImages;
    window.cancelBatchUpload = cancelBatchUpload;
    window.duplicateStorybookById = duplicateStorybookById;
    window.addReviewNewPage = addReviewNewPage;
    window.deleteReviewPage = deleteReviewPage;
    window.updateReviewPageText = updateReviewPageText;
    window.updateReviewPagePrompt = updateReviewPagePrompt;
    window.switchLanguage = switchLanguage;
    window.switchReviewLanguage = switchReviewLanguage;
    window.translateAllPages = translateAllPages;
    window.translateSinglePage = translateSinglePage;
    window.togglePublicStatus = togglePublicStatus;
    window.checkStorybookStatus = checkStorybookStatus;
    window.closeStatusPopup = closeStatusPopup;
    window.addLanguageFromTab = addLanguageFromTab;
    window.toggleAddLanguageDropdown = toggleAddLanguageDropdown;
    window.deleteBackgroundMusic = deleteBackgroundMusic;
    window.deleteQuiz = deleteQuiz;
    window.showQuizAnswer = showQuizAnswer;
    window.downloadAllAudio = downloadAllAudio;
    window.downloadAudio = downloadAudio;
    window.downloadAllText = downloadAllText;
    window.showGenerationModeHelp = showGenerationModeHelp;
    window.selectStorybook = selectStorybook;
    window.deleteStorybook = deleteStorybook;
    window.updateBookTitleInList = updateBookTitleInList;
    window.duplicateStorybook = duplicateStorybook;
    // window.createNewStorybook = createNewStorybook;  // ❌ 함수 정의 없음
    window.generateStorybook = generateStorybook;
    window.generateCoverImage = generateCoverImage;
    window.toggleCoverCharacterRef = toggleCoverCharacterRef;
    // window.regenerateCoverImage = regenerateCoverImage;  // ❌ 함수 정의 없음
    window.generateCharacterReference = generateCharacterReference;
    window.generateAllCharacterReferences = generateAllCharacterReferences;
    window.selectCharacterImageFromHistory = selectCharacterImageFromHistory;
    window.selectCoverImageFromHistory = selectCoverImageFromHistory;
    window.selectIllustrationFromHistory = selectIllustrationFromHistory;
    window.openCharacterUploadModal = openCharacterUploadModal;
    window.openIllustrationUploadModal = openIllustrationUploadModal;
    window.toggleImageDeleteButton = toggleImageDeleteButton;
    window.toggleKeyObjectReference = toggleKeyObjectReference;
    window.toggleReferenceImage = toggleReferenceImage;
    window.generateIllustration = generateIllustration;
    window.generateAllIllustrationsParallel = generateAllIllustrationsParallel;
    window.generateAllIllustrationsSequential = generateAllIllustrationsSequential;
    window.downloadAllIllustrations = downloadAllIllustrations;
    window.downloadAllKeyObjectImages = downloadAllKeyObjectImages;
    window.generatePageTTS = generatePageTTS;
    window.generateAllTTS = generateAllTTS;
    window.generateQuiz = generateQuiz;
    window.generateVocabularyImages = generateVocabularyImages;
    window.generateAllVocabularyImages = generateAllVocabularyImages;
    window.generateSingleVocabularyImage = generateSingleVocabularyImage;
    window.generateKeyObjectsForStorybook = generateKeyObjectsForStorybook;
    window.generateAllKeyObjectImages = generateAllKeyObjectImages;
    window.generateSingleKeyObjectImage = generateSingleKeyObjectImage;
    window.saveCurrentStorybook = saveCurrentStorybook;
    window.openPreview = openPreview;
    window.downloadImage = downloadImage;
    window.downloadAllCharacterReferences = downloadAllCharacterReferences;
    window.downloadAllVocabularyImages = downloadAllVocabularyImages;
    // window.playTTS = playTTS;  // ❌ 함수 정의 없음
    // window.stopTTS = stopTTS;  // ❌ 함수 정의 없음
    // window.updateStoryTitle = updateStoryTitle;  // ❌ 함수 정의 없음
    // window.updateCoverPrompt = updateCoverPrompt;  // ❌ 함수 정의 없음
    // window.addCharacter = addCharacter;  // ❌ 함수 정의 없음
    window.updateCharacterName = updateCharacterName;
    window.updateCharacterHeight = updateCharacterHeight;
    window.updateCharacterDescription = updateCharacterDescription;
    window.deleteCharacter = deleteCharacter;
    // window.addPage = addPage;  // ❌ 함수 정의 없음
    window.deletePage = deletePage;
    window.uploadIllustration = uploadIllustration;
    window.executeIllustrationUpload = executeIllustrationUpload;
    window.uploadPageTTS = uploadPageTTS;
    window.downloadIllustration = downloadIllustration;
    window.downloadPageTTS = downloadPageTTS;
    window.updatePageIllustrationPrompt = updatePageIllustrationPrompt;
    window.updatePageText = updatePageText;
    window.openBatchIllustrationUpload = openBatchIllustrationUpload;
    window.openBatchTTSUpload = openBatchTTSUpload;
    window.togglePageCharacterRef = togglePageCharacterRef;
    
    // 폴더 관련 함수 전역 노출
    window.createFolder = createFolder;
    window.renameFolder = renameFolder;
    window.deleteFolder = deleteFolder;
    window.toggleFolder = toggleFolder;
    window.addBookToFolder = addBookToFolder;
    window.removeBookFromFolder = removeBookFromFolder;
    
    // window.goBack = goBack;  // ❌ 함수 정의 없음
    // window.toggleLanguage = toggleLanguage;  // ❌ 함수 정의 없음
    window.openBackgroundMusicModal = openBackgroundMusicModal;
    window.closeBackgroundMusicModal = closeBackgroundMusicModal;
    window.selectBackgroundMusic = selectBackgroundMusic;
    // window.removeBackgroundMusic = removeBackgroundMusic;  // ❌ 함수 정의 없음
    window.loadBackgroundMusicList = loadBackgroundMusicList;
    
    // 모델 선택 관련 함수 전역 노출
    window.createModelSelect = createModelSelect;
    window.updateCharacterModel = updateCharacterModel;
    window.updateKeyObjectModel = updateKeyObjectModel;
    window.updateKeyObjectField = updateKeyObjectField;
    window.updateIllustrationModel = updateIllustrationModel;
    window.updateVocabularyModel = updateVocabularyModel;
    window.updateCoverModel = updateCoverModel;
    window.createTTSModelSelect = createTTSModelSelect;
    window.updateTTSModelDescription = updateTTSModelDescription;
    
    // 표지 관련 함수 전역 노출
    window.buildCoverPrompt = buildCoverPrompt;
    
    // 드래그 앤 드롭 핸들러 전역 노출
    window.handleDragStart = handleDragStart;
    window.handleDragOver = handleDragOver;
    window.handleDragEnter = handleDragEnter;
    window.handleDragLeave = handleDragLeave;
    window.handleDragEnd = handleDragEnd;
    window.handleDrop = handleDrop;
    
    // UI 핸들러 전역 노출
    window.handleArtStyleChange = handleArtStyleChange;
    
    // 버튼 로딩 유틸리티 전역 노출
    window.setButtonLoading = setButtonLoading;
    window.resetButtonLoading = resetButtonLoading;
    window.setButtonsLoading = setButtonsLoading;
    window.resetButtonsLoading = resetButtonsLoading;
    window.applySortOption = applySortOption;
    window.toggleSortOrder = toggleSortOrder;
    window.filterByCategory = filterByCategory;
    window.filterByVisibility = filterByVisibility;
    window.filterBooks = filterBooks;
    
    // 모달 관련 함수 전역 노출
    window.closeCoverUploadModal = closeCoverUploadModal;
    window.closeReviewModal = closeReviewModal;
    window.closeTTSUploadModal = closeTTSUploadModal;
    window.closeCharacterUploadModal = closeCharacterUploadModal;
    window.completeReviewFromModal = completeReviewFromModal;
    
    // 업로드 관련 함수 전역 노출
    window.switchCoverUploadTab = switchCoverUploadTab;
    window.switchTTSUploadTab = switchTTSUploadTab;
    window.switchUploadTab = switchUploadTab;
    window.switchCharacterUploadTab = switchCharacterUploadTab;
    window.uploadCover = uploadCover;
    window.uploadTTSAudio = uploadTTSAudio;
    window.uploadCharacter = uploadCharacter;
    window.uploadBackgroundMusic = uploadBackgroundMusic;
    
    // 동영상 생성 함수들
    window.openVideoGenerationModal = openVideoGenerationModal;
    window.closeVideoGenerationModal = closeVideoGenerationModal;
    window.generateVideo = generateVideo;
    window.openVideoResultModal = openVideoResultModal;
    window.closeVideoResultModal = closeVideoResultModal;
    window.copyVideoUrl = copyVideoUrl;
    window.downloadVideoFromUrl = downloadVideoFromUrl;
    
    // 기타 함수 전역 노출
    window.updateStorybookCategory = updateStorybookCategory;
    window.updateArtStyle = updateArtStyle;
    window.updateTTSModelDescription = updateTTSModelDescription;
    window.checkStorybookStatus = checkStorybookStatus;
    
    })(); // IIFE 종료
} else {
    console.warn('⚠️ app.js: 모듈 로드 대기 중... 전역 변수로 fallback');
}

// 페이지 로드 시 배경음악 목록 로드 (IIFE 외부)
document.addEventListener('DOMContentLoaded', () => {
    if (window.loadBackgroundMusicList) {
        window.loadBackgroundMusicList();
    }
});

