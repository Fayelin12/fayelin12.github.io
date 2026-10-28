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
    },

    /**
     * 防抖保存 — 避免频繁触发全量 JSON 序列化和 localStorage 写入
     * @param {string} key - 存储键
     * @param {Function|*} getData - 获取最新数据的函数（推荐）或直接传数据对象
     * @param {number} delay - 防抖延迟（毫秒）
     */
    saveDebounced(key, getData, delay) {
        delay = delay || LIFE_RPG_CONFIG.DEBOUNCE_DELAY;
        if (!this._debounceTimers) this._debounceTimers = {};
        if (!this._pendingGetters) this._pendingGetters = {};

        if (this._debounceTimers[key]) {
            clearTimeout(this._debounceTimers[key]);
        }
        this._pendingGetters[key] = getData;
        this._debounceTimers[key] = setTimeout(() => {
            const data = typeof getData === 'function' ? getData() : getData;
            this.save(key, data);
            delete this._debounceTimers[key];
            delete this._pendingGetters[key];
        }, delay);
    },

    /**
     * 立即刷新所有防抖待保存的数据（页面卸载前调用）
     */
    flush() {
        if (!this._debounceTimers) return;
        for (const key in this._debounceTimers) {
            clearTimeout(this._debounceTimers[key]);
            const getData = this._pendingGetters && this._pendingGetters[key];
            if (getData) {
                const data = typeof getData === 'function' ? getData() : getData;
                this.save(key, data);
            }
            delete this._debounceTimers[key];
            if (this._pendingGetters) delete this._pendingGetters[key];
        }
    }
};

// 页面卸载前自动刷新所有待保存数据
window.addEventListener('beforeunload', () => {
    StorageManager.flush();
});

// ==================== SQLite 数据库管理（基于 sql.js） ====================
const DBManager = {
    db: null,
    SQL: null,
    _ready: false,
    _persistTimer: null,
    _usingFallback: false,

    /** 安全转整数，避免 asm.js 的 datatype mismatch */
    _int: function(v) { var n = parseInt(v); return isNaN(n) ? 0 : n; },

    /**
     * 初始化数据库 — 加载 WASM、打开/创建 DB、执行自动迁移
     * 每个页面在 init() 时调用一次
     * 持久化策略：优先 OPFS，不可用时降级 localStorage base64
     */
    async init() {
        if (this._ready) return;

        try {
            this.SQL = await initSqlJs();

            // 尝试加载已有数据库（OPFS > localStorage）
            var dbData = null;
            try {
                var root = await navigator.storage.getDirectory();
                var fh = await root.getFileHandle('life-rpg.db', { create: false });
                var file = await fh.getFile();
                dbData = new Uint8Array(await file.arrayBuffer());
            } catch (e) {
                // OPFS 不可用或文件不存在，尝试 localStorage
                var b64 = null;
                try { b64 = localStorage.getItem('lifeRpgSqliteDb'); } catch (ignore) {}
                if (b64) {
                    try {
                        var binary = atob(b64);
                        dbData = new Uint8Array(binary.length);
                        for (var i = 0; i < binary.length; i++) dbData[i] = binary.charCodeAt(i);
                    } catch (ignore) {}
                }
            }

            this.db = new this.SQL.Database(dbData);
            this.db.run('PRAGMA journal_mode=WAL');
            this._initSchema();
            // 每次加载时清理历史遗留的重复数据
            this._dedupIfNeeded();
            await this._migrateIfNeeded();
            this._ready = true;
        } catch (e) {
            console.error('DBManager init failed, using fallback:', (e && e.message) || String(e));
            this._usingFallback = true;
            this._ready = true;
        }
    },

    /** 每次加载时清理重复数据 */
    _dedupIfNeeded() {
        try {
            this.db.run("DELETE FROM calendar_entries WHERE rowid NOT IN (SELECT MIN(rowid) FROM calendar_entries GROUP BY date, COALESCE(checkpoint_id,'___empty___'), COALESCE(description,''))");
            this.db.run("DELETE FROM checkpoint_completions WHERE rowid NOT IN (SELECT MIN(rowid) FROM checkpoint_completions GROUP BY checkpoint_id, date, COALESCE(entry_id,''))");
        } catch (e) {}
    },

    _initSchema() {
        this.db.run('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');
        this.db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL, icon TEXT, desc TEXT)');
        this.db.run('CREATE TABLE IF NOT EXISTS landmarks (id INTEGER PRIMARY KEY, name TEXT NOT NULL, icon TEXT, type TEXT, desc TEXT, boss TEXT)');
        this.db.run('CREATE TABLE IF NOT EXISTS quests (id INTEGER PRIMARY KEY, landmark_id INTEGER NOT NULL, name TEXT NOT NULL, type TEXT DEFAULT \'main\', reward_type TEXT, reward_amount INTEGER DEFAULT 0, desc TEXT)');
        this.db.run('CREATE TABLE IF NOT EXISTS levels (id INTEGER PRIMARY KEY, quest_id INTEGER NOT NULL, name TEXT NOT NULL, time INTEGER, checkpoints_json TEXT)');
        this.db.run('CREATE TABLE IF NOT EXISTS calendar_entries (id TEXT PRIMARY KEY, date TEXT NOT NULL, checkpoint_id TEXT, checkpoint_name TEXT, level_id INTEGER, quest_id INTEGER, landmark_name TEXT, description TEXT, completed INTEGER DEFAULT 0, created_at TEXT)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_cal_date ON calendar_entries(date)');
        this.db.run('CREATE TABLE IF NOT EXISTS checkpoint_completions (id INTEGER PRIMARY KEY AUTOINCREMENT, checkpoint_id TEXT NOT NULL, date TEXT NOT NULL, entry_id TEXT, archived INTEGER DEFAULT 0)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_comp_cp ON checkpoint_completions(checkpoint_id)');
    },

    /** 首次运行：从 localStorage JSON 自动迁移数据到 SQLite */
    async _migrateIfNeeded() {
        // 用 localStorage 标记是否已迁移
        var alreadyMigrated = false;
        try { alreadyMigrated = localStorage.getItem('lifeRpgMigrated') === '1'; } catch (ignore) {}

        // 如果已迁移但 DB 实际为空（之前持久化失败导致），清除标记重新迁移
        if (alreadyMigrated) {
            var check = this.db.exec('SELECT COUNT(*) as cnt FROM tags');
            var hasNoData = true;
            try { hasNoData = check[0].values[0][0] === 0; } catch (ignore) {}
            if (hasNoData) {
                try { localStorage.removeItem('lifeRpgMigrated'); } catch (ignore) {}
                alreadyMigrated = false;
            }
        }

        if (alreadyMigrated) return;

        var oldData = StorageManager.load(LIFE_RPG_CONFIG.STORAGE_KEY);
        if (!oldData) {
            try { localStorage.setItem('lifeRpgMigrated', '1'); } catch (ignore) {}
            return;
        }

        var self = this;
        function logStep(step) { console.log('[Migrate] Step:', step); }
        function safeRun(label, fn) {
            try { logStep(label); fn(); }
            catch (e) { console.error('[Migrate] FAIL at', label, ':', (e && e.message) || String(e)); throw e; }
        }

        this.db.run('BEGIN TRANSACTION');

        safeRun('tags', function() {
            if (!oldData.tags || !oldData.tags.length) return;
            var stmt = self.db.prepare('INSERT OR REPLACE INTO tags VALUES (?, ?, ?, ?)');
            for (var i = 0; i < oldData.tags.length; i++) {
                var t = oldData.tags[i];
                stmt.run([self._int(t.id), t.name || '', t.icon || '', t.desc || '']);
            }
            stmt.free();
        });

        safeRun('landmarks', function() {
            if (!oldData.landmarks || !oldData.landmarks.length) return;
            var stmt = self.db.prepare('INSERT OR REPLACE INTO landmarks VALUES (?, ?, ?, ?, ?, ?)');
            for (var i = 0; i < oldData.landmarks.length; i++) {
                var lm = oldData.landmarks[i];
                stmt.run([self._int(lm.id), lm.name || '', lm.icon || '', lm.type || '', lm.desc || '', lm.boss || '']);
            }
            stmt.free();
        });

        safeRun('landmarkQuests', function() {
            if (!oldData.landmarkQuests) return;
            var stmt = self.db.prepare('INSERT OR REPLACE INTO quests VALUES (?, ?, ?, ?, ?, ?, ?)');
            var lmIds = Object.keys(oldData.landmarkQuests);
            for (var i = 0; i < lmIds.length; i++) {
                var quests = oldData.landmarkQuests[lmIds[i]];
                if (!quests || !quests.length) continue;
                for (var j = 0; j < quests.length; j++) {
                    var q = quests[j];
                    stmt.run([self._int(q.id), self._int(lmIds[i]), q.name || '', q.type || 'main', q.rewardType || '', self._int(q.rewardAmount), q.desc || '']);
                }
            }
            stmt.free();
        });

        safeRun('questLevels', function() {
            if (!oldData.questLevels) return;
            var stmt = self.db.prepare('INSERT OR REPLACE INTO levels VALUES (?, ?, ?, ?, ?)');
            var qIds = Object.keys(oldData.questLevels);
            for (var i = 0; i < qIds.length; i++) {
                var level = oldData.questLevels[qIds[i]];
                if (!level) continue;
                // 兼容数组格式：部分数据中 questLevels[questId] 是数组
                if (Array.isArray(level)) level = level[0] || null;
                if (!level || !level.name) continue;
                stmt.run([self._int(level.id), self._int(qIds[i]), level.name, self._int(level.time), JSON.stringify(level.checkpoints || [])]);
            }
            stmt.free();
        });

        safeRun('calendarEntries', function() {
            if (!oldData.calendarEntries) return;
            var stmt = self.db.prepare('INSERT OR REPLACE INTO calendar_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            var dates = Object.keys(oldData.calendarEntries);
            for (var i = 0; i < dates.length; i++) {
                var entries = oldData.calendarEntries[dates[i]];
                if (!entries || !entries.length) continue;
                for (var j = 0; j < entries.length; j++) {
                    var e = entries[j];
                    stmt.run([e.id || '', dates[i], e.checkpointId || '', e.checkpointName || '', self._int(e.levelId), self._int(e.questId), e.landmarkName || '', e.description || '', e.completed ? 1 : 0, e.createdAt || e.created_at || '']);
                }
            }
            stmt.free();
        });

        safeRun('checkpointCompletions', function() {
            if (!oldData.checkpointCompletions) return;
            var stmt = self.db.prepare('INSERT OR REPLACE INTO checkpoint_completions (checkpoint_id, date, entry_id, archived) VALUES (?, ?, ?, ?)');
            var cpIds = Object.keys(oldData.checkpointCompletions);
            for (var i = 0; i < cpIds.length; i++) {
                var comps = oldData.checkpointCompletions[cpIds[i]];
                if (!comps || !comps.length) continue;
                for (var j = 0; j < comps.length; j++) {
                    var c = comps[j];
                    stmt.run([cpIds[i], c.date || '', c.entryId || '', c.archived ? 1 : 0]);
                }
            }
            stmt.free();
        });

        this.db.run("INSERT OR REPLACE INTO meta VALUES ('migrated', '1')");
        this.db.run('COMMIT');
        try { localStorage.setItem('lifeRpgMigrated', '1'); } catch (ignore) {}
        console.log('[Migrate] SUCCESS - data migrated to SQLite');
        await this._persistNow();
    },

    /** 从 SQLite 读取完整数据，返回与原 adminData 相同结构的对象 */
    load() {
        if (this._usingFallback) return null;
        if (!this._ready) throw new Error('DBManager not initialized');

        var result = { tags: [], landmarks: [], landmarkQuests: {}, questLevels: {}, calendarEntries: {}, checkpointCompletions: {} };

        var rows = this.db.exec('SELECT * FROM tags');
        if (rows.length > 0) {
            for (var i = 0; i < rows[0].values.length; i++) {
                var r = rows[0].values[i];
                result.tags.push({ id: r[0], name: r[1], icon: r[2], desc: r[3] });
            }
        }

        rows = this.db.exec('SELECT * FROM landmarks');
        if (rows.length > 0) {
            for (var i = 0; i < rows[0].values.length; i++) {
                var r = rows[0].values[i];
                result.landmarks.push({ id: r[0], name: r[1], icon: r[2], type: r[3], desc: r[4], boss: r[5] });
            }
        }

        rows = this.db.exec('SELECT * FROM quests ORDER BY id');
        if (rows.length > 0) {
            for (var i = 0; i < rows[0].values.length; i++) {
                var r = rows[0].values[i];
                var lmId = r[1];
                if (!result.landmarkQuests[lmId]) result.landmarkQuests[lmId] = [];
                result.landmarkQuests[lmId].push({ id: r[0], name: r[2], type: r[3], rewardType: r[4], rewardAmount: r[5], desc: r[6] });
            }
        }

        rows = this.db.exec('SELECT * FROM levels');
        if (rows.length > 0) {
            for (var i = 0; i < rows[0].values.length; i++) {
                var r = rows[0].values[i];
                // questLevels 值始终为数组，兼容原数据结构
                result.questLevels[r[1]] = [{ id: r[0], name: r[2], time: r[3], checkpoints: JSON.parse(r[4] || '[]') }];
            }
        }

        rows = this.db.exec('SELECT * FROM calendar_entries ORDER BY date');
        if (rows.length > 0) {
            for (var i = 0; i < rows[0].values.length; i++) {
                var r = rows[0].values[i];
                var date = r[1];
                if (!result.calendarEntries[date]) result.calendarEntries[date] = [];
                result.calendarEntries[date].push({ id: r[0], checkpointId: r[2], checkpointName: r[3], levelId: r[4], questId: r[5], landmarkName: r[6], description: r[7], completed: r[8] === 1, createdAt: r[9] });
            }
        }

        rows = this.db.exec('SELECT * FROM checkpoint_completions');
        if (rows.length > 0) {
            for (var i = 0; i < rows[0].values.length; i++) {
                var r = rows[0].values[i];
                var cpId = r[0];
                if (!result.checkpointCompletions[cpId]) result.checkpointCompletions[cpId] = [];
                result.checkpointCompletions[cpId].push({ date: r[1], entryId: r[2], archived: r[3] === 1 });
            }
        }

        return result;
    },

    /** 保存完整数据到 SQLite（事务内全量替换） */
    save(data) {
        if (this._usingFallback) return StorageManager.save(LIFE_RPG_CONFIG.STORAGE_KEY, data);
        if (!this._ready) return false;

        this.db.run('BEGIN TRANSACTION');

        this.db.run('DELETE FROM tags');
        if (data.tags) {
            var stmt = this.db.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)');
            for (var i = 0; i < data.tags.length; i++) {
                var t = data.tags[i];
                stmt.run([this._int(t.id), t.name, t.icon || '', t.desc || '']);
            }
            stmt.free();
        }

        this.db.run('DELETE FROM landmarks');
        if (data.landmarks) {
            var stmt = this.db.prepare('INSERT INTO landmarks VALUES (?, ?, ?, ?, ?, ?)');
            for (var i = 0; i < data.landmarks.length; i++) {
                var lm = data.landmarks[i];
                stmt.run([this._int(lm.id), lm.name, lm.icon || '', lm.type || '', lm.desc || '', lm.boss || '']);
            }
            stmt.free();
        }

        this.db.run('DELETE FROM quests');
        if (data.landmarkQuests) {
            var stmt = this.db.prepare('INSERT INTO quests VALUES (?, ?, ?, ?, ?, ?, ?)');
            var lmIds = Object.keys(data.landmarkQuests);
            for (var i = 0; i < lmIds.length; i++) {
                var quests = data.landmarkQuests[lmIds[i]];
                for (var j = 0; j < quests.length; j++) {
                    var q = quests[j];
                    stmt.run([this._int(q.id), this._int(lmIds[i]), q.name, q.type || 'main', q.rewardType || '', this._int(q.rewardAmount), q.desc || '']);
                }
            }
            stmt.free();
        }

        this.db.run('DELETE FROM levels');
        if (data.questLevels) {
            var stmt = this.db.prepare('INSERT INTO levels VALUES (?, ?, ?, ?, ?)');
            var qIds = Object.keys(data.questLevels);
            for (var i = 0; i < qIds.length; i++) {
                var level = data.questLevels[qIds[i]];
                if (!level) continue;
                if (Array.isArray(level)) level = level[0] || null;
                if (!level || !level.name) continue;
                stmt.run([this._int(level.id), this._int(qIds[i]), level.name, this._int(level.time), JSON.stringify(level.checkpoints || [])]);
            }
            stmt.free();
        }

        this.db.run('DELETE FROM calendar_entries');
        if (data.calendarEntries) {
            var stmt = this.db.prepare('INSERT INTO calendar_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            var dates = Object.keys(data.calendarEntries);
            for (var i = 0; i < dates.length; i++) {
                var entries = data.calendarEntries[dates[i]];
                for (var j = 0; j < entries.length; j++) {
                    var e = entries[j];
                    stmt.run([e.id || '', dates[i], e.checkpointId || '', e.checkpointName || '', this._int(e.levelId), this._int(e.questId), e.landmarkName || '', e.description || '', e.completed ? 1 : 0, e.createdAt || e.created_at || '']);
                }
            }
            stmt.free();
        }

        this.db.run('DELETE FROM checkpoint_completions');
        if (data.checkpointCompletions) {
            var stmt = this.db.prepare('INSERT INTO checkpoint_completions (checkpoint_id, date, entry_id, archived) VALUES (?, ?, ?, ?)');
            var cpIds = Object.keys(data.checkpointCompletions);
            for (var i = 0; i < cpIds.length; i++) {
                var comps = data.checkpointCompletions[cpIds[i]];
                for (var j = 0; j < comps.length; j++) {
                    var c = comps[j];
                    stmt.run([cpIds[i], c.date || '', c.entryId || '', c.archived ? 1 : 0]);
                }
            }
            stmt.free();
        }

        this.db.run('COMMIT');
        this._persistDebounced();
        return true;
    },

    /** 防抖保存 — 从 getter 取数据写入 SQLite，OPFS 持久化有独立防抖 */
    saveDebounced(getData, delay) {
        var data = typeof getData === 'function' ? getData() : getData;
        return this.save(data);
    },

    /** 持久化 DB：优先 OPFS，不可用时降级 localStorage base64 */
    async _persistNow() {
        if (!this.db) return;
        var data = this.db.export();
        var persisted = false;

        // 优先尝试 OPFS
        try {
            var root = await navigator.storage.getDirectory();
            var fh = await root.getFileHandle('life-rpg.db', { create: true });
            var writable = await fh.createWritable();
            await writable.write(data);
            await writable.close();
            persisted = true;
        } catch (e) {
            // OPFS 不可用（如 file://），不打印错误
        }

        // 始终存一份 localStorage base64 备份
        try {
            var b64 = '';
            for (var i = 0; i < data.length; i++) {
                b64 += String.fromCharCode(data[i]);
            }
            b64 = btoa(b64);
            if (b64.length < LIFE_RPG_CONFIG.MAX_STORAGE_SIZE) {
                localStorage.setItem('lifeRpgSqliteDb', b64);
            }
        } catch (e) {
            if (!persisted) console.error('DB persist failed entirely:', (e && e.message) || String(e));
        }
    },

    /** 延迟写入 OPFS，合并多次 save 为一次文件写入 */
    _persistDebounced() {
        if (this._persistTimer) clearTimeout(this._persistTimer);
        var self = this;
        this._persistTimer = setTimeout(function() {
            self._persistTimer = null;
            self._persistNow();
        }, LIFE_RPG_CONFIG.DEBOUNCE_DELAY);
    },

    /** 页面卸载前强制刷新 OPFS */
    flush() {
        if (this._persistTimer) {
            clearTimeout(this._persistTimer);
            this._persistTimer = null;
        }
        this._persistNow();
    },

    /** 获取数据库文件大小（字节） */
    getUsage() {
        if (!this.db) return 0;
        return this.db.export().length;
    },

    /** 关闭数据库连接 */
    close() {
        if (this.db) { this.db.close(); this.db = null; }
        this._ready = false;
    }
};

// 页面隐藏时自动持久化到 OPFS
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden' && DBManager._ready) {
        DBManager._persistNow();
    }
});
window.addEventListener('beforeunload', function() {
    if (DBManager._ready) DBManager._persistNow();
});

// ==================== 游戏数据管理 ====================
const GameDataManager = {
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
     * 异步加载游戏数据（优先 SQLite，失败回退 localStorage）
     */
    async load() {
        if (!DBManager._ready) {
            await DBManager.init();
        }
        if (!DBManager._usingFallback) {
            var saved = DBManager.load();
            if (saved) {
                return {
                    ...this.defaultData,
                    ...saved,
                    tags: saved.tags && saved.tags.length ? saved.tags : this.defaultData.tags,
                    landmarks: saved.landmarks && saved.landmarks.length ? saved.landmarks : this.defaultData.landmarks,
                    landmarkQuests: saved.landmarkQuests || this.defaultData.landmarkQuests
                };
            }
        }
        // 回退到 localStorage
        var saved = StorageManager.load(LIFE_RPG_CONFIG.STORAGE_KEY);
        if (!saved) return { ...this.defaultData };
        return {
            ...this.defaultData,
            ...saved,
            tags: saved.tags || this.defaultData.tags,
            landmarks: saved.landmarks || this.defaultData.landmarks,
            landmarkQuests: saved.landmarkQuests || this.defaultData.landmarkQuests
        };
    },

    /**
     * 保存游戏数据（优先 SQLite，失败回退 localStorage）
     */
    save(data) {
        DBManager.save(data);
        // 同时写一份 localStorage 备份（安全网）
        StorageManager.save(LIFE_RPG_CONFIG.STORAGE_KEY, data);
        return true;
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
        db: DBManager,
        data: GameDataManager,
        dom: DOMUtils,
        events: EventManager,
        constants: CONSTANTS
    };

    // 暴露到全局
    global.LifeRPG = LifeRPG;

})(window);