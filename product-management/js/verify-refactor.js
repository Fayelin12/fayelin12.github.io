/**
 * 重构验证脚本
 * 对比重构前后的渲染输出是否一致
 */

'use strict';

var fs = require('fs');
var path = require('path');

// Mock UIAdapter
function setupMock() {
  global.UIAdapter = {
    getDefault: function() {
      return {
        name: 'antd-mini',
        mode: 'npm',
        getComponentPath: function(relPath) {
          return '/node_modules/antd-mini/es/' + relPath.replace(/\//g, '') + '/index';
        },
        getDependencies: function() { return { 'antd-mini': '^2.x' }; },
        getProjectConfig: function() { return { miniprogramRoot: './', setting: {} }; },
        getInstallHint: function() { return '请运行: npm install antd-mini'; }
      };
    }
  };
}

function loadVersion(name, isBackup) {
  var dir = path.join(__dirname);
  var suffix = isBackup ? '.js.backup' : '.js';
  var files = {
    shared: 'shared-style-filter.js',
    registry: 'component-registry' + suffix,
    html: 'schema-to-html' + suffix,
    axml: 'schema-to-axml' + suffix,
  };

  setupMock();

  // 先清空全局变量避免冲突
  delete global.ComponentRegistry;
  delete global.SchemaToHtml;
  delete global.SchemaToAxml;
  delete global.SharedStyleFilter;

  eval(fs.readFileSync(path.join(dir, files.shared), 'utf8'));
  eval(fs.readFileSync(path.join(dir, files.registry), 'utf8'));
  eval(fs.readFileSync(path.join(dir, files.html), 'utf8'));
  eval(fs.readFileSync(path.join(dir, files.axml), 'utf8'));

  return {
    ComponentRegistry: global.ComponentRegistry,
    SchemaToHtml: global.SchemaToHtml,
    SchemaToAxml: global.SchemaToAxml
  };
}

// 测试 schema
var testSchema = {
  version: '1.0',
  page: {
    id: 'test',
    title: '验证页',
    children: [
      {
        type: 'steps',
        props: { current: 1, items: [{ title: '步骤1' }, { title: '步骤2' }, { title: '步骤3' }] }
      },
      {
        type: 'card',
        children: [
          { type: 'cardHeader', children: [{ type: 'cardTitle', children: '卡片标题' }, { type: 'cardExtra', children: '更多' }] },
          { type: 'cardBody', children: [{ type: 'text', children: '卡片内容' }] },
          { type: 'cardFooter', children: [{ type: 'text', children: '底部' }] }
        ]
      },
      {
        type: 'list',
        children: [
          { type: 'listHeader', children: '列表头部' },
          {
            type: 'listItem',
            children: [
              { type: 'listItemContent', children: [{ type: 'listItemTitle', children: '标题' }, { type: 'listItemBrief', children: '简介' }] },
              { type: 'listItemExtra', children: '附加' },
              { type: 'listItemArrow' }
            ]
          },
          { type: 'listFooter', children: '列表底部' }
        ]
      },
      { type: 'checkbox', props: { checked: true, label: '同意' } },
      { type: 'radio', props: { checked: false, label: '选项' } },
      { type: 'loading', props: { size: 'large', text: '加载中' } },
      { type: 'result', props: { status: 'success', title: '成功', description: '操作完成' } },
      { type: 'empty', props: { description: '暂无数据' } }
    ]
  }
};

function normalize(html) {
  // 标准化空白，方便比较
  return html.replace(/\n+/g, '\n').replace(/\s+$/gm, '');
}

function compare(label, before, after) {
  var b = normalize(before);
  var a = normalize(after);
  if (b === a) {
    console.log('  [一致] ' + label);
    return true;
  } else {
    console.log('  [不一致] ' + label);
    // 输出差异的前200字符
    console.log('    重构前: ' + JSON.stringify(b.substring(0, 200)));
    console.log('    重构后: ' + JSON.stringify(a.substring(0, 200)));
    return false;
  }
}

console.log('\n============================================================');
console.log('重构前后渲染输出对比');
console.log('============================================================\n');

var before = loadVersion('before', true);
var beforeHtml = before.SchemaToHtml.render(testSchema);
var beforeAxml = before.SchemaToAxml.compileAxml(testSchema);

var after = loadVersion('after', false);
var afterHtml = after.SchemaToHtml.render(testSchema);
var afterAxml = after.SchemaToAxml.compileAxml(testSchema);

var ok = true;
ok = compare('H5 整体输出', beforeHtml, afterHtml) && ok;
ok = compare('AXML 整体输出', beforeAxml, afterAxml) && ok;

// 单独组件对比
var components = [
  { type: 'steps', props: { current: 1, items: [{ title: 'A' }, { title: 'B' }] } },
  { type: 'listItem', children: [{ type: 'listItemContent', children: [{ type: 'listItemTitle', children: 'T' }] }] },
  { type: 'checkbox', props: { checked: true, label: 'L' } },
  { type: 'radio', props: { checked: false, label: 'R' } },
  { type: 'loading', props: { text: 'load' } },
  { type: 'result', props: { status: 'error', title: 'T', description: 'D' } },
  { type: 'empty', props: { description: 'empty' } }
];

console.log('\n各组件独立对比:');
components.forEach(function(comp) {
  var bHtml = before.SchemaToHtml.renderNode(comp);
  var aHtml = after.SchemaToHtml.renderNode(comp);
  ok = compare('H5 ' + comp.type, bHtml, aHtml) && ok;
});

components.forEach(function(comp) {
  var bAxml = before.SchemaToAxml.compileAxml({ page: { children: [comp] } });
  var aAxml = after.SchemaToAxml.compileAxml({ page: { children: [comp] } });
  ok = compare('AXML ' + comp.type, bAxml, aAxml) && ok;
});

console.log('\n============================================================');
console.log(ok ? '全部一致，重构成功' : '存在不一致，请检查');
console.log('============================================================\n');

process.exit(ok ? 0 : 1);
