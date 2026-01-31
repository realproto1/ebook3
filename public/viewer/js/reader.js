// 전역 변수
let currentBook = null;
let currentPage = -1; // -1은 표지, 0부터는 본문
let currentLanguage = 'ko'; // 현재 선택된 언어
let isAutoPlaying = false;
let autoPlayInterval = null;
let currentAudio = null;
let isHeaderVisible = false; // 헤더 초기 상태: 숨김
let hasCoverPage = false; // 표지 페이지 존재 여부
let backgroundMusic = null; // 배경음악 Audio 객체
let backgroundMusicList = []; // 배경음악 목록
let isBackgroundMusicPlaying = false; // 배경음악 재생 상태
let preloadedImages = {}; // 프리로드된 이미지 캐시 {pageIndex: Image}

// 이미지 프리로딩 함수 (이전 2개 + 다음 5개)
function preloadNextPages(currentPageIndex) {
    if (!currentBook || !currentBook.pages) {
        return;
    }
    
    const lastPage = currentBook.pages.length - 1;
    const totalToPreload = [];
    
    // 1. 이전 2개 페이지 (뒤로 가기 대비)
    for (let i = 2; i >= 1; i--) {
        const prevIndex = currentPageIndex - i;
        if (prevIndex >= 0) {
            totalToPreload.push(prevIndex);
        }
    }
    
    // 2. 다음 5개 페이지
    // 표지 페이지(-1)인 경우 첫 페이지(0)부터 시작
    const startIndex = currentPageIndex === -1 ? 0 : currentPageIndex + 1;
    for (let i = 0; i < 5; i++) {
        const nextIndex = startIndex + i;
        if (nextIndex <= lastPage) {
            totalToPreload.push(nextIndex);
        }
    }
    
    // 프리로드 실행 (백그라운드에서 조용히)
    totalToPreload.forEach((pageIndex) => {
        const page = currentBook.pages[pageIndex];
        if (page && page.illustrationImage) {
            // 이미 프리로드된 경우 건너뛰기
            if (preloadedImages[pageIndex]) {
                return;
            }
            
            // 새 Image 객체 생성 및 프리로드
            const img = new Image();
            img.src = page.illustrationImage;
            preloadedImages[pageIndex] = img;
            
            console.log(`🔄 프리로딩: 페이지 ${pageIndex + 1}/${currentBook.pages.length}`);
        }
    });
}

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

// URL에서 언어 파라미터 가져오기
function getLanguageParam() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('lang') || 'ko'; // 기본값은 한국어
}

// 동화책 로드
async function loadBook() {
    let bookId = getBookId();
    const selectedLanguage = getLanguageParam();
    
    console.log('🔍 Debug - bookId:', bookId);
    console.log('🔍 Debug - selectedLanguage:', selectedLanguage);
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
            
            // 조회수 증가
            incrementViewCount(bookId);
            
            // 페이지가 없으면 에러
            if (!currentBook.pages || currentBook.pages.length === 0) {
                alert('이 동화책에는 페이지가 없습니다.');
                window.history.back();
                return;
            }
            
            // 선택된 언어 적용
            currentLanguage = selectedLanguage;
            console.log('🌐 Language set to:', currentLanguage);
            console.log('📚 동화책 데이터:', {
                title: currentBook.title,
                pages: currentBook.pages.length,
                languages: currentBook.languages,
                hasTranslations: !!currentBook.translations,
                translationKeys: Object.keys(currentBook.translations || {})
            });
            
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
            
            // 배경음악 목록 로드
            await loadBackgroundMusicList();
            
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
            
            // 프리로딩 캐시 초기화
            preloadedImages = {};
            
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
    
    // 페이지 전환 시 TTS 중지
    stopTTS();
    
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
        
        // currentPage 업데이트
        currentPage = pageIndex;
        
        // 1단계: 먼저 페이드아웃
        imageEl.style.transition = 'opacity 0.15s ease-out';
        textEl.style.transition = 'opacity 0.15s ease-out';
        imageEl.style.opacity = '0';
        textEl.style.opacity = '0';
        
        // 2단계: 150ms 후 내용 변경
        setTimeout(() => {
            // 표지 이미지 설정
            imageEl.src = currentBook.coverImage;
            imageEl.alt = `${currentBook.title} 표지`;
            
            // 표지에는 텍스트 오버레이 숨김
            textEl.textContent = '';
            
            // 3단계: 이미지 로드 대기
            if (imageEl.complete) {
                fadeInCover();
            } else {
                imageEl.onload = fadeInCover;
                imageEl.onerror = fadeInCover;
            }
            
            function fadeInCover() {
                // 4단계: 페이드인
                imageEl.style.transition = 'opacity 0.3s ease-in';
                imageEl.style.opacity = '1';
            }
        }, 150);
        
        updateProgress();
        updateNavigationButtons();
        
        // 표지에서 첫 페이지(0)와 두 번째 페이지(1) 프리로드
        preloadNextPages(-1);
        
        return;
    }
    
    // 본문 페이지 처리
    const page = currentBook.pages[pageIndex];
    
    // currentPage 즉시 업데이트 (텍스트 표시보다 먼저)
    currentPage = pageIndex;
    
    console.log(`📄 Showing page ${pageIndex + 1}/${currentBook.pages.length}`);
    
    // 페이지 전환 애니메이션
    const imageEl = document.getElementById('page-image');
    const textEl = document.getElementById('page-text');
    const imageContainer = document.getElementById('page-image-container');
    
    // 1단계: 먼저 페이드아웃 (이전 페이지 완전히 숨김)
    imageEl.style.transition = 'opacity 0.15s ease-out';
    textEl.style.transition = 'opacity 0.15s ease-out';
    imageEl.style.opacity = '0';
    textEl.style.opacity = '0';
    
    // 2단계: 150ms 후 내용 변경 (완전히 사라진 후)
    setTimeout(() => {
        // 내용 변경
        if (page.illustrationImage) {
            imageEl.src = page.illustrationImage;
            imageEl.alt = `Page ${pageIndex + 1}`;
        } else {
            imageEl.src = '';
            imageEl.alt = '이미지 없음';
        }
        
        // 현재 언어에 맞는 텍스트 표시
        const pageText = getPageText(page, currentLanguage);
        console.log(`📝 페이지 ${pageIndex + 1} 텍스트:`, {
            currentLanguage,
            pageNumber: page.pageNumber,
            hasTranslations: !!currentBook.translations,
            hasCurrentLangTranslation: !!currentBook.translations?.[currentLanguage],
            originalText: page.text?.substring(0, 30),
            translatedText: pageText?.substring(0, 30)
        });
        textEl.textContent = pageText || '텍스트가 없습니다.';
        
        // 3단계: 이미지 로드 대기 (새 이미지가 준비되면)
        if (page.illustrationImage) {
            // 이미지가 이미 캐시에 있으면 즉시 로드, 아니면 로드 완료 대기
            if (imageEl.complete) {
                // 이미 로드됨
                fadeInNewPage();
            } else {
                // 로드 대기
                imageEl.onload = fadeInNewPage;
                imageEl.onerror = fadeInNewPage; // 로드 실패해도 표시
            }
        } else {
            // 이미지 없으면 바로 페이드인
            fadeInNewPage();
        }
        
        function fadeInNewPage() {
            // 4단계: 페이드인 애니메이션
            imageEl.style.transition = 'opacity 0.3s ease-in';
            textEl.style.transition = 'opacity 0.3s ease-in';
            imageEl.style.opacity = '1';
            textEl.style.opacity = '1';
        }
    }, 150);

    
    // 진행률 업데이트 (즉시)
    updateProgress();
    
    // 버튼 상태 업데이트 (즉시)
    updateNavigationButtons();
    
    // 페이지 이미지 로드 후 TTS 자동 재생 (본문 페이지만)
    if (pageIndex >= 0) {
        // 페이드인 애니메이션 완료 대기 후 TTS 자동 재생
        setTimeout(() => {
            console.log('🎬 페이지 전환 완료 - TTS 자동 재생 시도');
            autoPlayTTS();
            
            // 첫 페이지에서 배경음악 시작
            if (pageIndex === 0 && currentBook.backgroundMusicId && !backgroundMusic) {
                playBackgroundMusic(currentBook.backgroundMusicId);
            }
        }, 350); // 페이드인 애니메이션 시간 (300ms) + 버퍼
    }
    
    // fullscreen 상태에서도 오버레이 이미지/텍스트 업데이트
    if (isImageFullscreen) {
        console.log('📺 Fullscreen 오버레이 업데이트');
        updateFullscreenOverlay();
    }
    
    // 다음 페이지 이미지 프리로드 (본문 페이지만)
    if (pageIndex >= 0) {
        preloadNextPages(pageIndex);
    }
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

// 다음 페이지 (전환 애니메이션 + 이전 페이지 잠깐 보이기)
function nextPage() {
    if (!currentBook || !currentBook.pages) {
        console.error('❌ currentBook is not loaded');
        return;
    }
    
    const lastPage = currentBook.pages.length - 1;
    
    if (currentPage < lastPage) {
        // TTS 중지
        stopTTS();
        
        const imageEl = document.getElementById('page-image');
        const textEl = document.getElementById('page-text');
        
        // 1단계: 현재 페이지 축소 애니메이션 (200ms)
        imageEl.style.transition = 'transform 0.2s ease-out';
        textEl.style.transition = 'transform 0.2s ease-out';
        imageEl.style.transform = 'scale(0.95)';
        textEl.style.transform = 'scale(0.95)';
        
        // 2단계: 200ms 후 다음 페이지로 전환
        setTimeout(() => {
            // transition 초기화
            imageEl.style.transition = '';
            textEl.style.transition = '';
            imageEl.style.transform = '';
            textEl.style.transform = '';
            
            showPage(currentPage + 1);
        }, 200);
    } else {
        // 마지막 페이지면 완독 알림
        if (confirm('동화책을 모두 읽으셨습니다!\n\n목록으로 돌아가시겠습니까?')) {
            window.location.href = '/viewer.html';
        }
    }
}

// 이전 페이지 (전환 애니메이션 + 현재 페이지 잠깐 보이기)
function previousPage() {
    if (!currentBook || !currentBook.pages) {
        console.error('❌ currentBook is not loaded');
        return;
    }
    
    const firstPage = hasCoverPage ? -1 : 0;
    
    if (currentPage > firstPage) {
        // TTS 중지
        stopTTS();
        
        const imageEl = document.getElementById('page-image');
        const textEl = document.getElementById('page-text');
        
        // 1단계: 현재 페이지 축소 애니메이션 (200ms)
        imageEl.style.transition = 'transform 0.2s ease-out';
        textEl.style.transition = 'transform 0.2s ease-out';
        imageEl.style.transform = 'scale(0.95)';
        textEl.style.transform = 'scale(0.95)';
        
        // 2단계: 200ms 후 이전 페이지로 전환
        setTimeout(() => {
            // transition 초기화
            imageEl.style.transition = '';
            textEl.style.transition = '';
            imageEl.style.transform = '';
            textEl.style.transform = '';
            
            showPage(currentPage - 1);
        }, 200);
    }
}

// TTS 중지 함수
function stopTTS() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        
        const button = document.getElementById('tts-button-header');
        const buttonText = document.getElementById('tts-text');
        
        if (buttonText) {
            buttonText.textContent = '읽어주기';
        }
        if (button) {
            button.classList.remove('playing');
        }
        
        console.log('🔇 TTS 중지됨');
    }
}

// TTS 자동 재생 함수
async function autoPlayTTS() {
    // 표지 페이지에서는 자동 재생 안 함
    if (currentPage === -1) {
        return;
    }
    
    // 이미 재생 중이면 중지하고 재시작
    if (currentAudio) {
        stopTTS();
    }
    
    const page = currentBook.pages[currentPage];
    const audioUrl = getPageTTS(page, currentLanguage);
    
    if (audioUrl) {
        try {
            const button = document.getElementById('tts-button-header');
            const buttonText = document.getElementById('tts-text');
            
            console.log('🎵 TTS 자동 재생 시작:', audioUrl.substring(0, 50) + '...');
            buttonText.textContent = '재생 중...';
            button.classList.add('playing');
            currentAudio = new Audio(audioUrl);
            
            // TTS 완료 시 자동 넘김
            currentAudio.addEventListener('ended', () => {
                console.log('✅ TTS 완료 - 자동 넘김 준비');
                currentAudio = null;
                buttonText.textContent = '읽어주기';
                button.classList.remove('playing');
                
                // 1초 딜레이 후 다음 페이지로 자동 넘김
                console.log('⏱️ 1초 대기 후 자동 넘김...');
                setTimeout(() => {
                    const lastPage = currentBook.pages.length - 1;
                    console.log(`📊 현재 페이지: ${currentPage}, 마지막 페이지: ${lastPage}`);
                    if (currentPage < lastPage) {
                        console.log('⏭️ 다음 페이지로 자동 이동 실행!');
                        nextPage();
                    } else {
                        console.log('📖 마지막 페이지입니다');
                    }
                }, 1000);
            });
            
            currentAudio.addEventListener('error', () => {
                console.error('❌ TTS 재생 실패');
                currentAudio = null;
                buttonText.textContent = '읽어주기';
                button.classList.remove('playing');
            });
            
            await currentAudio.play();
            buttonText.textContent = '중지';
        } catch (error) {
            console.error('TTS autoplay error:', error);
            currentAudio = null;
        }
    } else {
        console.log('⚠️ 이 페이지에는 TTS가 없습니다');
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
    
    // TTS 오디오 URL 찾기 - 현재 언어에 맞는 TTS 사용
    const audioUrl = getPageTTS(page, currentLanguage);
    
    // 디버깅: 페이지 데이터 확인
    console.log('🔍 TTS Debug - Page:', currentPage + 1);
    console.log('  Language:', currentLanguage);
    console.log('  audioUrl:', audioUrl ? `${audioUrl.substring(0, 50)}...` : 'null');
    
    if (audioUrl) {
        try {
            buttonText.textContent = '재생 중...';
            button.classList.add('playing');
            currentAudio = new Audio(audioUrl);
            
            currentAudio.addEventListener('ended', () => {
                console.log('✅ TTS 완료 - 자동 넘김');
                currentAudio = null;
                buttonText.textContent = '읽어주기';
                button.classList.remove('playing');
                
                // 1초 딜레이 후 다음 페이지로 자동 넘김
                setTimeout(() => {
                    const lastPage = currentBook.pages.length - 1;
                    if (currentPage < lastPage) {
                        console.log('⏭️ 다음 페이지로 자동 이동');
                        nextPage();
                    } else {
                        console.log('📖 마지막 페이지입니다');
                    }
                }, 1000);
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
    
    // 배경음악 중지
    stopBackgroundMusic();
    
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
    
    // 페이지 범위 계산 (버튼 핸들러에서 사용)
    const firstPage = currentBook.hasCoverPage ? -1 : 0;
    const lastPage = currentBook.pages.length - 1;
    
    // 이전 페이지 버튼
    const prevBtn = document.createElement('button');
    prevBtn.id = 'fullscreen-prev-btn';
    prevBtn.style.cssText = `
        position: fixed;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 56px;
        height: 56px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100003;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-size: 1.5rem;
        transition: all 0.2s;
        opacity: 0;
        pointer-events: none;
    `;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = async () => {
        // Fullscreen 유지하면서 페이지만 변경
        // TTS 중지
        stopTTS();
        
        // 현재 페이지 업데이트 및 표시
        if (currentPage > firstPage) {
            showPage(currentPage - 1);
            // 버튼 상태도 업데이트
            updateButtonStates();
        }
    };
    
    // 다음 페이지 버튼
    const nextBtn = document.createElement('button');
    nextBtn.id = 'fullscreen-next-btn';
    nextBtn.style.cssText = `
        position: fixed;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 56px;
        height: 56px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100003;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-size: 1.5rem;
        transition: all 0.2s;
        opacity: 0;
        pointer-events: none;
    `;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = async () => {
        // Fullscreen 유지하면서 페이지만 변경
        // TTS 중지
        stopTTS();
        
        // 현재 페이지 업데이트 및 표시
        if (currentPage < lastPage) {
            showPage(currentPage + 1);
            // 버튼 상태도 업데이트
            updateButtonStates();
        }
    };
    
    // 버튼 활성화 상태 업데이트 함수
    function updateButtonStates() {
        if (currentPage <= firstPage) {
            prevBtn.style.opacity = '0';
        } else {
            prevBtn.style.pointerEvents = 'auto';
        }
        
        if (currentPage >= lastPage) {
            nextBtn.style.opacity = '0';
        } else {
            nextBtn.style.pointerEvents = 'auto';
        }
    }
    
    updateButtonStates();
    
    // 이미지 클릭 시 버튼 토글
    let buttonsVisible = false;
    let hideButtonsTimeout = null;
    
    function toggleButtons() {
        buttonsVisible = !buttonsVisible;
        
        // 기존 타임아웃 취소
        if (hideButtonsTimeout) {
            clearTimeout(hideButtonsTimeout);
            hideButtonsTimeout = null;
        }
        
        if (buttonsVisible) {
            // 버튼 표시
            if (currentPage > firstPage) {
                prevBtn.style.opacity = '1';
                prevBtn.style.pointerEvents = 'auto';
            }
            if (currentPage < lastPage) {
                nextBtn.style.opacity = '1';
                nextBtn.style.pointerEvents = 'auto';
            }
            
            // 3초 후 자동 숨김
            hideButtonsTimeout = setTimeout(() => {
                prevBtn.style.opacity = '0';
                prevBtn.style.pointerEvents = 'none';
                nextBtn.style.opacity = '0';
                nextBtn.style.pointerEvents = 'none';
                buttonsVisible = false;
            }, 3000);
        } else {
            // 버튼 숨김
            prevBtn.style.opacity = '0';
            prevBtn.style.pointerEvents = 'none';
            nextBtn.style.opacity = '0';
            nextBtn.style.pointerEvents = 'none';
        }
    }
    
    fullImage.onclick = (e) => {
        e.stopPropagation();
        toggleButtons();
    };
    
    imageContainer.onclick = (e) => {
        // 버튼 클릭이 아닌 경우에만 토글
        if (e.target === imageContainer || e.target === fullImage) {
            toggleButtons();
        }
    };
    
    // 텍스트 오버레이 - overlay의 직계 자식으로 배치
    const textOverlay = document.createElement('div');
    textOverlay.className = 'fullscreen-text';  // 클래스 추가 (업데이트용)
    
    // 모바일 여부 체크
    const isMobile = window.innerWidth <= 768;
    
    textOverlay.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100vw;
        padding: ${isMobile ? '1.5rem 1rem 1rem 1rem' : '2rem 1.5rem 1.5rem 1.5rem'};
        background: linear-gradient(
            to top, 
            rgba(0, 0, 0, 0.95) 0%, 
            rgba(0, 0, 0, 0.85) 20%,
            rgba(0, 0, 0, 0.6) 40%,
            rgba(0, 0, 0, 0.3) 60%,
            transparent 100%
        );
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: white;
        font-size: ${isMobile ? '1rem' : '1.25rem'};
        line-height: ${isMobile ? '1.6' : '1.8'};
        text-align: center;
        text-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.9),
            0 4px 12px rgba(0, 0, 0, 0.7);
        font-weight: 500;
        letter-spacing: 0.3px;
        word-break: keep-all;
        z-index: 100002;
        pointer-events: none;
        min-height: ${isMobile ? '80px' : '100px'};
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    textOverlay.textContent = pageText ? pageText.textContent : '';
    
    // 조립 - 버튼과 textOverlay를 overlay에 직접 추가
    imageContainer.appendChild(fullImage);
    overlay.appendChild(closeBtn);
    overlay.appendChild(imageContainer);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(textOverlay);
    
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
    
    // 전체화면 진입 후 TTS 자동재생 (표지가 아닌 경우)
    // 단, 이미 TTS가 재생 중이면 다시 시작하지 않음
    if (currentPage !== -1 && !currentAudio) {
        console.log('🎵 전체화면 모드에서 TTS 자동재생 시작');
        setTimeout(() => {
            autoPlayTTS();
        }, 500);
    } else if (currentAudio) {
        console.log('ℹ️ TTS가 이미 재생 중이므로 자동재생을 건너뜁니다');
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

// Fullscreen 오버레이 내용 업데이트 (페이지 전환 시)
function updateFullscreenOverlay() {
    const overlay = document.getElementById('fullscreen-overlay');
    if (!overlay) {
        console.warn('⚠️ Fullscreen 오버레이를 찾을 수 없습니다');
        return;
    }
    
    // 현재 페이지 정보
    const pageImage = document.getElementById('page-image');
    const pageText = document.getElementById('page-text');
    
    if (!pageImage) {
        console.error('❌ 페이지 이미지를 찾을 수 없습니다');
        return;
    }
    
    // 오버레이 내부의 이미지 찾기
    const fullImage = overlay.querySelector('img');
    const fullText = overlay.querySelector('.fullscreen-text');
    
    if (fullImage) {
        // 페이드아웃
        fullImage.style.transition = 'opacity 0.2s ease-out';
        fullImage.style.opacity = '0';
        
        setTimeout(() => {
            // 이미지 업데이트
            fullImage.src = pageImage.src;
            fullImage.alt = pageImage.alt;
            
            // 페이드인
            fullImage.style.opacity = '1';
            console.log('✅ Fullscreen 이미지 업데이트 완료');
        }, 200);
    }
    
    if (fullText && pageText) {
        // 페이드아웃
        fullText.style.transition = 'opacity 0.2s ease-out';
        fullText.style.opacity = '0';
        
        setTimeout(() => {
            // 텍스트 업데이트
            fullText.textContent = pageText.textContent;
            
            // 페이드인
            fullText.style.opacity = '1';
            console.log('✅ Fullscreen 텍스트 업데이트 완료');
        }, 200);
    }
    
    console.log('📺 Fullscreen 오버레이 업데이트 완료');
}


// 현재 언어에 맞는 페이지 텍스트 가져오기
function getPageText(page, lang) {
    console.log('🔍 getPageText 호출:', {
        pageNumber: page.pageNumber,
        lang,
        hasCurrentBook: !!currentBook,
        hasTranslations: !!currentBook?.translations,
        translationLangs: Object.keys(currentBook?.translations || {})
    });
    
    if (!currentBook || !currentBook.translations) {
        console.log('⚠️ translations 없음, 기본 텍스트 반환');
        return page.text || '';
    }
    
    // 한국어는 기본 텍스트 사용
    if (lang === 'ko') {
        console.log('🇰🇷 한국어 - 기본 텍스트 사용');
        return page.text || '';
    }
    
    // 번역된 텍스트 찾기
    const translations = currentBook.translations[lang];
    if (!translations || !Array.isArray(translations)) {
        console.log(`⚠️ ${lang} 번역 없음, 기본 텍스트 반환`);
        return page.text || '';
    }
    
    // 페이지 번호로 찾기
    const translatedPage = translations.find(p => p.pageNumber === page.pageNumber);
    const result = translatedPage ? translatedPage.text : (page.text || '');
    console.log(`✅ ${lang} 번역 찾음:`, result?.substring(0, 50));
    return result;
}

// 현재 언어에 맞는 TTS URL 가져오기
function getPageTTS(page, lang) {
    if (!page) return null;
    
    // 한국어인 경우
    if (lang === 'ko') {
        return page.audioUrl || page.ttsAudio?.url || null;
    }
    
    // 다른 언어인 경우
    if (page.ttsAudio && page.ttsAudio[lang]) {
        return page.ttsAudio[lang].url || null;
    }
    
    return null;
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

// ========================================
// 💬 댓글 기능
// ========================================

let commentsLoaded = false;

// 댓글 패널 토글
function toggleComments() {
    const panel = document.getElementById('comments-panel');
    const isOpen = !panel.classList.contains('translate-x-full');
    
    if (isOpen) {
        panel.classList.add('translate-x-full');
    } else {
        panel.classList.remove('translate-x-full');
        if (!commentsLoaded) {
            loadComments();
        }
    }
}

// 댓글 로드
async function loadComments() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('id');
        
        if (!bookId) return;
        
        console.log('📖 댓글 로드 중...');
        
        const response = await axios.get(`/api/viewer/storybooks/${bookId}/comments`);
        
        if (response.data.success) {
            const comments = response.data.comments;
            displayComments(comments);
            updateCommentCount(comments.length);
            commentsLoaded = true;
            console.log(`✅ 댓글 ${comments.length}개 로드 완료`);
        }
    } catch (error) {
        console.error('❌ 댓글 로드 실패:', error);
    }
}

// 댓글 표시
function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-comment-slash text-4xl mb-3"></i>
                <p>아직 댓글이 없습니다.</p>
                <p class="text-sm mt-1">첫 번째 댓글을 작성해보세요!</p>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="bg-gray-800 rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                    <i class="fas fa-user-circle text-purple-400 text-xl"></i>
                    <span class="text-white font-semibold">${escapeHtml(comment.author)}</span>
                </div>
                <span class="text-gray-500 text-xs">${formatDate(comment.createdAt)}</span>
            </div>
            <p class="text-gray-300 mb-3 whitespace-pre-wrap">${escapeHtml(comment.content)}</p>
            <button 
                onclick="likeComment('${comment.id}')"
                class="text-gray-400 hover:text-pink-400 transition flex items-center gap-1 text-sm"
            >
                <i class="fas fa-heart"></i>
                <span id="like-count-${comment.id}">${comment.likes || 0}</span>
            </button>
        </div>
    `).join('');
}

// 댓글 수 업데이트
function updateCommentCount(count) {
    const countEl = document.getElementById('comment-count');
    if (countEl) {
        countEl.textContent = `(${count})`;
    }
}

// 댓글 작성
async function submitComment() {
    try {
        const author = document.getElementById('comment-author').value.trim();
        const content = document.getElementById('comment-content').value.trim();
        
        if (!author) {
            alert('닉네임을 입력해주세요.');
            return;
        }
        
        if (!content) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('id');
        
        if (!bookId) return;
        
        console.log('💬 댓글 작성 중...');
        
        const response = await axios.post(`/api/viewer/storybooks/${bookId}/comments`, {
            author,
            content
        });
        
        if (response.data.success) {
            console.log('✅ 댓글 작성 완료');
            
            // 입력 필드 초기화
            document.getElementById('comment-author').value = '';
            document.getElementById('comment-content').value = '';
            
            // 댓글 목록 새로고침
            loadComments();
            
            alert('댓글이 작성되었습니다! 🎉');
        }
    } catch (error) {
        console.error('❌ 댓글 작성 실패:', error);
        alert('댓글 작성에 실패했습니다.');
    }
}

// 댓글 좋아요
async function likeComment(commentId) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('id');
        
        if (!bookId) return;
        
        const response = await axios.post(`/api/viewer/storybooks/${bookId}/comments/${commentId}/like`);
        
        if (response.data.success) {
            const likeCountEl = document.getElementById(`like-count-${commentId}`);
            if (likeCountEl) {
                likeCountEl.textContent = response.data.likes;
            }
        }
    } catch (error) {
        console.error('❌ 좋아요 실패:', error);
    }
}

// 날짜 포맷팅
function formatDate(isoString) {
    const date = new Date(isoString);
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
        month: 'short', 
        day: 'numeric' 
    });
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// 🔗 공유하기 기능
// ========================================

function shareStorybook() {
    const url = window.location.href;
    const title = currentBook ? currentBook.title : '탱고북 동화책';
    const text = `${title} - 재미있는 동화책을 함께 읽어요!`;
    
    // 네이티브 공유 API 지원 확인
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url
        }).then(() => {
            console.log('✅ 공유 완료');
        }).catch((error) => {
            console.log('❌ 공유 취소:', error);
        });
    } else {
        // 공유 API 미지원시 URL 복사
        copyToClipboard(url);
        alert('링크가 클립보드에 복사되었습니다! 📋\n친구들에게 공유해보세요! 🎉');
    }
}

// 클립보드에 복사
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// ==================== 배경음악 ====================

// 배경음악 목록 로드
async function loadBackgroundMusicList() {
    try {
        const response = await fetch('/api/background-music');
        const data = await response.json();
        
        if (data.success) {
            backgroundMusicList = data.music;
            console.log('✅ 배경음악 목록 로드:', backgroundMusicList.length + '개');
        }
    } catch (error) {
        console.error('❌ 배경음악 목록 로드 오류:', error);
    }
}

// 배경음악 재생
function playBackgroundMusic(musicId) {
    if (!musicId) {
        console.log('🎵 배경음악 ID 없음');
        return;
    }
    
    const music = backgroundMusicList.find(m => m.id === musicId);
    if (!music) {
        console.log('🎵 배경음악을 찾을 수 없음:', musicId);
        return;
    }
    
    // 기존 배경음악 중지
    stopBackgroundMusic();
    
    try {
        backgroundMusic = new Audio(music.url);
        backgroundMusic.loop = true; // 반복 재생
        backgroundMusic.volume = 0.3; // 볼륨 30%
        
        // 배경음악 버튼 표시
        const bgmButton = document.getElementById('bgm-button');
        if (bgmButton) {
            bgmButton.classList.remove('hidden');
        }
        
        // 사용자 상호작용 후 재생 시도
        backgroundMusic.play()
            .then(() => {
                console.log('🎵 배경음악 재생 시작:', music.title);
                isBackgroundMusicPlaying = true;
                updateBGMIcon();
            })
            .catch(error => {
                console.log('⚠️ 배경음악 자동재생 차단됨. 사용자가 버튼을 클릭해야 합니다.');
                console.error('배경음악 재생 오류:', error);
                // 자동재생 실패 시에도 버튼은 표시 (사용자가 클릭할 수 있도록)
                isBackgroundMusicPlaying = false;
                updateBGMIcon();
            });
    } catch (error) {
        console.error('❌ 배경음악 생성 오류:', error);
    }
}

// 배경음악 중지
function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        backgroundMusic = null;
        console.log('🔇 배경음악 중지됨');
        isBackgroundMusicPlaying = false;
        updateBGMIcon();
    }
}

// 배경음악 토글
function toggleBackgroundMusic() {
    if (!backgroundMusic) {
        // 배경음악이 설정되어 있으면 재생 시도
        if (currentBook && currentBook.backgroundMusicId) {
            playBackgroundMusic(currentBook.backgroundMusicId);
        }
        return;
    }
    
    if (isBackgroundMusicPlaying) {
        // 일시정지
        backgroundMusic.pause();
        isBackgroundMusicPlaying = false;
        console.log('⏸️ 배경음악 일시정지');
    } else {
        // 재생
        backgroundMusic.play()
            .then(() => {
                isBackgroundMusicPlaying = true;
                console.log('▶️ 배경음악 재생');
            })
            .catch(error => {
                console.error('❌ 배경음악 재생 오류:', error);
            });
    }
    
    updateBGMIcon();
}

// 배경음악 아이콘 업데이트
function updateBGMIcon() {
    const icon = document.getElementById('bgm-icon');
    if (icon) {
        if (isBackgroundMusicPlaying) {
            icon.className = 'fas fa-music text-sm text-green-400';
        } else {
            icon.className = 'fas fa-music text-sm text-gray-400';
        }
    }
}

// ==================== 조회수 ====================

// 조회수 증가
async function incrementViewCount(bookId) {
    try {
        const response = await axios.post(`/api/storybooks/${bookId}/view`);
        if (response.data.success) {
            console.log('📊 조회수 증가:', response.data.views);
        }
    } catch (error) {
        console.error('❌ 조회수 증가 오류:', error);
    }
}

// 전역으로 노출
window.toggleFullscreen = toggleFullscreen;
window.toggleComments = toggleComments;
window.submitComment = submitComment;
window.likeComment = likeComment;
window.shareStorybook = shareStorybook;
window.toggleBackgroundMusic = toggleBackgroundMusic;
