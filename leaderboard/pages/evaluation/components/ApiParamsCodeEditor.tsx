import React from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/themes/prism-tomorrow.css';

/** 与 Form.Item 受控联动的 API 参数代码编辑器（bash 风格高亮） */
function ApiParamsCodeEditor({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <Editor
      value={value ?? ''}
      onValueChange={(code) => onChange?.(code)}
      highlight={(code) => Prism.highlight(code, Prism.languages.bash, 'bash')}
      padding={12}
      style={{
        fontFamily: '"Fira code", "Fira Mono", Consolas, Monaco, "Andale Mono", monospace',
        fontSize: 13,
        minHeight: 280,
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        backgroundColor: '#fff',
      }}
      textareaClassName="!text-transparent caret-[#d4d4d4] resize-none"
      preClassName="m-0 pointer-events-none"
    />
  );
}

export default ApiParamsCodeEditor