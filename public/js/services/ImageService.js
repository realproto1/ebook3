/**
 * ImageService
 * - 이미지 생성 API 통합
 * - 표지, 캐릭터, 삽화, Key Object, Vocabulary 이미지 생성
 * - 이미지 업로드 및 관리
 */

class ImageService {
    constructor() {
        this.uploadHistory = {
            cover: [],
            characters: {},
            illustrations: {},
            keyObjects: {},
            vocabulary: {}
        };
    }

    /**
     * 표지 이미지 생성
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async generateCover(options) {
        try {
            const {
                prompt,
                title = 'Untitled',
                storybookId = '',
                characterReferences = [],
                model = DEFAULT_IMAGE_SETTINGS.coverModel,
                aspectRatio = '16:9'
            } = options;

            const response = await api.post('/api/generate-cover', {
                customPrompt: prompt,  // ✅ 서버는 customPrompt 필드를 기대함
                title,
                storybookId,
                characterReferences,
                settings: {
                    aspectRatio,
                    coverModel: model
                }
            }, {
                errorMessage: '표지 이미지를 생성할 수 없습니다.'
            });

            // 히스토리 저장
            this.uploadHistory.cover.unshift({
                url: response.imageUrl,
                prompt,
                timestamp: new Date().toISOString()
            });

            return response;
        } catch (error) {
            console.error('generateCover error:', error);
            throw error;
        }
    }

    /**
     * 캐릭터 레퍼런스 이미지 생성
     * @param {Object} character
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    /**
     * 캐릭터 레퍼런스 이미지 생성
     * @param {Object} character - 캐릭터 정보 { name, description, age }
     * @param {Object} options - 생성 옵션
     * @param {Function} options.onStart - 시작 콜백 (element) => void
     * @param {Function} options.onProgress - 진행 콜백 (element, progress) => void
     * @param {Function} options.onComplete - 완료 콜백 (element, imageUrl) => void
     * @param {Function} options.onError - 에러 콜백 (element, error) => void
     * @param {HTMLElement} options.targetElement - 로딩 UI를 표시할 DOM 요소
     * @returns {Promise<Object>} { success, imageUrl, error }
     */
    async generateCharacter(character, options = {}) {
        const {
            model = DEFAULT_IMAGE_SETTINGS.characterModel,
            aspectRatio = '16:9',
            artStyle = '디즈니 스타일',
            storybookId = null,
            storybookTitle = null,
            onStart = null,
            onProgress = null,
            onComplete = null,
            onError = null,
            targetElement = null
        } = options;

        try {
            // 시작 콜백 호출
            if (onStart && targetElement) {
                onStart(targetElement);
            }

            const response = await api.post('/api/generate-character-image', {
                character: {
                    name: character.name,
                    description: character.description || character.prompt,
                    age: character.age
                },
                artStyle,
                settings: {
                    aspectRatio,
                    enforceNoText: true,
                    characterModel: model
                },
                storybookId,
                storybookTitle
            }, {
                errorMessage: '캐릭터 이미지를 생성할 수 없습니다.'
            });

            // 히스토리 저장
            const charId = character.id || character.name;
            if (!this.uploadHistory.characters[charId]) {
                this.uploadHistory.characters[charId] = [];
            }
            this.uploadHistory.characters[charId].unshift({
                url: response.imageUrl,
                prompt: character.description || character.prompt,
                timestamp: new Date().toISOString()
            });

            // 완료 콜백 호출
            if (onComplete && targetElement) {
                onComplete(targetElement, response.imageUrl);
            }

            return response;
        } catch (error) {
            console.error('generateCharacter error:', error);
            
            // 에러 콜백 호출
            if (onError && targetElement) {
                onError(targetElement, error);
            }
            
            throw error;
        }
    }

    /**
     * 모든 캐릭터 레퍼런스 생성 (병렬)
     * @param {Array} characters
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async generateAllCharacters(characters, options = {}) {
        try {
            const promises = characters.map((char, index) => 
                this.generateCharacter(char, options)
                    .catch(error => {
                        console.error(`Character ${index} generation failed:`, error);
                        return { error: error.message, index };
                    })
            );

            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            console.error('generateAllCharacters error:', error);
            throw error;
        }
    }

    /**
     * 페이지 삽화 생성
     * @param {Object} page
     * @param {Array} characterReferences
     * @param {Object} options
     * @param {Function} options.onStart - 시작 콜백
     * @param {Function} options.onComplete - 완료 콜백
     * @param {Function} options.onError - 에러 콜백
     * @param {HTMLElement} options.targetElement - 대상 DOM 요소
     * @returns {Promise<Object>}
     */
    async generateIllustration(page, characterReferences = [], options = {}) {
        const {
            model = DEFAULT_IMAGE_SETTINGS.illustrationModel,
            aspectRatio = '16:9',
            additionalPrompt = '',
            artStyle = '디즈니 스타일',
            settings = {},
            editNote = '',
            previousPages = [],
            storybookId = null,
            storybookTitle = null,
            onStart = null,
            onComplete = null,
            onError = null,
            targetElement = null
        } = options;

        try {
            // 시작 콜백 호출
            if (onStart && targetElement) {
                onStart(targetElement);
            }

            const response = await api.post('/api/generate-illustration', {
                page,
                artStyle,
                characterReferences,
                settings: {
                    ...settings,
                    illustrationModel: model,
                    aspectRatio
                },
                editNote,
                previousPages,
                storybookId,
                storybookTitle,
                additionalPrompt
            }, {
                errorMessage: '삽화를 생성할 수 없습니다.'
            });

            // 히스토리 저장
            const pageId = page.id || page.order || page.pageNumber;
            if (!this.uploadHistory.illustrations[pageId]) {
                this.uploadHistory.illustrations[pageId] = [];
            }
            this.uploadHistory.illustrations[pageId].unshift({
                url: response.imageUrl,
                prompt: page.scene_description || page.image_prompt,
                timestamp: new Date().toISOString()
            });

            // 완료 콜백 호출
            if (onComplete && targetElement) {
                onComplete(targetElement, response.imageUrl);
            }

            return response;
        } catch (error) {
            console.error('generateIllustration error:', error);
            
            // 에러 콜백 호출
            if (onError && targetElement) {
                onError(targetElement, error);
            }
            
            throw error;
        }
    }

    /**
     * 모든 삽화 생성 (병렬)
     * @param {Array} pages
     * @param {Array} characterReferences
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async generateAllIllustrationsParallel(pages, characterReferences = [], options = {}) {
        try {
            const promises = pages.map((page, index) => 
                this.generateIllustration(page, characterReferences, options)
                    .catch(error => {
                        console.error(`Illustration ${index} generation failed:`, error);
                        return { error: error.message, index };
                    })
            );

            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            console.error('generateAllIllustrationsParallel error:', error);
            throw error;
        }
    }

    /**
     * 모든 삽화 생성 (순차)
     * @param {Array} pages
     * @param {Array} characterReferences
     * @param {Object} options
     * @param {Function} onProgress
     * @returns {Promise<Array>}
     */
    async generateAllIllustrationsSequential(pages, characterReferences = [], options = {}, onProgress = null) {
        try {
            const results = [];

            for (let i = 0; i < pages.length; i++) {
                try {
                    const result = await this.generateIllustration(pages[i], characterReferences, options);
                    results.push(result);
                    
                    if (onProgress) {
                        onProgress(i + 1, pages.length, result);
                    }
                } catch (error) {
                    console.error(`Illustration ${i} generation failed:`, error);
                    results.push({ error: error.message, index: i });
                    
                    if (onProgress) {
                        onProgress(i + 1, pages.length, { error: error.message });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('generateAllIllustrationsSequential error:', error);
            throw error;
        }
    }

    /**
     * Key Object 이미지 생성
     * @param {Object} keyObject
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async generateKeyObject(keyObject, options = {}) {
        const {
            model = DEFAULT_IMAGE_SETTINGS.keyObjectModel,
            aspectRatio = '1:1',
            artStyle = '디즈니 스타일',  // ✅ artStyle 추가
            settings = {},  // ✅ settings 추가
            storybookId = null,  // ✅ storybookId 추가
            storybookTitle = null,  // ✅ storybookTitle 추가
            onStart = null,
            onComplete = null,
            onError = null,
            targetElement = null
        } = options;

        try {
            // 시작 콜백 호출
            if (onStart && targetElement) {
                onStart(targetElement);
            }

            const response = await api.post('/api/generate-key-object', {
                name: keyObject.name || keyObject.korean,
                description: keyObject.description,
                prompt: keyObject.prompt,
                model,
                aspectRatio,
                artStyle,  // ✅ artStyle 전달
                settings,  // ✅ settings 전달
                storybookId,  // ✅ storybookId 전달
                storybookTitle  // ✅ storybookTitle 전달
            }, {
                errorMessage: 'Key Object 이미지를 생성할 수 없습니다.'
            });

            // 히스토리 저장
            const objId = keyObject.id || keyObject.name;
            if (!this.uploadHistory.keyObjects[objId]) {
                this.uploadHistory.keyObjects[objId] = [];
            }
            this.uploadHistory.keyObjects[objId].unshift({
                url: response.imageUrl,
                prompt: keyObject.prompt,
                timestamp: new Date().toISOString()
            });

            // 완료 콜백 호출
            if (onComplete && targetElement) {
                onComplete(targetElement, response.imageUrl);
            }

            return response;
        } catch (error) {
            console.error('generateKeyObject error:', error);
            
            // 에러 콜백 호출
            if (onError && targetElement) {
                onError(targetElement, error);
            }
            
            throw error;
        }
    }

    /**
     * 모든 Key Object 이미지 생성
     * @param {Array} keyObjects
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async generateAllKeyObjects(keyObjects, options = {}) {
        try {
            const promises = keyObjects.map((obj, index) => 
                this.generateKeyObject(obj, options)
                    .catch(error => {
                        console.error(`Key Object ${index} generation failed:`, error);
                        return { error: error.message, index };
                    })
            );

            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            console.error('generateAllKeyObjects error:', error);
            throw error;
        }
    }

    /**
     * Vocabulary 이미지 생성
     * @param {Object} word
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async generateVocabulary(word, options = {}) {
        const {
            model = DEFAULT_IMAGE_SETTINGS.vocabularyModel,
            aspectRatio = '1:1',
            onStart = null,
            onComplete = null,
            onError = null,
            targetElement = null
        } = options;

        try {
            // 시작 콜백 호출
            if (onStart && targetElement) {
                onStart(targetElement);
            }

            const response = await api.post('/api/generate-vocabulary', {
                korean: word.korean,
                english: word.english,
                prompt: word.prompt,
                model,
                aspectRatio
            }, {
                errorMessage: 'Vocabulary 이미지를 생성할 수 없습니다.'
            });

            // 히스토리 저장
            const wordId = word.id || word.korean;
            if (!this.uploadHistory.vocabulary[wordId]) {
                this.uploadHistory.vocabulary[wordId] = [];
            }
            this.uploadHistory.vocabulary[wordId].unshift({
                url: response.imageUrl,
                prompt: word.prompt,
                timestamp: new Date().toISOString()
            });

            // 완료 콜백 호출
            if (onComplete && targetElement) {
                onComplete(targetElement, response.imageUrl);
            }

            return response;
        } catch (error) {
            console.error('generateVocabulary error:', error);
            
            // 에러 콜백 호출
            if (onError && targetElement) {
                onError(targetElement, error);
            }
            
            throw error;
        }
    }

    /**
     * 모든 Vocabulary 이미지 생성
     * @param {Array} vocabulary
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async generateAllVocabulary(vocabulary, options = {}) {
        try {
            const promises = vocabulary.map((word, index) => 
                this.generateVocabulary(word, options)
                    .catch(error => {
                        console.error(`Vocabulary ${index} generation failed:`, error);
                        return { error: error.message, index };
                    })
            );

            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            console.error('generateAllVocabulary error:', error);
            throw error;
        }
    }

    /**
     * 이미지 업로드
     * @param {File|Blob} file
     * @param {string} type - 'cover', 'character', 'illustration', etc.
     * @returns {Promise<Object>}
     */
    async uploadImage(file, type = 'general') {
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('type', type);

            const response = await api.uploadFile('/api/upload-image', formData, {
                errorMessage: '이미지를 업로드할 수 없습니다.'
            });

            return response;
        } catch (error) {
            console.error('uploadImage error:', error);
            throw error;
        }
    }

    /**
     * 이미지 일괄 업로드
     * @param {FileList|Array} files
     * @param {string} type
     * @param {Function} onProgress
     * @returns {Promise<Array>}
     */
    async uploadImagesBatch(files, type = 'general', onProgress = null) {
        try {
            const results = [];

            for (let i = 0; i < files.length; i++) {
                try {
                    const result = await this.uploadImage(files[i], type);
                    results.push(result);
                    
                    if (onProgress) {
                        onProgress(i + 1, files.length, result);
                    }
                } catch (error) {
                    console.error(`Image ${i} upload failed:`, error);
                    results.push({ error: error.message, index: i });
                    
                    if (onProgress) {
                        onProgress(i + 1, files.length, { error: error.message });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('uploadImagesBatch error:', error);
            throw error;
        }
    }

    /**
     * 히스토리 가져오기
     * @param {string} type
     * @param {string} id
     * @returns {Array}
     */
    getHistory(type, id = null) {
        if (id) {
            return this.uploadHistory[type][id] || [];
        }
        return this.uploadHistory[type] || [];
    }

    /**
     * 히스토리 초기화
     * @param {string} type
     * @param {string} id
     */
    clearHistory(type, id = null) {
        if (id && this.uploadHistory[type]) {
            delete this.uploadHistory[type][id];
        } else if (type) {
            this.uploadHistory[type] = Array.isArray(this.uploadHistory[type]) ? [] : {};
        } else {
            this.uploadHistory = {
                cover: [],
                characters: {},
                illustrations: {},
                keyObjects: {},
                vocabulary: {}
            };
        }
    }
}

// 싱글톤 인스턴스 생성
const imageService = new ImageService();

// 전역으로 export
if (typeof window !== 'undefined') {
    window.ImageService = ImageService;
    window.imageService = imageService;
}

// ES6 모듈 export (주석 처리 - 일반 script 태그 사용)
// export { ImageService, imageService };
// export default imageService;
