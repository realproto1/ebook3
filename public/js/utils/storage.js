/**
 * Storage 유틸리티
 * - localStorage 래핑
 * - 타입 안전성
 * - 에러 처리
 */

class Storage {
    /**
     * 데이터 저장
     * @param {string} key 
     * @param {any} value - 자동으로 JSON.stringify 처리
     */
    static set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Storage.set error:', error);
            return false;
        }
    }

    /**
     * 데이터 가져오기
     * @param {string} key 
     * @param {any} defaultValue - 없을 경우 기본값
     * @returns {any}
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.error('Storage.get error:', error);
            return defaultValue;
        }
    }

    /**
     * 데이터 제거
     * @param {string} key 
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage.remove error:', error);
            return false;
        }
    }

    /**
     * 모든 데이터 제거
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage.clear error:', error);
            return false;
        }
    }

    /**
     * 키 존재 여부 확인
     * @param {string} key 
     * @returns {boolean}
     */
    static has(key) {
        return localStorage.getItem(key) !== null;
    }

    /**
     * 모든 키 가져오기
     * @returns {string[]}
     */
    static keys() {
        return Object.keys(localStorage);
    }

    /**
     * 네임스페이스 기반 저장 (예: 'game.score', 'user.name')
     */
    static setNamespaced(namespace, key, value) {
        const fullKey = `${namespace}.${key}`;
        return this.set(fullKey, value);
    }

    /**
     * 네임스페이스 기반 가져오기
     */
    static getNamespaced(namespace, key, defaultValue = null) {
        const fullKey = `${namespace}.${key}`;
        return this.get(fullKey, defaultValue);
    }

    /**
     * 네임스페이스의 모든 데이터 가져오기
     * @param {string} namespace 
     * @returns {Object}
     */
    static getAllNamespaced(namespace) {
        const prefix = `${namespace}.`;
        const result = {};
        
        this.keys()
            .filter(key => key.startsWith(prefix))
            .forEach(key => {
                const shortKey = key.substring(prefix.length);
                result[shortKey] = this.get(key);
            });
        
        return result;
    }

    /**
     * 네임스페이스의 모든 데이터 제거
     * @param {string} namespace 
     */
    static clearNamespace(namespace) {
        const prefix = `${namespace}.`;
        this.keys()
            .filter(key => key.startsWith(prefix))
            .forEach(key => this.remove(key));
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.Storage = Storage;
}

// ES6 모듈 export
export { Storage };
export default Storage;
