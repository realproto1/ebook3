// TTS 디버깅 스크립트
// 브라우저 콘솔에서 실행:
// 1. currentStorybook.pages.length
// 2. currentStorybook.translations['en'].length
// 3. currentStorybook.translations['en'].forEach((p, i) => { if (!p.text || p.text.trim() === '') console.log('Empty page:', i, p) })
// 4. currentStorybook.pages.forEach((p, i) => { const text = getPageText(p, 'en'); if (!text || text.trim() === '') console.log('No text for page', i, p.pageNumber) })
