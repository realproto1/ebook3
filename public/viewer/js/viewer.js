// 전역 변수
let allStorybooks = [];
let filteredStorybooks = [];
let currentFilter = '';

// 페이지 로드 시 동화책 목록 불러오기
async function loadStorybooks() {
    showLoading();
    
    try {
        console.log('📖 Loading public storybooks...');
        
        const response = await axios.get('/api/viewer/storybooks');
        
        if (response.data.success) {
            allStorybooks = response.data.storybooks;
            filteredStorybooks = [...allStorybooks];
            
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
        <div class="book-card bg-white rounded-2xl shadow-xl overflow-hidden fade-in">
            <!-- 표지 이미지 -->
            <div class="relative h-64 overflow-hidden cursor-pointer" onclick="openBook('${book.id}')">
                ${book.coverImage 
                    ? `<img src="${book.coverImage}" alt="${book.title}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <i class="fas fa-book text-white text-6xl"></i>
                       </div>`
                }
                <!-- 연령 배지 -->
                <div class="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full px-3 py-1 text-sm font-bold text-purple-700">
                    <i class="fas fa-child mr-1"></i>
                    ${book.targetAge}세
                </div>
            </div>
            
            <!-- 정보 -->
            <div class="p-5">
                <h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2">${book.title}</h3>
                
                <div class="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>
                        <i class="fas fa-file-alt mr-1"></i>
                        ${book.pageCount}페이지
                    </span>
                    <span>
                        <i class="fas fa-users mr-1"></i>
                        ${book.characterCount}명
                    </span>
                </div>
                
                <!-- 아트 스타일 태그 -->
                <div class="text-xs text-gray-500 mb-4 line-clamp-1">
                    <i class="fas fa-palette mr-1"></i>
                    ${book.artStyle}
                </div>
                
                <!-- 액션 버튼 -->
                <div class="flex gap-2">
                    <button onclick="openBook('${book.id}')" class="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-lg transition">
                        <i class="fas fa-book-open mr-2"></i>
                        보기
                    </button>
                    <button onclick="openGamesFromViewer('${book.id}')" class="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition">
                        <i class="fas fa-gamepad mr-2"></i>
                        게임
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 연령대 필터
function filterByAge(age) {
    currentFilter = age;
    
    // 필터 버튼 활성화 상태 변경
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.age === age) {
            btn.classList.add('active');
        }
    });
    
    // 필터링
    if (age === '') {
        filteredStorybooks = [...allStorybooks];
    } else {
        filteredStorybooks = allStorybooks.filter(book => {
            const targetAge = parseInt(book.targetAge);
            if (age === '4-5') return targetAge >= 4 && targetAge <= 5;
            if (age === '5-7') return targetAge >= 5 && targetAge <= 7;
            if (age === '7-8') return targetAge >= 7 && targetAge <= 8;
            return true;
        });
    }
    
    renderBooks();
}

// 정렬
function sortBooks() {
    const sortValue = document.getElementById('sort-select').value;
    
    switch(sortValue) {
        case 'latest':
            filteredStorybooks.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            break;
        case 'oldest':
            filteredStorybooks.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
            break;
        case 'title':
            filteredStorybooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    renderBooks();
}

// 동화책 열기 (언어 선택 포함)
async function openBook(bookId) {
    console.log('🔍 openBook 호출됨 - bookId:', bookId);
    
    try {
        // 동화책 데이터 로드
        console.log('📡 API 호출 시작:', `/api/viewer/storybooks/${bookId}`);
        const response = await axios.get(`/api/viewer/storybooks/${bookId}`);
        
        console.log('📡 API 응답:', {
            success: response.data.success,
            hasStorybook: !!response.data.storybook,
            title: response.data.storybook?.title
        });
        
        if (!response.data.success || !response.data.storybook) {
            console.error('❌ 동화책 로드 실패: 응답 데이터 없음');
            alert('동화책을 불러올 수 없습니다.');
            return;
        }
        
        const storybook = response.data.storybook;
        
        // 사용 가능한 언어 목록 가져오기
        const availableLanguages = storybook.languages || ['ko'];
        console.log('🌐 사용 가능한 언어:', availableLanguages);
        
        // 언어가 1개면 바로 이동, 2개 이상이면 선택 모달 표시
        if (availableLanguages.length === 1) {
            console.log('➡️ 언어 1개 - 바로 이동:', availableLanguages[0]);
            window.location.href = `/reader.html?id=${bookId}&lang=${availableLanguages[0]}`;
        } else {
            console.log('📋 언어 2개 이상 - 선택 모달 표시');
            showLanguageModal(bookId, storybook.title, availableLanguages);
        }
    } catch (error) {
        console.error('❌ 동화책 로드 실패:', error);
        console.error('❌ 에러 상세:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        alert('동화책을 불러오는 중 오류가 발생했습니다.');
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

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    loadStorybooks();
});
