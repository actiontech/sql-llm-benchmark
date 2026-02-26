import React from 'react';
import { Modal, Card, Typography, Row, Col, Divider } from 'antd';
import {
  RobotOutlined,
  DatabaseOutlined,
  MailOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

const { Title, Paragraph, Text } = Typography;

interface EvaluationTypeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EvaluationTypeModal: React.FC<EvaluationTypeModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const { t } = useTranslation('common');

  const handleCustomModelClick = () => {
    onClose();
    router.push('/evaluation/custom-model');
  };

  const handleCustomDatasetClick = () => {
    onClose();
    router.push('/evaluation/custom-dataset');
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
      className="[&_.ant-modal-content]:rounded-3xl [&_.ant-modal-content]:shadow-2xl"
    >
      <div className="py-4">
        <header className="text-center mb-8">
          <Title level={3} className="text-center mb-0">
            {t('evaluation.modal_title')}
          </Title>
        </header>

        <Row gutter={24}>
          {/* 场景一: 自定义模型测评 */}
          <Col xs={24} md={12}>
            <Card
              hoverable
              onClick={handleCustomModelClick}
              className={cn(
                'group h-full cursor-pointer',
                'bg-white border-[2px] border-gray-100',
                'rounded-2xl p-8',
                'transition-all duration-300',
                'hover:border-blue-500! hover:shadow-2xl'
              )}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    'w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-6',
                    'group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white',
                    'transition-all duration-300'
                  )}
                >
                  <RobotOutlined style={{ fontSize: 40 }} />
                </div>
                <Title level={5} className="mb-3">
                  {t('evaluation.custom_model.title')}
                </Title>
                <div className="mb-4 px-3 py-2 bg-blue-50/50 rounded-xl text-left w-full min-h-[72px] flex items-center">
                  <Text className=" text-blue-800!">
                    {t('evaluation.custom_model.goal')}
                  </Text>
                </div>
                <ul className="list-none pl-0 space-y-3 mb-8 text-left w-full  text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-blue-500! shrink-0" />
                    {t('evaluation.custom_model.desc_1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-blue-500! shrink-0" />
                    {t('evaluation.custom_model.desc_2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-blue-500! shrink-0" />
                    {t('evaluation.custom_model.desc_3')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-blue-500! shrink-0" />
                    {t('evaluation.custom_model.desc_4')}
                  </li>
                </ul>
                <div
                  className={cn(
                    'mt-auto w-full px-6 py-2.5 text-center',
                    'bg-blue-500 text-white',
                    'rounded-md',
                    'hover:bg-blue-600',
                    'transition-colors duration-200'
                  )}
                >
                  {t('evaluation.create_button')}
                </div>
              </div>
            </Card>
          </Col>

          {/* 场景二: 自定义数据集测评 */}
          <Col xs={24} md={12}>
            <Card
              hoverable
              onClick={handleCustomDatasetClick}
              className={cn(
                'group h-full cursor-pointer',
                'bg-white border-[2px] border-gray-100',
                'rounded-2xl p-8',
                'transition-all duration-300',
                'hover:border-green-500! hover:shadow-2xl'
              )}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    'w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-600 mb-6',
                    'group-hover:scale-110 group-hover:bg-green-600 group-hover:text-white',
                    'transition-all duration-300'
                  )}
                >
                  <DatabaseOutlined style={{ fontSize: 40 }} />
                </div>
                <Title level={5} className="mb-3">
                  {t('evaluation.custom_dataset.title')}
                </Title>
                <div className="mb-4 px-3 py-2 bg-green-50/50 rounded-xl text-left w-full min-h-[72px] flex items-center">
                  <Text className=" text-green-800!">
                    {t('evaluation.custom_dataset.goal')}
                  </Text>
                </div>
                <ul className="list-none pl-0 space-y-3 mb-8 text-left w-full  text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-green-500! shrink-0" />
                    {t('evaluation.custom_dataset.desc_1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-green-500! shrink-0" />
                    {t('evaluation.custom_dataset.desc_2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-green-500! shrink-0" />
                    {t('evaluation.custom_dataset.desc_3')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-green-500! shrink-0" />
                    {t('evaluation.custom_dataset.desc_4')}
                  </li>
                </ul>
                <div
                  className={cn(
                    'mt-auto w-full px-6 py-2.5 text-center',
                    'bg-green-500 text-white',
                    'rounded-md',
                    'hover:bg-green-600',
                    'transition-colors duration-200'
                  )}
                >
                  {t('evaluation.create_button')}
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Divider className="my-6" />

        {/* 商业信息和联系方式 */}
        <div className="px-4">
          <div className="bg-gray-50 rounded-lg p-5">
            <Paragraph className="text-gray-700  mb-3 text-center">
              {t('evaluation.commercial_info')}
            </Paragraph>
            <div
              className={cn(
                'flex items-center justify-center gap-2 text-base w-66 m-auto',
                'border border-gray-200 bg-white rounded-3xl px-4 py-1',
                'transition-shadow duration-200 hover:shadow-md'
              )}
            >
              <MailOutlined className="text-blue-500!" />
              <Text strong className="text-gray-800 ">
                {t('evaluation.contact_email')}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
