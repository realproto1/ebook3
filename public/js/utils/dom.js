/**
 * DOM 유틸리티
 * - DOM 조작 헬퍼
 * - 이벤트 관리
 * - 애니메이션
 */

class DOM {
    /**
     * 요소 선택 (querySelector 래핑)
     * @param {string} selector 
     * @param {HTMLElement} parent 
     * @returns {HTMLElement|null}
     */
    static select(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * 여러 요소 선택 (querySelectorAll 래핑)
     * @param {string} selector 
     * @param {HTMLElement} parent 
     * @returns {NodeList}
     */
    static selectAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }

    /**
     * ID로 요소 선택
     * @param {string} id 
     * @returns {HTMLElement|null}
     */
    static id(id) {
        return document.getElementById(id);
    }

    /**
     * 요소 생성
     * @param {string} tag 
     * @param {Object} attributes 
     * @param {string} content 
     * @returns {HTMLElement}
     */
    static create(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        // 속성 설정
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'dataset' && typeof value === 'object') {
                Object.assign(element.dataset, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.substring(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // 내용 설정
        if (content) {
            if (attributes.html) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
        
        return element;
    }

    /**
     * 요소 제거
     * @param {HTMLElement|string} element 
     */
    static remove(element) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    /**
     * 클래스 토글
     * @param {HTMLElement|string} element 
     * @param {string} className 
     */
    static toggleClass(element, className) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            el.classList.toggle(className);
        }
    }

    /**
     * 클래스 추가
     * @param {HTMLElement|string} element 
     * @param {string|string[]} classNames 
     */
    static addClass(element, classNames) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            const classes = Array.isArray(classNames) ? classNames : [classNames];
            el.classList.add(...classes);
        }
    }

    /**
     * 클래스 제거
     * @param {HTMLElement|string} element 
     * @param {string|string[]} classNames 
     */
    static removeClass(element, classNames) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            const classes = Array.isArray(classNames) ? classNames : [classNames];
            el.classList.remove(...classes);
        }
    }

    /**
     * 스타일 설정
     * @param {HTMLElement|string} element 
     * @param {Object} styles 
     */
    static setStyle(element, styles) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            Object.assign(el.style, styles);
        }
    }

    /**
     * 이벤트 리스너 추가
     * @param {HTMLElement|string} element 
     * @param {string} event 
     * @param {Function} handler 
     * @param {Object} options 
     */
    static on(element, event, handler, options = {}) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            el.addEventListener(event, handler, options);
        }
    }

    /**
     * 이벤트 리스너 제거
     * @param {HTMLElement|string} element 
     * @param {string} event 
     * @param {Function} handler 
     */
    static off(element, event, handler) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            el.removeEventListener(event, handler);
        }
    }

    /**
     * 한 번만 실행되는 이벤트 리스너
     * @param {HTMLElement|string} element 
     * @param {string} event 
     * @param {Function} handler 
     */
    static once(element, event, handler) {
        this.on(element, event, handler, { once: true });
    }

    /**
     * 페이드인 애니메이션
     * @param {HTMLElement|string} element 
     * @param {number} duration - 밀리초
     */
    static fadeIn(element, duration = 300) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (!el) return;

        el.style.opacity = '0';
        el.style.display = 'block';
        el.style.transition = `opacity ${duration}ms`;
        
        setTimeout(() => {
            el.style.opacity = '1';
        }, 10);
    }

    /**
     * 페이드아웃 애니메이션
     * @param {HTMLElement|string} element 
     * @param {number} duration - 밀리초
     * @param {Function} callback 
     */
    static fadeOut(element, duration = 300, callback) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (!el) return;

        el.style.transition = `opacity ${duration}ms`;
        el.style.opacity = '0';
        
        setTimeout(() => {
            el.style.display = 'none';
            if (callback) callback();
        }, duration);
    }

    /**
     * 슬라이드다운 애니메이션
     * @param {HTMLElement|string} element 
     * @param {number} duration 
     */
    static slideDown(element, duration = 300) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (!el) return;

        el.style.maxHeight = '0';
        el.style.overflow = 'hidden';
        el.style.transition = `max-height ${duration}ms ease-in-out`;
        el.style.display = 'block';
        
        setTimeout(() => {
            el.style.maxHeight = el.scrollHeight + 'px';
        }, 10);
    }

    /**
     * 슬라이드업 애니메이션
     * @param {HTMLElement|string} element 
     * @param {number} duration 
     * @param {Function} callback 
     */
    static slideUp(element, duration = 300, callback) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (!el) return;

        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.overflow = 'hidden';
        el.style.transition = `max-height ${duration}ms ease-in-out`;
        
        setTimeout(() => {
            el.style.maxHeight = '0';
        }, 10);
        
        setTimeout(() => {
            el.style.display = 'none';
            if (callback) callback();
        }, duration);
    }

    /**
     * HTML 이스케이프
     * @param {string} text 
     * @returns {string}
     */
    static escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 스크롤을 요소로 이동
     * @param {HTMLElement|string} element 
     * @param {Object} options 
     */
    static scrollTo(element, options = {}) {
        const el = typeof element === 'string' ? this.select(element) : element;
        if (el) {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                ...options
            });
        }
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.DOM = DOM;
}

// ES6 모듈 export
export { DOM };
export default DOM;
