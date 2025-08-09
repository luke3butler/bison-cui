import React from 'react';
import { detectLanguageFromPath } from '../../../utils/language-detection';
import { CodeHighlight } from '../../CodeHighlight';
import { DiffViewer } from './DiffViewer';
import { ToolCollapse } from '../ToolCollapse';

interface EditToolProps {
  input: any;
  result: string;
  isMultiEdit?: boolean;
  workingDirectory?: string;
}

export function EditTool({ input, result, isMultiEdit = false, workingDirectory }: EditToolProps) {
  // 从文件路径检测语言
  const filePath = input?.file_path || '';
  const language = detectLanguageFromPath(filePath);
  
  const renderContent = () => {
    // For MultiEdit, process all edits
    if (isMultiEdit && input.edits && Array.isArray(input.edits)) {
      return (
        <div className="flex flex-col gap-1">
          {input.edits.map((edit: any, index: number) => (
            <div key={index}>
              <DiffViewer
                oldValue={edit.old_string || ''}
                newValue={edit.new_string || ''}
                language={language}
              />
              {index < input.edits.length - 1 && (
                <div className="h-2" />
              )}
            </div>
          ))}
        </div>
      );
    }

    // For regular Edit, process single edit
    if (input.old_string !== undefined && input.new_string !== undefined) {
      return (
        <DiffViewer
          oldValue={input.old_string}
          newValue={input.new_string}
          language={language}
        />
      );
    }

    // Fallback if we can't parse the edit
    return result ? (
      <CodeHighlight
        code={result}
        language={language}
        className="bg-neutral-950 rounded-xl overflow-hidden"
      />
    ) : (
      <div className="bg-neutral-950 rounded-xl overflow-hidden">
        <pre className="p-3 m-0 text-neutral-200 font-mono text-xs leading-6">Edit completed successfully</pre>
      </div>
    );
  };

  return (
    <ToolCollapse 
      summaryText="File changes"
      toolName="EditTool"
      ariaLabel="Toggle file changes"
    >
      {renderContent()}
    </ToolCollapse>
  );
}