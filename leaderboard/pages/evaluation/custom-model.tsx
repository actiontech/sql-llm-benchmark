import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Steps,
  Card,
  Typography,
  Alert,
  Checkbox,
  Space,
  Tag,
  Descriptions,
  Modal,
  message,
  Skeleton,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  RobotOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { useFormPersist } from '../../hooks/useFormPersist';
import { submitCustomModelEvaluation } from '@/services/evaluation';
import type { CustomModelRequest } from '@/types/evaluation';
import {
  formatFileSize,
  validateModelApiParams,
} from '../../utils/evaluationUtils';
import Header from '../../components/Header';
import type { Dataset } from '@/types/evaluation';
import { EmailVerificationInput } from '@/components/Evaluation';
import ApiParamsCodeEditor from './components/ApiParamsCodeEditor';
import ApiParamsExampleModal from './components/ApiParamsExampleModal';

const { Title, Paragraph, Text } = Typography;

/** 模型 API 参数文本域默认值 */
const DEFAULT_MODEL_API_PARAMS = `# Basic parameters
openai_api_base="Please input  url",
key="Please input api token",
model="Please input model name",
# For non-commercial API model, any string can be filled in key

# Optional parameters
batch_size=5`;

/**
 * 表单值类型
 * 复用 CustomModelRequest，但排除 selectedDatasets（由独立状态管理）
 */
type FormValues = Omit<CustomModelRequest, 'selectedDatasets'>;

const CustomModelEvaluationPage: React.FC = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const { onValuesChange, clearDraft } = useFormPersist('custom_model', form);

  const [isMounted, setIsMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [apiParamsExampleModalOpen, setApiParamsExampleModalOpen] = useState(false);

  // 确保组件仅在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 获取数据集列表
  useEffect(() => {
    if (!isMounted) return;

    const fetchDatasets = async () => {
      setLoadingDatasets(true);
      try {
        const res = await fetch('/api/evaluation/datasets');
        const data = await res.json();
        const loadedDatasets = data.datasets || [];
        setDatasets(loadedDatasets);
        // 默认全选所有数据集
        setSelectedDatasets(loadedDatasets.map((dataset: Dataset) => dataset.id));
      } catch (error) {
        console.error('Error fetching datasets:', error);
        message.error(t('evaluation.error.fetch_datasets_failed'));
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchDatasets();
  }, [t, isMounted]);

  // 处理下一步
  const handleNext = async () => {
    try {
      // 根据当前步骤验证对应的表单字段
      const fieldsToValidate = {
        0: ['modelName', 'modelApiParams'], // 步骤0: 模型信息
        1: [], // 步骤1: 数据集选择（由 selectedDatasets 状态管理，不需要验证表单）
      };

      const fields = fieldsToValidate[currentStep as keyof typeof fieldsToValidate] || [];

      if (fields.length > 0) {
        await form.validateFields(fields);
      }

      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 处理上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // 处理提交
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true);
      const paramsText = values.modelApiParams || '';
      const validation = validateModelApiParams(paramsText);
      if (!validation.valid) {
        message.error(validation.error || t('evaluation.custom_model.form.model_api_params_invalid'));
        setSubmitting(false);
        return;
      }

      // 使用封装的 API 方法，错误已被统一拦截
      const result = await submitCustomModelEvaluation({
        ...values,
        selectedDatasets,
      });

      // 只处理成功场景
      Modal.success({
        title: t('evaluation.success.submit_success'),
        content: (
          <div>
            <p>{t('evaluation.success.estimated_duration')}</p>
            <p>
              {t('evaluation.result_email_hint')}: {values.resultEmail}
            </p>
          </div>
        ),
        onOk: () => {
          clearDraft();
          router.push('/');
        },
      });
    } catch (error) {
      // 错误已被统一拦截并显示通知，这里只需做清理工作
      // 不输出错误日志，避免在控制台显示堆栈信息
      if (error && typeof error === 'object' && 'isHandled' in error) {
        // 已处理的业务错误，静默处理
      } else {
        // 未预期的错误，记录到控制台
        console.log('Submit error:', error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 计算选中数据集的总Token
  const totalTokens = selectedDatasets.reduce((sum, id) => {
    const dataset = datasets.find((d) => d.id === id);
    return sum + (dataset?.tokenEstimate || 0);
  }, 0);

  // 步骤配置
  const steps = [
    {
      title: t('evaluation.custom_model.steps.model_info'),
      icon: <RobotOutlined />,
    },
    {
      title: t('evaluation.custom_model.steps.dataset_select'),
      icon: <DatabaseOutlined />,
    },
    {
      title: t('evaluation.custom_model.steps.email_and_confirm'),
      icon: <CheckCircleOutlined />,
    },
  ];

  const stepItems = steps.map((step, index) => ({
    key: index.toString(),
    title: step.title,
    icon: step.icon,
  }));

  // 避免 SSR hydration 错误
  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* 页面头部 */}
          <Space align="baseline">
            <Title level={3}>{t('evaluation.custom_model.page_title')}</Title>
            <Paragraph className="text-gray-600">
              {t('evaluation.custom_model.description')}
            </Paragraph>
          </Space>

          {/* 步骤指示器 */}
          <Steps current={currentStep} items={stepItems} className="mb-8" />

          {/* 表单内容卡片 */}
          <Card className="shadow-lg mt-3!">
            <Form
              form={form}
              layout="vertical"
              onValuesChange={onValuesChange}
              initialValues={{
                modelApiParams: DEFAULT_MODEL_API_PARAMS,
              }}
            >
              {/* 步骤 0: 模型信息 */}
              <div hidden={currentStep !== 0}>
                <Form.Item
                  label={t('evaluation.custom_model.form.model_name')}
                  name="modelName"
                  rules={[
                    {
                      required: true,
                      message: t(
                        'evaluation.custom_model.form.model_name_required'
                      ),
                    },
                  ]}
                >
                  <Input
                    placeholder={t(
                      'evaluation.custom_model.form.model_name_placeholder'
                    )}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <span>{t('evaluation.custom_model.form.model_api_params')}</span>
                      <Typography.Text type="secondary">{t('evaluation.custom_model.form.model_api_params_hint')}</Typography.Text>
                      <Typography.Link
                        onClick={() => setApiParamsExampleModalOpen(true)}
                        style={{ fontSize: 'inherit' }}
                      >
                        {t('evaluation.custom_model.form.view_example')}
                      </Typography.Link>
                    </Space>
                  }
                  name="modelApiParams"
                  rules={[
                    { required: true, message: t('evaluation.custom_model.form.model_api_params_required') },
                    {
                      validator: (_, value) => {
                        const v = (value || '').trim();
                        if (!v) return Promise.reject(new Error(t('evaluation.custom_model.form.model_api_params_required')));
                        const result = validateModelApiParams(v);
                        if (!result.valid) return Promise.reject(new Error(result.error));
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  {isMounted ? (
                    <ApiParamsCodeEditor />
                  ) : (
                    <Input.TextArea
                      rows={12}
                      size="large"
                      showCount
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                    />
                  )}
                </Form.Item>
              </div>

              {/* 步骤 1: 选择数据集 */}
              <div hidden={currentStep !== 1}>
                <Paragraph className="mb-4">
                  {t('evaluation.custom_model.dataset_select_hint')}
                </Paragraph>

                {loadingDatasets ? (
                  <Skeleton active />
                ) : (
                  <div className="space-y-6">
                    {/* 按照分类分组展示数据集 */}
                    {Object.entries(
                      datasets.reduce((acc, dataset) => {
                        const category = dataset.category;
                        if (!acc[category]) {
                          acc[category] = [];
                        }
                        acc[category].push(dataset);
                        return acc;
                      }, {} as Record<string, Dataset[]>)
                    ).map(([category, categoryDatasets]) => {
                      const categoryName = t(`table.${category}`, { defaultValue: category });
                      const categoryIds = categoryDatasets.map((d) => d.id);
                      const selectedInCategory = categoryDatasets.filter((d) =>
                        selectedDatasets.includes(d.id)
                      );
                      const allSelected =
                        selectedInCategory.length === categoryDatasets.length;
                      const someSelected = selectedInCategory.length > 0;

                      // 全选该分类
                      const handleSelectAllCategory = (checked: boolean) => {
                        if (checked) {
                          const toAdd = categoryIds.filter(
                            (id) => !selectedDatasets.includes(id)
                          );
                          setSelectedDatasets([...selectedDatasets, ...toAdd]);
                        } else {
                          setSelectedDatasets(
                            selectedDatasets.filter((id) => !categoryIds.includes(id))
                          );
                        }
                      };

                      // 计算当前分类的总 token 数
                      const categoryTokens = categoryDatasets.reduce((sum, dataset) => {
                        return sum + (dataset.tokenEstimate || 0);
                      }, 0);

                      return (
                        <div key={category}>
                          {/* 分类标题：含全选 */}
                          <Divider titlePlacement="start">
                            <Space size="middle">
                              <Checkbox
                                checked={allSelected}
                                indeterminate={someSelected && !allSelected}
                                onChange={(e) =>
                                  handleSelectAllCategory(e.target.checked)
                                }
                              />
                              <Text strong className="text-base">
                                {categoryName}
                              </Text>
                              <Tag color="purple">
                                {t('evaluation.token_estimate')}: {categoryTokens.toLocaleString()}
                              </Tag>
                            </Space>
                          </Divider>

                          {/* 该分类下的数据集 */}
                          <Row gutter={[16, 16]}>
                            {categoryDatasets.map((dataset) => {
                              // 从数据集 ID 中提取文件名用于翻译
                              const fileName = dataset.id.split('/')[1] + '.jsonl';
                              const translatedName = t(`indicator.${fileName}`, { defaultValue: dataset.name });

                              // 动态生成数据集描述
                              const description = t('evaluation.dataset_description', { count: dataset.testCaseCount });

                              return (
                                <Col key={dataset.id} xs={24} sm={12} lg={8}>
                                  <Card
                                    size="small"
                                    className={cn(
                                      'cursor-pointer transition-all duration-200 h-full',
                                      selectedDatasets.includes(dataset.id)
                                        ? 'border-2 border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                                        : 'border border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                    )}
                                    onClick={() => {
                                      if (selectedDatasets.includes(dataset.id)) {
                                        setSelectedDatasets(
                                          selectedDatasets.filter((id) => id !== dataset.id)
                                        );
                                      } else {
                                        setSelectedDatasets([...selectedDatasets, dataset.id]);
                                      }
                                    }}
                                  >
                                    <div className="flex flex-col h-full">
                                      <Space className="mb-2">
                                        <Checkbox
                                          checked={selectedDatasets.includes(dataset.id)}
                                          className="mr-2 mt-1"
                                        />
                                        <Text strong className="flex-1">{translatedName}</Text>
                                      </Space>
                                      <div className="text-gray-600 text-sm mb-3 flex-1">
                                        {description}
                                      </div>
                                      <div className="flex justify-between">
                                        <Tag color="purple" className="w-fit">
                                          {t('evaluation.token_estimate')}: {dataset.tokenEstimate?.toLocaleString()}
                                        </Tag>
                                        <a
                                          href={dataset.githubLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-blue-500 hover:text-blue-700 text-sm"
                                        >
                                          <GithubOutlined /> {t('evaluation.view_dataset')}
                                        </a>
                                      </div>
                                    </div>
                                  </Card>
                                </Col>
                              );
                            })}
                          </Row>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedDatasets.length > 0 && (
                  <Alert
                    type="info"
                    message={
                      <div>
                        {t('evaluation.selected_datasets')}: {selectedDatasets.length}{' '}
                        {t('evaluation.estimated_tokens')}:{' '}
                        {totalTokens.toLocaleString()}
                      </div>
                    }
                    className="mt-4!"
                  />
                )}

                {selectedDatasets.length === 0 && (
                  <Alert
                    type="error"
                    message={t('evaluation.custom_model.error.no_dataset_selected')}
                    className="mt-4!"
                  />
                )}

                <Alert
                  type="warning"
                  description={t('evaluation.custom_model.warning.balance_description')}
                  showIcon
                  className="mt-4!"
                />
              </div>

              {/* 步骤 2: 结果接收邮箱和确认提交 */}
              <div hidden={currentStep !== 2}>
                {/* 配置信息总览 */}
                <Title level={4} className="mb-4">
                  {t('evaluation.confirm_title')}
                </Title>

                <Descriptions column={1} bordered className="mb-6!">
                  <Descriptions.Item
                    label={t('evaluation.custom_model.form.model_name')}
                  >
                    {form.getFieldValue('modelName')}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={t('evaluation.custom_model.form.model_api_params')}
                  >
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border max-h-48 overflow-y-auto">
                      {form.getFieldValue('modelApiParams') || ''}
                    </pre>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={t('evaluation.custom_model.form.datasets')}
                  >
                    <Space wrap>
                      {selectedDatasets.map((id) => {
                        const dataset = datasets.find((d) => d.id === id);
                        if (!dataset) return null;

                        // 从数据集 ID 中提取文件名用于翻译
                        const fileName = id.split('/')[1] + '.jsonl';
                        const translatedName = t(`indicator.${fileName}`, { defaultValue: dataset.name });

                        return (
                          <Tag key={id} color="blue">
                            {translatedName}
                          </Tag>
                        );
                      })}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>

                {/* 邮箱验证码组件 */}
                <EmailVerificationInput
                  form={form}
                  emailFieldName="resultEmail"
                  codeFieldName="verificationCode"
                  emailLabel={t('evaluation.custom_model.form.result_email')}
                  size="large"
                  countdownSeconds={60}
                  showCodeHint={true}
                />

                <Alert
                  type="info"
                  message={t('evaluation.custom_model.email_hint')}
                  showIcon
                />
              </div>
            </Form>

            <ApiParamsExampleModal
              open={apiParamsExampleModalOpen}
              onClose={() => setApiParamsExampleModalOpen(false)}
            />

            {/* 底部操作按钮 */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                disabled={currentStep === 0}
                onClick={handlePrev}
                size="large"
              >
                {t('common.prev')}
              </Button>
              {currentStep < 2 ? (
                <Button
                  type="primary"
                  onClick={handleNext}
                  disabled={
                    currentStep === 1 && selectedDatasets.length === 0
                  }
                  size="large"
                >
                  {t('common.next')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={async () => {
                    try {
                      // 验证邮箱和验证码
                      await form.validateFields(['resultEmail', 'verificationCode']);
                      handleSubmit();
                    } catch (error) {
                      console.error('Validation failed:', error);
                    }
                  }}
                  loading={submitting}
                  size="large"
                >
                  {t('evaluation.submit_button')}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomModelEvaluationPage;
