import React from 'react';
import { Modal, Table, Button } from 'antd';
import { useTranslation } from 'react-i18next';

/** 示例弹窗参数行：参数 key、i18n meaning key、示例文案 */
const API_PARAMS_EXAMPLE_ROWS: { key: string; meaningKey: string; example: string }[] = [
  { key: 'openai_api_base', meaningKey: 'api_params_param_openai_api_base_meaning', example: 'openai_api_base="https://internlm-chat.intern-ai.org.cn/puyu/api/v1/"' },
  { key: 'key', meaningKey: 'api_params_param_key_meaning', example: 'key="Your API token"' },
  { key: 'model', meaningKey: 'api_params_param_model_meaning', example: 'model="internlm2.5-latest"' },
  { key: 'batch_size', meaningKey: 'api_params_param_batch_size_meaning', example: 'batch_size=2' },
];

export interface ApiParamsExampleModalProps {
  open: boolean;
  onClose: () => void;
}

function ApiParamsExampleModal({ open, onClose }: ApiParamsExampleModalProps) {
  const { t } = useTranslation('common');

  return (
    <Modal
      title={t('evaluation.custom_model.form.api_params_example_modal_title')}
      open={open}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          {t('evaluation.custom_model.form.api_params_example_modal_ok')}
        </Button>
      }
      width={900}
      destroyOnClose
    >
      <Table
        dataSource={API_PARAMS_EXAMPLE_ROWS}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: t('evaluation.custom_model.form.api_params_example_param_name'),
            dataIndex: 'key',
            key: 'key',
            render: (key: string) => <code>{key}</code>,
            width: 140,
          },
          {
            title: t('evaluation.custom_model.form.api_params_example_meaning'),
            dataIndex: 'meaningKey',
            key: 'meaning',
            render: (meaningKey: string) => t(`evaluation.custom_model.form.${meaningKey}`),
          },
          {
            title: t('evaluation.custom_model.form.api_params_example_value'),
            dataIndex: 'example',
            key: 'example',
            render: (example: string) => <code className="text-sm whitespace-nowrap">{example}</code>,
          },
        ]}
      />
    </Modal>
  );
}

export default ApiParamsExampleModal