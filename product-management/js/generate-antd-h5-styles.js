/**
 * antd-mini 样式提取器
 *
 * 从 miniprogram-output/node_modules/antd-mini/es/ 中提取所有组件的真实 CSS，
 * 自动转换为 H5 可用的 CSS 文件。保证 H5 预览与 IDE 渲染完全一致。
 *
 * 用法: node js/generate-antd-h5-styles.js
 * 输出: css/antd-mini-h5.css
 *
 * 每次 antd-mini 版本升级后重新运行此脚本即可。
 */

var fs = require('fs');
var path = require('path');

var ANT_DIST = path.resolve(__dirname, '..', 'miniprogram-output', 'node_modules', 'antd-mini', 'es');
var OUTPUT = path.resolve(__dirname, '..', 'css', 'antd-mini-h5.css');

if (!fs.existsSync(ANT_DIST)) {
  console.error('antd-mini 未安装，请先在 miniprogram-output 中执行 npm install');
  process.exit(1);
}

// ---- 组件类名映射：antd-mini 内部类名 → H5 规范类名 ----
// 格式: { '内部选择器片段（不含组件前缀）': 'H5 类名后缀' }
// 例如 .ant-button-primary → .am-button--primary
var VARIANT_MAP = {
  'primary': '--primary',
  'default': '--default',
  'text': '--text',
  'danger': '--danger',
  'warning': '--warning',
  'success': '--success',
  'info': '--info',
  'large': '--lg',
  'medium': '--md',
  'small': '--sm',
  'active': '--active',
  'disabled': '--disabled',
  'inline': '--inline',
  'block': '--block',
  'checked': '--checked',
  'readonly': '--readonly',
};

// ---- 工具函数 ----

/** rpx → px: 750rpx = 375px  → 2rpx = 1px */
function rpxToPx(value) {
  return value.replace(/(\d+)rpx/g, function (_, num) {
    return (parseInt(num) / 2) + 'px';
  });
}

/** 组件目录名 → H5 类名前缀 */
function dirToPrefix(dirName) {
  // Calendar → calendar, DatePicker → date-picker
  return dirName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

// ---- 主流程 ----

var allRules = [];

// 递归收集所有组件（含子组件如 List/ListItem、Form/FormItem 等）
var componentDirs = [];
function collectDirs(dir, parentName) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(function (d) {
    if (!d.isDirectory()) return;
    if (d.name === '_util' || d.name === 'mixins' || d.name === 'node_modules') return;
    var fullPath = path.join(dir, d.name);
    if (fs.existsSync(path.join(fullPath, 'index.acss'))) {
      componentDirs.push({ name: d.name, parent: parentName, fullPath: fullPath });
    }
    collectDirs(fullPath, d.name);  // 递归子目录
  });
}
collectDirs(ANT_DIST, '');

componentDirs.forEach(function (comp) {
  var css = fs.readFileSync(path.join(comp.fullPath, 'index.acss'), 'utf8');
  var compName = comp.parent ? comp.name : comp.name;  // 子组件用自身名称（如 ListItem → list-item）
  var h5Prefix = dirToPrefix(compName);
  var tagName = 'ant-' + h5Prefix;  // ant-button, ant-input, etc.
  var amPrefix = 'am-' + h5Prefix;   // am-button, am-input, etc.

  // 将 antd-mini 的内部类名转换为 H5 规范类名
  var baseClass = '.ant-' + h5Prefix;
  var amBaseClass = '.' + amPrefix;
  var processed = css;

  // 1. 先处理多段变体（必须在基类替换之前）
  //    .ant-button-primary-danger → .am-button--primary-danger
  var multiVariants = ['primary-danger', 'default-danger', 'text-danger'];
  multiVariants.forEach(function (mv) {
    var mvClass = baseClass + '-' + mv;
    var amMvClass = amBaseClass + '--' + mv;
    var mvRegex = new RegExp(mvClass.replace(/\./g, '\\.') + '(?![\\w-])', 'g');
    processed = processed.replace(mvRegex, amMvClass);
  });

  // 2. 单段变体: .ant-button-primary → .am-button--primary
  Object.keys(VARIANT_MAP).forEach(function (variant) {
    var variantClass = baseClass + '-' + variant;
    var amVariantClass = amBaseClass + VARIANT_MAP[variant];
    var regex = new RegExp(variantClass.replace(/\./g, '\\.') + '(?![\\w-])', 'g');
    processed = processed.replace(regex, amVariantClass);
  });

  // 3. 基类: .ant-button → .am-button
  //    内部子类: .ant-button-wrap → .am-button__wrap
  processed = processed
    .split(baseClass + '-').join(amBaseClass + '__')
    .split(baseClass).join(amBaseClass);

  // 4. rpx → px
  processed = rpxToPx(processed);

  if (processed.trim()) {
    allRules.push('/* === ' + compName + ' === */');
    allRules.push(processed.trim());
  }
});

// ---- 补充：antd-mini 全局工具类 ----
// 这些是 antd-mini 内部使用的公共类，不归特定组件
var utilCss = '';
var utilDir = path.join(ANT_DIST, '_util');
if (fs.existsSync(utilDir)) {
  var utilFiles = fs.readdirSync(utilDir).filter(function (f) { return f.endsWith('.acss') || f.endsWith('.css'); });
  utilFiles.forEach(function (f) {
    var content = rpxToPx(fs.readFileSync(path.join(utilDir, f), 'utf8'));
    if (content.trim()) {
      utilCss += '/* === _util/' + f + ' === */\n' + content.trim() + '\n';
    }
  });
}

// ---- 输出 ----
var output = [
  '/*',
  ' * antd-mini H5 样式 — 自动生成',
  ' * 来源: antd-mini v' + JSON.parse(fs.readFileSync(path.join(ANT_DIST, '..', 'package.json'), 'utf8')).version,
  ' * 生成: ' + new Date().toISOString(),
  ' * 用法: <link rel="stylesheet" href="css/antd-mini-h5.css">',
  ' * 更新: node js/generate-antd-h5-styles.js',
  ' */',
  '',
  allRules.join('\n\n'),
  '',
  utilCss,
].join('\n');

fs.writeFileSync(OUTPUT, output, 'utf8');
console.log('[generate] 已生成:', OUTPUT);
console.log('[generate] 组件数:', componentDirs.length);
console.log('[generate] 文件大小:', (fs.statSync(OUTPUT).size / 1024).toFixed(1) + 'KB');
