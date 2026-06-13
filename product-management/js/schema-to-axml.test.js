/**
 * schema-to-axml 单元测试（独立文件）
 * 运行: node js/schema-to-axml.test.js
 */

(function () {
  'use strict';

  // Node.js 环境需要先加载依赖
  if (typeof require !== 'undefined') {
    var path = require('path');
    var fs = require('fs');

    // 加载适配器
    var adapterCode = fs.readFileSync(path.join(__dirname, 'ui-library-adapter.js'), 'utf8');
    eval(adapterCode);

    // 加载共享样式过滤器（schema-to-axml.js 依赖）
    var filterCode = fs.readFileSync(path.join(__dirname, 'shared-style-filter.js'), 'utf8');
    eval(filterCode);
    global.SharedStyleFilter = global.SharedStyleFilter;

    // 加载组件注册表（schema-to-axml.js 依赖）
    var registryCode = fs.readFileSync(path.join(__dirname, 'component-registry.js'), 'utf8');
    eval(registryCode);

    // 加载编译器
    var compilerCode = fs.readFileSync(path.join(__dirname, 'schema-to-axml.js'), 'utf8');
    eval(compilerCode);
  }

  var SchemaToAxml = global.SchemaToAxml || window.SchemaToAxml;
  if (!SchemaToAxml) {
    console.error('SchemaToAxml 未加载');
    process.exit(1);
  }

  console.group('[SchemaToAxml] 单元测试');
  var passed = 0;
  var failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log('  \u2713 ' + message);
    } else {
      failed++;
      console.error('  \u2717 ' + message);
    }
  }

  // 测试 1：按钮编译
  try {
    var schema = {
      version: '1.0',
      page: {
        id: 'test', title: '\u6D4B\u8BD5',
        children: [
          { type: 'button', props: { type: 'primary' }, children: '\u63D0\u4EA4' }
        ]
      }
    };
    var r1 = SchemaToAxml.compile(schema);
    assert(r1.axml.indexOf('<ant-button') !== -1, '\u6309\u94AE\u7F16\u8BD1\u4E3A ant-button');
    assert(r1.axml.indexOf('type="primary"') !== -1, '\u6309\u94AE type \u5C5E\u6027\u6B63\u786E');
    assert(r1.axml.indexOf('\u63D0\u4EA4') !== -1, '\u6309\u94AE\u6587\u672C\u4FDD\u7559');
  } catch (e) {
    assert(false, '\u6309\u94AE\u7F16\u8BD1\u5931\u8D25: ' + e.message);
  }

  // 测试 2：步骤条编译
  try {
    var schema = {
      version: '1.0',
      page: {
        id: 'test', title: '\u6D4B\u8BD5',
        children: [{
          type: 'steps',
          props: { current: 0, items: [{ title: '\u6B65\u9AA41' }, { title: '\u6B65\u9AA42' }] }
        }]
      }
    };
    var r2 = SchemaToAxml.compile(schema);
    assert(r2.axml.indexOf('<view class="am-steps"') !== -1, '\u6B65\u9AA4\u6761\u7F16\u8BD1\u4E3A view.am-steps');
    assert(r2.axml.indexOf('am-step__badge') !== -1, '\u6B65\u9AA4\u6761\u5305\u542B\u6570\u5B57\u56FE\u6807');
    assert(r2.axml.indexOf('>1<') !== -1, '\u7B2C\u4E00\u6B65\u663E\u793A 01');
  } catch (e) {
    assert(false, '\u6B65\u9AA4\u6761\u7F16\u8BD1\u5931\u8D25: ' + e.message);
  }

  // 测试 3：卡片编译（antd-mini 无 Card，原生 view 模拟）
  try {
    var schema = {
      version: '1.0',
      page: {
        id: 'test', title: '\u6D4B\u8BD5',
        children: [{
          type: 'card',
          children: [
            { type: 'cardHeader', children: [{ type: 'cardTitle', children: '\u6807\u9898' }] },
            { type: 'cardBody', children: [{ type: 'text', children: '\u5185\u5BB9' }] }
          ]
        }]
      }
    };
    var r3 = SchemaToAxml.compile(schema);
    assert(r3.axml.indexOf('<view class="am-card"') !== -1, '\u5361\u7247\u7F16\u8BD1\u4E3A view.am-card');
    assert(r3.axml.indexOf('<text class="am-card__title">\u6807\u9898</text>') !== -1, '\u5361\u7247 title \u63D0\u53D6\u4E3A\u539F\u751F\u6807\u7B7E');
    assert(r3.axml.indexOf('<view class="am-card__body"') !== -1, '\u5361\u7247 body \u4F7F\u7528\u539F\u751F view');
  } catch (e) {
    assert(false, '\u5361\u7247\u7F16\u8BD1\u5931\u8D25: ' + e.message);
  }

  // 测试 4：事件编译
  try {
    var schema = {
      version: '1.0',
      page: {
        id: 'test', title: '\u6D4B\u8BD5',
        children: [
          { type: 'button', props: { type: 'primary' }, events: { onTap: 'handleSubmit' }, children: '\u63D0\u4EA4' }
        ]
      }
    };
    var r4 = SchemaToAxml.compile(schema);
    assert(r4.axml.indexOf('onTap="handleSubmit"') !== -1, 'onTap \u7F16\u8BD1\u4E3A AXML \u4E8B\u4EF6');
    assert(r4.js.indexOf('handleSubmit(e)') !== -1, 'JS \u4E2D\u5305\u542B\u4E8B\u4EF6\u5904\u7406\u51FD\u6570');
  } catch (e) {
    assert(false, '\u4E8B\u4EF6\u7F16\u8BD1\u5931\u8D25: ' + e.message);
  }

  // 测试 5：ACSS 生成
  try {
    var schema = { version: '1.0', page: { id: 'test', title: '\u6D4B\u8BD5', children: [] } };
    var r5 = SchemaToAxml.compile(schema);
    assert(r5.acss.indexOf('.am-button') !== -1, 'ACSS \u5305\u542B\u6309\u94AE\u6837\u5F0F');
    assert(r5.acss.indexOf('88rpx') !== -1, 'ACSS \u4F7F\u7528 rpx \u5355\u4F4D');
    assert(r5.acss.indexOf('.am-steps') !== -1, 'ACSS \u5305\u542B\u6B65\u9AA4\u6761\u6837\u5F0F');
  } catch (e) {
    assert(false, 'ACSS \u751F\u6210\u5931\u8D25: ' + e.message);
  }

  // 测试 6：列表项扁平化（含 npm 路径验证）
  try {
    var schema = {
      version: '1.0',
      page: {
        id: 'test', title: '\u6D4B\u8BD5',
        children: [{
          type: 'list',
          children: [{
            type: 'listItem',
            children: [
              { type: 'listItemContent', children: [{ type: 'listItemTitle', children: '\u6807\u9898' }] },
              { type: 'listItemExtra', children: '\u9644\u52A0' },
              { type: 'listItemArrow' }
            ]
          }]
        }]
      }
    };
    var r6 = SchemaToAxml.compile(schema);
    assert(r6.axml.indexOf('<ant-list-item') !== -1, '\u5217\u8868\u9879\u7F16\u8BD1\u4E3A ant-list-item');
    assert(r6.axml.indexOf('title="\u6807\u9898"') !== -1, '\u5217\u8868\u9879 title \u5C5E\u6027\u63D0\u53D6\u6B63\u786E');
    assert(r6.axml.indexOf('extra="\u9644\u52A0"') !== -1, '\u5217\u8868\u9879 extra \u5C5E\u6027\u63D0\u53D6\u6B63\u786E');
    assert(r6.axml.indexOf('arrow') !== -1, '\u5217\u8868\u9879 arrow \u5C5E\u6027\u5B58\u5728');
  } catch (e) {
    assert(false, '\u5217\u8868\u9879\u7F16\u8BD1\u5931\u8D25: ' + e.message);
  }

  console.log('\n\u6D4B\u8BD5\u7ED3\u679C: ' + passed + ' \u901A\u8FC7, ' + failed + ' \u5931\u8D25');
  console.groupEnd();

  if (typeof process !== 'undefined') {
    process.exit(failed > 0 ? 1 : 0);
  }
})();
