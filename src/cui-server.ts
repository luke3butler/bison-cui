import express, { Express } from 'express';
import * as path from 'path';
import { ClaudeProcessManager } from './services/claude-process-manager';
import { StreamManager } from './services/stream-manager';
import { ClaudeHistoryReader } from './services/claude-history-reader';
import { PermissionTracker } from './services/permission-tracker';
import { MCPConfigGenerator } from './services/mcp-config-generator';
import { FileSystemService } from './services/file-system-service';
import { ConfigService } from './services/config-service';
import { SessionInfoService } from './services/session-info-service';
import { PreferencesService } from './services/preferences-service';
import { ConversationStatusManager } from './services/conversation-status-manager';
import { WorkingDirectoriesService } from './services/working-directories-service';
import { ToolMetricsService } from './services/ToolMetricsService';
import { NotificationService } from './services/notification-service';
import { geminiService } from './services/gemini-service';
import { 
  StreamEvent,
  CUIError,
  PermissionRequest
} from './types';
import { createLogger, type Logger } from './services/logger';
import { createConversationRoutes } from './routes/conversation.routes';
import { createSystemRoutes } from './routes/system.routes';
import { createPermissionRoutes } from './routes/permission.routes';
import { createFileSystemRoutes } from './routes/filesystem.routes';
import { createLogRoutes } from './routes/log.routes';
import { createStreamingRoutes } from './routes/streaming.routes';
import { createWorkingDirectoriesRoutes } from './routes/working-directories.routes';
import { createPreferencesRoutes } from './routes/preferences.routes';
import { createGeminiRoutes } from './routes/gemini.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { createCorsMiddleware } from './middleware/cors-setup';
import { queryParser } from './middleware/query-parser';
import { authMiddleware, createAuthMiddleware } from './middleware/auth';

// Conditionally import ViteExpress only in development environment
let ViteExpress: typeof import('vite-express') | undefined;
if (process.env.NODE_ENV === 'development') {
  ViteExpress = require('vite-express');
}

/**
 * Main CUI server class
 */
export class CUIServer {
  private app: Express;
  private server?: import('http').Server;
  private processManager: ClaudeProcessManager;
  private streamManager: StreamManager;
  private historyReader: ClaudeHistoryReader;
  private statusTracker: ConversationStatusManager;
  private permissionTracker: PermissionTracker;
  private mcpConfigGenerator: MCPConfigGenerator;
  private fileSystemService: FileSystemService;
  private configService: ConfigService;
  private sessionInfoService: SessionInfoService;
  private preferencesService: PreferencesService;
  private conversationStatusManager: ConversationStatusManager;
  private workingDirectoriesService: WorkingDirectoriesService;
  private toolMetricsService: ToolMetricsService;
  private notificationService: NotificationService;
  private logger: Logger;
  private port: number;
  private host: string;
  private configOverrides?: { port?: number; host?: string; token?: string; skipAuthToken?: boolean };

  constructor(configOverrides?: { port?: number; host?: string; token?: string; skipAuthToken?: boolean }) {
    this.app = express();
    this.configOverrides = configOverrides;
    
    this.logger = createLogger('CUIServer');
    
    // TEST: Add debug log right at the start
    this.logger.debug('🔍 TEST: CUIServer constructor started - this should be visible if debug logging works');
    
    // Initialize config service first
    this.configService = ConfigService.getInstance();
    
    // Will be set after config is loaded
    this.port = 0;
    this.host = '';
    
    this.logger.debug('Initializing CUIServer', {
      nodeEnv: process.env.NODE_ENV,
      configOverrides
    });
    
    // Initialize services
    this.logger.debug('Initializing services');
    this.historyReader = new ClaudeHistoryReader();
    // Create a single instance of ConversationStatusManager for both statusTracker and conversationStatusManager
    this.conversationStatusManager = new ConversationStatusManager();
    this.statusTracker = this.conversationStatusManager; // Use the same instance for backward compatibility
    this.toolMetricsService = new ToolMetricsService();
    this.fileSystemService = new FileSystemService();
    this.sessionInfoService = SessionInfoService.getInstance();
    this.preferencesService = PreferencesService.getInstance();
    this.processManager = new ClaudeProcessManager(this.historyReader, this.statusTracker, undefined, undefined, this.toolMetricsService, this.sessionInfoService, this.fileSystemService);
    this.streamManager = new StreamManager();
    this.permissionTracker = new PermissionTracker();
    this.mcpConfigGenerator = new MCPConfigGenerator();
    this.workingDirectoriesService = new WorkingDirectoriesService(this.historyReader, this.logger);
    this.notificationService = new NotificationService(this.preferencesService);
    
    // Wire up notification service
    this.processManager.setNotificationService(this.notificationService);
    this.permissionTracker.setNotificationService(this.notificationService);
    this.permissionTracker.setConversationStatusManager(this.conversationStatusManager);
    this.permissionTracker.setHistoryReader(this.historyReader);
    
    this.logger.debug('Services initialized successfully');
    
    this.setupMiddleware();
    // Routes will be set up in start() to allow tests to override services
    this.setupProcessManagerIntegration();
    this.setupPermissionTrackerIntegration();
    this.processManager.setConversationStatusManager(this.conversationStatusManager);
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get the configured port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get the configured host
   */
  getHost(): string {
    return this.host;
  }

  /**
   * Initialize services without starting the HTTP server
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initialize method called');
    try {
      // Initialize configuration first
      this.logger.debug('Initializing configuration');
      await this.configService.initialize();
      const config = this.configService.getConfig();
      
      // Initialize session info service
      this.logger.debug('Initializing session info service');
      await this.sessionInfoService.initialize();
      this.logger.debug('Session info service initialized successfully');

      this.logger.debug('Initializing preferences service');
      await this.preferencesService.initialize();
      this.logger.debug('Preferences service initialized successfully');

      this.logger.debug('Initializing Gemini service');
      await geminiService.initialize();
      this.logger.debug('Gemini service initialized successfully');
      
      // Apply overrides if provided (for tests and CLI options)
      this.port = this.configOverrides?.port ?? config.server.port;
      this.host = this.configOverrides?.host ?? config.server.host;
      
      this.logger.info('Configuration loaded', {
        machineId: config.machine_id,
        port: this.port,
        host: this.host,
        overrides: this.configOverrides ? Object.keys(this.configOverrides) : []
      });

      // Set up routes after services are initialized
      // This allows tests to override services before routes are created
      this.logger.debug('Setting up routes');
      this.setupRoutes();
      
      // Generate MCP config before starting server
      const mcpConfigPath = this.mcpConfigGenerator.generateConfig(this.port);
      this.processManager.setMCPConfigPath(mcpConfigPath);
      this.logger.debug('MCP config generated and set', { path: mcpConfigPath });
      
      // Display auth URL with token fragment
      const authToken = this.configOverrides?.token ?? config.authToken;
      const authUrl = `http://${this.host}:${this.port}#token=${authToken}`;
      if (!this.configOverrides?.skipAuthToken) {
        this.logger.info(`Access with auth token: ${authUrl}`);
      } else {
        this.logger.info('Authentication is disabled (--skip-auth-token)');
      }
    } catch (error) {
      this.logger.error('Failed to initialize server:', error, {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof CUIError) {
        throw error;
      } else {
        throw new CUIError('SERVER_INIT_FAILED', `Server initialization failed: ${error}`, 500);
      }
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    this.logger.debug('Start method called');
    try {
      // Initialize all services
      await this.initialize();

      // Start Express server
      const isDev = process.env.NODE_ENV === 'development';
      this.logger.debug('Creating HTTP server listener', { 
        useViteExpress: isDev,
        environment: process.env.NODE_ENV 
      });
      
      await new Promise<void>((resolve, reject) => {
        // Use ViteExpress only in development
        if (isDev && ViteExpress) {
          try {
            this.server = this.app.listen(this.port, this.host, () => {
              this.logger.debug('Server successfully bound to port (dev mode)', {
                port: this.port,
                host: this.host,
                address: this.server?.address()
              });
              resolve();
            });
            
            // Configure ViteExpress for development
            ViteExpress.config({
              mode: 'development',
              viteConfigFile: 'vite.config.ts'
            });
            
            ViteExpress.bind(this.app, this.server);
            this.logger.info(`CUI development server running on http://${this.host}:${this.port}`);
          } catch (error) {
            this.logger.error('Failed to start ViteExpress server', error);
            reject(error);
          }
        } else {
          // Production/test mode - regular Express server
          this.server = this.app.listen(this.port, this.host, () => {
            this.logger.debug('Server successfully bound to port', {
              port: this.port,
              host: this.host,
              address: this.server?.address(),
              mode: process.env.NODE_ENV || 'production'
            });
            resolve();
          });
        }

        if (this.server) {
          this.server.on('error', (error: Error) => {
            this.logger.error('Failed to start HTTP server:', error, {
              errorCode: (error as any).code,
              errorSyscall: (error as any).syscall,
              port: this.port,
              host: this.host
            });
            reject(new CUIError('HTTP_SERVER_START_FAILED', `Failed to start HTTP server: ${error.message}`, 500));
          });
        }
      });
      
      this.logger.info(`cui server started on http://${this.host}:${this.port}`);
    } catch (error) {
      this.logger.error('Failed to start server:', error, {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      // Attempt cleanup on startup failure
      await this.cleanup();
      
      if (error instanceof CUIError) {
        throw error;
      } else {
        throw new CUIError('SERVER_START_FAILED', `Server startup failed: ${error}`, 500);
      }
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    this.logger.debug('Stop method called', {
      hasServer: !!this.server,
      activeSessions: this.processManager.getActiveSessions().length,
      connectedClients: this.streamManager.getTotalClientCount()
    });
    
    // Stop accepting new connections
    if (this.server) {
      // Since Node v18.2.0, closeAllConnections is available to close all connections.
      if (typeof this.server.closeAllConnections === 'function') {
        this.server.closeAllConnections();
      }
    }
    
    // Stop all active Claude processes
    const activeSessions = this.processManager.getActiveSessions();
    if (activeSessions.length > 0) {
      this.logger.info(`Stopping ${activeSessions.length} active sessions...`);
      this.logger.debug('Active sessions to stop', { sessionIds: activeSessions });
      
      const stopResults = await Promise.allSettled(
        activeSessions.map(streamingId => 
          this.processManager.stopConversation(streamingId)
            .catch(error => this.logger.error(`Error stopping session ${streamingId}:`, error))
        )
      );
      
      this.logger.debug('Session stop results', {
        total: stopResults.length,
        fulfilled: stopResults.filter(r => r.status === 'fulfilled').length,
        rejected: stopResults.filter(r => r.status === 'rejected').length
      });
    }
    
    // Disconnect all streaming clients
    this.logger.debug('Disconnecting all streaming clients');
    this.streamManager.disconnectAll();
    
    // Clean up MCP config
    this.logger.debug('Cleaning up MCP config');
    this.mcpConfigGenerator.cleanup();
    
    // Only close server in test environment
    if (process.env.NODE_ENV === 'test' && this.server) {
      this.logger.debug('Closing HTTP server (test environment)');
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.logger.info('HTTP server closed successfully');
          resolve();
        });
      });
    }
  }

  /**
   * Cleanup resources during failed startup
   */
  private async cleanup(): Promise<void> {
    this.logger.info('Performing cleanup after startup failure...');
    this.logger.debug('Cleanup initiated', {
      hasServer: !!this.server,
      hasActiveStreams: this.streamManager.getTotalClientCount() > 0
    });
    
    try {
      // Close HTTP server if it was started
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            this.logger.info('HTTP server closed during cleanup');
            resolve();
          });
        });
      }

      // Disconnect streaming clients
      this.streamManager.disconnectAll();
      
      this.logger.info('Cleanup completed');
    } catch (error) {
      this.logger.error('Error during cleanup:', error, {
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
    }
  }

  private setupMiddleware(): void {
    this.app.use(createCorsMiddleware());
    this.app.use(express.json({ limit: '10mb' }));
    
    // Static file serving
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      // In production/test, serve built static files
      const staticPath = path.join(__dirname, 'web');
      this.logger.debug('Serving static files from', { path: staticPath });
      this.app.use(express.static(staticPath));
    }
    // In development, ViteExpress handles static file serving
    
    // Request logging
    this.app.use(requestLogger);
    
    // Query parameter parsing - convert strings to proper types
    this.app.use(queryParser);
    
  }

  private setupRoutes(): void {
    // System routes (includes health check) - before auth
    this.app.use('/api/system', createSystemRoutes(this.processManager, this.historyReader));
    this.app.use('/', createSystemRoutes(this.processManager, this.historyReader)); // For /health at root
    
    // Permission routes - before auth (needed for MCP server communication)
    this.app.use('/api/permissions', createPermissionRoutes(this.permissionTracker));
    
    // Apply auth middleware to all other API routes unless skipAuthToken is set
    if (!this.configOverrides?.skipAuthToken) {
      if (this.configOverrides?.token) {
        // Use custom auth middleware with token override
        this.app.use('/api', createAuthMiddleware(this.configOverrides.token));
        this.logger.info('Using custom authentication token from CLI');
      } else {
        // Use default auth middleware
        this.app.use('/api', authMiddleware);
      }
    } else {
      this.logger.warn('Authentication middleware is disabled - API endpoints are not protected!');
    }
    
    // API routes
    this.app.use('/api/conversations', createConversationRoutes(
      this.processManager,
      this.historyReader,
      this.statusTracker,
      this.sessionInfoService,
      this.conversationStatusManager,
      this.toolMetricsService
    ));
    this.app.use('/api/filesystem', createFileSystemRoutes(this.fileSystemService));
    this.app.use('/api/logs', createLogRoutes());
    this.app.use('/api/stream', createStreamingRoutes(this.streamManager));
    this.app.use('/api/working-directories', createWorkingDirectoriesRoutes(this.workingDirectoriesService));
    this.app.use('/api/preferences', createPreferencesRoutes(this.preferencesService));
    this.app.use('/api/gemini', createGeminiRoutes(geminiService));
    
    // React Router catch-all - must be after all API routes
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      // In production/test, serve index.html for all non-API routes
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'web/index.html'));
      });
    }
    // In development, ViteExpress handles React routing
    
    // Error handling - MUST be last
    this.app.use(errorHandler);
  }

  private setupProcessManagerIntegration(): void {
    this.logger.debug('Setting up ProcessManager integration with StreamManager');
    
    // Set up tool metrics service to listen to claude messages
    this.toolMetricsService.listenToClaudeMessages(this.processManager);
    
    // Forward Claude messages to stream
    this.processManager.on('claude-message', ({ streamingId, message }) => {
      this.logger.debug('Received claude-message event', { 
        streamingId, 
        messageType: message?.type,
        messageSubtype: message?.subtype,
        hasContent: !!message?.content,
        contentLength: message?.content?.length || 0,
        messageKeys: message ? Object.keys(message) : []
      });
      
      // Skip broadcasting system init messages as they're now included in API response
      if (message && message.type === 'system' && message.subtype === 'init') {
        this.logger.debug('Skipping broadcast of system init message (included in API response)', {
          streamingId,
          sessionId: message.session_id
        });
        return;
      }
      
      // Stream other Claude messages as normal
      this.logger.debug('Broadcasting message to StreamManager', { 
        streamingId, 
        messageType: message?.type,
        messageSubtype: message?.subtype
      });
      this.streamManager.broadcast(streamingId, message);
    });

    // Handle process closure
    this.processManager.on('process-closed', ({ streamingId, code }) => {
      this.logger.debug('Received process-closed event, closing StreamManager session', {
        streamingId,
        exitCode: code,
        clientCount: this.streamManager.getClientCount(streamingId),
        wasSuccessful: code === 0
      });
      
      // Unregister session from status tracker
      this.logger.debug('Unregistering session from status tracker', { streamingId });
      this.statusTracker.unregisterActiveSession(streamingId);
      
      // Clean up conversation context (handled automatically in unregisterActiveSession)
      
      // Clean up permissions for this streaming session
      const removedCount = this.permissionTracker.removePermissionsByStreamingId(streamingId);
      if (removedCount > 0) {
        this.logger.debug('Cleaned up permissions for closed session', {
          streamingId,
          removedPermissions: removedCount
        });
      }

      if (code === 0) {
        // Session completion notification removed
      }

      this.streamManager.closeSession(streamingId);
    });

    // Handle process errors
    this.processManager.on('process-error', ({ streamingId, error }) => {
      this.logger.debug('Received process-error event, forwarding to StreamManager', { 
        streamingId, 
        error,
        errorLength: error?.toString().length || 0,
        clientCount: this.streamManager.getClientCount(streamingId)
      });
      
      // Unregister session from status tracker on error
      this.logger.debug('Unregistering session from status tracker due to error', { streamingId });
      this.statusTracker.unregisterActiveSession(streamingId);
      
      // Clean up conversation context on error (handled automatically in unregisterActiveSession)
      
      const errorEvent: StreamEvent = {
        type: 'error' as const,
        error: error.toString(),
        streamingId: streamingId,
        timestamp: new Date().toISOString()
      };
      
      this.logger.debug('Broadcasting error event to clients', {
        streamingId,
        errorEventKeys: Object.keys(errorEvent)
      });
      
      this.streamManager.broadcast(streamingId, errorEvent);
    });
    
    this.logger.debug('ProcessManager integration setup complete', {
      totalEventListeners: this.processManager.listenerCount('claude-message') + 
                          this.processManager.listenerCount('process-closed') + 
                          this.processManager.listenerCount('process-error')
    });
  }

  private setupPermissionTrackerIntegration(): void {
    this.logger.debug('Setting up PermissionTracker integration');
    
    // Forward permission events to stream
    this.permissionTracker.on('permission_request', (request: PermissionRequest) => {
      this.logger.debug('Permission request event received', {
        id: request.id,
        toolName: request.toolName,
        streamingId: request.streamingId
      });
      
      // Broadcast to the appropriate streaming session
      if (request.streamingId && request.streamingId !== 'unknown') {
        const event: StreamEvent = {
          type: 'permission_request',
          data: request,
          streamingId: request.streamingId,
          timestamp: new Date().toISOString()
        };

        this.streamManager.broadcast(request.streamingId, event);

        // Permission request notification removed
      }
    });
    
    this.logger.debug('PermissionTracker integration setup complete');
  }
}