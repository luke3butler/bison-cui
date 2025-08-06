import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, Mic, Send, Loader2, Sparkles, Laptop, Square, Check, X } from 'lucide-react';
import { DropdownSelector, DropdownOption } from '../DropdownSelector';
import { PermissionDialog } from '../PermissionDialog';
import { DirectoryPicker } from '../DirectoryPicker';
import type { PermissionRequest, Command } from '@/types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './Composer.module.css';

export interface FileSystemEntry {
  name: string;
  type: 'file' | 'directory';
  depth: number;
}

interface AutocompleteState {
  isActive: boolean;
  triggerIndex: number;
  query: string;
  suggestions: FileSystemEntry[] | Command[];
  focusedIndex: number;
  type: 'file' | 'command';
}

export interface ComposerProps {
  // Core functionality
  value?: string;
  onChange?: (value: string) => void;
  onSubmit: (message: string, workingDirectory?: string, model?: string, permissionMode?: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;

  // Feature flags
  showDirectorySelector?: boolean;
  showModelSelector?: boolean;
  enableFileAutocomplete?: boolean;
  showPermissionUI?: boolean;
  showStopButton?: boolean;

  // Directory selection
  workingDirectory?: string;
  onDirectoryChange?: (directory: string) => void;
  recentDirectories?: Record<string, { lastDate: string; shortname: string }>;
  getMostRecentWorkingDirectory?: () => string | null;

  // Model selection
  model?: string;
  onModelChange?: (model: string) => void;
  availableModels?: string[];

  // Permission handling
  permissionRequest?: PermissionRequest | null;
  onPermissionDecision?: (requestId: string, action: 'approve' | 'deny', denyReason?: string) => void;

  // Stop functionality
  onStop?: () => void;

  // File autocomplete
  fileSystemEntries?: FileSystemEntry[];
  onFetchFileSystem?: (directory: string) => Promise<FileSystemEntry[]>;
  dropdownPosition?: 'above' | 'below';

  // Command autocomplete
  availableCommands?: Command[];
  onFetchCommands?: (workingDirectory?: string) => Promise<Command[]>;
}

export interface ComposerRef {
  focusInput: () => void;
}

interface DirectoryDropdownProps {
  selectedDirectory: string;
  recentDirectories: Record<string, { lastDate: string; shortname: string }>;
  onDirectorySelect: (directory: string) => void;
}

function DirectoryDropdown({ 
  selectedDirectory, 
  recentDirectories, 
  onDirectorySelect 
}: DirectoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Convert recentDirectories to sorted array and create options
  const options: DropdownOption<string>[] = Object.entries(recentDirectories)
    .map(([path, data]) => ({
      value: path,
      label: data.shortname,
    }))
    .sort((a, b) => {
      const dateA = recentDirectories[a.value].lastDate;
      const dateB = recentDirectories[b.value].lastDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  // Get shortname for display
  const displayText = selectedDirectory === 'Select directory' 
    ? selectedDirectory
    : recentDirectories[selectedDirectory]?.shortname || selectedDirectory.split('/').pop() || selectedDirectory;

  // Validate directory path (basic check for now)
  const validateDirectory = (path: string): boolean => {
    // Allow paths that start with / (absolute), ~ (home), or . (relative)
    // Also allow paths that contain / or \ (directory separators)
    return path.startsWith('/') || path.startsWith('~') || path.startsWith('.') || 
           path.includes('/') || path.includes('\\');
  };

  // Handle opening directory picker modal
  const handleBrowseFolder = () => {
    setIsOpen(false); // Close dropdown
    setIsPickerOpen(true); // Open modal
  };

  // Handle directory selection from modal
  const handleDirectorySelected = (path: string) => {
    onDirectorySelect(path);
  };

  return (
    <>
      <DropdownSelector
        options={options}
        value={selectedDirectory}
        onChange={(value) => {
          onDirectorySelect(value);
          setIsOpen(false);
        }}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placeholder="Enter a directory..."
        showFilterInput={true}
        allowCustomValue={true}
        showBrowseOption={true}
        onBrowseFolder={handleBrowseFolder}
        customValueValidator={validateDirectory}
        customValueLabel={(value) => `📁 Use directory: ${value}`}
        filterPredicate={(option, searchText) => {
          // Allow filtering by both path and shortname
          return option.value.toLowerCase().includes(searchText.toLowerCase()) ||
                 option.label.toLowerCase().includes(searchText.toLowerCase());
        }}
        renderTrigger={({ onClick }) => (
          <button
            type="button"
            className={styles.actionButton}
            onClick={onClick}
            aria-label="View all code environments"
          >
            <Laptop size={14} />
            <span className={styles.buttonText}>
              <span className={styles.buttonLabel}>{displayText}</span>
            </span>
            <ChevronDown size={14} />
          </button>
        )}
      />
      
      <DirectoryPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleDirectorySelected}
        initialPath={selectedDirectory !== 'Select directory' ? selectedDirectory : undefined}
      />
    </>
  );
}

interface AutocompleteDropdownProps {
  suggestions: FileSystemEntry[] | Command[];
  onSelect: (path: string) => void;
  onClose: () => void;
  isOpen: boolean;
  focusedIndex: number;
  position?: 'above' | 'below';
  triggerRef?: React.RefObject<HTMLElement>;
  type: 'file' | 'command';
}

function AutocompleteDropdown({
  suggestions,
  onSelect,
  onClose,
  isOpen,
  focusedIndex,
  position = 'below',
  triggerRef,
  type,
}: AutocompleteDropdownProps) {
  if (!isOpen) return null;

  const options = suggestions.map((entry) => {
    if (type === 'command') {
      const command = entry as Command;
      return {
        value: command.name,
        label: command.name,
        description: command.description,
        disabled: false
      };
    } else {
      const fileEntry = entry as FileSystemEntry;
      return {
        value: fileEntry.name,
        label: fileEntry.name,
        disabled: false
      };
    }
  });

  return (
    <div className={`${styles.autocompleteDropdown} ${position === 'above' ? styles.autocompleteDropdownAbove : ''}`}>
      <DropdownSelector
        options={options}
        value={undefined}
        onChange={onSelect}
        isOpen={true}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        showFilterInput={false}
        maxVisibleItems={5}
        className={styles.pathAutocomplete}
        initialFocusedIndex={focusedIndex}
        visualFocusOnly={true}
        triggerElementRef={triggerRef}
        renderOption={type === 'command' ? (option) => (
          <div className={styles.commandOption}>
            <span className={styles.commandName}>{option.label}</span>
            {option.description && (
              <span className={styles.commandDescription}>{option.description}</span>
            )}
          </div>
        ) : undefined}
      />
    </div>
  );
}

interface ComposerCache {
  selectedPermissionMode: string;
  draft: string;
}

export const Composer = forwardRef<ComposerRef, ComposerProps>(function Composer({
  value: controlledValue,
  onChange: onControlledChange,
  onSubmit,
  placeholder = "Type a message...",
  isLoading = false,
  disabled = false,
  showDirectorySelector = false,
  showModelSelector = false,
  enableFileAutocomplete = false,
  showPermissionUI = false,
  showStopButton = false,
  workingDirectory = '',
  onDirectoryChange,
  recentDirectories = {},
  getMostRecentWorkingDirectory,
  model = 'default',
  onModelChange,
  availableModels = ['default', 'opus', 'sonnet'],
  permissionRequest,
  onPermissionDecision,
  onStop,
  fileSystemEntries = [],
  onFetchFileSystem,
  dropdownPosition = 'below',
  availableCommands = [],
  onFetchCommands,
}: ComposerProps, ref: React.Ref<ComposerRef>) {
  // Load cached state
  const [cachedState, setCachedState] = useLocalStorage<ComposerCache>('cui-composer', {
    selectedPermissionMode: 'default',
    draft: '',
  });

  // Use controlled or uncontrolled value
  const [uncontrolledValue, setUncontrolledValue] = useState(cachedState.draft);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = (newValue: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(newValue);
    }
    onControlledChange?.(newValue);
  };

  const [selectedDirectory, setSelectedDirectory] = useState(workingDirectory || 'Select directory');
  const [selectedModel, setSelectedModel] = useState(model);
  const [selectedPermissionMode, setSelectedPermissionMode] = useState<string>(cachedState.selectedPermissionMode);
  const [isPermissionDropdownOpen, setIsPermissionDropdownOpen] = useState(false);
  const [localFileSystemEntries, setLocalFileSystemEntries] = useState<FileSystemEntry[]>(fileSystemEntries);
  const [localCommands, setLocalCommands] = useState<Command[]>(availableCommands);
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    isActive: false,
    triggerIndex: -1,
    query: '',
    suggestions: [],
    focusedIndex: 0,
    type: 'file',
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focusInput method via ref
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }), []);

  // Update local state when props change
  useEffect(() => {
    if (workingDirectory) {
      setSelectedDirectory(workingDirectory);
    }
  }, [workingDirectory]);

  useEffect(() => {
    if (model) {
      setSelectedModel(model);
    }
  }, [model]);

  useEffect(() => {
    if (fileSystemEntries.length > 0) {
      setLocalFileSystemEntries(fileSystemEntries);
    }
  }, [fileSystemEntries]);

  useEffect(() => {
    if (availableCommands.length > 0) {
      setLocalCommands(availableCommands);
    }
  }, [availableCommands]);

  // Update cache when state changes
  useEffect(() => {
    setCachedState({
      selectedPermissionMode,
      draft: value,
    });
  }, [selectedPermissionMode, value, setCachedState]);

  // Auto-select most recent directory on mount (for Home usage)
  useEffect(() => {
    if (showDirectorySelector && (!workingDirectory || selectedDirectory === 'Select directory') && Object.keys(recentDirectories).length > 0 && getMostRecentWorkingDirectory) {
      const mostRecent = getMostRecentWorkingDirectory();
      if (mostRecent) {
        setSelectedDirectory(mostRecent);
        onDirectoryChange?.(mostRecent);
        
        // Fetch file system entries for the auto-selected directory
        if (enableFileAutocomplete && onFetchFileSystem) {
          onFetchFileSystem(mostRecent)
            .then(entries => setLocalFileSystemEntries(entries))
            .catch(error => console.error('Failed to fetch file system entries:', error));
        }
      }
    }
  }, [workingDirectory, selectedDirectory, recentDirectories, getMostRecentWorkingDirectory, showDirectorySelector, onDirectoryChange, enableFileAutocomplete, onFetchFileSystem]);

  // Fetch file system entries when composer is focused (for autocomplete)
  useEffect(() => {
    if (!enableFileAutocomplete || !onFetchFileSystem) return;

    const fetchFileSystem = async () => {
      if (selectedDirectory && selectedDirectory !== 'Select directory') {
        try {
          const entries = await onFetchFileSystem(selectedDirectory);
          setLocalFileSystemEntries(entries);
        } catch (error) {
          console.error('Failed to fetch file system entries:', error);
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      const handleFocus = () => fetchFileSystem();
      textarea.addEventListener('focus', handleFocus);
      return () => textarea.removeEventListener('focus', handleFocus);
    }
  }, [selectedDirectory, enableFileAutocomplete, onFetchFileSystem]);

  // Fetch commands when composer is focused (for autocomplete)
  useEffect(() => {
    if (!onFetchCommands) return;

    const fetchCommands = async () => {
      try {
        const commands = await onFetchCommands(selectedDirectory !== 'Select directory' ? selectedDirectory : undefined);
        setLocalCommands(commands);
      } catch (error) {
        console.error('Failed to fetch commands:', error);
      }
    };

    // Fetch commands immediately
    fetchCommands();

    const textarea = textareaRef.current;
    if (textarea) {
      const handleFocus = () => fetchCommands();
      textarea.addEventListener('focus', handleFocus);
      return () => textarea.removeEventListener('focus', handleFocus);
    }
  }, [selectedDirectory, onFetchCommands]);

  const detectAutocomplete = (value: string, cursorPosition: number) => {
    // Find the last @ before cursor
    const beforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return null;
    
    // Check if there's a space or newline between @ and cursor
    const afterAt = beforeCursor.substring(lastAtIndex + 1);
    if (afterAt.includes(' ') || afterAt.includes('\n')) return null;
    
    return {
      triggerIndex: lastAtIndex,
      query: afterAt,
      type: 'file' as const,
    };
  };

  const detectSlashCommandAutocomplete = (value: string, cursorPosition: number) => {
    // Find the last / before cursor
    const beforeCursor = value.substring(0, cursorPosition);
    const lastSlashIndex = beforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex === -1) return null;
    
    // Check if the slash is at the beginning of the input or after whitespace/newline
    const beforeSlash = beforeCursor.substring(0, lastSlashIndex);
    if (beforeSlash.trim() !== '' && !beforeSlash.endsWith('\n') && !beforeSlash.endsWith(' ')) return null;
    
    // Check if there's a space or newline between / and cursor
    const afterSlash = beforeCursor.substring(lastSlashIndex + 1);
    if (afterSlash.includes(' ') || afterSlash.includes('\n')) return null;
    
    return {
      triggerIndex: lastSlashIndex,
      query: afterSlash,
      type: 'command' as const,
    };
  };

  const filterSuggestions = (query: string): FileSystemEntry[] => {
    if (!localFileSystemEntries) return []; // Return empty array if entries not loaded
    if (!query) return localFileSystemEntries.slice(0, 50); // Show first 50 entries when no query
    
    const lowerQuery = query.toLowerCase();
    return localFileSystemEntries
      .filter(entry => entry.name.toLowerCase().includes(lowerQuery))
      .slice(0, 50); // Limit to 50 results
  };

  const filterCommandSuggestions = (query: string): Command[] => {
    if (!localCommands) return []; // Return empty array if commands not loaded
    if (!query) return localCommands.slice(0, 50); // Show first 50 commands when no query
    
    const lowerQuery = query.toLowerCase();
    return localCommands
      .filter(command => command.name.toLowerCase().includes(lowerQuery))
      .slice(0, 50); // Limit to 50 results
  };

  const resetAutocomplete = () => {
    setAutocomplete({
      isActive: false,
      triggerIndex: -1,
      query: '',
      suggestions: [],
      focusedIndex: 0,
      type: 'file',
    });
  };

  const getPermissionModeLabel = (mode: string): string => {
    switch (mode) {
      case 'default': return 'Code';
      case 'acceptEdits': return 'Auto';
      case 'bypassPermissions': return 'Yolo';
      case 'plan': return 'Plan';
      default: return 'Code';
    }
  };

  const getPermissionModeTitle = (mode: string): string => {
    switch (mode) {
      case 'default': return 'Code - Ask for permissions as needed';
      case 'acceptEdits': return 'Auto - Allow Claude to make changes directly';
      case 'bypassPermissions': return 'Yolo - Skip all permission prompts';
      case 'plan': return 'Plan - Create a plan without executing';
      default: return 'Code - Ask for permissions as needed';
    }
  };

  const handleAutocompleteSelection = (selection: string) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    
    if (autocomplete.type === 'command') {
      // For commands, replace the entire trigger sequence (including the /) with the selected command
      const newText = value.substring(0, autocomplete.triggerIndex) + selection + value.substring(cursorPos);
      setValue(newText);
      
      // Reset autocomplete state immediately
      resetAutocomplete();
      
      // Set cursor position after the inserted selection and adjust height
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = autocomplete.triggerIndex + selection.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 0);
    } else {
      // For files, keep the existing behavior (append after the @ symbol)
      const newText = value.substring(0, autocomplete.triggerIndex + 1) + selection + value.substring(cursorPos);
      setValue(newText);
      
      // Reset autocomplete state immediately
      resetAutocomplete();
      
      // Set cursor position after the inserted selection and adjust height
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = autocomplete.triggerIndex + 1 + selection.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 0);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    adjustTextareaHeight();
    
    // Detect autocomplete triggers
    const cursorPos = e.target.selectionStart;
    
    // Check for slash command autocomplete first (higher priority)
    const commandAutocompleteInfo = detectSlashCommandAutocomplete(newValue, cursorPos);
    if (commandAutocompleteInfo && onFetchCommands) {
      const suggestions = filterCommandSuggestions(commandAutocompleteInfo.query);
      setAutocomplete(prev => ({
        isActive: true,
        triggerIndex: commandAutocompleteInfo.triggerIndex,
        query: commandAutocompleteInfo.query,
        suggestions,
        type: commandAutocompleteInfo.type,
        // Keep focusedIndex if it's still valid, otherwise reset to 0
        focusedIndex: prev.focusedIndex < suggestions.length ? prev.focusedIndex : 0,
      }));
      return;
    }
    
    // Check for file autocomplete if enabled
    if (enableFileAutocomplete) {
      const fileAutocompleteInfo = detectAutocomplete(newValue, cursorPos);
      if (fileAutocompleteInfo) {
        const suggestions = filterSuggestions(fileAutocompleteInfo.query);
        setAutocomplete(prev => ({
          isActive: true,
          triggerIndex: fileAutocompleteInfo.triggerIndex,
          query: fileAutocompleteInfo.query,
          suggestions,
          type: fileAutocompleteInfo.type,
          // Keep focusedIndex if it's still valid, otherwise reset to 0
          focusedIndex: prev.focusedIndex < suggestions.length ? prev.focusedIndex : 0,
        }));
        return;
      }
    }
    
    // No autocomplete triggers found
    resetAutocomplete();
  };

  const handleSubmit = (permissionMode: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isLoading) return;

    // For Home usage with directory/model
    if (showDirectorySelector && selectedDirectory === 'Select directory') return;

    onSubmit(
      trimmedValue,
      showDirectorySelector ? selectedDirectory : undefined,
      showModelSelector ? selectedModel : undefined,
      permissionMode
    );
    
    setValue('');
    resetAutocomplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (autocomplete.isActive) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (autocomplete.suggestions.length > 0) {
            setAutocomplete(prev => ({
              ...prev,
              focusedIndex: (prev.focusedIndex + 1) % prev.suggestions.length
            }));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (autocomplete.suggestions.length > 0) {
            setAutocomplete(prev => ({
              ...prev,
              focusedIndex: prev.focusedIndex === 0 ? prev.suggestions.length - 1 : prev.focusedIndex - 1
            }));
          }
          break;
        case 'Enter':
        case 'Tab':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            if (autocomplete.suggestions.length > 0) {
              // Select the currently focused suggestion
              const suggestion = autocomplete.suggestions[autocomplete.focusedIndex];
              const suggestionName = autocomplete.type === 'command' 
                ? (suggestion as Command).name 
                : (suggestion as FileSystemEntry).name;
              handleAutocompleteSelection(suggestionName);
            }
          }
          break;
        case ' ':
          // Don't prevent default for space - let it insert the character
          resetAutocomplete();
          break;
        case 'Escape':
          e.preventDefault();
          resetAutocomplete();
          break;
      }
    } else if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        handleSubmit(selectedPermissionMode);
      }
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = Math.floor(window.innerHeight * 0.8); // Up to 80% of viewport
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  };

  // Adjust height whenever text changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  // Re-adjust height on window resize
  useEffect(() => {
    const handleResize = () => {
      adjustTextareaHeight();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDirectorySelect = (directory: string) => {
    setSelectedDirectory(directory);
    onDirectoryChange?.(directory);
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    onModelChange?.(model);
  };

  return (
    <form className={styles.composer} onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(selectedPermissionMode);
    }}>
      {(enableFileAutocomplete || onFetchCommands) && dropdownPosition === 'above' && (
        <AutocompleteDropdown
          suggestions={autocomplete.suggestions}
          onSelect={handleAutocompleteSelection}
          onClose={resetAutocomplete}
          isOpen={autocomplete.isActive && autocomplete.suggestions.length > 0}
          focusedIndex={autocomplete.focusedIndex}
          position={dropdownPosition}
          type={autocomplete.type}
        />
      )}
      <div className={styles.container}>
        <div className={styles.inputWrapper}>
          <div className={styles.textAreaContainer}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={permissionRequest && showPermissionUI ? "Deny and tell Claude what to do" : placeholder}
              value={value}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={(isLoading || disabled) && !(permissionRequest && showPermissionUI)}
            />
          </div>

          {(showDirectorySelector || showModelSelector) && (
            <div className={styles.footerActions}>
              <div className={styles.actionButtons}>
                <div className={styles.actionGroup}>
                  {/* Working Directory Selector */}
                  {showDirectorySelector && (
                    <DirectoryDropdown
                      selectedDirectory={selectedDirectory}
                      recentDirectories={recentDirectories}
                      onDirectorySelect={handleDirectorySelect}
                    />
                  )}

                  {/* Model Selector */}
                  {showModelSelector && (
                    <button
                      type="button"
                      className={styles.actionButton}
                      aria-label="Select AI model"
                      onClick={() => {
                        // Toggle between models for now
                        const currentIndex = availableModels.indexOf(selectedModel);
                        const nextIndex = (currentIndex + 1) % availableModels.length;
                        handleModelSelect(availableModels[nextIndex]);
                      }}
                    >
                      <Sparkles size={14} />
                      <span className={styles.buttonText}>
                        <span className={styles.buttonLabel}>{selectedModel}</span>
                      </span>
                      <ChevronDown size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Action Button */}
          <div className={styles.voiceButton}>
            {permissionRequest && showPermissionUI ? (
              <div className={styles.permissionButtons}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.approveButton}`}
                  onClick={() => onPermissionDecision?.(permissionRequest.id, 'approve')}
                >
                  <div className={styles.btnContent}>
                    <Check size={14} />
                    Accept
                  </div>
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.denyButton}`}
                  onClick={() => {
                    const denyReason = value.trim();
                    onPermissionDecision?.(permissionRequest.id, 'deny', denyReason || undefined);
                    setValue('');
                  }}
                >
                  <div className={styles.btnContent}>
                    <X size={14} />
                    Deny
                  </div>
                </button>
              </div>
            ) : isLoading && showStopButton ? (
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => onStop?.()}
                title="Stop generation"
              >
                <Square size={18} />
              </button>
            ) : (
              <div className={styles.permissionModeButtons}>
                {/* Combined Permission Mode Button with Dropdown */}
                <div className={styles.combinedPermissionButton}>
                  <button
                    type="button"
                    className={styles.permissionMainButton}
                    title={getPermissionModeTitle(selectedPermissionMode)}
                    disabled={!value.trim() || isLoading || disabled || (showDirectorySelector && selectedDirectory === 'Select directory')}
                    onClick={() => handleSubmit(selectedPermissionMode)}
                  >
                    <div className={styles.btnContent}>
                      {isLoading ? <Loader2 size={14} className={styles.spinning} /> : getPermissionModeLabel(selectedPermissionMode)}
                    </div>
                  </button>
                  <DropdownSelector
                    options={[
                      { value: 'default', label: 'Code', description: 'Ask before making changes' },
                      { value: 'acceptEdits', label: 'Auto', description: 'Apply edits automatically' },
                      { value: 'bypassPermissions', label: 'Yolo', description: 'No permission prompts' },
                      { value: 'plan', label: 'Plan', description: 'Planning mode only' },
                    ]}
                    value={selectedPermissionMode}
                    onChange={setSelectedPermissionMode}
                    isOpen={isPermissionDropdownOpen}
                    onOpenChange={setIsPermissionDropdownOpen}
                    showFilterInput={false}
                    renderOption={(option) => (
                      <div className={styles.permissionOption}>
                        <span className={styles.permissionOptionLabel}>{option.label}</span>
                        {option.description && (
                          <span className={styles.permissionOptionDescription}>{option.description}</span>
                        )}
                      </div>
                    )}
                    renderTrigger={({ onClick }) => (
                      <button
                        type="button"
                        className={styles.permissionDropdownButton}
                        onClick={onClick}
                        disabled={!value.trim() || isLoading || disabled || (showDirectorySelector && selectedDirectory === 'Select directory')}
                        aria-label="Select permission mode"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M4.5 5.5L8 9L11.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      </button>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {(enableFileAutocomplete || onFetchCommands) && dropdownPosition === 'below' && (
        <AutocompleteDropdown
          suggestions={autocomplete.suggestions}
          onSelect={handleAutocompleteSelection}
          onClose={resetAutocomplete}
          isOpen={autocomplete.isActive && autocomplete.suggestions.length > 0}
          focusedIndex={autocomplete.focusedIndex}
          position={dropdownPosition}
          triggerRef={textareaRef}
          type={autocomplete.type}
        />
      )}
      
      {/* Permission Dialog */}
      {permissionRequest && showPermissionUI && (
        <PermissionDialog 
          permissionRequest={permissionRequest}
          isVisible={true}
        />
      )}
    </form>
  );
});