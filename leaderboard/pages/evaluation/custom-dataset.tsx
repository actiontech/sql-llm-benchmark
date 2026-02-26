import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GetStaticProps } from 'next';
import fs from 'fs';
import path from 'path';
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
  Upload,
  Radio,
  Divider,
  Row,
  Col,
  Progress,
} from 'antd';
import {
  UserOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { useFormPersist } from '../../hooks/useFormPersist';
import { formatFileSize } from '../../utils/evaluationUtils';
import Header from '../../components/Header';
import { LogoImage } from '../../components/LogoImage';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  submitCustomDatasetEvaluation,
  getLeaderboardModels,
  type BusinessInfo,
  type EvaluationConfig,
  type LeaderboardModel,
} from '@/services/evaluation';
import { EmailVerificationInput } from '@/components/Evaluation';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

/**
 * 表单值类型
 * 包含商业信息、测评配置和自定义模型需求
 */
interface FormValues extends BusinessInfo, EvaluationConfig {
  /** 用户希望支持的自定义模型需求（可选，用分号分割的模型名称） */
  customModelsRequest?: string;
  /** 邮箱验证码 */
  verificationCode: string;
}

/** 自定义数据集测评页的静态 props（仅组织者 logo，来自 public/logos） */
interface CustomDatasetPageProps {
  logoInfo: Record<string, string>;
}

const CustomDatasetEvaluationPage: React.FC<CustomDatasetPageProps> = ({
  logoInfo = {},
}) => {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const { onValuesChange, clearDraft } = useFormPersist('custom_dataset', form);
  const prevLangRef = useRef(i18n.language);

  const [isMounted, setIsMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectAllModels, setSelectAllModels] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [leaderboardModels, setLeaderboardModels] = useState<LeaderboardModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // 获取榜单模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const data = await getLeaderboardModels();
        setLeaderboardModels(data.models);
      } catch (error) {
        // 错误已被 Service 层统一处理（显示通知）
        console.error('Failed to fetch models:', error);
        setLeaderboardModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [t]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 中英文切换时，将 targetPrompt、judgePrompt 重置为当前语言的默认值
  const currentLanguage = i18n.language;
  useEffect(() => {
    if (prevLangRef.current !== currentLanguage) {
      prevLangRef.current = currentLanguage;
      form.setFieldValue('targetPrompt', t('evaluation.custom_dataset.form.target_prompt_default'));
      form.setFieldValue('judgePrompt', t('evaluation.custom_dataset.form.judge_prompt_default'));
    }
  }, [currentLanguage]);

  // 监听当前选择的裁判方式，用于只展示对应说明
  const currentJudgeMode = Form.useWatch('judgeMode', form);

  // 切换到主观/混合时，若裁判提示词为空则填充默认值
  useEffect(() => {
    if (
      (currentJudgeMode === 'subjective' || currentJudgeMode === 'hybrid') &&
      !form.getFieldValue('judgePrompt')
    ) {
      form.setFieldValue(
        'judgePrompt',
        t('evaluation.custom_dataset.form.judge_prompt_default')
      );
    }
  }, [currentJudgeMode]);

  // 按厂商分组模型
  const groupedModels = useMemo(() => {
    const groups = new Map<string, LeaderboardModel[]>();

    leaderboardModels.forEach((model) => {
      const org = model.organization || t('common.unknown_vendor');
      if (!groups.has(org)) {
        groups.set(org, []);
      }
      groups.get(org)!.push(model);
    });

    // 转换为数组并排序
    return Array.from(groups.entries());
  }, [leaderboardModels, t]);

  if (!isMounted) {
    return null;
  }

  // 处理全选模型
  const handleSelectAllModels = (checked: boolean) => {
    setSelectAllModels(checked);
    if (checked) {
      setSelectedModels(leaderboardModels.map((m) => m.id));
    } else {
      setSelectedModels([]);
    }
  };

  // 处理模型选择变化
  const handleModelsChange = (checkedValues: string[]) => {
    setSelectedModels(checkedValues);
    setSelectAllModels(checkedValues.length === leaderboardModels.length);
  };

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.jsonl,.csv',
    maxCount: 1,
    fileList,
    beforeUpload: (file: File) => {
      // 验证文件类型
      const isValidType =
        file.type === 'text/csv' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.jsonl');

      if (!isValidType) {
        message.error(t('evaluation.custom_dataset.error.invalid_file_type'));
        return Upload.LIST_IGNORE;
      }

      // 验证文件大小 (20MB)
      const isLt20M = file.size / 1024 / 1024 < 20;
      if (!isLt20M) {
        message.error(t('evaluation.custom_dataset.error.file_too_large'));
        return Upload.LIST_IGNORE;
      }

      // 保存原始文件对象
      setDatasetFile(file);

      // 构建 UploadFile 对象用于显示
      const uploadFile: UploadFile = {
        uid: file.name + Date.now(),
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
        originFileObj: file as any,
      };

      setFileList([uploadFile]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
      setDatasetFile(null);
    },
  };

  // 处理下一步
  const handleNext = async () => {
    try {
      // 根据当前步骤验证对应字段
      if (currentStep === 0) {
        // Step 0: 验证数据集配置
        await form.validateFields(['judgeMode']);

        // 业务逻辑验证
        if (fileList.length === 0) {
          message.error(t('evaluation.custom_dataset.error.no_file'));
          return;
        }
        if (selectedModels.length === 0) {
          message.error(t('evaluation.custom_dataset.error.no_model'));
          return;
        }
      } else if (currentStep === 1) {
        // Step 1: 验证商业信息（不包含邮箱和验证码）
        await form.validateFields(['name', 'phone', 'company']);
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
    setUploadProgress(0);

    try {
      const values = form.getFieldsValue();

      // 准备商业信息
      const businessInfo: BusinessInfo = {
        name: values.name,
        phone: values.phone,
        company: values.company,
        email: values.email,
      };

      // 准备测评配置
      const evaluationConfig: EvaluationConfig = {
        datasetName: values.datasetName,
        datasetDescription: values.datasetDescription,
        judgeMode: values.judgeMode,
        targetPrompt: values.targetPrompt,
        judgePrompt: values.judgePrompt,
      };

      // 检查文件是否存在
      if (!datasetFile) {
        message.error(t('evaluation.custom_dataset.error.no_file'));
        return;
      }

      // 使用封装的 API 方法，错误已被统一拦截
      const result = await submitCustomDatasetEvaluation({
        datasetFile: datasetFile,
        businessInfo,
        selectedModels,
        customModelsRequest: values.customModelsRequest,
        evaluationConfig,
        verificationCode: values.verificationCode,
        onProgress: (percent) => setUploadProgress(percent),
      });

      // 只处理成功场景
      Modal.success({
        title: t('evaluation.success.submit_success'),
        content: (
          <div>
            <p>{t('evaluation.success.estimated_duration')}</p>
            <p>
              {t('evaluation.result_email_hint')}: {values.email}
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
        console.error('Submit error:', error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 步骤配置
  const steps = [
    {
      title: t('evaluation.custom_dataset.steps.dataset_config'),
      icon: <DatabaseOutlined />,
    },
    {
      title: t('evaluation.custom_dataset.steps.business_info'),
      icon: <UserOutlined />,
    },
    {
      title: t('evaluation.custom_dataset.steps.confirm_and_email'),
      icon: <CheckCircleOutlined />,
    },
  ];

  const stepItems = steps.map((step, index) => ({
    key: index.toString(),
    title: step.title,
    icon: step.icon,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* 页面头部 */}
          <Space align="baseline">

            <Title level={2}>{t('evaluation.custom_dataset.page_title')}</Title>
            <Paragraph className="text-gray-600">
              {t('evaluation.custom_dataset.description')}
            </Paragraph>
          </Space>

          {/* 步骤指示器 */}
          <Steps current={currentStep} items={stepItems} className="mb-8" />

          {/* 表单内容卡片 */}
          <Card className="shadow-lg mt-3!">
            {/* 表单内容区域 */}
            <div className="pr-2">
              <Form
                form={form}
                layout="vertical"
                onValuesChange={onValuesChange}
                initialValues={{
                  // judgeMode: 'objective',
                  datasetDescription: t('evaluation.custom_dataset.form.dataset_description_placeholder'),
                  // targetPrompt: `${t('evaluation.custom_dataset.form.example_prefix')}${t('evaluation.custom_dataset.form.target_prompt_default')}`,
                  // judgePrompt: `${t('evaluation.custom_dataset.form.example_prefix')}${t('evaluation.custom_dataset.form.judge_prompt_default')}`,
                }}
              >
                {/* 步骤 0: 数据集与模型配置 */}
                <div hidden={currentStep !== 0} >
                  {/* 数据集上传 */}
                  <Form.Item
                    label={t('evaluation.custom_dataset.form.dataset_file')}
                    required
                  >
                    <Dragger {...uploadProps}>
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        {t('evaluation.custom_dataset.upload.click_or_drag')}
                      </p>
                      <p className="ant-upload-hint">
                        {t('evaluation.custom_dataset.upload.hint')}
                      </p>
                    </Dragger>
                  </Form.Item>

                  {/* 数据集名称（可选） */}
                  <Form.Item
                    label={t('evaluation.custom_dataset.form.dataset_name')}
                    name="datasetName"
                    tooltip={t('evaluation.custom_dataset.form.dataset_name_tooltip')}
                  >
                    <Input
                      placeholder={t('evaluation.custom_dataset.form.dataset_name_placeholder')}
                      maxLength={100}
                      showCount
                    />
                  </Form.Item>

                  {/* 数据集描述：紧挨数据集名称下方 */}
                  <Form.Item
                    label={t('evaluation.custom_dataset.form.dataset_description')}
                    name="datasetDescription"
                    rules={[
                      {
                        required: true,
                        message: t(
                          'evaluation.custom_dataset.form.dataset_description_required'
                        ),
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>

                  {/* <Divider>{t('evaluation.custom_dataset.model_select_title')}</Divider> */}

                  {/* 榜单模型选择 */}
                  <div className="mb-6">
                    <Text strong className="mb-2 block">
                      {t('evaluation.custom_dataset.leaderboard_models')}
                      {loadingModels && (
                        <Text type="secondary" className="ml-2">
                          ({t('common.loading')}...)
                        </Text>
                      )}
                      {!loadingModels && leaderboardModels.length > 0 && (
                        <Text type="secondary" className="ml-2">
                          ({leaderboardModels.length} {t('common.items')})
                        </Text>
                      )}
                    </Text>
                    {!loadingModels && leaderboardModels.length === 0 ? (
                      <Alert
                        message={t('evaluation.custom_dataset.no_models_available')}
                        type="warning"
                        showIcon
                        className="mb-3"
                      />
                    ) : (
                      <>
                        <Checkbox
                          checked={selectAllModels}
                          onChange={(e) => handleSelectAllModels(e.target.checked)}
                          className="mb-3!"
                          disabled={loadingModels || leaderboardModels.length === 0}
                        >
                          {t('common.select_all')}
                        </Checkbox>
                        <Checkbox.Group
                          value={selectedModels}
                          onChange={handleModelsChange}
                          className="w-full block!"
                          disabled={loadingModels}
                        >
                          {groupedModels.map(([organization, models], index) => (
                            <Row
                              key={organization}
                              gutter={[16, 12]}
                              align="top"
                              className={cn(
                                index < groupedModels.length - 1 &&
                                'mb-5 pb-4 border-b border-gray-200'
                              )}
                            >
                              <Col flex="0 0 120px" >
                                <LogoImage
                                  organization={organization}
                                  logoInfo={logoInfo}
                                  width={100}
                                  height={24}
                                  style={{ objectFit: 'contain', objectPosition: 'left' }}
                                />
                              </Col>
                              <Col flex="1">
                                <Row gutter={[16, 12]}>
                                  {models.map((model) => (
                                    <Col span={8} key={model.id}>
                                      <Checkbox value={model.id}>{model.name}</Checkbox>
                                    </Col>
                                  ))}
                                </Row>
                              </Col>
                            </Row>
                          ))}
                        </Checkbox.Group>
                      </>
                    )}
                  </div>

                  {/* 自定义模型需求 */}
                  <div className="mb-6">
                    <Form.Item
                      label={t('evaluation.custom_dataset.custom_models_request')}
                      name="customModelsRequest"
                      tooltip={t('evaluation.custom_dataset.custom_models_request_tooltip')}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder={t('evaluation.custom_dataset.custom_models_request_placeholder')}
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>
                  </div>

                  {/* <Divider>{t('evaluation.custom_dataset.evaluation_config')}</Divider> */}

                  {/* <Form.Item
                    label={t('evaluation.custom_dataset.form.judge_mode')}
                    name="judgeMode"
                    rules={[
                      {
                        required: true,
                        message: t(
                          'evaluation.custom_dataset.form.judge_mode_required'
                        ),
                      },
                    ]}
                  >
                    <Radio.Group>
                      <Radio value="objective">
                        {t('evaluation.custom_dataset.judge_mode.objective')}
                      </Radio>
                      <Radio value="subjective">
                        {t('evaluation.custom_dataset.judge_mode.subjective')}
                      </Radio>
                      <Radio value="hybrid">
                        {t('evaluation.custom_dataset.judge_mode.mixed')}
                      </Radio>
                    </Radio.Group>
                  </Form.Item>

                  评估方式说明：仅展示当前选择的方式
                  {currentJudgeMode && (
                    <Alert
                      type="info"
                      className="mb-4!"
                      message={
                        (() => {
                          const detailKey =
                            currentJudgeMode === 'objective'
                              ? 'objective_detail'
                              : currentJudgeMode === 'subjective'
                                ? 'subjective_detail'
                                : 'mixed_detail';
                          return (
                            <div className="text-sm">
                              <div className="font-medium">
                                {t(`evaluation.custom_dataset.judge_mode.${detailKey}.title`)}
                              </div>
                              <div className="text-gray-600 mt-1">
                                <strong>
                                  {t('evaluation.custom_dataset.judge_mode.feature_label')}
                                </strong>{' '}
                                {t(`evaluation.custom_dataset.judge_mode.${detailKey}.feature`)}
                                <br />
                                <strong>
                                  {t('evaluation.custom_dataset.judge_mode.scenario_label')}
                                </strong>{' '}
                                {t(`evaluation.custom_dataset.judge_mode.${detailKey}.scenario`)}
                                <br />
                                <strong>
                                  {t('evaluation.custom_dataset.judge_mode.method_label')}
                                </strong>{' '}
                                {t(`evaluation.custom_dataset.judge_mode.${detailKey}.method`)}
                              </div>
                            </div>
                          );
                        })()
                      }
                    />
                  )}

                  <Form.Item
                    label={t('evaluation.custom_dataset.form.target_prompt')}
                    name="targetPrompt"
                    tooltip={
                      {
                        title: <span className="whitespace-pre-line">
                          {t('evaluation.custom_dataset.form.target_prompt_tooltip')}
                        </span>,
                        classNames: {
                          root: 'max-w-100! w-100!',
                        }
                      }
                    }
                  >
                    <Input.TextArea
                      rows={8}
                      placeholder={t('evaluation.custom_dataset.form.target_prompt_placeholder')}
                    />
                  </Form.Item>

                  裁判提示词：仅在主观或混合裁判方式时显示
                  {(currentJudgeMode === 'subjective' || currentJudgeMode === 'hybrid') && (
                    <Form.Item
                      label={t('evaluation.custom_dataset.form.judge_prompt')}
                      name="judgePrompt"
                      tooltip={t('evaluation.custom_dataset.form.judge_prompt_placeholder')}
                    >
                      <Input.TextArea
                        rows={10}
                        placeholder={t('evaluation.custom_dataset.form.judge_prompt_placeholder')}
                      />
                    </Form.Item>
                  )} */}
                </div>

                {/* 步骤 1: 商业信息 */}
                <div hidden={currentStep !== 1} >
                  <Form.Item
                    label={t('evaluation.custom_dataset.form.name')}
                    name="name"
                    rules={[
                      {
                        required: true,
                        message: t(
                          'evaluation.custom_dataset.form.name_required'
                        ),
                      },
                    ]}
                  >
                    <Input size="large" />
                  </Form.Item>

                  <Form.Item
                    label={t('evaluation.custom_dataset.form.phone')}
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: t(
                          'evaluation.custom_dataset.form.phone_required'
                        ),
                      },
                      {
                        pattern: /^1[3-9]\d{9}$/,
                        message: t(
                          'evaluation.custom_dataset.form.phone_invalid'
                        ),
                      },
                    ]}
                  >
                    <Input size="large" />
                  </Form.Item>

                  <Form.Item
                    label={t('evaluation.custom_dataset.form.company')}
                    name="company"
                    rules={[
                      {
                        required: true,
                        message: t(
                          'evaluation.custom_dataset.form.company_required'
                        ),
                      },
                    ]}
                  >
                    <Input size="large" />
                  </Form.Item>

                  <Alert
                    type="info"
                    message={t('evaluation.custom_dataset.business_info_hint')}
                    showIcon
                  />
                </div>

                {/* 步骤 2: 结果确认与接收 */}
                <div hidden={currentStep !== 2} >
                  <Title level={4} className="mb-4">
                    {t('evaluation.confirm_title')}
                  </Title>

                  <Descriptions column={1} bordered className="mb-6!">
                    <Descriptions.Item
                      label={t('evaluation.custom_dataset.form.company')}
                    >
                      {form.getFieldValue('company')}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('evaluation.custom_dataset.contact')}>
                      {form.getFieldValue('name')} ({form.getFieldValue('phone')})
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('evaluation.custom_dataset.form.dataset_file')}
                    >
                      {fileList[0]?.name} ({formatFileSize(fileList[0]?.size || 0)})
                    </Descriptions.Item>
                    {form.getFieldValue('datasetName') && (
                      <Descriptions.Item
                        label={t('evaluation.custom_dataset.form.dataset_name')}
                      >
                        {form.getFieldValue('datasetName')}
                      </Descriptions.Item>
                    )}
                    {form.getFieldValue('datasetDescription') && (
                      <Descriptions.Item
                        label={t('evaluation.custom_dataset.form.dataset_description')}
                      >
                        {form.getFieldValue('datasetDescription')}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item
                      label={t('evaluation.custom_dataset.evaluation_models')}
                    >
                      <div>
                        {selectedModels.length > 0 && (
                          <div>
                            {t('evaluation.custom_dataset.leaderboard_models')}:{' '}
                            {selectedModels
                              .map((id) => leaderboardModels.find((m) => m.id === id)?.name ?? id)
                              .join('、')}
                          </div>
                        )}
                        {form.getFieldValue('customModelsRequest') && (
                          <div>
                            {t('evaluation.custom_dataset.custom_models_request')}:{' '}
                            {form.getFieldValue('customModelsRequest')}
                          </div>
                        )}
                      </div>
                    </Descriptions.Item>
                    {/* 表单中已注释，结果展示暂不显示
                    <Descriptions.Item
                      label={t('evaluation.custom_dataset.form.judge_mode')}
                    >
                      {form.getFieldValue('judgeMode') &&
                        t(`evaluation.custom_dataset.judge_mode.${form.getFieldValue('judgeMode')}`)}
                    </Descriptions.Item>
                    {form.getFieldValue('targetPrompt') && (
                      <Descriptions.Item
                        label={t('evaluation.custom_dataset.form.target_prompt')}
                      >
                        <div className="whitespace-pre-wrap">{form.getFieldValue('targetPrompt')}</div>
                      </Descriptions.Item>
                    )}
                    {form.getFieldValue('judgePrompt') &&
                      (form.getFieldValue('judgeMode') === 'subjective' ||
                        form.getFieldValue('judgeMode') === 'hybrid') && (
                        <Descriptions.Item
                          label={t('evaluation.custom_dataset.form.judge_prompt')}
                        >
                          <div className="whitespace-pre-wrap">{form.getFieldValue('judgePrompt')}</div>
                        </Descriptions.Item>
                      )}
                    */}
                  </Descriptions>

                  {/* 邮箱验证码组件 */}
                  <EmailVerificationInput
                    form={form}
                    emailFieldName="email"
                    codeFieldName="verificationCode"
                    size="large"
                    countdownSeconds={60}
                    showCodeHint={true}
                  />

                  <Alert
                    type="info"
                    message={t('evaluation.custom_dataset.email_hint')}
                    showIcon
                  />

                  {submitting && uploadProgress > 0 && (
                    <div className="mt-4">
                      <Progress percent={uploadProgress} status="active" />
                    </div>
                  )}
                </div>
              </Form>
            </div>

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
                <Button type="primary" onClick={handleNext} size="large">
                  {t('common.next')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={async () => {
                    try {
                      // 验证邮箱和验证码
                      await form.validateFields(['email', 'verificationCode']);
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

export const getStaticProps: GetStaticProps<CustomDatasetPageProps> = async () => {
  const logosDir = path.join(process.cwd(), 'public', 'logos');
  const logoInfo: Record<string, string> = {};
  if (fs.existsSync(logosDir)) {
    const logoFiles = fs.readdirSync(logosDir);
    logoFiles.forEach((file) => {
      const name = path.parse(file).name;
      const ext = path.parse(file).ext.substring(1);
      if (!logoInfo[name] || ext === 'svg') {
        logoInfo[name] = ext;
      }
    });
  }
  return {
    props: { logoInfo },
  };
};

export default CustomDatasetEvaluationPage;
