import { useState } from 'react';
import type { DropdownOption } from '../components/DropdownSelector';

/**
 * Custom hook that provides DirectoryPicker functionality and enhanced props
 * for any directory selection component. This allows us to add directory picker
 * features to the basic upstream DirectoryDropdown with minimal code changes.
 */
export function useDirectoryPicker(
  onDirectorySelect: (directory: string) => void,
  selectedDirectory: string
) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Validate directory path (basic check for now)
  const validateDirectory = (path: string): boolean => {
    // Allow paths that start with / (absolute), ~ (home), or . (relative)
    // Also allow paths that contain / or \ (directory separators)
    return path.startsWith('/') || path.startsWith('~') || path.startsWith('.') || 
           path.includes('/') || path.includes('\\');
  };

  // Handle opening directory picker modal
  const handleBrowseFolder = () => {
    setIsPickerOpen(true);
  };

  // Handle directory selection from modal
  const handleDirectorySelected = (path: string) => {
    onDirectorySelect(path);
    setIsPickerOpen(false);
  };

  // Enhanced props to spread onto DropdownSelector
  const enhancedProps = {
    allowCustomValue: true,
    showBrowseOption: true,
    onBrowseFolder: handleBrowseFolder,
    customValueValidator: validateDirectory,
    customValueLabel: (value: string) => `📁 Use directory: ${value}`,
    filterPredicate: (option: DropdownOption<string>, searchText: string) => {
      // Allow filtering by both path and shortname
      return option.value.toLowerCase().includes(searchText.toLowerCase()) ||
             option.label.toLowerCase().includes(searchText.toLowerCase());
    }
  };

  // Picker state and handlers
  const pickerState = {
    isPickerOpen,
    setIsPickerOpen,
    handleDirectorySelected,
    selectedDirectory
  };

  return {
    enhancedProps,
    pickerState
  };
}