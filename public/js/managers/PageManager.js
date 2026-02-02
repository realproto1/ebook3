/**
 * PageManager.js
 * 동화책 페이지 관리 기능
 */

class PageManager {
    constructor(dependencies) {
        this.storybookManager = dependencies.storybookManager;
        
        console.log('✅ PageManager 초기화 완료');
    }
    
    /**
     * 새 페이지 추가
     */
    addNewPage(storybook) {
        if (!storybook || !storybook.pages) {
            throw new Error('동화책이 선택되지 않았습니다.');
        }
        
        // 확인 메시지
        if (!confirm('새 페이지를 추가하시겠습니까?\n\n맨 마지막에 빈 페이지가 추가됩니다.')) {
            return null;
        }
        
        // 새 페이지 번호 계산
        const lastPage = storybook.pages[storybook.pages.length - 1];
        const newPageNumber = lastPage ? lastPage.pageNumber + 1 : 1;
        
        // 새 페이지 객체 생성
        const newPage = {
            pageNumber: newPageNumber,
            text: '',
            sceneDescription: '',
            sceneStructure: {
                scene: '',
                action: '',
                emotion: ''
            },
            imageUrl: '',
            imageHistory: [],
            audioUrl: '',
            ttsAudio: {
                ko: { url: '', model: '' }
            },
            translatedAudioUrls: {},
            characterReferences: storybook.characters?.map(() => false) || [],
            keyObjectReferences: storybook.key_objects?.map(() => false) || []
        };
        
        // 페이지 배열에 추가
        storybook.pages.push(newPage);
        
        // 모든 번역 언어에도 빈 페이지 추가
        if (storybook.translations) {
            Object.keys(storybook.translations).forEach(lang => {
                if (Array.isArray(storybook.translations[lang])) {
                    storybook.translations[lang].push({
                        pageNumber: newPageNumber,
                        text: ''
                    });
                }
            });
        }
        
        console.log(`✅ 페이지 ${newPageNumber} 추가 완료`);
        
        return {
            page: newPage,
            pageIndex: storybook.pages.length - 1
        };
    }
    
    /**
     * Review 페이지 삭제
     */
    deleteReviewPage(reviewData, lang, pageIdx) {
        const pages = reviewData.translations?.[lang] || reviewData.pages || [];
        const pageNumber = pages[pageIdx]?.pageNumber || pageIdx + 1;
        
        if (!confirm(`페이지 ${pageNumber}을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
            return false;
        }
        
        // 데이터에서 삭제
        if (reviewData.translations && reviewData.translations[lang]) {
            reviewData.translations[lang].splice(pageIdx, 1);
            
            // 페이지 번호 재정렬
            reviewData.translations[lang].forEach((page, idx) => {
                page.pageNumber = idx + 1;
            });
        }
        
        console.log(`✅ Review 페이지 ${pageNumber} (${lang}) 삭제됨`);
        return true;
    }
    
    /**
     * Review 새 페이지 추가
     */
    addReviewNewPage(reviewData, lang) {
        const pages = reviewData.translations?.[lang] || reviewData.pages || [];
        const newPageNumber = pages.length + 1;
        
        const newPage = {
            pageNumber: newPageNumber,
            text: ''
        };
        
        // 데이터 업데이트
        if (!reviewData.translations) {
            reviewData.translations = {};
        }
        if (!reviewData.translations[lang]) {
            reviewData.translations[lang] = [];
        }
        
        reviewData.translations[lang].push(newPage);
        
        console.log(`✅ Review 새 페이지 ${newPageNumber} (${lang}) 추가됨`);
        
        return {
            page: newPage,
            pageIndex: pages.length
        };
    }
    
    /**
     * 페이지 삭제 (일반)
     */
    deletePage(storybook, pageIndex) {
        if (!storybook || !storybook.pages || !storybook.pages[pageIndex]) {
            throw new Error('페이지를 찾을 수 없습니다.');
        }
        
        const pageNumber = storybook.pages[pageIndex].pageNumber;
        
        if (!confirm(`페이지 ${pageNumber}을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
            return false;
        }
        
        // 페이지 삭제
        storybook.pages.splice(pageIndex, 1);
        
        // 페이지 번호 재정렬
        storybook.pages.forEach((page, idx) => {
            page.pageNumber = idx + 1;
        });
        
        // 번역 페이지도 삭제
        if (storybook.translations) {
            Object.keys(storybook.translations).forEach(lang => {
                if (Array.isArray(storybook.translations[lang]) && storybook.translations[lang][pageIndex]) {
                    storybook.translations[lang].splice(pageIndex, 1);
                    
                    // 번역 페이지 번호도 재정렬
                    storybook.translations[lang].forEach((page, idx) => {
                        page.pageNumber = idx + 1;
                    });
                }
            });
        }
        
        console.log(`✅ 페이지 ${pageNumber} 삭제 완료`);
        return true;
    }
    
    /**
     * 페이지 순서 변경
     */
    reorderPages(storybook, fromIndex, toIndex) {
        if (!storybook || !storybook.pages) {
            throw new Error('동화책이 선택되지 않았습니다.');
        }
        
        if (fromIndex < 0 || fromIndex >= storybook.pages.length ||
            toIndex < 0 || toIndex >= storybook.pages.length) {
            throw new Error('잘못된 페이지 인덱스입니다.');
        }
        
        // 페이지 이동
        const [movedPage] = storybook.pages.splice(fromIndex, 1);
        storybook.pages.splice(toIndex, 0, movedPage);
        
        // 페이지 번호 재정렬
        storybook.pages.forEach((page, idx) => {
            page.pageNumber = idx + 1;
        });
        
        // 번역 페이지도 동일하게 이동
        if (storybook.translations) {
            Object.keys(storybook.translations).forEach(lang => {
                if (Array.isArray(storybook.translations[lang])) {
                    const [movedTransPage] = storybook.translations[lang].splice(fromIndex, 1);
                    storybook.translations[lang].splice(toIndex, 0, movedTransPage);
                    
                    // 번역 페이지 번호도 재정렬
                    storybook.translations[lang].forEach((page, idx) => {
                        page.pageNumber = idx + 1;
                    });
                }
            });
        }
        
        console.log(`✅ 페이지 순서 변경: ${fromIndex + 1} → ${toIndex + 1}`);
        return true;
    }
}

// 전역으로 노출
window.PageManager = PageManager;
console.log('✅ PageManager.js 로드 완료');
