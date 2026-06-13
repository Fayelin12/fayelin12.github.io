/**
 * CSS 统一源构建脚本
 * 以 miniprogram-base.acss 为唯一源码，生成 H5 版本 alipay-mini-program.css
 *
 * 转换规则：
 * 1. rpx → px（÷2）
 * 2. 硬编码颜色 → CSS 变量（按属性上下文智能映射）
 * 3. H5 特有增强通过 css/h5-overrides.css 追加
 *
 * 使用方法：node css/build-h5-from-acss.js
 */

const fs = require('fs');
const path = require('path');

// ---- 颜色映射：硬编码色值 → CSS 变量 ----
const COLOR_MAP = {
  '#1677FF': 'var(--app-primary)',
  '#1F1F1F': 'var(--app-text)',
  '#5C5C5C': 'var(--app-text-secondary)',
  '#AAAAAA': 'var(--app-text-tertiary)',
  '#C8C8C8': 'var(--app-text-placeholder)',
  '#111111': 'var(--app-text-title)',
  '#FF8F1F': 'var(--app-warning)',
  '#FF3141': 'var(--app-danger)',
  '#00B578': 'var(--app-success)',
  '#FFF': 'var(--app-white)',
  '#FFFFFF': 'var(--app-white)',
  '#F5F5F5': 'var(--app-bg-page)',
  '#E5E5E5': 'var(--app-border)',
  '#F0F0F0': 'var(--app-border-light)',
  '#FFF7E6': 'var(--app-warning-light)',
  '#E6F4FF': 'var(--app-primary-light)',
  '#FFF2F0': 'var(--app-danger-light)',
  '#F0FFFA': 'var(--app-success-light)',
  '#D46B08': 'var(--app-warning-text)',
  '#0958D9': 'var(--app-info-text)',
  '#CCCCCC': 'var(--app-border)',
};

// ---- 尺寸映射：属性名 + 原始值 → CSS 变量或 px ----
const SIZE_TOKEN_MAP = {
  'margin-top': { '8rpx': 'var(--app-space-xs)', '16rpx': 'var(--app-space-sm)', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)', '48rpx': 'var(--app-space-xl)' },
  'margin-bottom': { '8rpx': 'var(--app-space-xs)', '16rpx': 'var(--app-space-sm)', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)', '48rpx': 'var(--app-space-xl)' },
  'margin-left': { '8rpx': 'var(--app-space-xs)', '16rpx': 'var(--app-space-sm)', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)' },
  'margin-right': { '8rpx': 'var(--app-space-xs)', '16rpx': 'var(--app-space-sm)', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)' },
  'padding': { '0': '0', '8rpx': 'var(--app-space-xs)', '16rpx': 'var(--app-space-sm)', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)', '48rpx': 'var(--app-space-xl)' },
  'padding-top': { '32rpx': 'var(--app-space-lg)' },
  'padding-bottom': { '32rpx': 'var(--app-space-lg)', '96rpx': '48px' },
  'padding-left': { '0': '0', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)', '48rpx': 'var(--app-space-xl)' },
  'padding-right': { '0': '0', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)', '48rpx': 'var(--app-space-xl)' },
  'gap': { '0': '0', '8rpx': 'var(--app-space-xs)', '16rpx': 'var(--app-space-sm)', '24rpx': 'var(--app-space-md)', '32rpx': 'var(--app-space-lg)' },
  'height': { 'auto': 'auto', '100%': '100%', '88rpx': '44px', '96rpx': '48px' },
  'width': { '100%': '100%' },
  'min-width': { '56rpx': '28px' },
  'min-height': { '96rpx': '48px' },
  'font-size': { '20rpx': 'var(--app-font-xs)', '24rpx': 'var(--app-font-sm)', '28rpx': 'var(--app-font-md)', '32rpx': 'var(--app-font-lg)' },
  'letter-spacing': { '-0.02rpx': '-0.01em' },
  'border-radius': { '0': '0', '4rpx': 'var(--app-radius-sm)', '8rpx': 'var(--app-radius-sm)', '16rpx': 'var(--app-radius-md)', '24rpx': 'var(--app-radius-lg)', '50%': '50%' },
  'border-top': { 'none': 'none', '2rpx': '1px' },
  'border-bottom': { 'none': 'none', '2rpx': '1px', '3rpx': '1.5px' },
  'border-left': { 'none': 'none', '4rpx': '2px' },
  'border': { 'none': 'none', '2rpx': '1px', '3rpx': '1.5px', '4rpx': '2px' },
  'box-shadow': { 'none': 'none', '0 2rpx 6rpx': '0 1px 3px', '0 4rpx 16rpx': '0 2px 8px', '0 8rpx 24rpx': '0 4px 12px' },
  'outline': { 'none': 'none' },
};

// ---- 全局 rpx → px 回退 ----
function convertRpxToPx(value) {
  return value.replace(/(\d+(?:\.\d+)?)rpx/g, (match, num) => {
    const n = parseFloat(num);
    return `${n / 2}px`;
  });
}

// ---- 颜色替换 ----
function replaceColors(decl) {
  let result = decl;
  // 按颜色值长度降序排列，避免短值（如 #FFF）先替换导致长值（如 #FFFFFF）残留
  const entries = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [color, variable] of entries) {
    const re = new RegExp(color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(re, variable);
  }
  return result;
}

// ---- 按属性上下文转换声明 ----
function transformDeclaration(prop, value) {
  // 1. 尝试精确映射（属性名 + 原始值）
  const propMap = SIZE_TOKEN_MAP[prop.toLowerCase()];
  if (propMap && propMap[value]) {
    return { prop, value: propMap[value] };
  }

  // 2. box-shadow 的特殊值替换（在通用转换前先做token映射）
  if (prop.toLowerCase() === 'box-shadow' && value !== 'none') {
    let newValue = value;
    const shadowMap = SIZE_TOKEN_MAP['box-shadow'] || {};
    for (const [orig, mapped] of Object.entries(shadowMap)) {
      if (orig !== 'none' && newValue.includes(orig)) {
        newValue = newValue.replace(orig, mapped);
      }
    }
    // 再处理剩余的rpx
    newValue = convertRpxToPx(newValue);
    newValue = replaceColors(newValue);
    return { prop, value: newValue };
  }

  // 3. 通用：rpx → px，然后颜色替换
  let newValue = convertRpxToPx(value);
  newValue = replaceColors(newValue);

  return { prop, value: newValue };
}

// ---- 解析 CSS（支持注释和嵌套规则）----
function parseCSS(source) {
  const tokens = [];
  let i = 0;
  const len = source.length;

  function skipWhitespace() {
    while (i < len && /\s/.test(source[i])) i++;
  }

  while (i < len) {
    skipWhitespace();
    if (i >= len) break;

    // 注释
    if (source[i] === '/' && i + 1 < len && source[i + 1] === '*') {
      let start = i;
      i += 2;
      while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      tokens.push({ type: 'comment', text: source.slice(start, i) });
      continue;
    }

    // 规则块
    let selectorStart = i;
    let inBlock = false;
    let depth = 0;

    while (i < len) {
      // 跳过块内的注释
      if (source[i] === '/' && i + 1 < len && source[i + 1] === '*') {
        i += 2;
        while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
        i += 2;
        continue;
      }

      if (!inBlock) {
        if (source[i] === '{') {
          inBlock = true;
          depth = 1;
          i++;
          continue;
        }
      } else {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
          depth--;
          if (depth === 0) {
            const selector = source.slice(selectorStart, source.indexOf('{', selectorStart)).trim();
            const declStart = source.indexOf('{', selectorStart) + 1;
            const declarations = source.slice(declStart, i).trim();
            tokens.push({ type: 'rule', selector, declarations });
            i++; // skip '}'
            break;
          }
        }
      }
      i++;
    }
  }

  return tokens;
}

// ---- 判断注释是否保留 ----
function shouldKeepComment(text) {
  // 保留分区注释（包含 ----）和设计说明注释
  if (/----/.test(text)) return true;
  if (/P[23]:/.test(text)) return true;
  return false;
}

// ---- 转换单个规则 ----
function transformRule(selector, declarations) {
  // @keyframes 特殊处理
  if (selector.startsWith('@keyframes')) {
    const innerRules = [];
    const regex = /([^{}]+)\{([^}]*)\}/g;
    let m;
    while ((m = regex.exec(declarations)) !== null) {
      const innerSel = m[1].trim();
      const innerDecls = m[2].trim();
      const transformed = innerDecls.split(';').map(d => {
        const trimmed = d.trim();
        if (!trimmed) return '';
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return trimmed;
        const prop = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        const t = transformDeclaration(prop, value);
        return `${t.prop}: ${t.value}`;
      }).filter(Boolean).join(';\n    ');
      innerRules.push(`  ${innerSel} {\n    ${transformed};\n  }`);
    }
    return `${selector} {\n${innerRules.join('\n')}\n}`;
  }

  // page 选择器特殊处理：跳过（H5中由 body 和 .am-page 分别承担）
  if (selector === 'page') {
    return null;
  }

  const decls = declarations.split(';').map(d => {
    const trimmed = d.trim();
    if (!trimmed) return null;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) return trimmed; // 不标准的行，原样保留
    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    const t = transformDeclaration(prop, value);
    return `${t.prop}: ${t.value}`;
  }).filter(Boolean);

  if (decls.length === 0) return null;

  return `${selector} {\n  ${decls.join(';\n  ')};\n}`;
}

// ---- 主流程 ----
const acssPath = path.join(__dirname, 'miniprogram-base.acss');
const overridesPath = path.join(__dirname, 'h5-overrides.css');
const outputPath = path.join(__dirname, 'alipay-mini-program.css');

if (!fs.existsSync(acssPath)) {
  console.error('[build-h5-from-acss] 源文件不存在:', acssPath);
  process.exit(1);
}

const acss = fs.readFileSync(acssPath, 'utf8');
const tokens = parseCSS(acss);

const result = [];
result.push('/* ============================================================');
result.push('   产品管理端 — H5 设计体系 (8px grid)');
result.push('   【自动生成】请勿直接编辑，修改 miniprogram-base.acss 后重新运行 node css/build-h5-from-acss.js');
result.push('   ============================================================ */');
result.push('');
result.push('/* ---- 基础 ---- */');
result.push('* { box-sizing: border-box; }');
result.push('body { margin: 0; font-family: var(--app-font); color: var(--app-text); }');
result.push('');

for (const token of tokens) {
  if (token.type === 'comment') {
    if (shouldKeepComment(token.text)) {
      result.push(token.text);
    }
  } else if (token.type === 'rule') {
    const transformed = transformRule(token.selector, token.declarations);
    if (transformed !== null) {
      result.push(transformed);
    }
  }
}

// 追加 H5 特有覆盖
let overrides = '';
if (fs.existsSync(overridesPath)) {
  overrides = fs.readFileSync(overridesPath, 'utf8').trim();
  if (overrides) {
    result.push('');
    result.push(overrides);
  }
}

const finalOutput = result.join('\n') + '\n';
fs.writeFileSync(outputPath, finalOutput, 'utf8');

console.log('[build-h5-from-acss] 生成完成');
console.log('  源文件:', acssPath);
console.log('  覆盖文件:', overridesPath);
console.log('  输出文件:', outputPath);
console.log('  输出大小:', Math.round(finalOutput.length / 1024) + 'KB');
console.log('');
console.log('提示: h5-overrides.css 仅保留 H5 预览框架样式和不影响保真度的基础修正');
console.log('      所有小程序不支持/表现不一致的视觉增强（transition、hover、复杂:active等）已移除');
