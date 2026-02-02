/**
 * Storybook 데이터 모델
 * - 동화책 데이터 구조
 * - 검증 로직
 * - 헬퍼 메서드
 */

class Storybook {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.author = data.author || '';
        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || new Date().toISOString();
        this.status = data.status || 'draft'; // draft, generating, completed
        this.language = data.language || 'ko';
        this.cover_image = data.cover_image || null;
        this.cover_prompt = data.cover_prompt || '';
        
        // 페이지 데이터
        this.pages = data.pages || [];
        
        // 캐릭터 데이터
        this.characters = data.characters || [];
        
        // Key Objects
        this.key_objects = data.key_objects || [];
        
        // 교육 콘텐츠
        this.educational_content = data.educational_content || {
            vocabulary: [],
            quiz: []
        };
        
        // 번역 데이터
        this.translations = data.translations || {};
        
        // 배경음악
        this.background_music = data.background_music || [];
        
        // 메타데이터
        this.metadata = data.metadata || {
            total_pages: 0,
            completion_rate: 0,
            has_audio: false,
            has_images: false
        };
    }

    /**
     * 동화책 검증
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.title || this.title.trim() === '') {
            errors.push('제목이 필요합니다.');
        }

        if (this.pages.length === 0) {
            errors.push('최소 1개의 페이지가 필요합니다.');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 완성도 계산
     * @returns {number} 0-100
     */
    calculateCompletionRate() {
        if (this.pages.length === 0) return 0;

        let totalScore = 0;
        let maxScore = this.pages.length * 3; // text, image, audio per page

        this.pages.forEach(page => {
            if (page.text && page.text.trim()) totalScore++;
            if (page.image_url) totalScore++;
            if (page.audio_url) totalScore++;
        });

        const rate = Math.round((totalScore / maxScore) * 100);
        this.metadata.completion_rate = rate;
        return rate;
    }

    /**
     * 페이지 추가
     * @param {Object} pageData 
     */
    addPage(pageData = {}) {
        const newPage = {
            id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: pageData.text || '',
            image_url: pageData.image_url || null,
            image_prompt: pageData.image_prompt || '',
            audio_url: pageData.audio_url || null,
            audio_text: pageData.audio_text || '',
            order: this.pages.length + 1,
            ...pageData
        };

        this.pages.push(newPage);
        this.metadata.total_pages = this.pages.length;
        this.updated_at = new Date().toISOString();
        
        return newPage;
    }

    /**
     * 페이지 삭제
     * @param {number} index 
     */
    deletePage(index) {
        if (index >= 0 && index < this.pages.length) {
            this.pages.splice(index, 1);
            
            // 순서 재정렬
            this.pages.forEach((page, i) => {
                page.order = i + 1;
            });
            
            this.metadata.total_pages = this.pages.length;
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * 페이지 업데이트
     * @param {number} index 
     * @param {Object} updates 
     */
    updatePage(index, updates) {
        if (index >= 0 && index < this.pages.length) {
            this.pages[index] = {
                ...this.pages[index],
                ...updates
            };
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * 캐릭터 추가
     * @param {Object} characterData 
     */
    addCharacter(characterData = {}) {
        const newCharacter = {
            id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: characterData.name || '',
            description: characterData.description || '',
            image_url: characterData.image_url || null,
            prompt: characterData.prompt || '',
            ...characterData
        };

        this.characters.push(newCharacter);
        this.updated_at = new Date().toISOString();
        
        return newCharacter;
    }

    /**
     * 캐릭터 삭제
     * @param {number} index 
     */
    deleteCharacter(index) {
        if (index >= 0 && index < this.characters.length) {
            this.characters.splice(index, 1);
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * 번역 추가
     * @param {string} language - 언어 코드 (en, ja, zh 등)
     * @param {Object} translationData 
     */
    addTranslation(language, translationData) {
        this.translations[language] = {
            title: translationData.title || this.title,
            pages: translationData.pages || [],
            created_at: new Date().toISOString()
        };
        this.updated_at = new Date().toISOString();
    }

    /**
     * JSON으로 변환
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            author: this.author,
            created_at: this.created_at,
            updated_at: this.updated_at,
            status: this.status,
            language: this.language,
            cover_image: this.cover_image,
            cover_prompt: this.cover_prompt,
            pages: this.pages,
            characters: this.characters,
            key_objects: this.key_objects,
            educational_content: this.educational_content,
            translations: this.translations,
            background_music: this.background_music,
            metadata: this.metadata
        };
    }

    /**
     * 복제
     * @returns {Storybook}
     */
    clone() {
        return new Storybook(JSON.parse(JSON.stringify(this.toJSON())));
    }

    /**
     * 정적 메서드: 빈 동화책 생성
     * @returns {Storybook}
     */
    static createEmpty() {
        return new Storybook({
            title: '새 동화책',
            author: '',
            pages: []
        });
    }

    /**
     * 정적 메서드: JSON에서 생성
     * @param {Object} json 
     * @returns {Storybook}
     */
    static fromJSON(json) {
        return new Storybook(json);
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.Storybook = Storybook;
}
