/**
 * CSS 生成产物校验脚本
 * 验证 alipay-mini-program.css 的构建质量
 *
 * 检查项：
 * 1. alipay-mini-program.css 是否存在且不为空
 * 2. 文件头是否包含【自动生成】标记
 * 3. 所有 --app-* CSS 变量引用是否在 common.css 中有定义
 * 4. 是否有残留的 rpx 单位（说明转换失败）
 * 5. 是否有未映射的硬编码颜色（说明 COLOR_MAP 可能不完整）
 *
 * 使用方法：node css/check-css-build.js
 */

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'alipay-mini-program.css');
const commonCssPath = path.join(__dirname, 'common.css');

// 已知且允许的硬编码颜色（渐变、H5覆盖中的特殊色等）
const ALLOWED_COLORS = new Set([
  '#1677FF', '#1F1F1F', '#5C5C5C', '#AAAAAA', '#C8C8C8', '#111111',
  '#FF8F1F', '#FF3141', '#00B578', '#FFF', '#FFFFFF', '#F5F5F5',
  '#E5E5E5', '#F0F0F0', '#FFF7E6', '#E6F4FF', '#FFF2F0', '#F0FFFA',
  '#D46B08', '#0958D9', '#CCCCCC',
  // H5 overrides 中的特殊保留色
  '#4D94FF', '#3D84EF', '#0D6EED',
]);

// 提取 common.css 中定义的 CSS 变量
function extractVars(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = new Set();
  const regex = /--app-[a-z0-9-]+(?=\s*:)/gi;
  let m;
  while ((m = regex.exec(content)) !== null) {
    vars.add(m[0]);
  }
  return vars;
}

// 提取文件中引用的 CSS 变量
function extractUsedVars(content) {
  const used = new Set();
  const regex = /var\((--app-[a-z0-9-]+)\)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    used.add(m[1]);
  }
  return used;
}

// 提取未映射的硬编码颜色（排除 rgba 等）
function extractHardcodedColors(content) {
  const colors = new Set();
  const regex = /#[0-9A-Fa-f]{3,8}\b/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    colors.add(m[0].toUpperCase());
  }
  return colors;
}

function main() {
  console.log('============================================================');
  console.log('CSS 生成产物校验报告');
  console.log('============================================================');
  console.log('');

  let hasError = false;
  let hasWarning = false;

  // 1. 文件存在且不为空
  if (!fs.existsSync(cssPath)) {
    console.error('[失败] alipay-mini-program.css 不存在');
    hasError = true;
  } else {
    const stats = fs.statSync(cssPath);
    if (stats.size === 0) {
      console.error('[失败] alipay-mini-program.css 为空文件');
      hasError = true;
    } else {
      console.log('[通过] 生成产物存在且不为空 (' + Math.round(stats.size / 1024) + 'KB)');
    }
  }

  if (hasError) {
    console.log('');
    console.log('============================================================');
    console.log('结果: 校验失败，请先运行 node css/build-h5-from-acss.js 生成产物');
    console.log('============================================================');
    process.exit(1);
  }

  const content = fs.readFileSync(cssPath, 'utf8');

  // 2. 文件头包含【自动生成】标记
  if (content.includes('【自动生成】')) {
    console.log('[通过] 文件头包含【自动生成】标记');
  } else {
    console.error('[失败] 文件头缺少【自动生成】标记');
    hasError = true;
  }

  // 3. 检查 rpx 残留（排除注释）
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const rpxMatches = noComments.match(/\d+rpx/g);
  if (rpxMatches) {
    const unique = [...new Set(rpxMatches)];
    console.error('[失败] 发现 ' + rpxMatches.length + ' 处 rpx 单位残留（应全部转换为 px）');
    console.error('       残留值:', unique.join(', '));
    hasError = true;
  } else {
    console.log('[通过] 无 rpx 单位残留');
  }

  // 4. 检查 CSS 变量引用是否都有定义
  if (!fs.existsSync(commonCssPath)) {
    console.warn('[跳过] common.css 不存在，无法检查变量定义');
    hasWarning = true;
  } else {
    const definedVars = extractVars(commonCssPath);
    const usedVars = extractUsedVars(content);
    const undefinedVars = [...usedVars].filter(v => !definedVars.has(v));
    if (undefinedVars.length > 0) {
      console.error('[失败] 引用了未在 common.css 中定义的 CSS 变量:');
      for (const v of undefinedVars) {
        console.error('       -', v);
      }
      hasError = true;
    } else {
      console.log('[通过] 所有 ' + usedVars.size + ' 个 --app-* 变量都在 common.css 中有定义');
    }
  }

  // 5. 检查未映射的硬编码颜色（警告级别，排除注释）
  const contentNoComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const hardcodedColors = extractHardcodedColors(contentNoComments);
  const unknownColors = [...hardcodedColors].filter(c => !ALLOWED_COLORS.has(c));
  if (unknownColors.length > 0) {
    console.warn('[警告] 发现未映射的硬编码颜色（请确认是否需要加入 COLOR_MAP）:');
    for (const c of unknownColors.slice(0, 10)) {
      console.warn('       -', c);
    }
    if (unknownColors.length > 10) {
      console.warn('       ... 还有 ' + (unknownColors.length - 10) + ' 个');
    }
    hasWarning = true;
  } else {
    console.log('[通过] 无未映射的硬编码颜色');
  }

  // 6. 额外检查：是否有未闭合的规则块
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    console.error('[失败] 花括号不匹配（开:' + openBraces + ' 闭:' + closeBraces + '）');
    hasError = true;
  } else {
    console.log('[通过] CSS 语法结构完整（花括号匹配）');
  }

  console.log('');
  console.log('============================================================');
  if (hasError) {
    console.log('结果: 校验失败，请修复上述错误后重新运行构建脚本');
    process.exit(1);
  } else if (hasWarning) {
    console.log('结果: 校验通过（有警告，建议检查）');
  } else {
    console.log('结果: 全部通过');
  }
  console.log('============================================================');
}

main();
