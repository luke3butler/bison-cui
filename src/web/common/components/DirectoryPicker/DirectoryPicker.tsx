import React, { useState, useEffect } from 'react';
import { X, Folder, Home, ChevronRight } from 'lucide-react';
import { api } from '../../../chat/services/api';
import styles from './DirectoryPicker.module.css';

interface Directory {
  name: string;
  path: string;
}

interface DirectoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  directories: Directory[];
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialPath
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigate to a directory
  const navigateToDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.browseDirectories(path);
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to browse directory';
      setError(errorMessage);
      console.error('Directory browse error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with home directory or provided path
  useEffect(() => {
    if (isOpen) {
      const startPath = initialPath || '~';
      navigateToDirectory(startPath);
    }
  }, [isOpen, initialPath]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate breadcrumb path segments
  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    
    const segments = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Root', path: '/' }];
    
    let buildPath = '';
    for (const segment of segments) {
      buildPath += '/' + segment;
      breadcrumbs.push({
        name: segment,
        path: buildPath
      });
    }
    
    return breadcrumbs;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Select Folder</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className={styles.breadcrumbs}>
          <button
            type="button"
            className={styles.homeButton}
            onClick={() => navigateToDirectory('~')}
            title="Go to home directory"
          >
            <Home size={16} />
          </button>
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <ChevronRight size={14} className={styles.separator} />}
              <button
                type="button"
                className={styles.breadcrumb}
                onClick={() => navigateToDirectory(crumb.path)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Current Path Display */}
        <div className={styles.currentPath}>
          <span className={styles.pathLabel}>Current folder:</span>
          <span className={styles.pathValue}>{currentPath}</span>
        </div>

        {/* Directory List */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading directories...</div>
          ) : error ? (
            <div className={styles.error}>
              <p>Error: {error}</p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => navigateToDirectory(currentPath || '~')}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className={styles.directoryList}>
              {/* Parent Directory */}
              {parentPath && (
                <button
                  type="button"
                  className={`${styles.directoryItem} ${styles.parentDirectory}`}
                  onClick={() => navigateToDirectory(parentPath)}
                >
                  <Folder size={16} />
                  <span>.. (Parent Directory)</span>
                </button>
              )}
              
              {/* Subdirectories */}
              {directories.length === 0 ? (
                <div className={styles.emptyMessage}>
                  No subdirectories found
                </div>
              ) : (
                directories.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    className={styles.directoryItem}
                    onClick={() => navigateToDirectory(dir.path)}
                  >
                    <Folder size={16} />
                    <span>{dir.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.selectButton}
            onClick={() => {
              onSelect(currentPath);
              onClose();
            }}
            disabled={!currentPath}
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  );
};