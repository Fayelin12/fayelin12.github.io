// 产品管理端 - JSON Schema 版本数据
// 格式版本: 1.0
// 生成时间: 2026-04-30T08:12:41.377Z
// 原始文件: v1.0.4.js
// 转换工具: js/batch-convert-versions.js

var versionDataSchema = (typeof versionDataSchema !== 'undefined') ? versionDataSchema : {};
versionDataSchema['v1.0.4'] = {
    name: 'v1.0.4',
    label: 'V1.0.4',
    description: '当前线上版本',
    format: 'schema',
    pages: [
        {
            id: 'xinzengbanli',
            name: '新增办理',
            icon: '📋',
            level: 1,
            isFolder: true,
            children: [
                {
                    id: 'step1-info-normal',
                    name: '车牌页',
                    icon: '🚗',
                    level: 2,
                    step: 1,
                    stepName: '资格核验',
                    scenarios: {
                        normal: {
                            title: '步骤1：资格核验 - 正常填写',
                            tips: [
                                '4步流程指示器清晰展示当前进度',
                                '办理人信息自动填充支付宝绑定信息',
                                '车牌号支持省份选择和新能源标识',
                                '车辆类型使用颜色区分（黄牌/蓝牌）',
                                '底部按钮带副标题说明办理规则'
                            ],
                            schema: {
                                version: '1.0',
                                page: {
                                    id: 'step1-info-normal',
                                    title: '步骤1：资格核验 - 正常填写',
                                    backgroundColor: '#f5f5f5',
                                    navigationBar: {
                                        title: '官方 ETC',
                                        showBack: true
                                    },
                                    children: [
                                        {
                                            type: 'page',
                                            className: [
                                                'am-page',
                                                'am-page--pb'
                                            ],
                                            children: [
                                                {
                                                    type: 'steps',
                                                    props: {
                                                        current: 0,
                                                        items: [
                                                            {
                                                                title: '资格核验',
                                                                active: true
                                                            },
                                                            {
                                                                title: '上传证照'
                                                            },
                                                            {
                                                                title: '包邮到家'
                                                            }
                                                        ]
                                                    },
                                                    className: [
                                                        'am-steps'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'view',
                                                            className: [
                                                                'am-step__connector',
                                                                'am-step__connector--active'
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'card',
                                                    className: [
                                                        'am-card'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'cardHeader',
                                                            className: [
                                                                'am-card__header'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'cardTitle',
                                                                    className: [
                                                                        'am-card__title'
                                                                    ],
                                                                    children: '办理人核验'
                                                                }
                                                            ]
                                                        },
                                                        {
                                                            type: 'cardBody',
                                                            props: {
                                                                flushBody: true
                                                            },
                                                            className: [
                                                                'am-card__body',
                                                                'am-card__body--flush'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'list',
                                                                    props: {
                                                                        flush: true
                                                                    },
                                                                    className: [
                                                                        'am-list',
                                                                        'am-list--flush'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'listItem',
                                                                            className: [
                                                                                'am-list-item'
                                                                            ],
                                                                            children: [
                                                                                {
                                                                                    type: 'listItemContent',
                                                                                    className: [
                                                                                        'am-list-item__content'
                                                                                    ],
                                                                                    children: [
                                                                                        {
                                                                                            type: 'listItemTitle',
                                                                                            className: [
                                                                                                'am-list-item__title'
                                                                                            ],
                                                                                            children: '本人姓名'
                                                                                        }
                                                                                    ]
                                                                                },
                                                                                {
                                                                                    type: 'input',
                                                                                    className: [
                                                                                        'am-input',
                                                                                        'am-input--inline',
                                                                                        'am-text--right'
                                                                                    ],
                                                                                    props: {
                                                                                        placeholder: '支付宝绑定真实姓名',
                                                                                        dataInputName: 'true'
                                                                                    },
                                                                                    style: {
                                                                                        maxWidth: '180px',
                                                                                        background: 'transparent',
                                                                                        border: 'none'
                                                                                    }
                                                                                }
                                                                            ],
                                                                            props: {
                                                                                title: '本人姓名',
                                                                                extra: '支付宝绑定真实姓名'
                                                                            }
                                                                        },
                                                                        {
                                                                            type: 'listItem',
                                                                            className: [
                                                                                'am-list-item'
                                                                            ],
                                                                            style: {
                                                                                flexWrap: 'wrap'
                                                                            },
                                                                            children: [
                                                                                {
                                                                                    type: 'listItemContent',
                                                                                    className: [
                                                                                        'am-list-item__content'
                                                                                    ],
                                                                                    children: [
                                                                                        {
                                                                                            type: 'listItemTitle',
                                                                                            className: [
                                                                                                'am-list-item__title'
                                                                                            ],
                                                                                            children: '手机号'
                                                                                        }
                                                                                    ]
                                                                                },
                                                                                {
                                                                                    type: 'input',
                                                                                    className: [
                                                                                        'am-input',
                                                                                        'am-input--inline',
                                                                                        'am-text--right'
                                                                                    ],
                                                                                    props: {
                                                                                        placeholder: '本人实名手机号',
                                                                                        dataInputPhone: 'true'
                                                                                    },
                                                                                    style: {
                                                                                        maxWidth: '180px',
                                                                                        background: 'transparent',
                                                                                        border: 'none'
                                                                                    }
                                                                                },
                                                                                {
                                                                                    type: 'text',
                                                                                    className: [
                                                                                        'am-text',
                                                                                        'am-text--sm',
                                                                                        'am-text--warning',
                                                                                        'am-w-full',
                                                                                        'am-mt-2'
                                                                                    ],
                                                                                    props: {
                                                                                        dataPhoneTip: 'true'
                                                                                    },
                                                                                    style: {
                                                                                        display: 'none'
                                                                                    }
                                                                                }
                                                                            ],
                                                                            props: {
                                                                                title: '手机号',
                                                                                extra: '本人实名手机号'
                                                                            }
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'card',
                                                    className: [
                                                        'am-card'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'cardHeader',
                                                            className: [
                                                                'am-card__header'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'cardTitle',
                                                                    className: [
                                                                        'am-card__title'
                                                                    ],
                                                                    children: '车辆核验'
                                                                }
                                                            ]
                                                        },
                                                        {
                                                            type: 'cardBody',
                                                            className: [
                                                                'am-card__body'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'view',
                                                                    props: {
                                                                        variant: 'flex'
                                                                    },
                                                                    style: {
                                                                        gap: '8rpx',
                                                                        alignItems: 'center'
                                                                    },
                                                                    className: [
                                                                        'am-flex',
                                                                        'am-gap-2',
                                                                        'am-items-center',
                                                                        'am-input-group'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'licensePrefix',
                                                                            className: [
                                                                                'am-license-prefix'
                                                                            ],
                                                                            children: '省'
                                                                        },
                                                                        {
                                                                            type: 'input',
                                                                            props: {
                                                                                inline: true,
                                                                                placeholder: '请输入车牌号',
                                                                                readonly: true
                                                                            },
                                                                            className: [
                                                                                'am-input',
                                                                                'am-input--inline'
                                                                            ]
                                                                        },
                                                                        {
                                                                            type: 'licenseNewEnergy',
                                                                            className: [
                                                                                'am-license-newenergy'
                                                                            ],
                                                                            children: [
                                                                                {
                                                                                    type: 'text',
                                                                                    props: {
                                                                                        size: 'md'
                                                                                    },
                                                                                    style: {
                                                                                        lineHeight: '1'
                                                                                    },
                                                                                    className: [
                                                                                        'am-text',
                                                                                        'am-text--md',
                                                                                        'am-leading-none'
                                                                                    ],
                                                                                    children: '+'
                                                                                },
                                                                                {
                                                                                    type: 'text',
                                                                                    children: '新能源'
                                                                                }
                                                                            ]
                                                                        }
                                                                    ]
                                                                },
                                                                {
                                                                    type: 'view',
                                                                    style: {
                                                                        marginTop: '16rpx'
                                                                    },
                                                                    className: [
                                                                        'am-mt-4'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'text',
                                                                            props: {
                                                                                size: 'lg',
                                                                                bold: true
                                                                            },
                                                                            style: {
                                                                                marginBottom: '12rpx'
                                                                            },
                                                                            className: [
                                                                                'am-text',
                                                                                'am-text--lg',
                                                                                'am-text--bold',
                                                                                'am-mb-3'
                                                                            ],
                                                                            children: '这辆车是'
                                                                        },
                                                                        {
                                                                            type: 'view',
                                                                            props: {
                                                                                variant: 'flex'
                                                                            },
                                                                            style: {
                                                                                gap: '12rpx'
                                                                            },
                                                                            className: [
                                                                                'am-flex',
                                                                                'am-gap-3'
                                                                            ],
                                                                            children: [
                                                                                {
                                                                                    type: 'button',
                                                                                    props: {
                                                                                        type: 'warning'
                                                                                    },
                                                                                    style: {
                                                                                        flex: '1'
                                                                                    },
                                                                                    className: [
                                                                                        'am-button',
                                                                                        'am-button--warning',
                                                                                        'am-flex-1'
                                                                                    ],
                                                                                    children: '黄牌'
                                                                                },
                                                                                {
                                                                                    type: 'button',
                                                                                    props: {
                                                                                        type: 'info'
                                                                                    },
                                                                                    style: {
                                                                                        flex: '1'
                                                                                    },
                                                                                    className: [
                                                                                        'am-button',
                                                                                        'am-button--info',
                                                                                        'am-flex-1'
                                                                                    ],
                                                                                    children: '蓝牌'
                                                                                }
                                                                            ]
                                                                        }
                                                                    ]
                                                                },
                                                                {
                                                                    type: 'view',
                                                                    style: {
                                                                        marginTop: '16rpx',
                                                                        paddingTop: '16rpx'
                                                                    },
                                                                    className: [
                                                                        'am-mt-4',
                                                                        'am-pt-4',
                                                                        'am-border-top'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'text',
                                                                            props: {
                                                                                size: 'sm',
                                                                                color: 'tertiary',
                                                                                relaxed: true
                                                                            },
                                                                            style: {
                                                                                marginBottom: '8rpx'
                                                                            },
                                                                            className: [
                                                                                'am-text',
                                                                                'am-text--sm',
                                                                                'am-text--tertiary',
                                                                                'am-text--relaxed',
                                                                                'am-mb-2'
                                                                            ],
                                                                            children: [
                                                                                '*限时特惠：服务费低至 0.5元/笔，无通行不收费',
                                                                                {
                                                                                    type: 'helpIcon',
                                                                                    className: [
                                                                                        'am-help-icon'
                                                                                    ],
                                                                                    children: '?'
                                                                                }
                                                                            ]
                                                                        },
                                                                        {
                                                                            type: 'text',
                                                                            props: {
                                                                                size: 'sm',
                                                                                color: 'tertiary',
                                                                                relaxed: true
                                                                            },
                                                                            className: [
                                                                                'am-text',
                                                                                'am-text--sm',
                                                                                'am-text--tertiary',
                                                                                'am-text--relaxed'
                                                                            ],
                                                                            children: '*免费申领的设备使用期应不少于3年，自质保期生效之日起算，如提前终止使用，注销ETC产品时将收取180元服务费'
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'checkboxRow',
                                                    className: [
                                                        'am-checkbox-row'
                                                    ],
                                                    events: {
                                                        onToggle: 'agree'
                                                    },
                                                    children: [
                                                        {
                                                            type: 'checkbox',
                                                            className: [
                                                                'am-checkbox'
                                                            ],
                                                            events: {
                                                                onChange: 'agree'
                                                            },
                                                            children: [
                                                                {
                                                                    type: 'text',
                                                                    className: [
                                                                        'am-checkbox__check'
                                                                    ],
                                                                    children: '✓'
                                                                }
                                                            ]
                                                        },
                                                        {
                                                            type: 'text',
                                                            props: {
                                                                size: 'md'
                                                            },
                                                            className: [
                                                                'am-text',
                                                                'am-text--md'
                                                            ],
                                                            children: '签约前确认并同意'
                                                        },
                                                        {
                                                            type: 'text',
                                                            props: {
                                                                size: 'md',
                                                                color: 'primary'
                                                            },
                                                            className: [
                                                                'am-text',
                                                                'am-text--md',
                                                                'am-text--primary'
                                                            ],
                                                            children: '《协议》'
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'button',
                                                    props: {
                                                        type: 'primary',
                                                        block: true,
                                                        round: true
                                                    },
                                                    style: {
                                                        marginTop: '24rpx',
                                                        marginBottom: '12rpx'
                                                    },
                                                    className: [
                                                        'am-button',
                                                        'am-button--primary',
                                                        'am-button--block',
                                                        'am-button--round',
                                                        'am-mt-6',
                                                        'am-mb-3'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'text',
                                                            props: {
                                                                size: 'lg',
                                                                color: 'white',
                                                                medium: true
                                                            },
                                                            className: [
                                                                'am-text',
                                                                'am-text--lg',
                                                                'am-text--white',
                                                                'am-text--medium'
                                                            ],
                                                            children: '查看办理资格'
                                                        },
                                                        {
                                                            type: 'text',
                                                            props: {
                                                                size: 'xs',
                                                                variant: 'subtitle'
                                                            },
                                                            className: [
                                                                'am-text',
                                                                'am-text--xs',
                                                                'am-button__subtitle'
                                                            ],
                                                            children: '交通部规定ETC实名办理，每辆车限办1个'
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'text',
                                                    props: {
                                                        size: 'sm',
                                                        color: 'tertiary',
                                                        align: 'center'
                                                    },
                                                    style: {
                                                        textAlign: 'center'
                                                    },
                                                    className: [
                                                        'am-text',
                                                        'am-text--sm',
                                                        'am-text--tertiary',
                                                        'am-text--center',
                                                        'am-text--privacy'
                                                    ],
                                                    children: [
                                                        '您的个人信息仅用于提交ETC办理资格核验，提交即同意',
                                                        {
                                                            type: 'text',
                                                            props: {
                                                                size: 'sm',
                                                                color: 'primary'
                                                            },
                                                            className: [
                                                                'am-text',
                                                                'am-text--sm',
                                                                'am-text--primary'
                                                            ],
                                                            children: '《隐私政策》'
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        loading: {
                            title: '步骤1：车辆信息录入 - 加载中',
                            tips: [
                                '加载动画提示用户等待',
                                '背景内容置灰防止误操作',
                                '验证过程不可重复提交'
                            ],
                            schema: {
                                version: '1.0',
                                page: {
                                    id: 'step1-info-normal',
                                    title: '步骤1：车辆信息录入 - 加载中',
                                    backgroundColor: '#f5f5f5',
                                    navigationBar: {
                                        title: '官方 ETC',
                                        showBack: true
                                    },
                                    children: [
                                        {
                                            type: 'page',
                                            style: {
                                                padding: '16rpx'
                                            },
                                            className: [
                                                'am-page',
                                                'am-p-4'
                                            ],
                                            children: [
                                                {
                                                    type: 'steps',
                                                    props: {
                                                        current: 0,
                                                        items: [
                                                            {
                                                                title: '资格核验',
                                                                active: true
                                                            },
                                                            {
                                                                title: '上传证照'
                                                            },
                                                            {
                                                                title: '包邮到家'
                                                            }
                                                        ]
                                                    },
                                                    style: {
                                                        marginBottom: '20rpx'
                                                    },
                                                    className: [
                                                        'am-steps',
                                                        'am-mb-5'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'view',
                                                            className: [
                                                                'am-step__connector',
                                                                'am-step__connector--active'
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'text',
                                                    props: {
                                                        size: 'xl',
                                                        bold: true
                                                    },
                                                    style: {
                                                        marginBottom: '16rpx'
                                                    },
                                                    className: [
                                                        'am-text',
                                                        'am-text--xl',
                                                        'am-text--bold',
                                                        'am-mb-4'
                                                    ],
                                                    children: '🚛 车辆信息'
                                                },
                                                {
                                                    type: 'card',
                                                    style: {
                                                        opacity: '0.6',
                                                        marginBottom: '12rpx'
                                                    },
                                                    className: [
                                                        'am-card',
                                                        'am-opacity-60',
                                                        'am-mb-3'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'cardBody',
                                                            className: [
                                                                'am-card__body'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'text',
                                                                    props: {
                                                                        size: 'sm',
                                                                        color: 'tertiary'
                                                                    },
                                                                    style: {
                                                                        marginBottom: '8rpx'
                                                                    },
                                                                    className: [
                                                                        'am-text',
                                                                        'am-text--sm',
                                                                        'am-text--tertiary',
                                                                        'am-mb-2'
                                                                    ],
                                                                    children: '车牌号码'
                                                                },
                                                                {
                                                                    type: 'view',
                                                                    props: {
                                                                        variant: 'flex'
                                                                    },
                                                                    style: {
                                                                        gap: '8rpx'
                                                                    },
                                                                    className: [
                                                                        'am-flex',
                                                                        'am-gap-2'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'tag',
                                                                            props: {
                                                                                solid: true
                                                                            },
                                                                            className: [
                                                                                'am-tag',
                                                                                'am-tag--solid'
                                                                            ],
                                                                            children: '京'
                                                                        },
                                                                        {
                                                                            type: 'displayField',
                                                                            className: [
                                                                                'am-display-field'
                                                                            ],
                                                                            children: 'A12345'
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'loading',
                                                    style: {
                                                        paddingTop: '40rpx',
                                                        paddingBottom: '40rpx'
                                                    },
                                                    className: [
                                                        'am-loading',
                                                        'am-py-10'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'view',
                                                            className: [
                                                                'am-loading__spinner',
                                                                'am-loading__spinner--lg'
                                                            ]
                                                        },
                                                        {
                                                            type: 'view',
                                                            className: [
                                                                'am-loading__text'
                                                            ],
                                                            children: '正在验证车辆信息...'
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        error: {
                            title: '步骤1：车辆信息录入 - 错误提示',
                            tips: [
                                '错误提示醒目展示在表单顶部',
                                '错误字段用红色边框标注',
                                '给出明确的错误原因和解决建议'
                            ],
                            schema: {
                                version: '1.0',
                                page: {
                                    id: 'step1-info-normal',
                                    title: '步骤1：车辆信息录入 - 错误提示',
                                    backgroundColor: '#f5f5f5',
                                    navigationBar: {
                                        title: '官方 ETC',
                                        showBack: true
                                    },
                                    children: [
                                        {
                                            type: 'page',
                                            style: {
                                                padding: '16rpx'
                                            },
                                            className: [
                                                'am-page',
                                                'am-p-4'
                                            ],
                                            children: [
                                                {
                                                    type: 'steps',
                                                    props: {
                                                        current: 0,
                                                        items: [
                                                            {
                                                                title: '资格核验',
                                                                active: true
                                                            },
                                                            {
                                                                title: '上传证照'
                                                            },
                                                            {
                                                                title: '包邮到家'
                                                            }
                                                        ]
                                                    },
                                                    style: {
                                                        marginBottom: '20rpx'
                                                    },
                                                    className: [
                                                        'am-steps',
                                                        'am-mb-5'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'view',
                                                            className: [
                                                                'am-step__connector',
                                                                'am-step__connector--active'
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'text',
                                                    props: {
                                                        size: 'xl',
                                                        bold: true
                                                    },
                                                    style: {
                                                        marginBottom: '16rpx'
                                                    },
                                                    className: [
                                                        'am-text',
                                                        'am-text--xl',
                                                        'am-text--bold',
                                                        'am-mb-4'
                                                    ],
                                                    children: '🚛 车辆信息'
                                                },
                                                {
                                                    type: 'card',
                                                    props: {
                                                        danger: true
                                                    },
                                                    style: {
                                                        marginBottom: '16rpx'
                                                    },
                                                    className: [
                                                        'am-card',
                                                        'am-card--danger',
                                                        'am-mb-4'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'cardBody',
                                                            className: [
                                                                'am-card__body'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'view',
                                                                    props: {
                                                                        variant: 'flex'
                                                                    },
                                                                    style: {
                                                                        gap: '8rpx',
                                                                        alignItems: 'center'
                                                                    },
                                                                    className: [
                                                                        'am-flex',
                                                                        'am-gap-2',
                                                                        'am-items-center'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'text',
                                                                            props: {
                                                                                color: 'danger'
                                                                            },
                                                                            className: [
                                                                                'am-text',
                                                                                'am-text--danger'
                                                                            ],
                                                                            children: '⚠️'
                                                                        },
                                                                        {
                                                                            type: 'text',
                                                                            props: {
                                                                                color: 'danger'
                                                                            },
                                                                            className: [
                                                                                'am-text',
                                                                                'am-text--danger'
                                                                            ],
                                                                            children: '该车牌号已办理ETC，请勿重复申请'
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'card',
                                                    style: {
                                                        marginBottom: '12rpx'
                                                    },
                                                    className: [
                                                        'am-card',
                                                        'am-mb-3'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'cardBody',
                                                            className: [
                                                                'am-card__body'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'text',
                                                                    props: {
                                                                        size: 'sm',
                                                                        color: 'tertiary'
                                                                    },
                                                                    style: {
                                                                        marginBottom: '8rpx'
                                                                    },
                                                                    className: [
                                                                        'am-text',
                                                                        'am-text--sm',
                                                                        'am-text--tertiary',
                                                                        'am-mb-2'
                                                                    ],
                                                                    children: '车牌号码'
                                                                },
                                                                {
                                                                    type: 'view',
                                                                    props: {
                                                                        variant: 'flex'
                                                                    },
                                                                    style: {
                                                                        gap: '8rpx'
                                                                    },
                                                                    className: [
                                                                        'am-flex',
                                                                        'am-gap-2'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'tag',
                                                                            props: {
                                                                                solid: true
                                                                            },
                                                                            className: [
                                                                                'am-tag',
                                                                                'am-tag--solid'
                                                                            ],
                                                                            children: '京'
                                                                        },
                                                                        {
                                                                            type: 'input',
                                                                            props: {
                                                                                danger: true,
                                                                                value: 'A12345'
                                                                            },
                                                                            style: {
                                                                                flex: '1'
                                                                            },
                                                                            className: [
                                                                                'am-input',
                                                                                'am-input--danger',
                                                                                'am-flex-1'
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'card',
                                                    style: {
                                                        marginBottom: '12rpx'
                                                    },
                                                    className: [
                                                        'am-card',
                                                        'am-mb-3'
                                                    ],
                                                    children: [
                                                        {
                                                            type: 'cardBody',
                                                            className: [
                                                                'am-card__body'
                                                            ],
                                                            children: [
                                                                {
                                                                    type: 'text',
                                                                    props: {
                                                                        size: 'sm',
                                                                        color: 'tertiary'
                                                                    },
                                                                    style: {
                                                                        marginBottom: '8rpx'
                                                                    },
                                                                    className: [
                                                                        'am-text',
                                                                        'am-text--sm',
                                                                        'am-text--tertiary',
                                                                        'am-mb-2'
                                                                    ],
                                                                    children: '车辆类型'
                                                                },
                                                                {
                                                                    type: 'view',
                                                                    props: {
                                                                        variant: 'flex'
                                                                    },
                                                                    style: {
                                                                        gap: '12rpx'
                                                                    },
                                                                    className: [
                                                                        'am-flex',
                                                                        'am-gap-3'
                                                                    ],
                                                                    children: [
                                                                        {
                                                                            type: 'button',
                                                                            props: {
                                                                                type: 'primary'
                                                                            },
                                                                            style: {
                                                                                flex: '1'
                                                                            },
                                                                            className: [
                                                                                'am-button',
                                                                                'am-button--primary',
                                                                                'am-flex-1'
                                                                            ],
                                                                            children: '货车'
                                                                        },
                                                                        {
                                                                            type: 'button',
                                                                            props: {
                                                                                type: 'default'
                                                                            },
                                                                            style: {
                                                                                flex: '1'
                                                                            },
                                                                            className: [
                                                                                'am-button',
                                                                                'am-button--default',
                                                                                'am-flex-1'
                                                                            ],
                                                                            children: '客车'
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'button',
                                                    props: {
                                                        type: 'primary',
                                                        block: true,
                                                        round: true
                                                    },
                                                    style: {
                                                        marginTop: '24rpx'
                                                    },
                                                    className: [
                                                        'am-button',
                                                        'am-button--primary',
                                                        'am-button--block',
                                                        'am-button--round',
                                                        'am-mt-6'
                                                    ],
                                                    children: '下一步'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]
        }
    ],
    requirements: {
        'step1-info-normal': {
            title: '需求说明',
            content: '## 一、页面定义\n\n- **名称**：车牌页（资格核验）\n\n- **路由**：step1-info-normal（新增办理流程 → 步骤1）\n\n\n\n## 二、业务定位\n\n- **目标**：采集办理人身份信息与车辆信息，完成ETC办理资格校验，作为新增办理流程的入口页\n\n- **核心场景**：用户从首页进入新增办理，系统自动填充办理人信息后，用户补充车牌号与车辆类型并提交核验\n\n- **关键指标**：资格核验通过率、页面放弃率、车牌输入完成率、协议勾选率\n\n\n\n## 三、前置条件\n\n- **适用角色**：已登录支付宝用户（含实名与未实名）\n\n- **进入参数**：可选携带订单号、presalecode（预售码）用于定位前置订单\n\n- **状态依赖**：\n  - 用户有效货车订单数需小于5（有效定义：订单状态不等于已取消/已注销），满5单阻断并弹窗提示\n  - 用户最新一笔历史订单状态等于已提交/已完成，且签约状态等于签约成功\n  - 发货方式等于2-电商渠道仓的前置订单且车牌号为空时，直接进入本页补充信息\n\n\n\n## 四、页面结构\n\n- **导航区**：顶部步骤指示器，3步流程展示（01资格核验-active、02上传证照、03包邮到家），当前步骤高亮蓝色，其余灰色\n\n- **内容区**：\n  - 办理人核验卡片：展示"本人姓名"与"手机号"两项，值为系统自动填充的只读占位文本\n  - 车辆核验卡片：包含车牌输入组（省份前缀+输入框+新能源标识）、车辆类型单选（黄牌/蓝牌）、费用信息说明（服务费特惠说明+注销费说明）\n  - 协议勾选区：圆形复选框+"签约前确认并同意"+《协议》链接\n  - 隐私说明：底部灰色小字，说明信息用途并附带《隐私政策》链接\n\n- **操作栏**：底部通栏主按钮"查看办理资格"，含副标题"交通部规定ETC实名办理，每辆车限办1个"\n\n\n\n## 五、交互行为\n\n> 按视觉顺序，格式：触发 → 规则 → 反馈\n\n\n\n### 步骤指示器\n\n- **触发**：页面初始化时自动渲染\n\n- **规则**：固定展示3步流程，当前步骤（资格核验）圆形背景为#1677FF蓝色、文字白色；非当前步骤圆形背景为#f5f5f5灰色、文字#999\n\n- **反馈**：仅作进度展示，不可点击跳转\n\n\n\n### 办理人信息展示\n\n- **触发**：页面加载\n\n- **规则**：系统自动获取支付宝实名信息与注册手机号并渲染为只读文本\n\n- **反馈**：姓名栏展示"支付宝绑定真实姓名"占位（未实名时同理留空占位），手机号栏展示"绑定手机号"占位；点击手机号理论上可拉齐数字键盘修改，但当前页面为只读展示态\n\n\n\n### 车牌输入组\n\n- **触发**：点击车牌输入框区域\n\n- **规则**：调起车牌专用输入键盘（省份选择器+号码输入），输入框为readonly状态，需通过专用键盘录入\n\n- **反馈**：输入框回显已输入内容；右侧"新能源"标识始终展示（绿色边框#00B578+绿色文字#00B578）\n\n\n\n### 车辆类型选择\n\n- **触发**：点击"黄牌"或"蓝牌"按钮\n\n- **规则**：单选模式，两个按钮互斥；黄牌背景色#FFF7E6文字色#D46B08，蓝牌背景色#E6F4FF文字色#0958D9\n\n- **反馈**：选中按钮保持高亮，未选中按钮恢复默认样式；当前实际页面仅展示黄牌/蓝牌两种（未展示8位新能源渐变绿选项）\n\n\n\n### 费用信息说明\n\n- **触发**：页面初始化展示\n\n- **规则**：固定文本展示，两行说明，位于车辆核验卡片底部，带顶部分割线\n\n- **反馈**：第一行为限时特惠说明，服务费低至0.5元/笔且无通行不收费，右侧带圆形问号帮助图标（border 1px solid #ccc）；第二行为免费申领设备使用期应不少于3年，提前终止注销时收取180元服务费\n\n\n\n### 问号帮助图标\n\n- **触发**：点击问号图标\n\n- **规则**：展示服务费/注销费详细说明浮层或弹窗\n\n- **反馈**：用户获得费用规则解释（具体交互未在当前代码中完整体现）\n\n\n\n### 协议勾选\n\n- **触发**：点击协议勾选区域（圆形复选框+文字）\n\n- **规则**：切换checked状态；checked时圆形复选框背景变为#1677FF并显示白色勾选符号\n\n- **反馈**：复选框视觉状态变化；未勾选时提交按钮触发弹窗提示\n\n\n\n### 《协议》链接\n\n- **触发**：点击"《协议》"文字链接\n\n- **规则**：阻止事件冒泡（避免触发父级勾选），按JPG格式展示一组协议图片\n\n- **反馈**：打开协议详情浏览页或弹窗\n\n\n\n### 提交按钮（查看办理资格）\n\n- **触发**：点击底部蓝色主按钮\n\n- **规则**：先校验协议是否已勾选，未勾选则弹窗提示；已勾选则调用速通车牌校验接口（2024.11.14更新版本）；防刷控制每人每日最多调用5次\n\n- **反馈**：\n  - 未勾选协议：弹窗提示"签约前确认并同意"，弹窗提供"同意"按钮，点击后视为勾选并继续提交\n  - 可发行且当前无订单：创建新订单，订单类型等于前置订单，进入下一步（上传证照页）\n  - 可发行且当前有订单：保存信息，同步创建支付宝订单，进入下一步\n  - 不可发行：模态弹窗提示，文字取校验接口返回msg，提供"我知道了"按钮，点击后自动返回首页\n  - 超出频次：toast报错"操作过于频繁，明日再试"\n\n\n\n### 隐私政策链接\n\n- **触发**：点击"《隐私政策》"链接\n\n- **规则**：跳转至隐私政策说明页\n\n- **反馈**：用户查看隐私政策详情\n\n\n\n## 六、状态分支\n\n- **当前展示**：正常填写状态（normal），表单可编辑，步骤指示器第一步active\n\n- **切换条件**：\n  - 点击提交按钮且基础校验通过后进入loading状态\n  - 车牌校验接口返回错误或车牌已办理时进入error状态\n\n- **状态差异**：\n  - normal：页面完整展示所有表单元素，可交互\n  - loading：背景内容置灰（opacity 0.6），中央展示旋转loading动画，提示"正在验证车辆信息..."，不可重复提交\n  - error：步骤指示器保持原样，表单顶部展示红色错误提示卡片（背景#fef2f2、边框#fecaca、文字#dc2626），错误输入框红边框标注，显示明确错误原因（如"该车牌号已办理ETC，请勿重复申请"）\n\n\n\n## 七、联动关系\n\n- **触发**：车牌号位数变化（7位或8位）\n\n- **影响**：根据原需求设计，车牌颜色应联动变化——7位展示黄牌/蓝牌选项，8位展示渐变绿色新能源选项；但当前实际页面仅展示黄牌/蓝牌两选项，未实现8位新能源渐变绿联动\n\n\n\n## 八、异常边界\n\n- **加载失败**：办理人信息获取失败时展示占位文本（"支付宝绑定真实姓名"/"绑定手机号"）；车牌校验接口超时或异常时进入error状态展示通用错误提示\n\n- **数据为空**：办理人信息未获取到时表单行仍展示但值为占位说明文字；车牌号未输入时输入框展示placeholder"请输入车牌号"\n\n- **权限不足**：有效货车订单满5单时阻断进入并弹窗温馨提示，用户点击"我知道了"后返回首页\n\n\n\n## 九、数据交互\n\n- **接口依赖**：\n\n  - 初始化：获取用户办理人信息（姓名、手机号）、查询历史订单状态与数量、读取后台费用配置\n\n  - 提交/更新：速通车牌校验接口（2024.11.14更新）、创建/更新订单接口、同步创建支付宝订单接口\n\n- **落库规则**：\n\n  - 时机：车牌校验通过后立即创建或更新订单\n\n  - 冲突处理：若携带订单号或presalecode且匹配到前置订单（订单类型等于1且车牌号为空），则更新原订单而非新建\n\n  - 后端校验点：车牌号正则校验、手机号正则校验、用户每日调用频次校验（上限5次）\n\n- **异常码映射**：\n\n  - 超出频次限制 → toast"操作过于频繁，明日再试"\n\n  - 车牌已办理或不可发行 → 模态弹窗展示接口返回msg，"我知道了"按钮返回首页\n\n  - 手机号格式错误 → toast"手机号错误，请检查"\n\n  - 车牌号格式错误 → toast"车牌号错误，请检查"\n\n- **埋点约定**：\n\n  - 事件：页面曝光、车牌输入完成、车辆类型选择、协议勾选/取消、提交按钮点击、协议链接点击、帮助图标点击\n\n  - 关键参数：车牌号、车牌颜色选择、是否勾选协议、来源渠道、是否前置订单补录\n',
            sections: [
                {
                    id: 'sec-1',
                    title: '一、页面定义',
                    anchor: 'anchor-1'
                },
                {
                    id: 'sec-2',
                    title: '二、业务定位',
                    anchor: 'anchor-2'
                },
                {
                    id: 'sec-3',
                    title: '三、前置条件',
                    anchor: 'anchor-3'
                },
                {
                    id: 'sec-4',
                    title: '四、页面结构',
                    anchor: 'anchor-4'
                },
                {
                    id: 'sec-5',
                    title: '五、交互行为',
                    anchor: 'anchor-5'
                },
                {
                    id: 'sec-6',
                    title: '六、状态分支',
                    anchor: 'anchor-6'
                },
                {
                    id: 'sec-7',
                    title: '七、联动关系',
                    anchor: 'anchor-7'
                },
                {
                    id: 'sec-8',
                    title: '八、异常边界',
                    anchor: 'anchor-8'
                },
                {
                    id: 'sec-9',
                    title: '九、数据交互',
                    anchor: 'anchor-9'
                }
            ],
            updatedAt: '2026-04-29T01:52:58.856Z'
        }
    }
};

if (typeof versionData !== 'undefined') {
    versionData['v1.0.4'] = versionDataSchema['v1.0.4'];
}
