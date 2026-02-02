/**
 * 모델 설정
 * - 이미지 생성 모델
 * - TTS 모델
 * - 기본 설정값
 */

// 이미지 생성 모델 목록
const IMAGE_MODELS = [
    { 
        value: 'gemini-3-pro-image-preview', 
        label: 'Nano Banana Pro (Gemini 3 Pro) ⭐', 
        description: '최고 품질, 네이티브 이미지 생성, 최대 14개 참조 이미지 지원' 
    },
    { 
        value: 'imagen-4', 
        label: 'Imagen 4', 
        description: 'Google 전문 이미지 생성 모델, 텍스트 렌더링 우수' 
    }
];

// TTS 모델 목록 (Gemini TTS Voices)
const TTS_MODELS = [
    { 
        value: 'Aoede', 
        label: 'Aoede ⭐', 
        description: '우아하고 부드러운 여성 목소리 (권장)' 
    },
    { 
        value: 'Kore', 
        label: 'Kore', 
        description: '밝고 경쾌한 여성 목소리' 
    },
    { 
        value: 'Puck', 
        label: 'Puck', 
        description: '명랑하고 활기찬 남성 목소리' 
    },
    { 
        value: 'Charon', 
        label: 'Charon', 
        description: '깊고 안정적인 남성 목소리' 
    },
    { 
        value: 'Fenrir', 
        label: 'Fenrir', 
        description: '차분하고 따뜻한 남성 목소리' 
    }
];

// 기본 이미지 설정
const DEFAULT_IMAGE_SETTINGS = {
    aspectRatio: '16:9',
    enforceNoText: true,
    enforceCharacterConsistency: true,
    additionalPrompt: '',
    imageQuality: 'high',
    imageModel: 'gemini-3-pro-image-preview',
    characterModel: 'gemini-3-pro-image-preview',
    keyObjectModel: 'gemini-3-pro-image-preview',
    illustrationModel: 'gemini-3-pro-image-preview',
    vocabularyModel: 'gemini-3-pro-image-preview',
    coverModel: 'gemini-3-pro-image-preview',
    geminiTTSModel: 'gemini-2.5-flash-preview-tts',
    ttsModel: 'Aoede',
    ttsVoiceConfig: '여성 목소리, 부드럽고 따뜻한 톤, 동화 낭독 스타일, 적당한 속도로 또박또박, 어린이가 이해하기 쉽게'
};

// 화면 비율 옵션
const ASPECT_RATIO_OPTIONS = [
    { value: '16:9', label: '16:9 (와이드)' },
    { value: '4:3', label: '4:3 (표준)' },
    { value: '1:1', label: '1:1 (정사각형)' },
    { value: '9:16', label: '9:16 (세로)' }
];

// 이미지 품질 옵션
const IMAGE_QUALITY_OPTIONS = [
    { value: 'high', label: '높음' },
    { value: 'medium', label: '중간' },
    { value: 'low', label: '낮음' }
];

/**
 * 모델 선택 HTML 생성
 */
class ModelSelector {
    /**
     * 이미지 모델 선택 HTML 생성
     * @param {string} sectionName - 섹션 이름 (ID prefix)
     * @param {string} currentModel - 현재 선택된 모델
     * @param {string} onChangeFunction - onchange 콜백 함수명
     * @returns {string} HTML
     */
    static createImageModelSelect(sectionName, currentModel, onChangeFunction) {
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

    /**
     * TTS 모델 선택 HTML 생성
     * @param {string} currentModel - 현재 선택된 모델
     * @param {number} pageIndex - 페이지 인덱스 (선택적)
     * @returns {string} HTML
     */
    static createTTSModelSelect(currentModel, pageIndex = null) {
        const modelOptions = TTS_MODELS.map(model => 
            `<option value="${model.value}" ${currentModel === model.value ? 'selected' : ''}>${model.label}</option>`
        ).join('');
        
        const idSuffix = pageIndex !== null ? `-${pageIndex}` : '';
        const onChangeAttr = pageIndex !== null 
            ? `onchange="updatePageTTSModel(this.value, ${pageIndex})"`
            : `onchange="updateTTSModel(this.value)"`;
        
        return `
            <select 
                id="tts-model-select${idSuffix}"
                ${onChangeAttr}
                class="text-sm border border-gray-300 rounded px-2 py-1 bg-white w-full"
            >
                ${modelOptions}
            </select>
        `;
    }

    /**
     * 모델 정보 가져오기
     * @param {string} modelValue 
     * @returns {Object|null}
     */
    static getImageModelInfo(modelValue) {
        return IMAGE_MODELS.find(m => m.value === modelValue) || null;
    }

    /**
     * TTS 모델 정보 가져오기
     * @param {string} modelValue 
     * @returns {Object|null}
     */
    static getTTSModelInfo(modelValue) {
        return TTS_MODELS.find(m => m.value === modelValue) || null;
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.IMAGE_MODELS = IMAGE_MODELS;
    window.TTS_MODELS = TTS_MODELS;
    window.DEFAULT_IMAGE_SETTINGS = DEFAULT_IMAGE_SETTINGS;
    window.ASPECT_RATIO_OPTIONS = ASPECT_RATIO_OPTIONS;
    window.IMAGE_QUALITY_OPTIONS = IMAGE_QUALITY_OPTIONS;
    window.ModelSelector = ModelSelector;
}
