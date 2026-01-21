/**
 * ⚡ Quick Reference Guide for app.js (5390 lines, 117 functions)
 * 
 * 이 파일은 app.js의 주요 섹션을 빠르게 찾기 위한 가이드입니다.
 */

export const APP_MAP = {
  // 🎨 UI 컴포넌트 생성
  ui: {
    createModelSelect: { line: 38, desc: "모델 선택 드롭다운 생성" },
    createTTSModelSelect: { line: 86, desc: "TTS 모델 선택 생성" },
    showNotification: { line: 1170, desc: "알림 토스트 표시" },
    showModal: { line: 1205, desc: "모달 창 표시" },
    toggleSection: { line: 652, desc: "섹션 접기/펴기" },
    toggleMobileSidebar: { line: 637, desc: "모바일 사이드바 토글" },
  },
  
  // ⚙️ 설정 관리
  settings: {
    loadImageSettings: { line: 700, desc: "이미지 설정 로드" },
    saveImageSettings: { line: 707, desc: "이미지 설정 저장" },
    openSettings: { line: 711, desc: "설정 모달 열기" },
    saveSettings: { line: 737, desc: "설정 저장" },
    resetSettings: { line: 775, desc: "설정 초기화" },
  },
  
  // 📚 동화책 관리
  storybook: {
    loadStorybooks: { line: 802, desc: "R2에서 동화책 목록 로드" },
    saveStorybooks: { line: 855, desc: "동화책 목록 저장" },
    renderBookList: { line: 861, desc: "동화책 목록 UI 렌더링" },
    selectStorybook: { line: 937, desc: "동화책 선택" },
    deleteStorybook: { line: 948, desc: "동화책 삭제 (확인 포함)" },
    updateBookTitleInList: { line: 988, desc: "목록의 제목 업데이트" },
    duplicateStorybook: { line: 1129, desc: "현재 동화책 복제" },
    updateStorybookTitle: { line: 1104, desc: "동화책 제목 수정" },
    generateStorybook: { line: 1274, desc: "새 동화책 생성" },
    displayStorybook: { line: 1370, desc: "동화책 표시" },
  },
  
  // 🖼️ 표지 이미지
  cover: {
    buildCoverPrompt: { line: 206, desc: "표지 프롬프트 생성" },
    resetCoverPrompt: { line: 236, desc: "표지 프롬프트 초기화" },
    toggleCoverCharacterRef: { line: 247, desc: "표지 캐릭터 참조 토글" },
    generateCoverImage: { line: 389, desc: "표지 이미지 생성" },
    selectCoverImageFromHistory: { line: 523, desc: "히스토리에서 표지 선택" },
    openCoverUploadModal: { line: 269, desc: "표지 업로드 모달 열기" },
    uploadCover: { line: 307, desc: "표지 이미지 업로드" },
  },
  
  // 👤 캐릭터 관리
  character: {
    addCharacter: { line: 1800, desc: "캐릭터 추가" },
    removeCharacter: { line: 1813, desc: "캐릭터 제거" },
    updateCharacterHeight: { line: 1839, desc: "캐릭터 높이 업데이트" },
    generateCharacterReference: { line: 2923, desc: "캐릭터 레퍼런스 생성" },
    renderCharacterImageWithHistory: { line: 3132, desc: "캐릭터 이미지 + 히스토리 렌더링" },
    selectCharacterImageFromHistory: { line: 3176, desc: "히스토리에서 캐릭터 이미지 선택" },
    openCharacterUploadModal: { line: 4361, desc: "캐릭터 업로드 모달 열기" },
    uploadCharacter: { line: 4401, desc: "캐릭터 이미지 업로드" },
  },
  
  // 📄 페이지 관리
  pages: {
    renderPages: { line: 1850, desc: "페이지 목록 렌더링" },
    addPage: { line: 2189, desc: "페이지 추가" },
    duplicatePage: { line: 2216, desc: "페이지 복제" },
    deletePage: { line: 2241, desc: "페이지 삭제" },
    movePage: { line: 2262, desc: "페이지 순서 이동" },
    generatePageTTS: { line: 126, desc: "페이지 TTS 생성" },
  },
  
  // 🎨 삽화 생성
  illustration: {
    generatePageIllustration: { line: 3359, desc: "페이지 삽화 생성" },
    openIllustrationUploadModal: { line: 4493, desc: "삽화 업로드 모달 열기" },
    uploadIllustration: { line: 4533, desc: "삽화 이미지 업로드" },
  },
  
  // 🔑 핵심 사물
  keyObject: {
    generateKeyObjectImage: { line: 3639, desc: "핵심 사물 이미지 생성" },
  },
  
  // 📝 학습 콘텐츠
  learning: {
    generateSingleVocabularyImage: { line: 4197, desc: "단일 학습 단어 이미지 생성" },
    generateAllVocabularyImages: { line: 4380, desc: "모든 학습 단어 이미지 생성" },
  },
  
  // 🌐 모달 관리
  modals: {
    characterUpload: { line: 4361, desc: "캐릭터 업로드 모달" },
    coverUpload: { line: 269, desc: "표지 업로드 모달" },
    illustrationUpload: { line: 4493, desc: "삽화 업로드 모달" },
  },
  
  // 🎯 드래그 앤 드롭
  dragAndDrop: {
    handleDragStart: { line: 1027, desc: "드래그 시작" },
    handleDragOver: { line: 1038, desc: "드래그 오버" },
    handleDrop: { line: 1059, desc: "드롭" },
    handleDragEnd: { line: 1091, desc: "드래그 종료" },
  },
  
  // 💾 로컬 저장소
  storage: {
    saveCurrentStorybook: { line: 2801, desc: "현재 동화책 R2에 저장" },
  },
};

/**
 * 섹션별 라인 범위
 */
export const SECTIONS = {
  설정_및_초기화: { start: 1, end: 800, desc: "전역 변수, 설정, 이미지 설정" },
  동화책_목록_관리: { start: 800, end: 1200, desc: "로드, 저장, 렌더링, 선택, 삭제" },
  동화책_생성_표시: { start: 1200, end: 1800, desc: "생성 폼, API 호출, 표시 로직" },
  캐릭터_관리: { start: 1800, end: 3200, desc: "추가, 제거, 이미지 생성, 히스토리" },
  페이지_삽화_관리: { start: 2200, end: 3700, desc: "페이지 CRUD, 삽화 생성" },
  핵심사물_학습콘텐츠: { start: 3600, end: 4700, desc: "핵심 사물, 학습 단어 이미지" },
  모달_업로드: { start: 4300, end: 5390, desc: "캐릭터/표지/삽화 업로드 모달" },
};

/**
 * 자주 수정하는 함수들
 */
export const HOT_FUNCTIONS = [
  { name: 'generateCharacterReference', line: 2923, freq: 'high' },
  { name: 'generateCoverImage', line: 389, freq: 'high' },
  { name: 'generateSingleVocabularyImage', line: 4197, freq: 'high' },
  { name: 'saveCurrentStorybook', line: 2801, freq: 'high' },
  { name: 'displayStorybook', line: 1370, freq: 'medium' },
  { name: 'renderPages', line: 1850, freq: 'medium' },
];

console.log('📚 App Guide Loaded');
console.log('   Total lines: 5390');
console.log('   Total functions: 117');
console.log('   Major sections:', Object.keys(SECTIONS).length);
