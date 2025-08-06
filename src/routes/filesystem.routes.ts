import { Router, Request } from 'express';
import { 
  CUIError,
  FileSystemListQuery,
  FileSystemListResponse,
  FileSystemReadQuery,
  FileSystemReadResponse 
} from '@/types';
import { RequestWithRequestId } from '@/types/express';
import { FileSystemService } from '@/services/file-system-service';
import { createLogger } from '@/services/logger';

export function createFileSystemRoutes(
  fileSystemService: FileSystemService
): Router {
  const router = Router();
  const logger = createLogger('FileSystemRoutes');

  // List directory contents
  router.get('/list', async (req: Request<Record<string, never>, FileSystemListResponse, Record<string, never>, FileSystemListQuery> & RequestWithRequestId, res, next) => {
    const requestId = req.requestId;
    logger.debug('List directory request', {
      requestId,
      path: req.query.path,
      recursive: req.query.recursive,
      respectGitignore: req.query.respectGitignore
    });
    
    try {
      // Validate required parameters
      if (!req.query.path) {
        throw new CUIError('MISSING_PATH', 'path query parameter is required', 400);
      }
      
      const result = await fileSystemService.listDirectory(
        req.query.path,
        req.query.recursive || false,
        req.query.respectGitignore || false
      );
      
      logger.debug('Directory listed successfully', {
        requestId,
        path: result.path,
        entryCount: result.entries.length
      });
      
      res.json(result);
    } catch (error) {
      logger.debug('List directory failed', {
        requestId,
        path: req.query.path,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  });

  // Read file contents
  router.get('/read', async (req: Request<Record<string, never>, FileSystemReadResponse, Record<string, never>, FileSystemReadQuery> & RequestWithRequestId, res, next) => {
    const requestId = req.requestId;
    logger.debug('Read file request', {
      requestId,
      path: req.query.path
    });
    
    try {
      // Validate required parameters
      if (!req.query.path) {
        throw new CUIError('MISSING_PATH', 'path query parameter is required', 400);
      }
      
      const result = await fileSystemService.readFile(req.query.path);
      
      logger.debug('File read successfully', {
        requestId,
        path: result.path,
        size: result.size
      });
      
      res.json(result);
    } catch (error) {
      logger.debug('Read file failed', {
        requestId,
        path: req.query.path,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  });

  // Browse directories for directory picker
  router.get('/browse', async (req: Request<Record<string, never>, any, Record<string, never>, { path: string }> & RequestWithRequestId, res, next) => {
    const requestId = req.requestId;
    logger.debug('Browse directories request', {
      requestId,
      path: req.query.path
    });
    
    try {
      // Validate required parameters
      if (!req.query.path) {
        throw new CUIError('MISSING_PATH', 'path query parameter is required', 400);
      }
      
      const result = await fileSystemService.browseDirectories(req.query.path);
      
      logger.debug('Directories browsed successfully', {
        requestId,
        currentPath: result.currentPath,
        directoryCount: result.directories.length,
        hasParent: result.parentPath !== null
      });
      
      res.json(result);
    } catch (error) {
      logger.debug('Browse directories failed', {
        requestId,
        path: req.query.path,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  });

  return router;
}