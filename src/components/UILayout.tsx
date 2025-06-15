import React from 'react';
import type { AgentType } from '../managers/AgentManager';
import type { ValidationResult } from '../types';
import { showComponent } from './ComponentRouter';

interface UILayoutProps {
  isCreatingAgent: boolean;
  showNodeConfig: boolean;
  showAgentExecution: boolean;
  selectedNodeId: string | null;
  selectedAgentId: string | null;
  validationResult: ValidationResult | null;
  onCreateAgent: (type: AgentType) => Promise<void>;
  onClearAll: () => void;
  onValidateFlow: () => void;
  onToggleNodeConfig: () => void;
  onToggleAgentExecution: () => void;
  onSave: () => void;
  onLoadFile: () => void;
}

export const UILayout: React.FC<UILayoutProps> = ({
  isCreatingAgent,
  showNodeConfig,
  showAgentExecution,
  validationResult,
  onCreateAgent,
  onClearAll,
  onValidateFlow,
  onToggleNodeConfig,
  onToggleAgentExecution,
  onSave,
  onLoadFile,
}) => {
  return (
    <>
      {/* Main Control Panel */}
      <div className='control-panel'>
        <div className='control-section'>
          <h3 className='control-title'>Agent Creation</h3>
          <div className='control-grid'>
            <button
              className='btn btn-primary'
              onClick={() => onCreateAgent('reasoning')}
              disabled={isCreatingAgent}
              title='Create a reasoning agent'
            >
              {isCreatingAgent ? '⏳' : '🧠'} Reasoning
            </button>
            <button
              className='btn btn-primary'
              onClick={() => onCreateAgent('swarm')}
              disabled={isCreatingAgent}
              title='Create a swarm agent'
            >
              {isCreatingAgent ? '⏳' : '🐝'} Swarm
            </button>
          </div>
        </div>

        <div className='control-section'>
          <h3 className='control-title'>Flow Control</h3>
          <div className='control-grid'>
            <button
              className='btn btn-secondary'
              onClick={onValidateFlow}
              title='Validate the current flow'
            >
              ✅ Validate
            </button>
            <button
              className='btn btn-secondary'
              onClick={onSave}
              title='Save the current flow'
            >
              💾 Save
            </button>
            <button
              className='btn btn-secondary'
              onClick={onLoadFile}
              title='Load a flow from file'
            >
              📁 Load
            </button>
            <button
              className='btn btn-danger'
              onClick={onClearAll}
              title='Clear all agents and connections'
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        <div className='control-section'>
          <h3 className='control-title'>View Controls</h3>
          <div className='control-grid'>
            <button
              className={`btn ${showNodeConfig ? 'btn-active' : 'btn-secondary'}`}
              onClick={onToggleNodeConfig}
              title='Toggle node configuration panel'
            >
              ⚙️ Config
            </button>
            <button
              className={`btn ${showAgentExecution ? 'btn-active' : 'btn-secondary'}`}
              onClick={onToggleAgentExecution}
              title='Toggle agent execution panel'
            >
              🚀 Execution
            </button>
          </div>
        </div>
      </div>

      {/* Component Launcher Panel */}
      <div className='launcher-panel'>
        <div className='launcher-section'>
          <h3 className='launcher-title'>Tools</h3>
          <div className='launcher-grid'>
            <button
              className='btn btn-tool'
              onClick={() => showComponent('analytics', true)}
              title='Open analytics dashboard'
            >
              📊 Analytics
            </button>
            <button
              className='btn btn-tool'
              onClick={() => showComponent('apiSettings', true)}
              title='Manage API keys'
            >
              🔑 API Keys
            </button>
            <button
              className='btn btn-tool'
              onClick={() => showComponent('nodePalette', true)}
              title='Open node palette'
            >
              🎨 Palette
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className='status-bar'>
        <div className='status-section'>
          <div className='status-item'>
            <span className='status-indicator status-active' />
            <span>System Ready</span>
          </div>
          {isCreatingAgent && (
            <div className='status-item'>
              <span className='status-indicator status-processing' />
              <span>Creating Agent...</span>
            </div>
          )}
        </div>
      </div>

      {/* Validation Results Overlay */}
      {validationResult && (
        <div className='validation-overlay'>
          <div className='validation-panel'>
            <div className='validation-header'>
              <h3>Validation Results</h3>
              <div
                className={`validation-status ${validationResult.isValid ? 'valid' : 'invalid'}`}
              >
                <div
                  className={`status-dot ${validationResult.isValid ? 'success' : 'error'}`}
                />
                <span>
                  {validationResult.isValid ? 'Valid Flow' : 'Invalid Flow'}
                </span>
              </div>
            </div>

            {validationResult.issues.length > 0 && (
              <div className='validation-issues'>
                <h4>Issues Found:</h4>
                <ul className='issue-list'>
                  {validationResult.issues.map(issue => (
                    <li
                      key={issue.id}
                      className={`issue-item issue-${issue.severity}`}
                    >
                      <span className='issue-icon'>
                        {issue.severity === 'error'
                          ? '❌'
                          : issue.severity === 'warning'
                            ? '⚠️'
                            : 'ℹ️'}
                      </span>
                      <div className='issue-content'>
                        <span className='issue-message'>{issue.message}</span>
                        {issue.code && (
                          <span className='issue-code'>({issue.code})</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UILayout;
