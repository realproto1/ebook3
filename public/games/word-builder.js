// 단어 만들기 게임 (Word Builder)
// 흩어진 글자를 조합하여 단어 완성

// URL에서 스토리 ID 추출
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story');

// 게임 상태
let storyData = null;
let vocabulary = [];
let words = [];
let currentWordIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let currentAnswer = [];
let hintCount = 0;

// 초기화
async function init() {
    if (!storyId) {
        alert('❌ 스토리 ID가 없습니다.');
        goBack();
        return;
    }

    try {
        // 스토리 데이터 로드
        const response = await axios.get(`/api/storybooks/${storyId}`);
        storyData = response.data;

        // 제목 표시
        document.getElementById('story-title').textContent = storyData.title || '동화책';

        // 학습 단어 추출
        vocabulary = storyData.educational_content?.vocabulary || [];
        
        if (vocabulary.length === 0) {
            alert('❌ 학습 단어가 없습니다.');
            goBack();
            return;
        }

        // 단어 준비 (최대 8개)
        words = shuffle([...vocabulary]).slice(0, Math.min(8, vocabulary.length));

        // 총 문제 수 표시
        document.getElementById('total-questions').textContent = words.length;

        // 첫 문제 표시
        showWord();

        console.log(`✅ ${words.length}개 단어 준비 완료`);

    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        alert('게임을 시작할 수 없습니다.');
        goBack();
    }
}

// Fisher-Yates 셔플
function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 단어 표시
function showWord() {
    const word = words[currentWordIndex];
    
    // 진행 상태 업데이트
    document.getElementById('current-question').textContent = currentWordIndex + 1;
    document.getElementById('correct-count').textContent = correctAnswers;
    const progress = ((currentWordIndex + 1) / words.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // 힌트 (정답은 숨김, 설명만 표시)
    document.getElementById('hint-text').textContent = `💡 ${word.definition}`;
    document.getElementById('hint-english').textContent = word.word;

    // 이미지 (있으면 표시)
    const imageElement = document.getElementById('hint-image');
    const imageUrl = word.image || word.imageUrl;
    if (imageUrl) {
        imageElement.src = imageUrl;
        imageElement.style.display = 'block';
        imageElement.onerror = () => {
            // 이미지 로드 실패 시 숨김
            imageElement.style.display = 'none';
        };
    } else {
        imageElement.style.display = 'none';
    }

    // 글자 생성
    generateLetters(word.korean);

    // 피드백 숨기기
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('feedback').className = 'feedback';

    // 힌트 카운트 초기화
    hintCount = 0;
}

// 글자 생성 (정답 글자 + 방해 글자)
function generateLetters(correctWord) {
    currentAnswer = [];

    // 정답 글자
    const correctLetters = correctWord.split('');

    // 방해 글자 (2~4개)
    const distractorPool = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
    const numDistractors = Math.floor(Math.random() * 3) + 2; // 2~4개
    const distractors = [];

    for (let i = 0; i < numDistractors; i++) {
        const randomLetter = distractorPool[Math.floor(Math.random() * distractorPool.length)];
        if (!correctLetters.includes(randomLetter)) {
            distractors.push(randomLetter);
        }
    }

    // 모든 글자 섞기
    const allLetters = shuffle([...correctLetters, ...distractors]);

    // 글자 버튼 생성
    const lettersGrid = document.getElementById('letters-grid');
    lettersGrid.innerHTML = '';

    allLetters.forEach((letter, index) => {
        const button = document.createElement('button');
        button.className = 'letter-button';
        button.textContent = letter;
        button.dataset.index = index;
        button.onclick = () => selectLetter(letter, button);
        lettersGrid.appendChild(button);
    });

    // 답안 영역 초기화
    updateAnswerArea();

    // 확인 버튼 비활성화
    document.getElementById('check-btn').disabled = true;
}

// 글자 선택
function selectLetter(letter, button) {
    if (button.disabled) return;

    // 답안에 추가
    currentAnswer.push(letter);

    // 버튼 비활성화
    button.disabled = true;

    // 답안 영역 업데이트
    updateAnswerArea();

    // 확인 버튼 활성화 (정답 길이와 같으면)
    const correctWord = words[currentWordIndex].korean;
    if (currentAnswer.length === correctWord.length) {
        document.getElementById('check-btn').disabled = false;
    }
}

// 답안 영역 업데이트
function updateAnswerArea() {
    const answerArea = document.getElementById('answer-area');
    answerArea.innerHTML = '';

    if (currentAnswer.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.textContent = '아래 글자를 눌러서 단어를 만들어보세요';
        placeholder.style.color = '#ccc';
        placeholder.style.fontSize = '18px';
        answerArea.appendChild(placeholder);
        return;
    }

    currentAnswer.forEach((letter, index) => {
        const letterDiv = document.createElement('div');
        letterDiv.className = 'answer-letter';
        letterDiv.textContent = letter;
        letterDiv.onclick = () => removeLetter(index);
        answerArea.appendChild(letterDiv);
    });
}

// 글자 제거 (클릭한 글자)
function removeLetter(index) {
    const letter = currentAnswer[index];

    // 답안에서 제거
    currentAnswer.splice(index, 1);

    // 답안 영역 업데이트
    updateAnswerArea();

    // 글자 버튼 다시 활성화
    const letterButtons = document.querySelectorAll('.letter-button');
    letterButtons.forEach(button => {
        if (button.textContent === letter && button.disabled) {
            button.disabled = false;
            return; // 첫 번째만 활성화
        }
    });

    // 확인 버튼 비활성화
    document.getElementById('check-btn').disabled = true;
}

// 답안 지우기
function clearAnswer() {
    currentAnswer = [];
    updateAnswerArea();

    // 모든 글자 버튼 활성화
    const letterButtons = document.querySelectorAll('.letter-button');
    letterButtons.forEach(button => {
        button.disabled = false;
    });

    // 확인 버튼 비활성화
    document.getElementById('check-btn').disabled = true;
}

// 힌트 보기
function showHint() {
    hintCount++;

    const word = words[currentWordIndex];

    if (hintCount === 1) {
        // 첫 번째 힌트: 뜻 표시 (이미 표시됨)
        alert(`힌트: "${word.definition}"`);
    } else if (hintCount === 2) {
        // 두 번째 힌트: 첫 글자 표시
        alert(`힌트: 첫 글자는 "${word.korean[0]}" 입니다!`);
    } else {
        // 세 번째 힌트: 정답 표시
        alert(`정답: "${word.korean}"`);
        document.getElementById('hint-text').textContent = `💡 정답: ${word.korean}`;
    }
}

// 정답 확인
function checkAnswer() {
    const word = words[currentWordIndex];
    const userAnswer = currentAnswer.join('');
    const isCorrect = userAnswer === word.korean;

    const feedback = document.getElementById('feedback');

    if (isCorrect) {
        feedback.textContent = '🎉 정답입니다!';
        feedback.className = 'feedback correct';
        correctAnswers++;
        playSound('correct');

        // 1초 후 설명 모달 표시
        setTimeout(() => {
            showExplanation(word);
        }, 1000);

    } else {
        feedback.textContent = `❌ 틀렸어요! 정답은 "${word.korean}" 입니다.`;
        feedback.className = 'feedback wrong';
        wrongAnswers++;
        playSound('wrong');

        // 2초 후 다음 문제
        setTimeout(() => {
            nextWord();
        }, 2000);
    }

    // 버튼 비활성화
    document.getElementById('check-btn').disabled = true;
    document.getElementById('hint-btn').disabled = true;
    document.getElementById('clear-btn').disabled = true;

    const letterButtons = document.querySelectorAll('.letter-button');
    letterButtons.forEach(button => {
        button.disabled = true;
    });
}

// 단어 설명 모달 표시
function showExplanation(word) {
    document.getElementById('explanation-word').textContent = word.korean;
    document.getElementById('explanation-meaning').textContent = word.definition;
    document.getElementById('explanation-example').textContent = `예문: "${word.example}"`;
    document.getElementById('explanation-modal').style.display = 'flex';
}

// 설명 모달 닫기 및 다음 문제
function closeExplanation() {
    document.getElementById('explanation-modal').style.display = 'none';
    nextWord();
}

// 다음 단어
function nextWord() {
    currentWordIndex++;

    if (currentWordIndex < words.length) {
        // 버튼 활성화
        document.getElementById('hint-btn').disabled = false;
        document.getElementById('clear-btn').disabled = false;

        showWord();
    } else {
        showResult();
    }
}

// 결과 표시
function showResult() {
    const totalWords = words.length;
    const accuracy = Math.round((correctAnswers / totalWords) * 100);

    // 등급 결정
    let grade = '';
    let icon = '';
    if (accuracy >= 90) {
        grade = '최우수';
        icon = '🏆';
    } else if (accuracy >= 70) {
        grade = '우수';
        icon = '🌟';
    } else if (accuracy >= 50) {
        grade = '보통';
        icon = '👍';
    } else {
        grade = '다시 도전!';
        icon = '💪';
    }

    // 결과 표시
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('final-correct').textContent = correctAnswers;
    document.getElementById('final-wrong').textContent = wrongAnswers;
    document.getElementById('final-accuracy').textContent = accuracy;
    document.getElementById('final-grade').textContent = `등급: ${grade}`;

    // 모달 표시
    document.getElementById('result-modal').style.display = 'flex';

    playSound('complete');
}

// 게임 재시작
function restartGame() {
    currentWordIndex = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    currentAnswer = [];
    
    document.getElementById('result-modal').style.display = 'none';
    
    words = shuffle([...vocabulary]).slice(0, Math.min(8, vocabulary.length));
    showWord();
}

// 게임 목록으로
function goToGames() {
    window.location.href = `/games.html?story=${storyId}`;
}

// 뒤로 가기
function goBack() {
    window.location.href = `/games.html?story=${storyId}`;
}

// 사운드 재생
function playSound(type) {
    try {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Sound play failed:', e));
    } catch (e) {
        console.warn('Sound not available:', type);
    }
}

// 초기화 실행
init();
