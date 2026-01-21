// 전역 변수
let currentBook = null;
let currentPage = 0;
let isAutoPlaying = false;
let autoPlayInterval = null;
let currentAudio = null;

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
        console.log(`📖 Loading storybook ${bookId} for reading...`);
        
        const response = await axios.get(`/api/viewer/storybooks/${bookId}`);
        
        if (response.data.success) {
            currentBook = response.data.storybook;
            console.log('✅ Storybook loaded:', currentBook.title);
            
            // 페이지가 없으면 에러
            if (!currentBook.pages || currentBook.pages.length === 0) {
                alert('이 동화책에는 페이지가 없습니다.');
                window.history.back();
                return;
            }
            
            // 로딩 숨기고 리더 표시
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('reader').classList.remove('hidden');
            
            // 첫 페이지 표시
            showPage(0);
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

// 페이지 표시
function showPage(pageIndex) {
    currentPage = pageIndex;
    const page = currentBook.pages[pageIndex];
    
    console.log(`📄 Showing page ${pageIndex + 1}/${currentBook.pages.length}`);
    
    // 페이지 전환 애니메이션
    const imageEl = document.getElementById('page-image');
    const textEl = document.getElementById('page-text');
    
    // Exit 애니메이션 시작
    imageEl.classList.add('page-exit');
    textEl.classList.add('page-exit');
    
    // Exit 애니메이션이 끝나면 내용 변경 후 Enter 애니메이션
    setTimeout(() => {
        // 먼저 클래스 제거
        imageEl.classList.remove('page-exit');
        textEl.classList.remove('page-exit');
        
        // 내용 변경
        if (page.illustrationImage) {
            imageEl.src = page.illustrationImage;
            imageEl.alt = `Page ${pageIndex + 1}`;
        } else {
            imageEl.src = '';
            imageEl.alt = '이미지 없음';
        }
        textEl.textContent = page.text || '텍스트가 없습니다.';
        
        // Enter 애니메이션 (약간의 딜레이 후)
        requestAnimationFrame(() => {
            imageEl.classList.add('page-enter');
            textEl.classList.add('page-enter');
            
            // Enter 애니메이션 완료 후 클래스 제거
            setTimeout(() => {
                imageEl.classList.remove('page-enter');
                textEl.classList.remove('page-enter');
            }, 300);
        });
        
    }, 300);
    
    // 진행률 업데이트 (즉시)
    updateProgress();
    
    // 버튼 상태 업데이트 (즉시)
    updateNavigationButtons();
}

// 진행률 업데이트
function updateProgress() {
    const progress = ((currentPage + 1) / currentBook.pages.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = 
        `${currentPage + 1} / ${currentBook.pages.length}`;
}

// 네비게이션 버튼 상태 업데이트
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // 첫 페이지면 이전 버튼 비활성화
    if (currentPage === 0) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
    }
    
    // 마지막 페이지면 다음 버튼 비활성화
    if (currentPage === currentBook.pages.length - 1) {
        nextBtn.style.opacity = '0.3';
        nextBtn.style.pointerEvents = 'none';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
}

// 다음 페이지
function nextPage() {
    if (currentPage < currentBook.pages.length - 1) {
        showPage(currentPage + 1);
    } else {
        // 마지막 페이지면 완독 알림
        if (confirm('동화책을 모두 읽으셨습니다!\n\n목록으로 돌아가시겠습니까?')) {
            window.location.href = '/viewer.html';
        }
    }
}

// 이전 페이지
function previousPage() {
    if (currentPage > 0) {
        showPage(currentPage - 1);
    }
}

// TTS 재생
async function playTTS() {
    const page = currentBook.pages[currentPage];
    const button = document.querySelector('button[onclick="playTTS()"]');
    const buttonText = document.getElementById('tts-text');
    
    // 이미 재생 중이면 중지
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        buttonText.textContent = '읽어주기';
        return;
    }
    
    // TTS 오디오 URL이 있으면 재생
    if (page.ttsAudioUrl) {
        try {
            buttonText.textContent = '재생 중...';
            currentAudio = new Audio(page.ttsAudioUrl);
            
            currentAudio.addEventListener('ended', () => {
                currentAudio = null;
                buttonText.textContent = '읽어주기';
            });
            
            currentAudio.addEventListener('error', () => {
                currentAudio = null;
                buttonText.textContent = '읽어주기';
                alert('음성 재생에 실패했습니다.');
            });
            
            await currentAudio.play();
            buttonText.textContent = '중지';
        } catch (error) {
            console.error('TTS playback error:', error);
            currentAudio = null;
            buttonText.textContent = '읽어주기';
            alert('음성 재생에 실패했습니다.');
        }
    } else {
        alert('이 페이지에는 음성이 아직 생성되지 않았습니다.');
    }
}

// 자동 재생 토글
function toggleAutoPlay() {
    isAutoPlaying = !isAutoPlaying;
    const icon = document.getElementById('autoplay-icon');
    
    if (isAutoPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        
        // 10초마다 다음 페이지
        autoPlayInterval = setInterval(() => {
            if (currentPage < currentBook.pages.length - 1) {
                nextPage();
            } else {
                toggleAutoPlay(); // 마지막 페이지면 자동 재생 중지
            }
        }, 10000);
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }
}

// 돌아가기
function exitReader() {
    // 자동 재생 중지
    if (isAutoPlaying) {
        toggleAutoPlay();
    }
    
    // 오디오 중지
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    window.history.back();
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        previousPage();
    } else if (e.key === 'ArrowRight') {
        nextPage();
    } else if (e.key === 'Escape') {
        exitReader();
    } else if (e.key === ' ') {
        e.preventDefault();
        playTTS();
    }
});

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    loadBook();
});
