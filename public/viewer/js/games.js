// 전역 변수
let currentBook = null;
let vocabulary = [];
let currentGame = null;
let gameState = {
    score: 0,
    totalQuestions: 0
};

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
        console.log(`🎮 Loading storybook ${bookId} for games...`);
        
        const response = await axios.get(`/api/viewer/storybooks/${bookId}`);
        
        if (response.data.success) {
            currentBook = response.data.storybook;
            console.log('✅ Storybook loaded:', currentBook.title);
            
            // 교육 콘텐츠 확인
            if (!currentBook.educational_content || 
                !currentBook.educational_content.vocabulary || 
                currentBook.educational_content.vocabulary.length === 0) {
                alert('이 동화책에는 학습 콘텐츠가 없습니다.');
                window.history.back();
                return;
            }
            
            vocabulary = currentBook.educational_content.vocabulary.slice(0, 8);
            
            // UI 표시
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            document.getElementById('book-title').textContent = currentBook.title;
            
            // 기본 게임 시작
            selectGame('matching');
        }
    } catch (error) {
        console.error('❌ Failed to load storybook:', error);
        alert('동화책을 불러오는데 실패했습니다.');
        window.location.href = '/viewer.html';
    }
}

// 게임 선택
function selectGame(gameType) {
    currentGame = gameType;
    gameState = { score: 0, totalQuestions: 0 };
    
    const content = document.getElementById('game-content');
    
    switch(gameType) {
        case 'matching':
            renderMatchingGame(content);
            break;
        case 'quiz':
            renderQuizGame(content);
            break;
        case 'character':
            renderCharacterGame(content);
            break;
        case 'sequence':
            renderSequenceGame(content);
            break;
    }
}

// 1. 단어 매칭 게임
function renderMatchingGame(container) {
    const shuffledWords = [...vocabulary].sort(() => Math.random() - 0.5);
    const shuffledImages = [...vocabulary].sort(() => Math.random() - 0.5);
    
    let selectedImage = null;
    let selectedWord = null;
    let matchedCount = 0;
    
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-puzzle-piece mr-2 text-purple-500"></i>
            단어와 이미지를 매칭하세요!
        </h2>
        <p class="text-gray-600 mb-6">이미지를 먼저 클릭하고, 그 다음 해당하는 단어를 클릭하세요.</p>
        
        <div class="grid md:grid-cols-2 gap-8">
            <!-- 이미지 영역 -->
            <div>
                <h3 class="font-bold text-lg mb-4 text-gray-700">이미지</h3>
                <div class="space-y-3" id="images-container">
                    ${shuffledImages.map((item, idx) => `
                        <div 
                            class="game-card border-4 border-gray-300 rounded-xl p-4 cursor-pointer hover:border-purple-400"
                            data-image-id="${vocabulary.indexOf(item)}"
                            onclick="selectImage(${vocabulary.indexOf(item)})"
                        >
                            ${currentBook.vocabularyImages && currentBook.vocabularyImages[vocabulary.indexOf(item)]
                                ? `<img src="${currentBook.vocabularyImages[vocabulary.indexOf(item)]}" 
                                       alt="${item.korean}" 
                                       class="w-full h-32 object-contain rounded-lg">`
                                : `<div class="w-full h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-image text-white text-4xl"></i>
                                   </div>`
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 단어 영역 -->
            <div>
                <h3 class="font-bold text-lg mb-4 text-gray-700">단어</h3>
                <div class="space-y-3" id="words-container">
                    ${shuffledWords.map((item, idx) => `
                        <div 
                            class="game-card border-4 border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400"
                            data-word-id="${vocabulary.indexOf(item)}"
                            onclick="selectWord(${vocabulary.indexOf(item)})"
                        >
                            <p class="text-2xl font-bold text-center text-gray-800">${item.korean}</p>
                            <p class="text-center text-gray-600">${item.word}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="mt-6 text-center">
            <p class="text-lg font-semibold text-gray-700">
                매칭 완료: <span id="match-count">0</span> / ${vocabulary.length}
            </p>
        </div>
    `;
    
    // 이미지 선택
    window.selectImage = function(id) {
        // 이미 매칭된 것은 선택 불가
        const imageEl = document.querySelector(`[data-image-id="${id}"]`);
        if (imageEl.classList.contains('correct')) return;
        
        // 이전 선택 해제
        document.querySelectorAll('[data-image-id]').forEach(el => {
            if (!el.classList.contains('correct')) {
                el.classList.remove('selected');
            }
        });
        
        selectedImage = id;
        imageEl.classList.add('selected');
        
        // 이미 단어가 선택되어 있으면 매칭 시도
        if (selectedWord !== null) {
            checkMatch();
        }
    };
    
    // 단어 선택
    window.selectWord = function(id) {
        // 이미 매칭된 것은 선택 불가
        const wordEl = document.querySelector(`[data-word-id="${id}"]`);
        if (wordEl.classList.contains('correct')) return;
        
        // 이전 선택 해제
        document.querySelectorAll('[data-word-id]').forEach(el => {
            if (!el.classList.contains('correct')) {
                el.classList.remove('selected');
            }
        });
        
        selectedWord = id;
        wordEl.classList.add('selected');
        
        // 이미 이미지가 선택되어 있으면 매칭 시도
        if (selectedImage !== null) {
            checkMatch();
        }
    };
    
    // 매칭 확인
    function checkMatch() {
        const imageEl = document.querySelector(`[data-image-id="${selectedImage}"]`);
        const wordEl = document.querySelector(`[data-word-id="${selectedWord}"]`);
        
        if (selectedImage === selectedWord) {
            // 정답!
            imageEl.classList.remove('selected');
            imageEl.classList.add('correct');
            wordEl.classList.remove('selected');
            wordEl.classList.add('correct');
            
            matchedCount++;
            document.getElementById('match-count').textContent = matchedCount;
            
            // 모두 맞췄으면
            if (matchedCount === vocabulary.length) {
                setTimeout(() => {
                    alert('🎉 축하합니다! 모든 단어를 맞췄어요!');
                }, 500);
            }
        } else {
            // 오답
            imageEl.classList.add('wrong');
            wordEl.classList.add('wrong');
            
            setTimeout(() => {
                imageEl.classList.remove('wrong', 'selected');
                wordEl.classList.remove('wrong', 'selected');
            }, 1000);
        }
        
        selectedImage = null;
        selectedWord = null;
    }
}

// 2. 스토리 퀴즈 게임
function renderQuizGame(container) {
    if (!currentBook.educational_content.quiz || currentBook.educational_content.quiz.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-question-circle text-6xl text-gray-300 mb-4"></i>
                <p class="text-xl text-gray-600">이 동화책에는 퀴즈가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    const quizzes = currentBook.educational_content.quiz;
    let currentQuizIndex = 0;
    let score = 0;
    
    function showQuiz(index) {
        const quiz = quizzes[index];
        
        container.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-question-circle mr-2 text-blue-500"></i>
                    퀴즈 ${index + 1} / ${quizzes.length}
                </h2>
                
                <div class="bg-blue-50 rounded-xl p-6 mb-6">
                    <p class="text-xl text-gray-800 font-semibold">${quiz.question}</p>
                </div>
                
                <div class="space-y-3">
                    ${quiz.options.map((option, optIdx) => `
                        <button 
                            onclick="checkAnswer(${optIdx})"
                            class="quiz-option w-full text-left p-4 rounded-xl border-3 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition font-semibold text-lg"
                        >
                            ${String.fromCharCode(65 + optIdx)}. ${option}
                        </button>
                    `).join('')}
                </div>
                
                <div class="mt-6 text-center">
                    <p class="text-lg text-gray-600">점수: <span class="font-bold text-blue-600">${score}</span> / ${quizzes.length}</p>
                </div>
            </div>
        `;
        
        window.checkAnswer = function(selectedIndex) {
            const buttons = document.querySelectorAll('.quiz-option');
            
            if (selectedIndex === quiz.answer) {
                // 정답
                buttons[selectedIndex].classList.add('correct');
                score++;
                
                setTimeout(() => {
                    if (currentQuizIndex < quizzes.length - 1) {
                        currentQuizIndex++;
                        showQuiz(currentQuizIndex);
                    } else {
                        // 퀴즈 완료
                        container.innerHTML = `
                            <div class="text-center py-12">
                                <i class="fas fa-trophy text-8xl text-yellow-500 mb-6"></i>
                                <h3 class="text-3xl font-bold text-gray-800 mb-4">퀴즈 완료!</h3>
                                <p class="text-2xl text-gray-700 mb-6">
                                    최종 점수: <span class="text-blue-600 font-bold">${score}</span> / ${quizzes.length}
                                </p>
                                <button 
                                    onclick="selectGame('quiz')"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition"
                                >
                                    다시 도전하기
                                </button>
                            </div>
                        `;
                    }
                }, 1000);
            } else {
                // 오답
                buttons[selectedIndex].classList.add('wrong');
                buttons[quiz.answer].classList.add('correct');
                
                setTimeout(() => {
                    if (currentQuizIndex < quizzes.length - 1) {
                        currentQuizIndex++;
                        showQuiz(currentQuizIndex);
                    } else {
                        // 퀴즈 완료
                        container.innerHTML = `
                            <div class="text-center py-12">
                                <i class="fas fa-trophy text-8xl text-yellow-500 mb-6"></i>
                                <h3 class="text-3xl font-bold text-gray-800 mb-4">퀴즈 완료!</h3>
                                <p class="text-2xl text-gray-700 mb-6">
                                    최종 점수: <span class="text-blue-600 font-bold">${score}</span> / ${quizzes.length}
                                </p>
                                <button 
                                    onclick="selectGame('quiz')"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition"
                                >
                                    다시 도전하기
                                </button>
                            </div>
                        `;
                    }
                }, 2000);
            }
        };
    }
    
    showQuiz(0);
}

// 3. 캐릭터 맞추기 게임
function renderCharacterGame(container) {
    if (!currentBook.characters || currentBook.characters.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
                <p class="text-xl text-gray-600">캐릭터 정보가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-users mr-2 text-green-500"></i>
            캐릭터 이름 맞추기
        </h2>
        <p class="text-gray-600 mb-6">캐릭터 이미지를 보고 이름을 맞춰보세요!</p>
        
        <div class="grid md:grid-cols-3 gap-6">
            ${currentBook.characters.map((char, idx) => `
                <div class="game-card border-4 border-gray-300 rounded-xl p-6 text-center">
                    ${char.referenceImage 
                        ? `<img src="${char.referenceImage}" alt="?" class="w-full h-48 object-cover rounded-lg mb-4">`
                        : `<div class="w-full h-48 bg-gradient-to-br from-green-400 to-teal-400 rounded-lg mb-4 flex items-center justify-center">
                            <i class="fas fa-user text-white text-6xl"></i>
                           </div>`
                    }
                    <p class="text-xl font-bold text-gray-800 mb-2">???</p>
                    <button 
                        onclick="revealCharacter(${idx})"
                        class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                        정답 확인
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    window.revealCharacter = function(index) {
        const char = currentBook.characters[index];
        const cards = document.querySelectorAll('.game-card');
        const card = cards[index];
        
        card.classList.add('correct');
        card.querySelector('p').textContent = char.name;
        card.querySelector('button').textContent = `역할: ${char.role}`;
        card.querySelector('button').disabled = true;
        card.querySelector('button').classList.remove('hover:bg-green-600');
        card.querySelector('button').classList.add('bg-gray-400');
    };
}

// 4. 순서 맞추기 게임
function renderSequenceGame(container) {
    const pages = currentBook.pages.slice(0, 6); // 첫 6페이지만
    const shuffled = [...pages].sort(() => Math.random() - 0.5);
    
    let selectedPages = [];
    
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-sort-numeric-down mr-2 text-orange-500"></i>
            스토리 순서 맞추기
        </h2>
        <p class="text-gray-600 mb-6">스토리의 순서대로 페이지를 클릭하세요!</p>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            ${shuffled.map((page, idx) => `
                <div 
                    class="game-card border-4 border-gray-300 rounded-xl p-4 cursor-pointer hover:border-orange-400"
                    data-page-num="${page.pageNumber}"
                    onclick="selectPageOrder(${page.pageNumber}, this)"
                >
                    ${page.illustrationImage 
                        ? `<img src="${page.illustrationImage}" alt="Page ${page.pageNumber}" class="w-full h-32 object-cover rounded-lg mb-2">`
                        : `<div class="w-full h-32 bg-gradient-to-br from-orange-400 to-red-400 rounded-lg mb-2"></div>`
                    }
                    <p class="text-sm text-gray-600 line-clamp-2">${page.text.substring(0, 50)}...</p>
                    <div class="order-badge hidden mt-2 text-center">
                        <span class="inline-block bg-orange-500 text-white rounded-full w-8 h-8 leading-8 font-bold"></span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="text-center">
            <button 
                onclick="checkSequence()"
                class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition"
            >
                순서 확인하기
            </button>
        </div>
    `;
    
    window.selectPageOrder = function(pageNum, element) {
        if (element.classList.contains('selected')) {
            // 선택 해제
            const index = selectedPages.indexOf(pageNum);
            selectedPages.splice(index, 1);
            element.classList.remove('selected');
            element.querySelector('.order-badge').classList.add('hidden');
        } else {
            // 선택
            selectedPages.push(pageNum);
            element.classList.add('selected');
            const badge = element.querySelector('.order-badge');
            badge.classList.remove('hidden');
            badge.querySelector('span').textContent = selectedPages.length;
        }
    };
    
    window.checkSequence = function() {
        const correctOrder = pages.map(p => p.pageNumber).sort((a, b) => a - b);
        const isCorrect = JSON.stringify(selectedPages) === JSON.stringify(correctOrder);
        
        if (isCorrect) {
            alert('🎉 정답입니다! 스토리 순서를 완벽하게 맞췄어요!');
        } else {
            alert('❌ 아쉽지만 틀렸어요. 다시 도전해보세요!');
            selectedPages = [];
            document.querySelectorAll('.game-card').forEach(card => {
                card.classList.remove('selected');
                card.querySelector('.order-badge').classList.add('hidden');
            });
        }
    };
}

// 페이지 로드 시 실행
window.addEventListener('DOMContentLoaded', () => {
    loadBook();
});
