// 전역 변수
let currentBook = null;

// URL에서 동화책 ID 가져오기
function getBookId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 동화책 로드
async function loadBook() {
    const bookId = getBookId();
    
    if (!bookId) {
        alert('동화책 ID가 없습니다.');
        window.location.href = '/viewer.html';
        return;
    }

    try {
        console.log(`📖 Loading storybook ${bookId}...`);
        
        const response = await axios.get(`/api/viewer/storybooks/${bookId}`);
        
        if (response.data.success) {
            currentBook = response.data.storybook;
            console.log('✅ Storybook loaded:', currentBook.title);
            renderBook();
        }
    } catch (error) {
        console.error('❌ Failed to load storybook:', error);
        
        if (error.response?.status === 403) {
            alert('이 동화책은 비공개입니다.');
        } else if (error.response?.status === 404) {
            alert('동화책을 찾을 수 없습니다.');
        } else {
            alert('동화책을 불러오는데 실패했습니다.');
        }
        
        window.location.href = '/viewer.html';
    }
}

// 동화책 렌더링
function renderBook() {
    // 로딩 숨기기
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');

    // 제목
    document.getElementById('book-title').textContent = currentBook.title;
    document.getElementById('book-age').textContent = currentBook.targetAge;
    document.getElementById('book-pages').textContent = currentBook.pages?.length || 0;
    document.getElementById('book-chars').textContent = currentBook.characters?.length || 0;

    // 표지 이미지
    const coverContainer = document.getElementById('cover-container');
    if (currentBook.coverImage) {
        coverContainer.innerHTML = `
            <img src="${currentBook.coverImage}" alt="${currentBook.title}" class="w-full h-full object-cover">
        `;
    } else {
        coverContainer.innerHTML = `
            <div class="text-center">
                <i class="fas fa-book text-8xl text-gray-400 mb-4"></i>
                <p class="text-gray-500">표지 이미지가 없습니다</p>
            </div>
        `;
    }

    // 캐릭터 미리보기
    const charactersPreview = document.getElementById('characters-preview');
    if (currentBook.characters && currentBook.characters.length > 0) {
        charactersPreview.innerHTML = `
            <h3 class="text-lg font-bold text-gray-700 mb-3">
                <i class="fas fa-users mr-2"></i>
                등장 캐릭터
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${currentBook.characters.slice(0, 4).map(char => `
                    <div class="text-center">
                        ${char.referenceImage 
                            ? `<img src="${char.referenceImage}" alt="${char.name}" class="w-full h-32 object-cover rounded-lg mb-2">`
                            : `<div class="w-full h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg mb-2 flex items-center justify-center">
                                <i class="fas fa-user text-white text-3xl"></i>
                               </div>`
                        }
                        <p class="font-semibold text-gray-800">${char.name}</p>
                        <p class="text-xs text-gray-500">${char.role}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 첫 페이지 미리보기
    const previewPage = document.getElementById('preview-page');
    if (currentBook.pages && currentBook.pages.length > 0) {
        const firstPage = currentBook.pages[0];
        previewPage.innerHTML = `
            ${firstPage.illustrationImage 
                ? `<img src="${firstPage.illustrationImage}" alt="Page 1" class="w-full rounded-lg mb-4">`
                : `<div class="w-full h-64 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg mb-4 flex items-center justify-center">
                    <i class="fas fa-image text-white text-6xl"></i>
                   </div>`
            }
            <p class="text-gray-700 leading-relaxed text-lg">${firstPage.text}</p>
        `;
    }
}

// 동화책 읽기 시작
function startReading() {
    if (!currentBook) return;
    window.location.href = `/reader.html?id=${currentBook.id}`;
}

// 학습 게임 시작
function startGames() {
    if (!currentBook) return;
    
    // 교육 콘텐츠 확인
    if (!currentBook.educational_content || !currentBook.educational_content.vocabulary || currentBook.educational_content.vocabulary.length === 0) {
        alert('이 동화책에는 아직 학습 콘텐츠가 없습니다.');
        return;
    }
    
    window.location.href = `/games.html?id=${currentBook.id}`;
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    loadBook();
});
