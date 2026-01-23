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
    const bookId = getBookId();
    
    console.log('🔍 Debug - bookId:', bookId);
    console.log('🔍 Debug - axios available:', typeof axios !== 'undefined');
    console.log('🔍 Debug - URL:', window.location.href);
    
    if (!bookId) {
        alert('동화책 ID가 없습니다.');
        window.location.href = '/viewer.html';
        return;
    }

    try {
        console.log(`📖 Loading storybook ${bookId} for reading...`);
        
        const apiUrl = `/api/viewer/storybooks/${bookId}`;
        console.log('🔍 Debug - API URL:', apiUrl);
        
        const response = await axios.get(apiUrl);
        
        if (response.data.success) {
            currentBook = response.data.storybook;
            console.log('✅ Storybook loaded:', currentBook.title);
            
            // 페이지가 없으면 에러
            if (!currentBook.pages || currentBook.pages.length === 0) {
                alert('이 동화책에는 페이지가 없습니다.');
                window.history.back();
                return;
            }
            
            // 표지 페이지 존재 여부 확인
            hasCoverPage = !!currentBook.coverImage;
            console.log(`📖 표지 페이지: ${hasCoverPage ? '있음' : '없음'}`);
            
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
            
            // 표지 또는 첫 페이지 표시
            if (hasCoverPage) {
                showPage(-1); // 표지 표시
            } else {
                showPage(0); // 첫 페이지 표시
            }
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

// 컨트롤 표시/숨김 토글 (텍스트는 항상 표시)
let controlsVisible = true;
let hideControlsTimeout = null;

window.toggleControls = function() {
    console.log('🔄 toggleControls 호출됨');
    console.log('현재 controlsVisible:', controlsVisible);
    
    const header = document.querySelector('header');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    console.log('🔍 요소 찾기:', {
        header: !!header,
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn
    });
    
    if (!header || !prevBtn || !nextBtn) {
        console.error('❌ 요소를 찾을 수 없음:', { header, prevBtn, nextBtn });
        return;
    }
    
    controlsVisible = !controlsVisible;
    console.log('변경된 controlsVisible:', controlsVisible);
    
    if (controlsVisible) {
        // 컨트롤 표시 (헤더 + 버튼만)
        console.log('✅ 컨트롤 표시');
        header.classList.remove('controls-hidden');
        prevBtn.classList.remove('controls-hidden');
        nextBtn.classList.remove('controls-hidden');
        
        console.log('🎨 클래스 제거 후:', {
            headerClasses: header.className,
            prevBtnClasses: prevBtn.className,
            nextBtnClasses: nextBtn.className
        });
        
        // 3초 후 자동 숨김
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            console.log('⏰ 3초 타이머 실행');
            if (controlsVisible) {
                window.toggleControls();
            }
        }, 3000);
    } else {
        // 컨트롤 숨김 (헤더 + 버튼만)
        console.log('❌ 컨트롤 숨김');
        header.classList.add('controls-hidden');
        prevBtn.classList.add('controls-hidden');
        nextBtn.classList.add('controls-hidden');
        
        console.log('🎨 클래스 추가 후:', {
            headerClasses: header.className,
            prevBtnClasses: prevBtn.className,
            nextBtnClasses: nextBtn.className
        });
        
        clearTimeout(hideControlsTimeout);
    }
};

// 초기 상태: 컨트롤 표시, 5초 후 자동 숨김
setTimeout(() => {
    if (controlsVisible && document.getElementById('prev-btn')) {
        window.toggleControls();
    }
}, 5000);
