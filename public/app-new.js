/**
 * app.js - 탱고북 동화책 생성 에디터
 * 리팩토링 버전 - 모듈화된 구조
 */

// 모듈 Import
import { API, api } from './js/core/api.js';
import { Storage } from './js/utils/storage.js';
import { audioPlayer } from './js/utils/audio.js';
import { DOM } from './js/utils/dom.js';
import { MODEL_CONFIGS, ModelSelector } from './js/config/models.js';
import { Storybook } from './js/models/Storybook.js';
import { StoryService } from './js/services/StoryService.js';
import { ImageService } from './js/services/ImageService.js';
import { TTSService } from './js/services/TTSService.js';
import { EditorController } from './js/controllers/EditorController.js';

// ============================================
// 전역 변수
// ============================================
let storybooks = [];
let currentStorybook = null;
let currentLanguage = 'ko';
let backgroundMusicList = [];

// 이미지 설정 (localStorage에서 로드)
let imageSettings = Storage.get('imageSettings') || {
    characterModel: 'gemini-3-pro-image-preview',
    keyObjectModel: 'gemini-3-pro-image-preview',
    illustrationModel: 'gemini-3-pro-image-preview',
    vocabularyModel: 'gemini-3-pro-image-preview',
    coverModel: 'gemini-3-pro-image-preview',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    ttsVoice: 'Aoede',
    ttsVoiceConfig: {
        voice: 'Aoede',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
    }
};

// ============================================
// API Key 관리
// ============================================
function getAPIKey() {
    return localStorage.getItem('gemini_api_key') || window.GEMINI_API_KEY || '';
}

// ============================================
// 모델 설정 함수들
// ============================================

/**
 * 이미지 모델 업데이트
 */
function updateCharacterModel(value) {
    imageSettings.characterModel = value;
    saveImageSettings();
}

function updateKeyObjectModel(value) {
    imageSettings.keyObjectModel = value;
    saveImageSettings();
}

function updateIllustrationModel(value) {
    imageSettings.illustrationModel = value;
    saveImageSettings();
}

function updateVocabularyModel(value) {
    imageSettings.vocabularyModel = value;
    saveImageSettings();
}

function updateCoverModel(value) {
    imageSettings.coverModel = value;
    saveImageSettings();
}

/**
 * TTS 모델 업데이트
 */
function updateTTSModel(value) {
    imageSettings.ttsModel = value;
    saveImageSettings();
}

function updateTTSVoiceConfig(config) {
    imageSettings.ttsVoiceConfig = {
        ...imageSettings.ttsVoiceConfig,
        ...config
    };
    saveImageSettings();
}

/**
 * 이미지 설정 저장
 */
function saveImageSettings() {
    Storage.set('imageSettings', imageSettings);
    console.log('✅ 이미지 설정 저장:', imageSettings);
}

/**
 * 이미지 설정 로드
 */
function loadImageSettings() {
    const saved = Storage.get('imageSettings');
    if (saved) {
        imageSettings = saved;
        console.log('✅ 이미지 설정 로드:', imageSettings);
    }
}

// ============================================
// 동화책 관리 함수들 (레거시)
// ============================================

/**
 * 동화책 목록 로드
 */
async function loadStorybooks() {
    try {
        const data = await StoryService.getAll();
        storybooks = data.storybooks || [];
        displayStorybooks();
    } catch (error) {
        console.error('동화책 목록 로드 실패:', error);
        alert('동화책 목록을 불러오는데 실패했습니다.');
    }
}

/**
 * 동화책 목록 표시
 */
function displayStorybooks() {
    const container = document.getElementById('storybookList');
    if (!container) return;

    if (storybooks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-book" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>아직 생성된 동화책이 없습니다.</p>
                <p style="font-size: 14px; margin-top: 10px;">새로운 동화책을 만들어보세요!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = storybooks.map((book, index) => {
        const progress = calculateCompletionRate(book);
        const createdDate = new Date(book.created_at).toLocaleDateString('ko-KR');
        
        return `
            <div class="storybook-card" onclick="selectStorybook(${index})">
                <div class="storybook-cover">
                    ${book.cover_image_url 
                        ? `<img src="${book.cover_image_url}" alt="${book.title}">`
                        : `<div class="no-cover"><i class="fas fa-book"></i></div>`
                    }
                </div>
                <div class="storybook-info">
                    <h3>${book.title}</h3>
                    <p class="author">${book.author || '작자 미상'}</p>
                    <p class="date">${createdDate}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p class="progress-text">${progress}% 완료</p>
                </div>
                <div class="storybook-actions">
                    <button onclick="event.stopPropagation(); editStorybook(${index})" 
                            class="btn-icon" title="편집">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteStorybook('${book.id}')" 
                            class="btn-icon btn-danger" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 동화책 선택
 */
function selectStorybook(index) {
    currentStorybook = storybooks[index];
    // author.html로 이동
    window.location.href = `author.html?id=${currentStorybook.id}`;
}

/**
 * 동화책 편집
 */
function editStorybook(index) {
    selectStorybook(index);
}

/**
 * 동화책 삭제
 */
async function deleteStorybook(id) {
    if (!confirm('정말 이 동화책을 삭제하시겠습니까?')) {
        return;
    }

    try {
        await StoryService.delete(id);
        alert('동화책이 삭제되었습니다.');
        loadStorybooks();
    } catch (error) {
        console.error('동화책 삭제 실패:', error);
        alert('동화책 삭제에 실패했습니다.');
    }
}

/**
 * 완성도 계산
 */
function calculateCompletionRate(storybook) {
    let total = 0;
    let completed = 0;

    // 기본 정보
    if (storybook.title) completed++;
    total++;

    // 커버 이미지
    if (storybook.cover_image_url) completed++;
    total++;

    // 캐릭터
    if (storybook.characters && storybook.characters.length > 0) {
        storybook.characters.forEach(char => {
            if (char.image_url) completed++;
            total++;
        });
    }

    // 페이지
    if (storybook.pages && storybook.pages.length > 0) {
        storybook.pages.forEach(page => {
            if (page.illustration_url) completed++;
            total++;
            if (page.audio_url) completed++;
            total++;
        });
    }

    return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// ============================================
// 레거시 함수들을 전역으로 노출
// ============================================

// 전역 함수로 export (HTML onclick에서 사용)
window.loadStorybooks = loadStorybooks;
window.selectStorybook = selectStorybook;
window.editStorybook = editStorybook;
window.deleteStorybook = deleteStorybook;
window.updateCharacterModel = updateCharacterModel;
window.updateKeyObjectModel = updateKeyObjectModel;
window.updateIllustrationModel = updateIllustrationModel;
window.updateVocabularyModel = updateVocabularyModel;
window.updateCoverModel = updateCoverModel;
window.updateTTSModel = updateTTSModel;
window.updateTTSVoiceConfig = updateTTSVoiceConfig;
window.getAPIKey = getAPIKey;

// 전역 변수 export
window.storybooks = storybooks;
window.currentStorybook = currentStorybook;
window.imageSettings = imageSettings;

// ============================================
// 페이지 로드 시 초기화
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Tangobook App 초기화');
    
    // 이미지 설정 로드
    loadImageSettings();
    
    // 홈 페이지인 경우 동화책 목록 로드
    if (document.getElementById('storybookList')) {
        loadStorybooks();
    }
});

console.log('✅ app.js 모듈 로드 완료');
