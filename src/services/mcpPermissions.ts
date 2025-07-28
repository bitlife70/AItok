import { Storage } from '../utils/storage';

export type PermissionLevel = 'allow' | 'deny' | 'prompt';
export type PermissionScope = 'filesystem' | 'network' | 'system' | 'database' | 'external_api';

export interface Permission {
  id: string;
  serverId: string;
  scope: PermissionScope;
  resource?: string; // Specific resource pattern, e.g., "/home/user/*", "*.api.com"
  level: PermissionLevel;
  grantedAt: Date;
  expiresAt?: Date;
  description: string;
}

export interface ToolPermissionCheck {
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
  scope: PermissionScope;
  resource?: string;
}

export interface PermissionRequest {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  scope: PermissionScope;
  resource?: string;
  description: string;
  requestedAt: Date;
  arguments: Record<string, any>;
}

export class MCPPermissionManager {
  private static readonly PERMISSIONS_KEY = 'mcp_permissions';
  private static readonly SETTINGS_KEY = 'mcp_permission_settings';
  
  private pendingRequests = new Map<string, PermissionRequest>();
  private permissionListeners: Array<(request: PermissionRequest) => void> = [];

  // Default permission settings
  private defaultSettings = {
    requireConfirmation: true,
    autoAllowTrustedServers: false,
    autoAllowFileSystemRead: false,
    autoAllowNetworkRequests: false,
    permissionTimeout: 300000, // 5 minutes
    maxPermissionsPerServer: 50
  };

  getPermissions(): Permission[] {
    const saved = Storage.getItem(MCPPermissionManager.PERMISSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  private savePermissions(permissions: Permission[]): void {
    Storage.setItem(MCPPermissionManager.PERMISSIONS_KEY, JSON.stringify(permissions));
  }

  getSettings() {
    const saved = Storage.getItem(MCPPermissionManager.SETTINGS_KEY);
    return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
  }

  updateSettings(settings: Partial<typeof this.defaultSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    Storage.setItem(MCPPermissionManager.SETTINGS_KEY, JSON.stringify(updated));
  }

  async checkPermission(check: ToolPermissionCheck): Promise<boolean> {
    const permissions = this.getPermissions();
    const settings = this.getSettings();

    // Find existing permission
    const existing = permissions.find(p => 
      p.serverId === check.serverId &&
      p.scope === check.scope &&
      (p.resource ? this.matchesPattern(check.resource || '', p.resource) : true) &&
      (!p.expiresAt || new Date(p.expiresAt) > new Date())
    );

    if (existing) {
      return existing.level === 'allow';
    }

    // Check auto-allow settings
    if (this.shouldAutoAllow(check, settings)) {
      // Grant automatic permission
      await this.grantPermission({
        id: `auto-${Date.now()}`,
        serverId: check.serverId,
        scope: check.scope,
        resource: check.resource,
        level: 'allow',
        grantedAt: new Date(),
        description: `Auto-granted for ${check.toolName}`
      });
      return true;
    }

    // Require user confirmation
    if (settings.requireConfirmation) {
      return await this.requestPermission(check);
    }

    // Default deny
    return false;
  }

  private shouldAutoAllow(check: ToolPermissionCheck, settings: any): boolean {
    // Check various auto-allow conditions
    if (settings.autoAllowFileSystemRead && 
        check.scope === 'filesystem' && 
        check.toolName.includes('read')) {
      return true;
    }

    if (settings.autoAllowNetworkRequests && check.scope === 'network') {
      return true;
    }

    return false;
  }

  private async requestPermission(check: ToolPermissionCheck): Promise<boolean> {
    const server = this.getServerInfo(check.serverId);
    
    const request: PermissionRequest = {
      id: `req-${Date.now()}`,
      serverId: check.serverId,
      serverName: server?.name || check.serverId,
      toolName: check.toolName,
      scope: check.scope,
      resource: check.resource,
      description: this.generatePermissionDescription(check),
      requestedAt: new Date(),
      arguments: check.arguments
    };

    this.pendingRequests.set(request.id, request);

    // Notify listeners (UI components)
    this.permissionListeners.forEach(listener => listener(request));

    // Wait for user response with timeout
    const settings = this.getSettings();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        resolve(false); // Default deny on timeout
      }, settings.permissionTimeout);

      // Set up response handler
      const checkResponse = () => {
        if (!this.pendingRequests.has(request.id)) {
          clearTimeout(timeout);
          // Check if permission was granted
          const permissions = this.getPermissions();
          const granted = permissions.some(p => 
            p.serverId === check.serverId &&
            p.scope === check.scope &&
            p.level === 'allow' &&
            new Date(p.grantedAt).getTime() > Date.now() - 10000 // Within last 10 seconds
          );
          resolve(granted);
        } else {
          setTimeout(checkResponse, 500);
        }
      };

      setTimeout(checkResponse, 500);
    });
  }

  private generatePermissionDescription(check: ToolPermissionCheck): string {
    switch (check.scope) {
      case 'filesystem':
        return `Access file system ${check.resource ? `(${check.resource})` : ''}`;
      case 'network':
        return `Make network requests ${check.resource ? `to ${check.resource}` : ''}`;
      case 'system':
        return `Execute system commands`;
      case 'database':
        return `Access database ${check.resource ? `(${check.resource})` : ''}`;
      case 'external_api':
        return `Call external API ${check.resource ? `(${check.resource})` : ''}`;
      default:
        return `Perform ${check.scope} operations`;
    }
  }

  async grantPermission(permission: Omit<Permission, 'id'> & { id?: string }): Promise<void> {
    const permissions = this.getPermissions();
    const settings = this.getSettings();

    // Check max permissions per server
    const serverPermissions = permissions.filter(p => p.serverId === permission.serverId);
    if (serverPermissions.length >= settings.maxPermissionsPerServer) {
      throw new Error(`Maximum permissions exceeded for server ${permission.serverId}`);
    }

    const newPermission: Permission = {
      id: permission.id || `perm-${Date.now()}`,
      ...permission,
      grantedAt: new Date(permission.grantedAt)
    };

    permissions.push(newPermission);
    this.savePermissions(permissions);
  }

  async revokePermission(permissionId: string): Promise<void> {
    const permissions = this.getPermissions();
    const filtered = permissions.filter(p => p.id !== permissionId);
    this.savePermissions(filtered);
  }

  async revokeServerPermissions(serverId: string): Promise<void> {
    const permissions = this.getPermissions();
    const filtered = permissions.filter(p => p.serverId !== serverId);
    this.savePermissions(filtered);
  }

  respondToPermissionRequest(requestId: string, granted: boolean, options?: {
    expiresIn?: number; // milliseconds
    resource?: string;
    remember?: boolean;
  }): void {
    const request = this.pendingRequests.get(requestId);
    if (!request) return;

    this.pendingRequests.delete(requestId);

    if (granted) {
      const permission: Omit<Permission, 'id'> = {
        serverId: request.serverId,
        scope: request.scope,
        resource: options?.resource || request.resource,
        level: 'allow',
        grantedAt: new Date(),
        expiresAt: options?.expiresIn ? new Date(Date.now() + options.expiresIn) : undefined,
        description: request.description
      };

      this.grantPermission(permission);
    }
  }

  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  addPermissionListener(listener: (request: PermissionRequest) => void): void {
    this.permissionListeners.push(listener);
  }

  removePermissionListener(listener: (request: PermissionRequest) => void): void {
    this.permissionListeners = this.permissionListeners.filter(l => l !== listener);
  }

  private matchesPattern(resource: string, pattern: string): boolean {
    // Simple pattern matching with wildcards
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`).test(resource);
  }

  private getServerInfo(serverId: string) {
    // This would normally come from the MCP service
    // For now, return basic info
    return { name: serverId };
  }

  getPermissionsByServer(serverId: string): Permission[] {
    return this.getPermissions().filter(p => p.serverId === serverId);
  }

  getPermissionStats(): {
    total: number;
    byScope: Record<PermissionScope, number>;
    byLevel: Record<PermissionLevel, number>;
    expired: number;
  } {
    const permissions = this.getPermissions();
    const now = new Date();

    const stats = {
      total: permissions.length,
      byScope: {} as Record<PermissionScope, number>,
      byLevel: {} as Record<PermissionLevel, number>,
      expired: 0
    };

    permissions.forEach(p => {
      // Count by scope
      stats.byScope[p.scope] = (stats.byScope[p.scope] || 0) + 1;
      
      // Count by level
      stats.byLevel[p.level] = (stats.byLevel[p.level] || 0) + 1;
      
      // Count expired
      if (p.expiresAt && new Date(p.expiresAt) <= now) {
        stats.expired++;
      }
    });

    return stats;
  }

  cleanupExpiredPermissions(): number {
    const permissions = this.getPermissions();
    const now = new Date();
    
    const valid = permissions.filter(p => 
      !p.expiresAt || new Date(p.expiresAt) > now
    );
    
    const removedCount = permissions.length - valid.length;
    if (removedCount > 0) {
      this.savePermissions(valid);
    }
    
    return removedCount;
  }

  exportPermissions(): string {
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      permissions: this.getPermissions(),
      settings: this.getSettings()
    }, null, 2);
  }

  importPermissions(jsonData: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);
      
      if (!data.version || !Array.isArray(data.permissions)) {
        throw new Error('Invalid export format');
      }

      const existingPermissions = this.getPermissions();
      
      for (const permission of data.permissions) {
        try {
          // Validate permission structure
          if (!permission.serverId || !permission.scope || !permission.level) {
            errors.push(`Invalid permission structure: ${JSON.stringify(permission)}`);
            continue;
          }

          // Check for duplicates
          const isDuplicate = existingPermissions.some(existing => 
            existing.serverId === permission.serverId &&
            existing.scope === permission.scope &&
            existing.resource === permission.resource
          );

          if (!isDuplicate) {
            existingPermissions.push({
              ...permission,
              grantedAt: new Date(permission.grantedAt),
              expiresAt: permission.expiresAt ? new Date(permission.expiresAt) : undefined
            });
            imported++;
          }
        } catch (error) {
          errors.push(`Failed to import permission: ${error}`);
        }
      }

      this.savePermissions(existingPermissions);

      // Import settings if available
      if (data.settings) {
        this.updateSettings(data.settings);
      }

    } catch (error) {
      errors.push(`Failed to parse import data: ${error}`);
    }

    return { imported, errors };
  }
}

// Global instance
export const mcpPermissionManager = new MCPPermissionManager();