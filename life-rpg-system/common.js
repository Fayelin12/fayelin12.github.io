/**
 * LIFE RPG 公共模块
 * 包含工具函数、数据管理、安全处理等
 */

// ==================== 安全配置 ====================
const LIFE_RPG_CONFIG = {
    STORAGE_KEY: 'lifeRpgAdminData', // 与原有数据兼容
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 300
};

// ==================== 安全工具 ====================
const SecurityUtils = {
    /**
     * HTML转义，防止XSS攻击
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * 验证输入是否安全
     */
    isSafeInput(input, maxLength = 100) {
        if (!input || typeof input !== 'string') return false;
        if (input.length > maxLength) return false;
        // 检查危险字符
        const dangerous = /<script|javascript:|on\w+=/i;
        return !dangerous.test(input);
    },

    /**
     * 净化对象中的所有字符串值
     */
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.escapeHtml(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
};

// ==================== 存储管理 ====================
const StorageManager = {
    /**
     * 保存数据到localStorage
     */
    save(key, data) {
        try {
            const serialized = JSON.stringify(data);
            // 检查存储空间
            if (serialized.length > LIFE_RPG_CONFIG.MAX_STORAGE_SIZE) {
                console.error('Storage quota exceeded');
                return false;
            }
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    },

    /**
     * 从localStorage加载数据
     */
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to load data:', error);
            return defaultValue;
        }
    },

    /**
     * 删除数据
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove data:', error);
            return false;
        }
    },

    /**
     * 获取已使用存储空间
     */
    getUsage() {
        let total = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2; // UTF-16
            }
        }
        return total;
    }
};

// ==================== 游戏数据管理 ====================
const GameDataManager = {
    // 默认数据结构
    defaultData: {
        tags: [
            { id: 1, name: '城堡', icon: '🏰', desc: '古老的防御工事' },
            { id: 2, name: '洞窟', icon: '🕳️', desc: '地下洞穴' },
            { id: 3, name: '废墟', icon: '🗿', desc: '城市遗迹' },
            { id: 4, name: '魔法学院', icon: '🔮', desc: '魔法师学习之地' },
            { id: 5, name: '森林', icon: '🌲', desc: '茂密的树林' },
            { id: 6, name: '山脉', icon: '⛰️', desc: '高耸入云的山峰' }
        ],
        landmarks: [
            { id: 1, name: '史东薇尔城', icon: '🏰', type: '城堡', desc: '被战争摧毁的古老城堡', boss: '接肢贵族' },
            { id: 2, name: '摩恩城', icon: '🗿', type: '废墟', desc: '曾经繁荣的城市', boss: '狮子混种' },
            { id: 3, name: '求学洞窟', icon: '🕳️', type: '洞窟', desc: '魔法师修行之地', boss: '魔像守卫' },
            { id: 4, name: '雷亚卢卡利亚', icon: '🔮', type: '魔法学院', desc: '辉石魔法师的最高学府', boss: '满月女王' },
            { id: 5, name: '希芙拉河', icon: '🕳️', type: '洞窟', desc: '地下河流', boss: '祖灵' },
            { id: 6, name: '盖利德要塞', icon: '🏰', type: '城堡', desc: '被猩红腐败侵蚀的堡垒', boss: '熔炉骑士' }
        ],
        landmarkQuests: {
            1: [
                { id: 101, name: '探索城堡外围', type: 'main', rewardType: 'exp', rewardAmount: 100, desc: '初步探索区域' },
                { id: 102, name: '寻找隐藏的密室', type: 'side', rewardType: 'fragment', rewardAmount: 1, desc: '发现秘密区域' }
            ],
            2: [
                { id: 201, name: '调查废墟', type: 'main', rewardType: 'exp', rewardAmount: 150, desc: '探索废弃区域' }
            ]
        },
        questLevels: {},
        calendarEntries: {},
        checkpointCompletions: {}
    },

    /**
     * 加载游戏数据
     */
    load() {
        const saved = StorageManager.load(LIFE_RPG_CONFIG.STORAGE_KEY);
        if (!saved) return { ...this.defaultData };

        // 合并默认数据，确保新字段存在
        return {
            ...this.defaultData,
            ...saved,
            tags: saved.tags || this.defaultData.tags,
            landmarks: saved.landmarks || this.defaultData.landmarks,
            landmarkQuests: saved.landmarkQuests || this.defaultData.landmarkQuests
        };
    },

    /**
     * 保存游戏数据
     */
    save(data) {
        return StorageManager.save(LIFE_RPG_CONFIG.STORAGE_KEY, data);
    },

    /**
     * 重置为默认数据
     */
    reset() {
        this.save(this.defaultData);
        return { ...this.defaultData };
    }
};

// ==================== DOM工具 ====================
const DOMUtils = {
    /**
     * 防抖函数
     */
    debounce(func, wait = LIFE_RPG_CONFIG.DEBOUNCE_DELAY) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 安全地设置innerHTML
     */
    safeSetHTML(element, html) {
        if (!element) return;
        element.innerHTML = SecurityUtils.escapeHtml(html);
    },

    /**
     * 创建带转义的文本节点
     */
    createSafeText(text) {
        return document.createTextNode(text);
    }
};

// ==================== 事件管理器（防止内存泄漏） ====================
const EventManager = {
    listeners: new Map(),

    /**
     * 添加事件监听
     */
    add(element, event, handler, options = {}) {
        if (!element || !event || !handler) return;

        element.addEventListener(event, handler, options);

        const key = element;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push({ event, handler, options });
    },

    /**
     * 移除元素的所有事件监听
     */
    removeAll(element) {
        if (!this.listeners.has(element)) return;

        const handlers = this.listeners.get(element);
        handlers.forEach(({ event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.listeners.delete(element);
    },

    /**
     * 清理所有监听
     */
    clear() {
        this.listeners.forEach((handlers, element) => {
            handlers.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.listeners.clear();
    }
};

// ==================== 常量定义 ====================
const CONSTANTS = {
    // 任务类型
    QUEST_TYPES: {
        main: { label: '主线', icon: '⚔️', color: '#c9a227' },
        side: { label: '支线', icon: '📋', color: '#7b68ee' },
        daily: { label: '日常', icon: '🌅', color: '#4a7c59' },
        challenge: { label: '挑战', icon: '💀', color: '#d4634e' }
    },

    // 奖励类型
    REWARD_TYPES: {
        exp: { label: '经验', icon: '✨' },
        fragment: { label: '碎片', icon: '🧩' },
        gold: { label: '金币', icon: '💰' },
        item: { label: '物品', icon: '🎁' }
    },

    // 图标选项
    ICONS: ['🏰', '🕳️', '🗿', '🔮', '🌲', '⛰️', '🏔️', '🏛️', '⚔️', '🌊', '🌋', '🏜️', '🌌', '⚡', '❄️'],

    // 月份名称
    MONTH_NAMES: ['一月', '二月', '三月', '四月', '五月', '六月',
                  '七月', '八月', '九月', '十月', '十一月', '十二月'],

    // 星期名称 (周一到周日，方便周末隐藏处理)
    WEEKDAYS: ['一', '二', '三', '四', '五', '六', '日'],

    // 日历网格天数
    CALENDAR_GRID_DAYS: 42
};

// ==================== 导出模块 ====================
// 使用 IIFE 避免全局污染
(function(global) {
    'use strict';

    const LifeRPG = {
        config: LIFE_RPG_CONFIG,
        security: SecurityUtils,
        storage: StorageManager,
        data: GameDataManager,
        dom: DOMUtils,
        events: EventManager,
        constants: CONSTANTS
    };

    // 暴露到全局
    global.LifeRPG = LifeRPG;

})(window);