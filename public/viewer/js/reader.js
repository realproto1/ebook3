// 전역 변수
let currentBook = null;
let currentPage = -1; // -1은 표지, 0부터는 본문
let isAutoPlaying = false;
let autoPlayInterval = null;
let currentAudio = null;
let isHeaderVisible = false; // 헤더 초기 상태: 숨김
let hasCoverPage = false; // 표지 페이지 존재 여부

// 모바일 주소창/네비게이션 숨기기
function hideAddressBar() {
    // 1. 즉시 스크롤하여 주소창 숨기기
    window.scrollTo(0, 1);
    
    // 2. 다시 위로 올려서 콘텐츠 정상 위치
    requestAnimationFrame(() => {
        window.scrollTo(0, 0);
    });
    
    // 3. 약간 아래로 스크롤 (주소창 숨김 유지)
    setTimeout(() => {
        window.scrollTo(0, 1);
    }, 100);
    
    // 4. 뷰포트 높이 재계산
    setTimeout(() => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // body 높이 강제 설정
        document.body.style.height = `${window.innerHeight}px`;
        document.documentElement.style.height = `${window.innerHeight}px`;
    }, 200);
}

// 헤더 토글
function toggleHeader() {
    const header = document.querySelector('header');
    if (!header) return;
    
    isHeaderVisible = !isHeaderVisible;
    
    if (isHeaderVisible) {
        header.classList.remove('hidden');
    } else {
        header.classList.add('hidden');
    }
}

// 헤더 숨기기
function hideHeader() {
    const header = document.querySelector('header');
    if (!header) return;
    
    isHeaderVisible = false;
    header.classList.add('hidden');
}

// 전체 화면 진입 (클릭 이벤트에서 호출)
function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen({ navigationUI: "hide" }).catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
    
    // 주소창 숨기기
    hideAddressBar();
}

// URL에서 동화책 ID 가져오기
function getBookId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 동화책 로드
async function loadBook() {
    let bookId = getBookId();
    
    console.log('🔍 Debug - bookId:', bookId);
    console.log('🔍 Debug - axios available:', typeof axios !== 'undefined');
    console.log('🔍 Debug - URL:', window.location.href);
    
    // 1. localStorage에서 temp_reader_book_id 확인 (author 페이지에서 온 경우)
    const tempBookId = localStorage.getItem('temp_reader_book_id');
    if (tempBookId) {
        console.log('📖 Found temp_reader_book_id:', tempBookId);
        bookId = tempBookId;
        localStorage.removeItem('temp_reader_book_id'); // 사용 후 삭제
    }
    
    // 2. 여전히 bookId가 없으면 에러
    if (!bookId) {
        alert('동화책 ID가 없습니다.');
        window.location.href = '/viewer.html';
        return;
    }

    try {
        console.log(`📖 Loading storybook ${bookId} from API...`);
        
        // 캐시 무효화를 위한 타임스탬프 추가
        const apiUrl = `/api/viewer/storybooks/${bookId}?t=${Date.now()}`;
        console.log('🔍 Debug - API URL:', apiUrl);
        
        const response = await axios.get(apiUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('🔍 Debug - API response:', {
            success: response.data.success,
            hasStorybook: !!response.data.storybook,
            pageCount: response.data.storybook?.pages?.length
        });
        
        if (response.data.success) {
            currentBook = response.data.storybook;
            console.log('✅ Storybook loaded:', currentBook.title);
            
            // 페이지가 없으면 에러
            if (!currentBook.pages || currentBook.pages.length === 0) {
                alert('이 동화책에는 페이지가 없습니다.');
                window.history.back();
                return;
            }
            
            // 표지 페이지 존재 여부 확인 (표시하지 않음, 진행률 계산용만)
            hasCoverPage = false; // 표지를 건너뛰고 항상 첫 페이지부터 시작
            console.log(`📖 표지 건너뛰기 - 첫 페이지부터 시작`);
            
            // 로딩 숨기고 리더 표시
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('reader').classList.remove('hidden');
            
            // 주소창 즉시 숨기기
            hideAddressBar();
            
            // 헤더 숨기기 (3초 후)
            setTimeout(() => {
                hideHeader();
            }, 3000);
            
            // 이미지 클릭 시 헤더 토글 이벤트 설정 (한 번만)
            const imageContainer = document.getElementById('page-image-container');
            if (imageContainer) {
                imageContainer.addEventListener('click', (e) => {
                    // 버튼 클릭은 무시
                    if (e.target.closest('.nav-button')) {
                        return;
                    }
                    e.stopPropagation();
                    toggleHeader();
                });
            }
            
            // 항상 첫 페이지(0번)부터 시작
            showPage(0);
        }
    } catch (error) {
        console.error('❌ Failed to load storybook:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data
        });
        
        if (error.response?.status === 403) {
            alert('이 동화책은 비공개입니다.');
        } else if (error.response?.status === 404) {
            alert('동화책을 찾을 수 없습니다.');
        } else {
            alert(`동화책을 불러오는데 실패했습니다.\n\n에러: ${error.message}\n상태: ${error.response?.status || 'N/A'}`);
        }
        
        // 디버깅을 위해 즉시 리다이렉트하지 않음
        setTimeout(() => {
            window.location.href = '/viewer.html';
        }, 3000);
    }
}

// 페이지 표시
function showPage(pageIndex) {
    if (!currentBook || !currentBook.pages) {
        console.error('❌ currentBook is not loaded in showPage');
        return;
    }
    
    currentPage = pageIndex;
    
    // TTS 버튼 표시/숨김
    const ttsButton = document.getElementById('tts-button-header');
    if (ttsButton) {
        if (pageIndex === -1) {
            ttsButton.style.display = 'none'; // 표지에서는 숨김
        } else {
            ttsButton.style.display = ''; // 본문에서는 표시
        }
    }
    
    // 표지 페이지 처리
    if (pageIndex === -1) {
        console.log('📖 Showing cover page');
        
        // 페이지 전환 애니메이션
        const imageEl = document.getElementById('page-image');
        const textEl = document.getElementById('page-text');
        const imageContainer = document.getElementById('page-image-container');
        
        // 1단계: Exit 애니메이션
        imageEl.style.opacity = '0';
        imageEl.style.transform = 'translateX(-100px)';
        textEl.style.opacity = '0';
        textEl.style.transform = 'translateX(-100px)';
        
        // 2단계: 표지 표시
        setTimeout(() => {
            imageContainer.style.visibility = 'hidden';
            
            // 표지 이미지 설정
            imageEl.src = currentBook.coverImage;
            imageEl.alt = `${currentBook.title} 표지`;
            
            // 표지에는 텍스트 오버레이 숨김
            textEl.textContent = '';
            
            // 위치 초기화
            imageEl.style.transform = 'translateX(100px)';
            textEl.style.transform = 'translateX(100px)';
            
            // 3단계: Enter 애니메이션
            requestAnimationFrame(() => {
                imageContainer.style.visibility = 'visible';
                imageEl.style.opacity = '1';
                imageEl.style.transform = 'translateX(0)';
                textEl.style.opacity = '0'; // 표지에는 텍스트 숨김
                textEl.style.transform = 'translateX(0)';
            });
        }, 350);
        
        updateProgress();
        updateNavigationButtons();
        return;
    }
    
    // 본문 페이지 처리
    const page = currentBook.pages[pageIndex];
    
    console.log(`📄 Showing page ${pageIndex + 1}/${currentBook.pages.length}`);
    
    // 페이지 전환 애니메이션
    const imageEl = document.getElementById('page-image');
    const textEl = document.getElementById('page-text');
    const imageContainer = document.getElementById('page-image-container');
    
    // 1단계: Exit 애니메이션 시작 (페이드아웃 + 왼쪽 이동)
    imageEl.style.opacity = '0';
    imageEl.style.transform = 'translateX(-100px)';
    textEl.style.opacity = '0';
    textEl.style.transform = 'translateX(-100px)';
    
    // 2단계: 애니메이션 완료 후 내용 변경
    setTimeout(() => {
        // 완전히 숨김 (visibility)
        imageContainer.style.visibility = 'hidden';
        
        // 내용 변경
        if (page.illustrationImage) {
            imageEl.src = page.illustrationImage;
            imageEl.alt = `Page ${pageIndex + 1}`;
        } else {
            imageEl.src = '';
            imageEl.alt = '이미지 없음';
        }
        textEl.textContent = page.text || '텍스트가 없습니다.';
        
        // 위치 초기화 (오른쪽에서 시작)
        imageEl.style.transform = 'translateX(100px)';
        textEl.style.transform = 'translateX(100px)';
        
        // 3단계: 다시 보이기 + Enter 애니메이션
        requestAnimationFrame(() => {
            imageContainer.style.visibility = 'visible';
            
            // Enter 애니메이션 (페이드인 + 중앙으로 이동)
            imageEl.style.opacity = '1';
            imageEl.style.transform = 'translateX(0)';
            textEl.style.opacity = '1';
            textEl.style.transform = 'translateX(0)';
        });
        
    }, 350); // Exit 애니메이션 완료 대기 (300ms + 50ms 버퍼)
    
    // 진행률 업데이트 (즉시)
    updateProgress();
    
    // 버튼 상태 업데이트 (즉시)
    updateNavigationButtons();
}

// 진행률 업데이트
function updateProgress() {
    let displayPage, totalPages;
    
    if (hasCoverPage) {
        // 표지가 있으면: 표지(-1) + 본문(0~N-1) = 총 N+1페이지
        displayPage = currentPage + 2; // -1→1, 0→2, 1→3, ...
        totalPages = currentBook.pages.length + 1;
    } else {
        // 표지가 없으면: 본문만
        displayPage = currentPage + 1;
        totalPages = currentBook.pages.length;
    }
    
    const progress = (displayPage / totalPages) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = 
        `${displayPage} / ${totalPages}`;
}

// 네비게이션 버튼 상태 업데이트
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    const firstPage = hasCoverPage ? -1 : 0;
    const lastPage = currentBook.pages.length - 1;
    
    // 첫 페이지면 이전 버튼 비활성화
    if (currentPage === firstPage) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
    }
    
    // 마지막 페이지면 다음 버튼 비활성화
    if (currentPage === lastPage) {
        nextBtn.style.opacity = '0.3';
        nextBtn.style.pointerEvents = 'none';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
}

// 다음 페이지
function nextPage() {
    if (!currentBook || !currentBook.pages) {
        console.error('❌ currentBook is not loaded');
        return;
    }
    
    const lastPage = currentBook.pages.length - 1;
    
    if (currentPage < lastPage) {
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
    if (!currentBook || !currentBook.pages) {
        console.error('❌ currentBook is not loaded');
        return;
    }
    
    const firstPage = hasCoverPage ? -1 : 0;
    
    if (currentPage > firstPage) {
        showPage(currentPage - 1);
    }
}

// TTS 재생
async function playTTS() {
    // 표지 페이지에서는 TTS 비활성화
    if (currentPage === -1) {
        return;
    }
    
    const page = currentBook.pages[currentPage];
    const button = document.getElementById('tts-button-header');
    const buttonText = document.getElementById('tts-text');
    
    // 이미 재생 중이면 중지
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        buttonText.textContent = '읽어주기';
        button.classList.remove('playing');
        return;
    }
    
    // TTS 오디오 URL 찾기 (여러 필드 지원)
    const audioUrl = page.ttsAudioUrl || page.audioUrl || page.ttsAudio?.url;
    
    // 디버깅: 페이지 데이터 확인
    console.log('🔍 TTS Debug - Page:', currentPage + 1);
    console.log('  ttsAudioUrl:', page.ttsAudioUrl);
    console.log('  audioUrl:', page.audioUrl);
    console.log('  ttsAudio:', page.ttsAudio);
    console.log('  Final audioUrl:', audioUrl);
    
    if (audioUrl) {
        try {
            buttonText.textContent = '재생 중...';
            button.classList.add('playing');
            currentAudio = new Audio(audioUrl);
            
            currentAudio.addEventListener('ended', () => {
                currentAudio = null;
                buttonText.textContent = '읽어주기';
                button.classList.remove('playing');
            });
            
            currentAudio.addEventListener('error', () => {
                currentAudio = null;
                buttonText.textContent = '읽어주기';
                button.classList.remove('playing');
                alert('음성 재생에 실패했습니다.');
            });
            
            await currentAudio.play();
            buttonText.textContent = '중지';
        } catch (error) {
            console.error('TTS playback error:', error);
            currentAudio = null;
            buttonText.textContent = '읽어주기';
            button.classList.remove('playing');
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
    // 즉시 주소창 숨기기 시도
    hideAddressBar();
    
    // 동화책 로드
    loadBook();
});

// 윈도우 리사이즈 시 주소창 숨기기
window.addEventListener('resize', () => {
    hideAddressBar();
});

// 화면 방향 변경 시 주소창 숨기기
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        hideAddressBar();
    }, 100);
});

// 스크롤 이벤트 감지하여 주소창 숨기기 유지
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        hideAddressBar();
    }, 100);
}, { passive: true });

// 터치 끝날 때 주소창 숨기기
window.addEventListener('touchend', () => {
    setTimeout(() => {
        hideAddressBar();
    }, 300);
}, { passive: true });

// ========================================
// 세로 모드 전환 힌트
// ========================================

function showRotateHint() {
    // 이미 알림이 표시 중이면 중복 방지
    if (document.getElementById('rotate-hint')) {
        return;
    }
    
    // 힌트 오버레이 생성
    const hint = document.createElement('div');
    hint.id = 'rotate-hint';
    hint.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        padding: 2rem;
        animation: fadeIn 0.3s ease-in;
    `;
    
    hint.innerHTML = `
        <div style="text-align: center; max-width: 400px;">
            <i class="fas fa-mobile-alt" style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.9;"></i>
            <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
                📱 기기를 세로로 회전해주세요
            </h3>
            <p style="font-size: 1rem; opacity: 0.8; line-height: 1.6;">
                세로 모드에서 더 편하게<br>동화책을 감상하실 수 있습니다
            </p>
            <button 
                onclick="closeRotateHint()"
                style="
                    margin-top: 2rem;
                    padding: 0.75rem 2rem;
                    background: white;
                    color: black;
                    border: none;
                    border-radius: 2rem;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 1rem;
                "
            >
                확인
            </button>
        </div>
    `;
    
    document.body.appendChild(hint);
    
    console.log('📱 세로 모드 전환 힌트 표시');
}

function closeRotateHint() {
    const hint = document.getElementById('rotate-hint');
    if (hint) {
        hint.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            hint.remove();
        }, 300);
    }
}

// 전역으로 노출
window.showRotateHint = showRotateHint;
window.closeRotateHint = closeRotateHint;

// ========================================
// 전체화면 관련 함수들 (iOS 호환)
// ========================================

let isImageFullscreen = false;

// 전체화면 토글 - iOS 호환 오버레이 방식
async function toggleFullscreen() {
    const fullscreenIcon = document.getElementById('fullscreen-icon');
    
    if (!isImageFullscreen) {
        // 전체화면 진입
        await enterImageFullscreen();
        fullscreenIcon.classList.remove('fa-expand');
        fullscreenIcon.classList.add('fa-compress');
    } else {
        // 전체화면 종료
        exitImageFullscreen();
        fullscreenIcon.classList.remove('fa-compress');
        fullscreenIcon.classList.add('fa-expand');
    }
}

// 이미지 전체화면 진입 (오버레이 방식)
async function enterImageFullscreen() {
    isImageFullscreen = true;
    
    // 현재 페이지 정보
    const pageImage = document.getElementById('page-image');
    const pageText = document.getElementById('page-text');
    
    if (!pageImage || !pageImage.src) {
        console.error('❌ 이미지가 없습니다');
        return;
    }
    
    // 전체화면 오버레이 생성
    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: #000000;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        animation: fadeIn 0.3s ease-in;
    `;
    
    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 44px;
        height: 44px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100001;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-size: 1.25rem;
    `;
    closeBtn.innerHTML = '<i class="fas fa-compress"></i>';
    closeBtn.onclick = () => {
        exitImageFullscreen();
        const fullscreenIcon = document.getElementById('fullscreen-icon');
        fullscreenIcon.classList.remove('fa-compress');
        fullscreenIcon.classList.add('fa-expand');
    };
    
    // 이미지 컨테이너
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        position: relative;
    `;
    
    // 이미지
    const fullImage = document.createElement('img');
    fullImage.src = pageImage.src;
    fullImage.alt = pageImage.alt;
    fullImage.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        object-position: center;
        display: block;
    `;
    
    // 텍스트 오버레이
    const textOverlay = document.createElement('div');
    textOverlay.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 2rem 1.5rem 1.5rem 1.5rem;
        background: linear-gradient(
            to top, 
            rgba(0, 0, 0, 0.9) 0%, 
            rgba(0, 0, 0, 0.7) 25%,
            rgba(0, 0, 0, 0.4) 50%,
            transparent 100%
        );
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: white;
        font-size: 1.25rem;
        line-height: 1.8;
        text-align: center;
        text-shadow: 
            0 1px 2px rgba(0, 0, 0, 0.8),
            0 2px 8px rgba(0, 0, 0, 0.6);
        font-weight: 500;
        letter-spacing: 0.3px;
        word-break: keep-all;
    `;
    textOverlay.textContent = pageText ? pageText.textContent : '';
    
    // 조립
    imageContainer.appendChild(fullImage);
    imageContainer.appendChild(textOverlay);
    overlay.appendChild(closeBtn);
    overlay.appendChild(imageContainer);
    
    // DOM에 추가
    document.body.appendChild(overlay);
    
    // iOS에서 주소창 숨기기 시도 (스크롤 트릭)
    setTimeout(() => {
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
    }, 100);
    
    // API 기반 전체화면도 시도 (Chrome/Android에서 주소창까지 숨김)
    try {
        if (overlay.requestFullscreen) {
            await overlay.requestFullscreen();
            console.log('✅ Fullscreen API 성공');
        } else if (overlay.webkitRequestFullscreen) {
            overlay.webkitRequestFullscreen();
            console.log('✅ WebKit Fullscreen 시도');
        }
    } catch (error) {
        // iOS에서는 실패할 수 있지만 오버레이는 이미 표시됨
        console.log('ℹ️ Fullscreen API 실패 (오버레이로 대체):', error.message);
    }
    
    console.log('📺 이미지 전체화면 진입 (오버레이 방식)');
}

// 이미지 전체화면 종료
function exitImageFullscreen() {
    isImageFullscreen = false;
    
    const overlay = document.getElementById('fullscreen-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
    
    // Fullscreen API 종료
    try {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (document.webkitFullscreenElement) {
            document.webkitExitFullscreen();
        }
    } catch (error) {
        console.log('ℹ️ Fullscreen API 종료 실패:', error.message);
    }
    
    console.log('📺 이미지 전체화면 종료');
}

// Fullscreen API 상태 변경 감지 (Chrome/Android)
document.addEventListener('fullscreenchange', handleFullscreenAPIChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenAPIChange);

function handleFullscreenAPIChange() {
    // Fullscreen API가 사용자 제스처(ESC)로 종료된 경우
    if (!document.fullscreenElement && !document.webkitFullscreenElement && isImageFullscreen) {
        exitImageFullscreen();
        const fullscreenIcon = document.getElementById('fullscreen-icon');
        if (fullscreenIcon) {
            fullscreenIcon.classList.remove('fa-compress');
            fullscreenIcon.classList.add('fa-expand');
        }
    }
}

// 전역으로 노출
window.toggleFullscreen = toggleFullscreen;
