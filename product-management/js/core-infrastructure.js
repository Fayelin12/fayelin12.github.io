/**
 * 核心基础设施模块
 * 提供依赖注入、事件总线、存储管理等基础服务
 * 
 * 包含：
 * - AppContainer: 依赖注入容器
 * - EventBus: 统一事件总线
 * - StorageManager: 带版本控制的存储管理器
 * - CSS.escape polyfill
 */

// ============ CSS.escape Polyfill ============
if (!window.CSS || !CSS.escape) {
    window.CSS = window.CSS || {};
    CSS.escape = function(str) {
        if (typeof str !== 'string') {
            throw new TypeError('Expected string');
        }
        return str.replace(/([!"#$%&'()*+,\-./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    };
}

// ============ 依赖注入容器 ============
const AppContainer = (function() {
    'use strict';

    const services = new Map();
    const singletons = new Map();

    return {
        /**
         * 注册服务
         * @param {string} name - 服务名称
         * @param {Function|Object} factory - 服务工厂函数或实例
         * @param {boolean} singleton - 是否为单例
         */
        register(name, factory, singleton = true) {
            services.set(name, { factory, singleton });
            // console.log(`[AppContainer] 注册服务: ${name}`);
        },

        /**
         * 解析服务
         * @param {string} name - 服务名称
         * @returns {*} 服务实例
         */
        resolve(name) {
            const service = services.get(name);
            if (!service) {
                throw new Error(`[AppContainer] 服务未找到: ${name}`);
            }

            if (service.singleton) {
                if (!singletons.has(name)) {
                    const instance = typeof service.factory === 'function' 
                        ? service.factory() 
                        : service.factory;
                    singletons.set(name, instance);
                }
                return singletons.get(name);
            }

            return typeof service.factory === 'function' 
                ? service.factory() 
                : service.factory;
        },

        /**
         * 检查服务是否存在
         * @param {string} name - 服务名称
         * @returns {boolean}
         */
        has(name) {
            return services.has(name);
        },

        /**
         * 移除服务
         * @param {string} name - 服务名称
         */
        unregister(name) {
            services.delete(name);
            singletons.delete(name);
        },

        /**
         * 清理所有服务
         */
        clear() {
            services.clear();
            singletons.clear();
        }
    };
})();

// ============ 统一事件总线 ============
const EventBus = (function() {
    'use strict';

    const events = new Map();
    
    // 事件名称常量
    const EVENT_NAMES = {
        // 页面相关
        PAGE_CHANGED: 'page:changed',
        PAGE_LOADED: 'page:loaded',
        
        // 需求文档相关
        REQUIREMENT_SAVED: 'requirement:saved',
        REQUIREMENT_UPDATED: 'requirement:updated',
        REQUIREMENT_EDIT_REQUESTED: 'requirement:editRequested',
        REQUIREMENT_EDITOR_CLOSED: 'requirement:editorClosed',
        REQUIREMENT_GOTO_PAGE: 'requirement:gotoPage',
        
        // 高亮配置相关
        HIGHLIGHT_CONFIG_SAVED: 'highlight:saved',
        HIGHLIGHT_CONFIG_CHANGED: 'highlight:changed',
        
        // 交互映射相关
        MAPPING_CREATED: 'mapping:created',
        MAPPING_REMOVED: 'mapping:removed',
        
        // 预览相关
        PREVIEW_UPDATED: 'preview:updated',
        PREVIEW_SCALE_CHANGED: 'preview:scaleChanged',
        
        // 版本相关
        VERSION_CHANGED: 'version:changed'
    };

    return {
        EVENT_NAMES,

        /**
         * 订阅事件
         * @param {string} eventName - 事件名称
         * @param {Function} handler - 事件处理器
         * @param {Object} options - 选项 { once: boolean }
         * @returns {Function} 取消订阅函数
         */
        on(eventName, handler, options = {}) {
            if (!events.has(eventName)) {
                events.set(eventName, []);
            }

            const handlers = events.get(eventName);
            const handlerWrapper = { handler, once: options.once };
            handlers.push(handlerWrapper);

            // 返回取消订阅函数
            return () => this.off(eventName, handler);
        },

        /**
         * 订阅一次性事件
         * @param {string} eventName - 事件名称
         * @param {Function} handler - 事件处理器
         * @returns {Function} 取消订阅函数
         */
        once(eventName, handler) {
            return this.on(eventName, handler, { once: true });
        },

        /**
         * 取消订阅
         * @param {string} eventName - 事件名称
         * @param {Function} handler - 事件处理器
         */
        off(eventName, handler) {
            const handlers = events.get(eventName);
            if (!handlers) return;

            const index = handlers.findIndex(h => h.handler === handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }

            if (handlers.length === 0) {
                events.delete(eventName);
            }
        },

        /**
         * 触发事件
         * @param {string} eventName - 事件名称
         * @param {*} data - 事件数据
         */
        emit(eventName, data) {
            const handlers = events.get(eventName);
            if (!handlers || handlers.length === 0) {
                return;
            }

            // 复制数组以避免在迭代时修改
            const handlersToCall = [...handlers];
            
            handlersToCall.forEach(({ handler, once }) => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`[EventBus] 事件处理器错误 (${eventName}):`, e);
                }
                
                if (once) {
                    this.off(eventName, handler);
                }
            });
        },

        /**
         * 获取事件订阅数量
         * @param {string} eventName - 事件名称
         * @returns {number}
         */
        listenerCount(eventName) {
            const handlers = events.get(eventName);
            return handlers ? handlers.length : 0;
        },

        /**
         * 清理所有事件
         */
        clear() {
            events.clear();
        }
    };
})();

// ============ 存储管理器 ============
const StorageManager = (function() {
    'use strict';

    const STORAGE_KEY = 'productManager';
    const CURRENT_VERSION = '1.0.0';
    const MAX_STORAGE_SIZE = 4000000; // 4MB

    // 版本迁移函数
    const MIGRATIONS = {
        '0.9.0': (data) => {
            // 0.9.0 -> 1.0.0 迁移
            return {
                ...data,
                version: '1.0.0',
                migratedAt: new Date().toISOString()
            };
        }
    };

    /**
     * 比较版本号
     * @param {string} v1 - 版本1
     * @param {string} v2 - 版本2
     * @returns {number} -1: v1<v2, 0: v1=v2, 1: v1>v2
     */
    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }
        return 0;
    }

    /**
     * 迁移数据
     * @param {Object} oldData - 旧数据
     * @param {string} fromVersion - 原版本
     * @returns {Object} 迁移后的数据
     */
    function migrateData(oldData, fromVersion) {
        let data = oldData;
        const versions = Object.keys(MIGRATIONS).sort();
        
        for (const v of versions) {
            if (compareVersions(fromVersion, v) < 0) {
                // console.log(`[StorageManager] 执行迁移: ${fromVersion} -> ${v}`);
                data = MIGRATIONS[v](data);
            }
        }
        
        return data;
    }

    return {
        CURRENT_VERSION,

        /**
         * 保存数据
         * @param {string} key - 数据键
         * @param {*} data - 数据
         * @returns {boolean} 是否成功
         */
        save(key, data) {
            try {
                const wrapper = {
                    version: CURRENT_VERSION,
                    timestamp: Date.now(),
                    data: data
                };
                
                const serialized = JSON.stringify(wrapper);
                
                // 大小检查
                if (serialized.length > MAX_STORAGE_SIZE) {
                    console.error(`[StorageManager] 数据过大: ${serialized.length} bytes`);
                    return false;
                }
                
                localStorage.setItem(`${STORAGE_KEY}:${key}`, serialized);
                return true;
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.error('[StorageManager] 存储空间不足');
                } else {
                    console.error('[StorageManager] 保存失败:', e);
                }
                return false;
            }
        },

        /**
         * 加载数据
         * @param {string} key - 数据键
         * @param {*} defaultValue - 默认值
         * @returns {*} 数据
         */
        load(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(`${STORAGE_KEY}:${key}`);
                if (!raw) return defaultValue;
                
                const wrapper = JSON.parse(raw);
                
                // 版本检查
                if (wrapper.version !== CURRENT_VERSION) {
                    // console.log(`[StorageManager] 数据版本迁移: ${wrapper.version} -> ${CURRENT_VERSION}`);
                    wrapper.data = migrateData(wrapper.data, wrapper.version);
                }
                
                return wrapper.data;
            } catch (e) {
                console.error('[StorageManager] 加载失败:', e);
                return defaultValue;
            }
        },

        /**
         * 删除数据
         * @param {string} key - 数据键
         */
        remove(key) {
            localStorage.removeItem(`${STORAGE_KEY}:${key}`);
        },

        /**
         * 清理所有数据
         */
        clear() {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${STORAGE_KEY}:`)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        },

        /**
         * 获取存储使用情况
         * @returns {Object} { used, total, percentage }
         */
        getUsage() {
            let used = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${STORAGE_KEY}:`)) {
                    used += localStorage.getItem(key).length * 2; // UTF-16
                }
            }
            
            return {
                used,
                total: MAX_STORAGE_SIZE,
                percentage: Math.round((used / MAX_STORAGE_SIZE) * 100)
            };
        },

        /**
         * 检查是否有足够空间
         * @param {number} requiredBytes - 需要的字节数
         * @returns {boolean}
         */
        hasSpace(requiredBytes) {
            const usage = this.getUsage();
            return (usage.used + requiredBytes) <= usage.total;
        }
    };
})();

// ============ 资源管理器 ============
const ResourceManager = (function() {
    'use strict';

    const resources = new Map();

    return {
        /**
         * 注册资源
         * @param {string} id - 资源ID
         * @param {Function} disposer - 清理函数
         */
        register(id, disposer) {
            // 如果已存在，先清理旧的
            if (resources.has(id)) {
                this.dispose(id);
            }
            resources.set(id, disposer);
        },

        /**
         * 清理资源
         * @param {string} id - 资源ID
         */
        dispose(id) {
            const disposer = resources.get(id);
            if (disposer) {
                try {
                    disposer();
                } catch (e) {
                    console.error(`[ResourceManager] 清理资源失败 (${id}):`, e);
                }
                resources.delete(id);
            }
        },

        /**
         * 清理所有资源
         */
        disposeAll() {
            resources.forEach((disposer, id) => {
                try {
                    disposer();
                } catch (e) {
                    console.error(`[ResourceManager] 清理资源失败 (${id}):`, e);
                }
            });
            resources.clear();
        },

        /**
         * 获取资源数量
         * @returns {number}
         */
        count() {
            return resources.size;
        }
    };
})();

// ============ 防抖/节流工具 ============
const Utils = {
    /**
     * 防抖函数
     * @param {Function} fn - 目标函数
     * @param {number} delay - 延迟时间(ms)
     * @returns {Function}
     */
    debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * 节流函数
     * @param {Function} fn - 目标函数
     * @param {number} limit - 限制时间(ms)
     * @returns {Function}
     */
    throttle(fn, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string}
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * 生成唯一ID
     * @returns {string}
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    // console.log('[CoreInfrastructure] 核心基础设施已加载');
    // console.log('[CoreInfrastructure] 事件名称:', EventBus.EVENT_NAMES);
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    ResourceManager.disposeAll();
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppContainer,
        EventBus,
        StorageManager,
        ResourceManager,
        Utils
    };
}
