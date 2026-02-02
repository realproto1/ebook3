/**
 * StorybookManager.js
 * 동화책 CRUD 및 관리 기능
 */

class StorybookManager {
    constructor(dependencies) {
        this.api = dependencies.api;
        this.storage = dependencies.storage;
        this.storyService = dependencies.storyService;
        
        // 전역 상태 참조
        this.storybooks = [];
        this.currentStorybook = null;
        
        console.log('✅ StorybookManager 초기화 완료');
    }
    
    /**
     * R2에서 모든 동화책 로드
     */
    async loadStorybooks() {
        console.log('🔧 StorybookManager.loadStorybooks() 시작');
        
        // 로딩 인디케이터 표시
        const loadingEl = document.getElementById('bookListLoading');
        if (loadingEl) {
            loadingEl.classList.remove('hidden');
        }
        
        try {
            console.log('📚 R2 API 호출 시작: GET /api/storybooks');
            const startTime = Date.now();
            const response = await this.api.get('/api/storybooks');
            console.log('📡 R2 API 응답:', response, `(${Date.now() - startTime}ms)`);
            
            if (response.success && response.storybooks) {
                const r2Books = response.storybooks;
                console.log(`✅ R2에서 ${r2Books.length}권의 동화책을 찾았습니다`);
                
                // 🚀 병렬로 모든 동화책 상세 정보 로드
                console.log('⚡ 모든 동화책을 병렬로 로드 시작...');
                const detailStartTime = Date.now();
                
                const detailPromises = r2Books.map(meta => 
                    this.api.get(`/api/storybooks/${meta.id}`)
                        .then(response => {
                            console.log(`✅ ${meta.title} 로드 성공`);
                            return response;
                        })
                        .catch(error => {
                            console.error(`❌ 동화책 ${meta.id} 로드 실패:`, error);
                            return null;
                        })
                );
                
                const fullBooks = (await Promise.all(detailPromises)).filter(book => book !== null);
                
                const detailElapsed = Date.now() - detailStartTime;
                console.log(`📚 총 ${fullBooks.length}권의 동화책 로드 완료 (${detailElapsed}ms, 평균 ${Math.round(detailElapsed / fullBooks.length)}ms/권)`);
                
                // 결과 반환
                this.storybooks = fullBooks;
                return fullBooks;
            } else {
                console.warn('⚠️ R2 응답 형식 오류:', response);
                return [];
            }
        } catch (error) {
            console.error('❌ R2 동화책 로드 실패:', error);
            throw error;
        } finally {
            // 로딩 인디케이터 숨기기
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }
        }
    }
    
    /**
     * 동화책 선택
     */
    selectStorybook(id, onSelect) {
        const book = this.storybooks.find(b => b.id === id);
        if (book) {
            this.currentStorybook = book;
            
            // 콜백 호출 (화면 업데이트용)
            if (typeof onSelect === 'function') {
                onSelect(book);
            }
            
            console.log('✅ 동화책 선택:', book.title);
            return book;
        }
        
        console.warn('⚠️ 동화책을 찾을 수 없습니다:', id);
        return null;
    }
    
    /**
     * 현재 동화책 저장
     */
    async saveCurrentStorybook(storybook = null) {
        const book = storybook || this.currentStorybook;
        
        if (!book || !book.id) {
            console.warn('⚠️ 저장할 동화책이 없습니다.');
            return false;
        }
        
        try {
            await this.api.put(`/api/storybooks/${book.id}`, book);
            console.log('✅ 동화책 저장 완료:', book.title);
            return true;
        } catch (error) {
            console.error('❌ 동화책 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * R2에 동화책 저장 (신규 생성 또는 복사본)
     */
    async saveToR2(storybook, retryCount = 0) {
        const MAX_RETRIES = 3;
        
        try {
            console.log(`💾 R2에 저장 시작: "${storybook.title}" (ID: ${storybook.id})`);
            
            const response = await this.api.post('/api/storybooks', storybook);
            
            if (response.success) {
                console.log(`✅ R2 저장 완료`);
                return true;
            } else {
                throw new Error(response.error || '저장 실패');
            }
        } catch (error) {
            console.error(`❌ R2 저장 실패 (시도 ${retryCount + 1}/${MAX_RETRIES}):`, error);
            
            // 재시도
            if (retryCount < MAX_RETRIES - 1) {
                console.log(`🔄 ${retryCount + 2}번째 시도 중...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.saveToR2(storybook, retryCount + 1);
            }
            
            throw error;
        }
    }
    
    /**
     * 동화책 삭제
     */
    async deleteStorybook(id, title = '이 동화책') {
        console.log(`🗑️ 삭제 요청: ID ${id}, 제목: ${title}`);
        
        // 확인 메시지
        const confirmMessage = `⚠️ 정말로 삭제하시겠습니까?\n\n동화책: "${title}"\n\n이 작업은 되돌릴 수 없습니다.\n- 모든 페이지\n- 캐릭터 레퍼런스\n- 표지 이미지\n- 생성된 모든 콘텐츠\n\n위 내용이 영구적으로 삭제됩니다.`;
        
        if (!confirm(confirmMessage)) {
            console.log(`❌ 사용자 취소: 삭제 취소됨`);
            return false;
        }
        
        console.log(`✅ 사용자 확인: 삭제 진행`);
        
        try {
            // R2에서 삭제
            console.log(`🗑️ R2에서 삭제 시작: ID ${id}`);
            const response = await this.api.delete(`/api/storybooks/${id}`);
            
            if (response.success) {
                console.log(`✅ R2 삭제 완료`);
                
                // 메모리에서 제거
                const beforeCount = this.storybooks.length;
                this.storybooks = this.storybooks.filter(b => b.id !== id);
                const afterCount = this.storybooks.length;
                
                console.log(`📊 동화책 목록 업데이트: ${beforeCount}권 → ${afterCount}권`);
                
                // 현재 선택된 동화책이면 선택 해제
                if (this.currentStorybook && this.currentStorybook.id === id) {
                    this.currentStorybook = null;
                }
                
                return true;
            } else {
                throw new Error(response.error || '삭제 실패');
            }
        } catch (error) {
            console.error('❌ 삭제 오류:', error);
            throw error;
        }
    }
    
    /**
     * 동화책 복사
     */
    async duplicateStorybook(id) {
        const book = this.storybooks.find(b => b.id === id);
        if (!book) {
            throw new Error('동화책을 찾을 수 없습니다.');
        }
        
        // 사용자 입력 받기
        const newTitle = prompt('새로운 동화책 제목을 입력하세요:', `${book.title} (복사본)`);
        if (!newTitle) {
            return null; // 취소
        }
        
        const newArtStyle = prompt('새로운 그림 스타일을 입력하세요:', book.artStyle || '디즈니 스타일');
        if (!newArtStyle) {
            return null; // 취소
        }
        
        // 깊은 복사
        const duplicate = JSON.parse(JSON.stringify(book));
        
        // 새 ID 생성
        duplicate.id = Date.now().toString();
        duplicate.title = newTitle;
        duplicate.artStyle = newArtStyle;
        
        // 🔥 이미지 제거 (텍스트는 유지)
        
        // 캐릭터 레퍼런스 이미지 제거
        if (duplicate.characters && Array.isArray(duplicate.characters)) {
            duplicate.characters.forEach(char => {
                char.referenceImage = null;
                char.imageHistory = [];
            });
        }
        
        // Key Object 이미지 제거
        duplicate.vocabularyImages = [];
        duplicate.keyObjectImages = [];
        
        if (duplicate.educational_content?.vocabulary && Array.isArray(duplicate.educational_content.vocabulary)) {
            duplicate.educational_content.vocabulary.forEach(vocab => {
                if (typeof vocab === 'object') {
                    delete vocab.image;
                    delete vocab.imageUrl;
                }
            });
        }
        
        if (duplicate.key_objects && Array.isArray(duplicate.key_objects)) {
            duplicate.key_objects.forEach(obj => {
                if (typeof obj === 'object') {
                    delete obj.image;
                    delete obj.imageUrl;
                }
            });
        }
        
        // 페이지 삽화 이미지 제거
        if (duplicate.pages && Array.isArray(duplicate.pages)) {
            duplicate.pages.forEach(page => {
                page.illustrationImage = null;
                page.illustrationHistory = [];
                delete page.artStyle; // 페이지별 스타일 제거
            });
        }
        
        // 표지 이미지 제거
        duplicate.coverImage = null;
        
        // 메모리에 추가
        this.storybooks.unshift(duplicate);
        
        // R2에 저장
        try {
            console.log(`💾 R2에 복사본 저장: "${duplicate.title}" (ID: ${duplicate.id})`);
            await this.saveToR2(duplicate);
            console.log(`✅ R2 저장 완료`);
            
            return duplicate;
        } catch (error) {
            console.error('❌ R2 저장 오류:', error);
            throw error;
        }
    }
    
    /**
     * 동화책 목록 가져오기
     */
    getStorybooks() {
        return this.storybooks;
    }
    
    /**
     * 현재 동화책 가져오기
     */
    getCurrentStorybook() {
        return this.currentStorybook;
    }
    
    /**
     * 현재 동화책 설정
     */
    setCurrentStorybook(storybook) {
        this.currentStorybook = storybook;
    }
}

// 전역으로 노출
window.StorybookManager = StorybookManager;
console.log('✅ StorybookManager.js 로드 완료');
