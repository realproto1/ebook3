// 댓글 관리 JavaScript

let currentBookId = null;

// URL에서 동화책 ID 가져오기
function getBookIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 댓글 패널 토글
function toggleComments() {
    const panel = document.getElementById('comments-panel');
    
    if (panel.classList.contains('translate-x-full')) {
        // 열기
        panel.classList.remove('translate-x-full');
        loadComments();
    } else {
        // 닫기
        panel.classList.add('translate-x-full');
    }
}

// 댓글 목록 불러오기
async function loadComments() {
    try {
        currentBookId = getBookIdFromUrl();
        if (!currentBookId) {
            console.error('❌ Book ID not found in URL');
            return;
        }

        console.log('📖 Loading comments for book:', currentBookId);
        
        const response = await axios.get(`/api/viewer/storybooks/${currentBookId}/comments`);
        
        if (response.data.success) {
            const comments = response.data.comments || [];
            displayComments(comments);
            updateCommentCount(comments.length);
            console.log(`✅ Loaded ${comments.length} comments`);
        }
    } catch (error) {
        console.error('❌ Failed to load comments:', error);
        showErrorMessage('댓글을 불러오는데 실패했습니다.');
    }
}

// 댓글 표시
function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-comments text-4xl mb-3"></i>
                <p>아직 댓글이 없습니다.</p>
                <p class="text-sm">첫 번째 댓글을 작성해보세요!</p>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                        ${comment.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-white font-semibold">${escapeHtml(comment.nickname)}</span>
                </div>
                <span class="text-gray-500 text-xs">${formatDate(comment.createdAt)}</span>
            </div>
            <p class="text-gray-300 whitespace-pre-wrap break-words">${escapeHtml(comment.content)}</p>
        </div>
    `).join('');
}

// 댓글 개수 업데이트
function updateCommentCount(count) {
    const commentCount = document.getElementById('comment-count');
    if (commentCount) {
        commentCount.textContent = `(${count})`;
    }
}

// 댓글 작성
async function submitComment() {
    try {
        const nickname = document.getElementById('comment-author').value.trim();
        const content = document.getElementById('comment-content').value.trim();
        
        if (!nickname) {
            alert('닉네임을 입력해주세요.');
            return;
        }
        
        if (!content) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }
        
        if (content.length > 500) {
            alert('댓글은 500자 이내로 작성해주세요.');
            return;
        }
        
        currentBookId = getBookIdFromUrl();
        if (!currentBookId) {
            alert('동화책 정보를 찾을 수 없습니다.');
            return;
        }
        
        console.log('💬 Submitting comment...');
        
        const response = await axios.post(`/api/viewer/storybooks/${currentBookId}/comments`, {
            nickname,
            content
        });
        
        if (response.data.success) {
            console.log('✅ Comment submitted successfully');
            
            // 입력 필드 초기화
            document.getElementById('comment-author').value = '';
            document.getElementById('comment-content').value = '';
            
            // 댓글 목록 다시 불러오기
            await loadComments();
            
            // 성공 메시지
            showSuccessMessage('댓글이 작성되었습니다!');
        }
    } catch (error) {
        console.error('❌ Failed to submit comment:', error);
        const errorMessage = error.response?.data?.error || '댓글 작성에 실패했습니다.';
        alert(errorMessage);
    }
}

// 공유하기
function shareStorybook() {
    const bookId = getBookIdFromUrl();
    if (!bookId) {
        alert('동화책 정보를 찾을 수 없습니다.');
        return;
    }
    
    const shareUrl = `${window.location.origin}/reader.html?id=${bookId}`;
    
    // Web Share API 지원 여부 확인
    if (navigator.share) {
        navigator.share({
            title: '탱고북 동화책',
            text: '재미있는 동화책을 공유합니다!',
            url: shareUrl
        })
        .then(() => console.log('✅ Share successful'))
        .catch((error) => {
            console.log('Share cancelled or failed:', error);
            // 공유 실패 시 URL 복사
            copyToClipboard(shareUrl);
        });
    } else {
        // Web Share API 미지원 시 URL 복사
        copyToClipboard(shareUrl);
    }
}

// 클립보드에 복사
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showSuccessMessage('링크가 복사되었습니다!');
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
        showSuccessMessage('링크가 복사되었습니다!');
    } catch (err) {
        console.error('❌ Fallback copy failed:', err);
        alert('복사에 실패했습니다. 수동으로 링크를 복사해주세요:\n\n' + text);
    }
    
    document.body.removeChild(textarea);
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

// 성공 메시지 표시
function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[60] animate-fade-in';
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-check-circle"></i>
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

// 에러 메시지 표시
function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[60] animate-fade-in';
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-exclamation-circle"></i>
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

// 페이지 로드 시 댓글 개수 초기화
window.addEventListener('DOMContentLoaded', () => {
    // 댓글 개수 불러오기 (패널은 열지 않음)
    const bookId = getBookIdFromUrl();
    if (bookId) {
        axios.get(`/api/viewer/storybooks/${bookId}/comments`)
            .then(response => {
                if (response.data.success) {
                    updateCommentCount(response.data.comments.length);
                }
            })
            .catch(error => {
                console.error('❌ Failed to load comment count:', error);
            });
    }
});
