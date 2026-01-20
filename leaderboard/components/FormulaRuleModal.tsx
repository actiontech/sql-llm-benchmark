import React from 'react';
import { Modal, Button, Typography } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface FormulaRuleModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FormulaRuleModal: React.FC<FormulaRuleModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation('common');

  const renderFormulaContent = () => (
    <div>
      <Typography.Title level={4} style={{ marginBottom: '8px' }}>
        {t('evaluation_cases.formula_tip.title')}
      </Typography.Title>
      <ol style={{ paddingLeft: '20px', margin: 0 }}>
        <li>
          <Typography.Text strong>
            {t('evaluation_cases.formula_tip.basic_elements.title')}:
          </Typography.Text>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>{t('evaluation_cases.formula_tip.basic_elements.item1')}</li>
            <li>{t('evaluation_cases.formula_tip.basic_elements.item2')}</li>
            <li>{t('evaluation_cases.formula_tip.basic_elements.item3')}</li>
          </ul>
        </li>
        <li>
          <Typography.Text strong>
            {t('evaluation_cases.formula_tip.weight_settings.title')}:
          </Typography.Text>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>{t('evaluation_cases.formula_tip.weight_settings.item1')}</li>
            <li>{t('evaluation_cases.formula_tip.weight_settings.item2')}</li>
          </ul>
        </li>
        <li>
          <Typography.Text strong>
            {t('evaluation_cases.formula_tip.scoring_steps.title')}:
          </Typography.Text>
          <ol type="a" style={{ paddingLeft: '20px', margin: 0 }}>
            <li>{t('evaluation_cases.formula_tip.scoring_steps.item1')}</li>
            <li>{t('evaluation_cases.formula_tip.scoring_steps.item2')}</li>
            <li>{t('evaluation_cases.formula_tip.scoring_steps.item3')}</li>
            <li>{t('evaluation_cases.formula_tip.scoring_steps.item4')}</li>
            <li>{t('evaluation_cases.formula_tip.scoring_steps.item5')}</li>
          </ol>
        </li>
        <li>
          <Typography.Text strong>
            {t('evaluation_cases.formula_tip.special_cases.title')}:
          </Typography.Text>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>{t('evaluation_cases.formula_tip.special_cases.item1')}</li>
            <li>{t('evaluation_cases.formula_tip.special_cases.item2')}</li>
          </ul>
        </li>
        <li>
          <Typography.Text strong>
            {t('evaluation_cases.formula_tip.example.title')}:
          </Typography.Text>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>{t('evaluation_cases.formula_tip.example.item1')}</li>
            <li>{t('evaluation_cases.formula_tip.example.item2')}</li>
            <li>{t('evaluation_cases.formula_tip.example.item3')}</li>
            <li>{t('evaluation_cases.formula_tip.example.item4')}</li>
            <li>{t('evaluation_cases.formula_tip.example.item5')}</li>
          </ul>
        </li>
      </ol>
    </div>
  );

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('actions.close')}
        </Button>,
      ]}
      width="30%"
      style={{ top: 50 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FormOutlined />
          <Text strong>{t('evaluation_cases.formula_button')}</Text>
        </div>
      }
    >
      {renderFormulaContent()}
    </Modal>
  );
};
