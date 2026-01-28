// 전역 변수
let allStorybooks = [];
let filteredStorybooks = [];
let currentAgeFilter = '';
let currentCategoryFilter = '';
let currentSort = 'title';

// 페이지 로드 시 동화책 목록 불러오기
async function loadStorybooks() {
    showLoading();
    
    try {
        console.log('📖 Loading public storybooks...');
        
        const response = await axios.get('/api/viewer/storybooks');
        
        if (response.data.success) {
            allStorybooks = response.data.storybooks;
            filteredStorybooks = [...allStorybooks];
            
            // 초기 로드 시 제목순으로 정렬
            filteredStorybooks.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
            
            console.log(`✅ Loaded ${allStorybooks.length} storybooks`);
            
            if (allStorybooks.length === 0) {
                showEmptyState();
            } else {
                renderBooks();
            }
        }
    } catch (error) {
        console.error('❌ Failed to load storybooks:', error);
        showError('동화책을 불러오는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 동화책 카드 렌더링
function renderBooks() {
    const grid = document.getElementById('books-grid');
    
    if (filteredStorybooks.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    grid.innerHTML = filteredStorybooks.map(book => `
        <div class="book-card bg-white rounded-3xl shadow-xl overflow-hidden fade-in">
            <!-- 표지 이미지 -->
            <div class="relative h-72 overflow-hidden cursor-pointer" onclick="console.log('📖 표지 클릭:', '${book.id}'); openBook('${book.id}')">
                ${book.coverImage 
                    ? `<img src="${book.coverImage}" alt="${book.title}" class="book-cover w-full h-full object-cover">`
                    : `<div class="book-cover w-full h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
                        <i class="fas fa-book-open text-white text-7xl opacity-80"></i>
                       </div>`
                }
                <!-- 연령 배지 -->
                <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg">
                    <span class="text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        <i class="fas fa-child mr-1"></i>
                        ${book.targetAge}세
                    </span>
                </div>
                <!-- 조회수 배지 -->
                <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1 shadow-lg">
                    <span class="text-xs font-semibold text-white flex items-center">
                        <i class="fas fa-eye mr-1.5"></i>
                        ${book.viewCount || 0}
                    </span>
                </div>
            </div>
            
            <!-- 정보 -->
            <div class="p-6">
                <!-- 제목 -->
                <h3 class="text-xl font-bold text-gray-800 mb-5 line-clamp-2 min-h-[3.5rem]">${book.title}</h3>
                
                <!-- 액션 버튼 -->
                <div class="flex gap-2 mb-3">
                    <button onclick="console.log('📖 읽기 버튼 클릭:', '${book.id}'); openBook('${book.id}')" class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                        <i class="fas fa-book-open mr-2"></i>
                        읽기
                    </button>
                    <button onclick="openGamesFromViewer('${book.id}')" class="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                        <i class="fas fa-gamepad mr-2"></i>
                        게임
                    </button>
                </div>
                
                <!-- 공유하기 & 댓글 버튼 -->
                <div class="flex gap-2">
                    <button onclick="shareBook('${book.id}'); event.stopPropagation();" class="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-semibold py-2.5 rounded-xl transition-all border border-blue-200">
                        <i class="fas fa-share-alt mr-1.5"></i>
                        공유
                    </button>
                    <button onclick="openComments('${book.id}', '${book.title.replace(/'/g, "\\'")}'); event.stopPropagation();" class="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 font-semibold py-2.5 rounded-xl transition-all border border-purple-200">
                        <i class="fas fa-comments mr-1.5"></i>
                        댓글 <span class="comment-count-${book.id}">0</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    console.log(`✅ ${filteredStorybooks.length}개 동화책 카드 렌더링 완료`);
    console.log('🔍 openBook 함수 존재 여부:', typeof openBook !== 'undefined');
    console.log('🔍 첫 번째 책 ID:', filteredStorybooks[0]?.id);
    
    // 실제로 onclick이 HTML에 있는지 확인
    setTimeout(() => {
        const firstButton = document.querySelector('.book-card button');
        if (firstButton) {
            console.log('🔍 첫 번째 버튼 onclick 속성:', firstButton.getAttribute('onclick'));
            console.log('🔍 첫 번째 버튼 존재:', !!firstButton);
        } else {
            console.error('❌ 버튼을 찾을 수 없습니다!');
        }
    }, 100);
    
    // 각 책의 댓글 개수 불러오기
    filteredStorybooks.forEach(book => {
        loadCommentCount(book.id);
    });
}

// 연령대 필터
// 카테고리 필터
function filterByCategory(category) {
    currentCategoryFilter = category;
    
    // 필터 버튼 활성화 상태 변경 (카테고리)
    document.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    applyFilters();
}

// 연령 필터
function filterByAge(age) {
    currentAgeFilter = age;
    
    // 필터 버튼 활성화 상태 변경 (연령대)
    document.querySelectorAll('.filter-btn[data-age]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.age === age) {
            btn.classList.add('active');
        }
    });
    
    applyFilters();
}

// 필터 적용 (카테고리 + 연령대)
function applyFilters() {
    filteredStorybooks = allStorybooks.filter(book => {
        // 카테고리 필터
        const categoryMatch = currentCategoryFilter === '' || book.category === currentCategoryFilter;
        
        // 연령 필터
        let ageMatch = true;
        if (currentAgeFilter !== '') {
            const targetAge = parseInt(book.targetAge);
            if (currentAgeFilter === '4-5') ageMatch = targetAge >= 4 && targetAge <= 5;
            else if (currentAgeFilter === '5-7') ageMatch = targetAge >= 5 && targetAge <= 7;
            else if (currentAgeFilter === '7-8') ageMatch = targetAge >= 7 && targetAge <= 8;
        }
        
        return categoryMatch && ageMatch;
    });
    
    // 현재 정렬 유지
    sortBooks();
}

// 정렬
function sortBooks() {
    const sortSelect = document.getElementById('sort-select');
    const sortValue = sortSelect ? sortSelect.value : 'title';
    currentSort = sortValue;
    
    switch(sortValue) {
        case 'latest':
            filteredStorybooks.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
            break;
        case 'oldest':
            filteredStorybooks.sort((a, b) => new Date(a.publishedAt || a.createdAt) - new Date(b.publishedAt || b.createdAt));
            break;
        case 'title':
        default:
            filteredStorybooks.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
            break;
    }
    
    renderBooks();
}

// 동화책 열기 (언어 선택 포함)
async function openBook(bookId) {
    console.log('🔍 openBook 호출됨 - bookId:', bookId);
    console.log('🔍 axios 사용 가능:', typeof axios !== 'undefined');
    
    if (typeof axios === 'undefined') {
        console.error('❌ axios가 로드되지 않았습니다!');
        alert('필수 라이브러리를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    // 1. 즉시 로딩 모달 표시
    showLoadingModal();
    
    try {
        // 2. 동화책 데이터 로드
        console.log('📡 API 호출 시작:', `/api/viewer/storybooks/${bookId}`);
        
        const response = await axios.get(`/api/viewer/storybooks/${bookId}`, {
            timeout: 10000, // 10초 타임아웃
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('📡 API 응답 받음:', response);
        console.log('📡 API 응답 데이터:', {
            success: response.data.success,
            hasStorybook: !!response.data.storybook,
            title: response.data.storybook?.title,
            languages: response.data.storybook?.languages
        });
        
        // 3. 로딩 모달 숨기기
        hideLoadingModal();
        
        if (!response.data.success || !response.data.storybook) {
            console.error('❌ 동화책 로드 실패: 응답 데이터 없음');
            alert('동화책을 불러올 수 없습니다.');
            return;
        }
        
        const storybook = response.data.storybook;
        
        // 4. 사용 가능한 언어 목록 가져오기
        const availableLanguages = storybook.languages || ['ko'];
        console.log('🌐 사용 가능한 언어:', availableLanguages);
        
        // 5. 언어가 1개면 바로 이동, 2개 이상이면 선택 모달 표시
        if (availableLanguages.length === 1) {
            console.log('➡️ 언어 1개 - 바로 이동:', availableLanguages[0]);
            window.location.href = `/reader.html?id=${bookId}&lang=${availableLanguages[0]}`;
        } else {
            console.log('📋 언어 2개 이상 - 선택 모달 표시');
            showLanguageModal(bookId, storybook.title, availableLanguages);
        }
    } catch (error) {
        // 에러 시에도 로딩 모달 숨기기
        hideLoadingModal();
        
        console.error('❌ 동화책 로드 실패:', error);
        console.error('❌ 에러 이름:', error.name);
        console.error('❌ 에러 메시지:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error('⏱️ 타임아웃 발생');
            alert('요청 시간이 초과되었습니다. 다시 시도해주세요.');
        } else if (error.response) {
            console.error('❌ 서버 응답:', {
                status: error.response.status,
                data: error.response.data
            });
            alert('동화책을 불러오는 중 서버 오류가 발생했습니다.');
        } else if (error.request) {
            console.error('❌ 요청 전송 실패:', error.request);
            alert('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
        } else {
            console.error('❌ 알 수 없는 오류');
            alert('동화책을 불러오는 중 오류가 발생했습니다.');
        }
    }
}

// 언어 선택 모달 표시
function showLanguageModal(bookId, bookTitle, languages) {
    console.log('🎨 showLanguageModal 호출:', { bookId, bookTitle, languages });
    
    const modal = document.getElementById('language-select-modal');
    const titleEl = document.getElementById('language-modal-book-title');
    const buttonsContainer = document.getElementById('language-buttons');
    
    if (!modal) {
        console.error('❌ 언어 선택 모달을 찾을 수 없습니다: #language-select-modal');
        return;
    }
    
    if (!titleEl) {
        console.error('❌ 제목 요소를 찾을 수 없습니다: #language-modal-book-title');
        return;
    }
    
    if (!buttonsContainer) {
        console.error('❌ 버튼 컨테이너를 찾을 수 없습니다: #language-buttons');
        return;
    }
    
    // 동화책 제목 표시
    titleEl.textContent = bookTitle;
    console.log('✅ 제목 설정:', bookTitle);
    
    // 언어 이름 매핑
    const languageNames = {
        'ko': { name: '한국어', flag: '🇰🇷', color: 'blue' },
        'en': { name: 'English', flag: '🇺🇸', color: 'green' },
        'zh': { name: '中文', flag: '🇨🇳', color: 'red' },
        'ja': { name: '日本語', flag: '🇯🇵', color: 'pink' },
        'es': { name: 'Español', flag: '🇪🇸', color: 'yellow' },
        'fr': { name: 'Français', flag: '🇫🇷', color: 'indigo' }
    };
    
    // 언어 버튼 생성
    const buttonsHTML = languages.map(lang => {
        const langInfo = languageNames[lang] || { name: lang, flag: '🌐', color: 'gray' };
        return `
            <button 
                onclick="selectLanguageAndOpen('${bookId}', '${lang}')"
                class="w-full flex items-center justify-between p-4 rounded-xl border-2 border-${langInfo.color}-200 bg-gradient-to-r from-${langInfo.color}-50 to-white hover:from-${langInfo.color}-100 hover:to-${langInfo.color}-50 hover:border-${langInfo.color}-400 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
            >
                <div class="flex items-center">
                    <span class="text-3xl mr-3">${langInfo.flag}</span>
                    <span class="text-lg font-bold text-gray-800">${langInfo.name}</span>
                </div>
                <i class="fas fa-chevron-right text-${langInfo.color}-600"></i>
            </button>
        `;
    }).join('');
    
    buttonsContainer.innerHTML = buttonsHTML;
    console.log('✅ 버튼 생성 완료:', languages.length, '개');
    
    // 모달 표시
    modal.classList.remove('hidden');
    console.log('✅ 모달 표시 완료');
}

// 언어 선택하고 동화책 열기
function selectLanguageAndOpen(bookId, language) {
    console.log('✅ selectLanguageAndOpen 호출:', { bookId, language });
    const url = `/reader.html?id=${bookId}&lang=${language}`;
    console.log('➡️ 이동할 URL:', url);
    window.location.href = url;
}

// 언어 선택 모달 닫기
function closeLanguageModal() {
    console.log('❌ closeLanguageModal 호출');
    const modal = document.getElementById('language-select-modal');
    modal.classList.add('hidden');
}

// UI 헬퍼 함수
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('books-grid').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('books-grid').classList.remove('hidden');
}

function showEmptyState() {
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('books-grid').classList.add('hidden');
}

function hideEmptyState() {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('books-grid').classList.remove('hidden');
}

function showError(message) {
    alert(message);
}

// 게임 페이지 열기
function openGamesFromViewer(bookId) {
    // games.html로 이동 (URL 파라미터로 bookId 전달)
    window.open(`/games.html?id=${bookId}`, '_blank');
}

// 로딩 모달 표시
function showLoadingModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) {
        modal.classList.remove('hidden');
        console.log('⏳ 로딩 모달 표시');
    }
}

// 로딩 모달 숨기기
function hideLoadingModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) {
        modal.classList.add('hidden');
        console.log('✅ 로딩 모달 숨김');
    }
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    // 언어 선택 모달이 열려있으면 닫기 (뒤로가기 시)
    const languageModal = document.getElementById('language-select-modal');
    if (languageModal && !languageModal.classList.contains('hidden')) {
        languageModal.classList.add('hidden');
    }
    
    loadStorybooks();
    
    // 전역으로 함수 노출 (디버깅용)
    window.openBook = openBook;
    window.openGamesFromViewer = openGamesFromViewer;
    window.shareBook = shareBook;
    window.openComments = openComments;
    window.selectLanguageAndOpen = selectLanguageAndOpen;
    window.closeLanguageModal = closeLanguageModal;
    window.filterByAge = filterByAge;
    window.filterByCategory = filterByCategory;
    window.sortBooks = sortBooks;
    
    console.log('🌐 전역 함수 등록 완료:', {
        openBook: typeof window.openBook,
        openGamesFromViewer: typeof window.openGamesFromViewer,
        shareBook: typeof window.shareBook,
        openComments: typeof window.openComments,
        filterByCategory: typeof window.filterByCategory
    });
});

// ===== 공유하기 & 댓글 기능 =====

// 동화책 공유하기
function shareBook(bookId) {
    const shareUrl = `${window.location.origin}/viewer.html?id=${bookId}`;
    
    // 바로 클립보드에 복사
    copyToClipboard(shareUrl);
}

// 클립보드에 복사
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('링크가 복사되었습니다!', 'success');
            })
            .catch(err => {
                console.error('❌ Clipboard copy failed:', err);
                fallbackCopyToClipboard(text);
            });
    } else {
        fallbackCopyToClipboard(text);
    }
}

// 클립보드 복사 폴백
function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('링크가 복사되었습니다!', 'success');
    } catch (err) {
        console.error('❌ Fallback copy failed:', err);
        alert('복사에 실패했습니다. 수동으로 링크를 복사해주세요:\n\n' + text);
    }
    
    document.body.removeChild(textarea);
}

// 댓글 개수 불러오기
async function loadCommentCount(bookId) {
    try {
        const response = await axios.get(`/api/viewer/storybooks/${bookId}/comments`);
        if (response.data.success) {
            const count = response.data.comments.length;
            const countElement = document.querySelector(`.comment-count-${bookId}`);
            if (countElement) {
                countElement.textContent = count;
            }
        }
    } catch (error) {
        console.error('❌ Failed to load comment count:', error);
    }
}

// 댓글 모달 열기
function openComments(bookId, bookTitle) {
    // 댓글 모달 HTML 생성
    const modal = document.createElement('div');
    modal.id = 'comments-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) closeCommentsModal();
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onclick="event.stopPropagation()">
            <!-- 헤더 -->
            <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h3 class="text-2xl font-bold text-gray-800 flex items-center">
                        <i class="fas fa-comments text-purple-600 mr-3"></i>
                        댓글
                    </h3>
                    <p class="text-sm text-gray-600 mt-1">${bookTitle}</p>
                </div>
                <button onclick="closeCommentsModal()" class="text-gray-500 hover:text-gray-700 text-2xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- 댓글 목록 -->
            <div id="modal-comments-list" class="flex-1 overflow-y-auto p-6 space-y-4">
                <div class="text-center py-8">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500"></div>
                    <p class="text-gray-600 mt-4">댓글을 불러오는 중...</p>
                </div>
            </div>
            
            <!-- 댓글 작성 폼 -->
            <div class="p-6 border-t border-gray-200 bg-gray-50">
                <div class="mb-3">
                    <input 
                        type="text" 
                        id="modal-comment-nickname" 
                        placeholder="별명 (최대 20자)" 
                        maxlength="20"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                </div>
                <div class="flex gap-2">
                    <textarea 
                        id="modal-comment-content" 
                        placeholder="댓글을 입력하세요 (최대 500자)" 
                        maxlength="500"
                        rows="2"
                        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    ></textarea>
                    <button 
                        onclick="submitCommentFromModal('${bookId}')"
                        class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium whitespace-nowrap"
                    >
                        작성
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 댓글 불러오기
    loadCommentsForModal(bookId);
}

// 댓글 모달 닫기
function closeCommentsModal() {
    const modal = document.getElementById('comments-modal');
    if (modal) {
        modal.remove();
    }
}

// 모달용 댓글 불러오기
async function loadCommentsForModal(bookId) {
    try {
        const response = await axios.get(`/api/viewer/storybooks/${bookId}/comments`);
        
        if (response.data.success) {
            const comments = response.data.comments || [];
            displayCommentsInModal(comments);
        }
    } catch (error) {
        console.error('❌ Failed to load comments:', error);
        const commentsList = document.getElementById('modal-comments-list');
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="text-center py-8 text-red-600">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>댓글을 불러오는데 실패했습니다.</p>
                </div>
            `;
        }
    }
}

// 모달에 댓글 표시
function displayCommentsInModal(comments) {
    const commentsList = document.getElementById('modal-comments-list');
    
    if (!commentsList) return;
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-comments text-6xl mb-4"></i>
                <p class="text-lg">아직 댓글이 없습니다.</p>
                <p class="text-sm mt-2">첫 번째 댓글을 작성해보세요!</p>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        ${escapeHtml(comment.nickname.charAt(0).toUpperCase())}
                    </div>
                    <span class="font-semibold text-gray-800">${escapeHtml(comment.nickname)}</span>
                </div>
                <span class="text-gray-500 text-sm">${formatDate(comment.createdAt)}</span>
            </div>
            <p class="text-gray-700 whitespace-pre-wrap break-words ml-13">${escapeHtml(comment.content)}</p>
        </div>
    `).join('');
}

// 모달에서 댓글 작성
async function submitCommentFromModal(bookId) {
    try {
        const nickname = document.getElementById('modal-comment-nickname').value.trim();
        const content = document.getElementById('modal-comment-content').value.trim();
        
        if (!nickname) {
            showToast('닉네임을 입력해주세요.', 'error');
            return;
        }
        
        if (!content) {
            showToast('댓글 내용을 입력해주세요.', 'error');
            return;
        }
        
        if (content.length > 500) {
            showToast('댓글은 500자 이내로 작성해주세요.', 'error');
            return;
        }
        
        console.log('💬 Submitting comment...');
        
        const response = await axios.post(`/api/viewer/storybooks/${bookId}/comments`, {
            nickname,
            content
        });
        
        if (response.data.success) {
            console.log('✅ Comment submitted successfully');
            
            // 입력 필드 초기화
            document.getElementById('modal-comment-nickname').value = '';
            document.getElementById('modal-comment-content').value = '';
            
            // 댓글 목록 다시 불러오기
            await loadCommentsForModal(bookId);
            
            // 카드의 댓글 개수 업데이트
            loadCommentCount(bookId);
            
            // 성공 메시지
            showToast('댓글이 작성되었습니다!', 'success');
        }
    } catch (error) {
        console.error('❌ Failed to submit comment:', error);
        const errorMessage = error.response?.data?.error || '댓글 작성에 실패했습니다.';
        showToast(errorMessage, 'error');
    }
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// HTML 이스케이프
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[60] animate-fade-in`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
