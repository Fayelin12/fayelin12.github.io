// 页面数据配置 - 版本管理结构
const versionData = {};

// 版本显示名称映射表：版本ID -> 显示信息
// 新增版本时在此配置名称，无需修改版本数据文件
const versionNameMap = {
    'v1.0.4': { label: 'V1.0.4', description: '当前线上版本' }
};

// 获取版本显示信息（优先从映射表读取，兼容旧数据）
function getVersionDisplayInfo(version) {
    if (versionNameMap[version]) {
        return {
            label: versionNameMap[version].label || version,
            description: versionNameMap[version].description || ''
        };
    }
    if (versionData[version]) {
        return {
            label: versionData[version].label || version,
            description: versionData[version].description || ''
        };
    }
    return { label: version, description: '' };
}

// 当前版本（默认显示，由版本文件加载后动态确定）
let currentVersion = null;

// 兼容旧代码，保留 pages 变量指向当前版本的 pages
let pages;

// 设备配置
const devices = {
    iphone14: { name: 'iPhone 14 Pro', width: 393, height: 852 },
    iphoneSE: { name: 'iPhone SE', width: 375, height: 667 },
    pixel7: { name: 'Pixel 7', width: 412, height: 915 }
};

// ============================================
// 删除版本补丁：从 localStorage 读取已删除版本列表并应用
// ============================================
(function applyDeletedVersionsPatch() {
    try {
        // 检查 localStorage 是否可用
        if (typeof localStorage === 'undefined') return;

        // 读取已删除版本列表
        const deletedVersionsRaw = localStorage.getItem('deletedVersions');
        if (!deletedVersionsRaw) return;

        let deletedVersions;
        try {
            deletedVersions = JSON.parse(deletedVersionsRaw);
        } catch (e) {
            console.error('[data.js] deletedVersions 数据损坏，清空之:', e);
            localStorage.removeItem('deletedVersions');
            return;
        }

        if (!Array.isArray(deletedVersions) || deletedVersions.length === 0) return;

        // 判断是否为线上版本
        function isOnlineVersionDesc(version) {
            const desc = (getVersionDisplayInfo(version).description || '').toLowerCase();
            return desc.includes('线上') || desc.includes('online') || desc.includes('当前');
        }

        let removedCount = 0;
        let needsCurrentVersionUpdate = false;

        for (const version of deletedVersions) {
            // 线上版本不能被删除
            if (isOnlineVersionDesc(version)) {
                // console.log('[data.js] 跳过删除线上版本:', version);
                continue;
            }

            if (versionData[version]) {
                delete versionData[version];
                removedCount++;
                if (typeof currentVersion !== 'undefined' && currentVersion === version) {
                    needsCurrentVersionUpdate = true;
                }
            }
        }

        // 如果当前版本被删除了，切换到剩余版本中合适的版本
        if (needsCurrentVersionUpdate || (typeof currentVersion !== 'undefined' && !versionData[currentVersion])) {
            const remainingVersions = Object.keys(versionData);
            if (remainingVersions.length > 0) {
                // 优先选择线上版本，否则选择最后一个版本
                const newVersion = remainingVersions.find(v => {
                    const desc = (getVersionDisplayInfo(v).description || '').toLowerCase();
                    return desc.includes('线上') || desc.includes('online') || desc.includes('当前');
                }) || remainingVersions[remainingVersions.length - 1];
                currentVersion = newVersion;
                if (typeof pages !== 'undefined' && versionData[newVersion]) {
                    pages = versionData[newVersion].pages;
                }
                // console.log('[data.js] currentVersion 已切换至:', newVersion);
            } else {
                if (typeof currentVersion !== 'undefined') currentVersion = null;
                if (typeof pages !== 'undefined') pages = [];
                // console.log('[data.js] 无剩余版本，currentVersion 已重置');
            }
        }

        if (removedCount > 0) {
            // console.log('[data.js] 已应用删除补丁，移除版本数:', removedCount, '剩余版本:', Object.keys(versionData));
        }
    } catch (error) {
        console.error('[data.js] 应用删除版本补丁失败:', error);
    }
})();

// ============================================
// 清除关联数据缓存：移除所有 pageAssociations_ 开头的 localStorage 数据
// ============================================
(function clearAssociationCache() {
    try {
        if (typeof localStorage === 'undefined') return;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pageAssociations_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            // console.log('[data.js] 已清除关联缓存:', key);
        });
        if (keysToRemove.length > 0) {
            // console.log('[data.js] 关联缓存清理完成，共清除', keysToRemove.length, '条');
        }
    } catch (error) {
        console.error('[data.js] 清除关联缓存失败:', error);
    }
})();

// 版本文件加载后，动态选择默认版本并设置 pages 引用
// 使用 setTimeout 确保所有同步加载的版本文件已执行完毕
setTimeout(() => {
    const available = Object.keys(versionData).filter(v => {
        const vd = versionData[v];
        return vd && vd.pages && Array.isArray(vd.pages) && vd.pages.length > 0;
    });
    if (available.length > 0) {
        const onlineVersion = available.find(v => {
            const desc = (getVersionDisplayInfo(v).description || '').toLowerCase();
            return desc.includes('线上') || desc.includes('online') || desc.includes('当前');
        });
        currentVersion = onlineVersion || available[available.length - 1];
        pages = versionData[currentVersion].pages;
        // console.log('[data.js] 动态初始化版本:', currentVersion);
    }
}, 0);
