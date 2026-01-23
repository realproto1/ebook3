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
                    <button onclick="openQuizFromViewer('${book.id}')" class="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition">
                        <i class="fas fa-question-circle mr-2"></i>
                        퀴즈
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

// 동화책 열기
function openBook(bookId) {
    window.location.href = `/book.html?id=${bookId}`;
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

// 퀴즈 페이지 열기
async function openQuizFromViewer(bookId) {
    // TODO: 퀴즈 페이지 구현 후 활성화
    alert('퀴즈 기능은 곧 제공될 예정입니다! 🎯');
    
    /*
    try {
        // API에서 동화책 데이터 가져오기
        const response = await axios.get(`/api/viewer/storybooks/${bookId}`);
        
        if (!response.data.success) {
            alert('동화책을 불러올 수 없습니다.');
            return;
        }
        
        const book = response.data.storybook;
        
        // 퀴즈가 없으면 안내
        if (!book.comprehensionQuestions || book.comprehensionQuestions.length === 0) {
            alert('이 동화책에는 아직 퀴즈가 없습니다.');
            return;
        }
        
        // localStorage에 bookId 저장
        localStorage.setItem('temp_quiz_book_id', bookId);
        
        // 퀴즈 페이지 열기
        window.open('/quiz.html', '_blank');
    } catch (error) {
        console.error('퀴즈 열기 실패:', error);
        alert('퀴즈를 여는 데 실패했습니다.');
    }
    */
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    loadStorybooks();
});
