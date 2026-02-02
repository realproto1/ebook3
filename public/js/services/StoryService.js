/**
 * StoryService
 * - 동화책 CRUD
 * - 목록 조회, 필터링, 정렬
 * - 상태 관리
 */

class StoryService {
    constructor() {
        this.storybooks = [];
        this.currentStorybook = null;
    }

    /**
     * 모든 동화책 목록 가져오기
     * @returns {Promise<Array>}
     */
    async fetchAll() {
        try {
            const data = await api.get('/api/storybooks', {
                errorMessage: '동화책 목록을 불러올 수 없습니다.'
            });

            this.storybooks = data.map(book => Storybook.fromJSON(book));
            return this.storybooks;
        } catch (error) {
            console.error('fetchAll error:', error);
            throw error;
        }
    }

    /**
     * 특정 동화책 가져오기
     * @param {string} id 
     * @returns {Promise<Storybook>}
     */
    async fetchById(id) {
        try {
            const data = await api.get(`/api/storybooks/${id}`, {
                errorMessage: '동화책을 불러올 수 없습니다.'
            });

            const storybook = Storybook.fromJSON(data);
            this.currentStorybook = storybook;
            return storybook;
        } catch (error) {
            console.error('fetchById error:', error);
            throw error;
        }
    }

    /**
     * 동화책 생성
     * @param {Object} data 
     * @returns {Promise<Storybook>}
     */
    async create(data) {
        try {
            const response = await api.post('/api/storybooks', data, {
                errorMessage: '동화책을 생성할 수 없습니다.'
            });

            const storybook = Storybook.fromJSON(response);
            this.storybooks.push(storybook);
            this.currentStorybook = storybook;
            return storybook;
        } catch (error) {
            console.error('create error:', error);
            throw error;
        }
    }

    /**
     * 동화책 업데이트
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Storybook>}
     */
    async update(id, updates) {
        try {
            const response = await api.put(`/api/storybooks/${id}`, updates, {
                errorMessage: '동화책을 업데이트할 수 없습니다.'
            });

            const storybook = Storybook.fromJSON(response);
            
            // 목록에서 업데이트
            const index = this.storybooks.findIndex(b => b.id === id);
            if (index !== -1) {
                this.storybooks[index] = storybook;
            }
            
            // 현재 동화책 업데이트
            if (this.currentStorybook && this.currentStorybook.id === id) {
                this.currentStorybook = storybook;
            }
            
            return storybook;
        } catch (error) {
            console.error('update error:', error);
            throw error;
        }
    }

    /**
     * 동화책 삭제
     * @param {string} id 
     * @returns {Promise<void>}
     */
    async delete(id) {
        try {
            await api.delete(`/api/storybooks/${id}`, {
                errorMessage: '동화책을 삭제할 수 없습니다.'
            });

            // 목록에서 제거
            this.storybooks = this.storybooks.filter(b => b.id !== id);
            
            // 현재 동화책이 삭제된 경우
            if (this.currentStorybook && this.currentStorybook.id === id) {
                this.currentStorybook = null;
            }
        } catch (error) {
            console.error('delete error:', error);
            throw error;
        }
    }

    /**
     * 동화책 생성 (AI 생성)
     * @param {Object} options
     * @returns {Promise<Storybook>}
     */
    async generateStorybook(options) {
        try {
            const response = await api.post('/api/generate-storybook', options, {
                errorMessage: '동화책을 생성할 수 없습니다.'
            });

            const storybook = Storybook.fromJSON(response);
            this.storybooks.push(storybook);
            this.currentStorybook = storybook;
            return storybook;
        } catch (error) {
            console.error('generateStorybook error:', error);
            throw error;
        }
    }

    /**
     * 동화책 번역
     * @param {string} id 
     * @param {string} targetLanguage 
     * @returns {Promise<Storybook>}
     */
    async translateStorybook(id, targetLanguage) {
        try {
            const response = await api.post('/api/translate-storybook', {
                id,
                targetLanguage
            }, {
                errorMessage: '동화책을 번역할 수 없습니다.'
            });

            const storybook = Storybook.fromJSON(response);
            
            // 업데이트
            if (this.currentStorybook && this.currentStorybook.id === id) {
                this.currentStorybook = storybook;
            }
            
            return storybook;
        } catch (error) {
            console.error('translateStorybook error:', error);
            throw error;
        }
    }

    /**
     * 필터링
     * @param {Object} filters
     * @returns {Array<Storybook>}
     */
    filter(filters = {}) {
        let filtered = [...this.storybooks];

        // 상태 필터
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(b => b.status === filters.status);
        }

        // 언어 필터
        if (filters.language && filters.language !== 'all') {
            filtered = filtered.filter(b => b.language === filters.language);
        }

        // 검색어 필터
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(query) ||
                (b.author && b.author.toLowerCase().includes(query))
            );
        }

        // 완성도 필터
        if (filters.minCompletion) {
            filtered = filtered.filter(b => 
                b.metadata.completion_rate >= filters.minCompletion
            );
        }

        return filtered;
    }

    /**
     * 정렬
     * @param {Array<Storybook>} storybooks 
     * @param {string} sortBy - 'date-desc', 'date-asc', 'title', 'completion'
     * @returns {Array<Storybook>}
     */
    sort(storybooks, sortBy = 'date-desc') {
        const sorted = [...storybooks];

        switch (sortBy) {
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'title':
                sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
                break;
            case 'completion':
                sorted.sort((a, b) => b.metadata.completion_rate - a.metadata.completion_rate);
                break;
            default:
                break;
        }

        return sorted;
    }

    /**
     * 현재 동화책 설정
     * @param {Storybook} storybook 
     */
    setCurrent(storybook) {
        this.currentStorybook = storybook;
    }

    /**
     * 현재 동화책 가져오기
     * @returns {Storybook|null}
     */
    getCurrent() {
        return this.currentStorybook;
    }

    /**
     * 상태별 카운트
     * @returns {Object}
     */
    getStatusCounts() {
        return {
            total: this.storybooks.length,
            draft: this.storybooks.filter(b => b.status === 'draft').length,
            generating: this.storybooks.filter(b => b.status === 'generating').length,
            completed: this.storybooks.filter(b => b.status === 'completed').length
        };
    }
}

// 싱글톤 인스턴스 생성
const storyService = new StoryService();

// 전역으로 export
if (typeof window !== 'undefined') {
    window.StoryService = StoryService;
    window.storyService = storyService;
}
