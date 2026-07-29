import { get, set } from 'idb-keyval';
import { Watchlist, Session, Mode, ModeConfig } from '../types';
import { MODES } from '../data';

// Helper to sanitize File items so IndexedDB and localStorage never encounter DataCloneErrors
function sanitizeFileItem(item: any) {
  if (!item) return item;

  if (item instanceof File) {
    return {
      name: item.name,
      size: item.size,
      type: item.type,
      webkitRelativePath: (item as any).customPath || (item as any).webkitRelativePath || (item as any).relativePath || '',
      title: item.name
    };
  }

  if (typeof item === 'object') {
    return {
      name: typeof item.name === 'string' ? item.name : (typeof item.title === 'string' ? item.title : 'مقطع'),
      size: typeof item.size === 'number' ? item.size : 0,
      type: typeof item.type === 'string' ? item.type : '',
      webkitRelativePath: typeof item.customPath === 'string' ? item.customPath : (typeof item.webkitRelativePath === 'string' ? item.webkitRelativePath : (typeof item.relativePath === 'string' ? item.relativePath : (typeof item.path === 'string' ? item.path : ''))),
      title: typeof item.title === 'string' ? item.title : (typeof item.name === 'string' ? item.name : 'مقطع'),
      url: typeof item.url === 'string' && !item.url.startsWith('blob:') ? item.url : '',
      coverImage: typeof item.coverImage === 'string' ? item.coverImage : (typeof item.thumbnail === 'string' ? item.thumbnail : (typeof item.poster === 'string' ? item.poster : ''))
    };
  }

  return item;
}

export function sanitizeWatchlists(lists: Watchlist[]): Watchlist[] {
  if (!Array.isArray(lists)) return [];
  return lists.map(w => ({
    ...w,
    files: Array.isArray(w.files) ? w.files.map(sanitizeFileItem) : [],
    seasons: Array.isArray(w.seasons)
      ? w.seasons.map(s => ({
          name: s.name,
          files: Array.isArray(s.files) ? s.files.map(sanitizeFileItem) : []
        }))
      : undefined
  }));
}

export const store = {
  async getParentDirectoryHandles(): Promise<any[]> {
    try {
      const handles = await get('app_parent_directories');
      if (Array.isArray(handles)) return handles;
      
      // Fallback for older single handle
      const singleHandle = await get('app_parent_directory');
      if (singleHandle) return [singleHandle];
      
      return [];
    } catch (e) {
      console.warn('IndexedDB getParentDirectoryHandles failed:', e);
      return [];
    }
  },

  async setParentDirectoryHandles(handles: any[]) {
    try {
      await set('app_parent_directories', handles);
    } catch (e) {
      console.warn('IndexedDB setParentDirectoryHandles failed:', e);
    }
  },

  async getWatchlists(): Promise<Watchlist[]> {
    try {
      const idbData = await get<Watchlist[]>('app_watchlists');
      if (Array.isArray(idbData) && idbData.length > 0) {
        return idbData;
      }
    } catch (e) {
      console.warn('IndexedDB getWatchlists failed, falling back to localStorage:', e);
    }

    try {
      const localData = localStorage.getItem('app_watchlists_backup');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('localStorage getWatchlists failed:', e);
    }

    return [];
  },

  async setWatchlists(watchlists: Watchlist[]) {
    const sanitized = sanitizeWatchlists(watchlists);

    // Primary: IndexedDB
    try {
      await set('app_watchlists', sanitized);
    } catch (e) {
      console.warn('IndexedDB setWatchlists failed:', e);
    }

    // Secondary: LocalStorage Backup
    try {
      localStorage.setItem('app_watchlists_backup', JSON.stringify(sanitized));
    } catch (e) {
      console.warn('LocalStorage backup setWatchlists failed:', e);
    }
  },

  async getSessions(): Promise<Session[]> {
    try {
      const idbData = await get<Session[]>('app_sessions');
      if (Array.isArray(idbData) && idbData.length > 0) return idbData;
    } catch (e) {
      console.warn('IndexedDB getSessions failed:', e);
    }

    try {
      const localData = localStorage.getItem('app_sessions_backup');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('localStorage getSessions failed:', e);
    }

    return [];
  },

  async setSessions(sessions: Session[]) {
    try {
      await set('app_sessions', sessions);
    } catch (e) {
      console.warn('IndexedDB setSessions failed:', e);
    }

    try {
      localStorage.setItem('app_sessions_backup', JSON.stringify(sessions));
    } catch (e) {
      console.warn('LocalStorage backup setSessions failed:', e);
    }
  },

  async getCategories(): Promise<Record<Mode, string[]>> {
    try {
      const idbData = await get<Record<Mode, string[]>>('app_categories');
      if (idbData && typeof idbData === 'object') return idbData;
    } catch (e) {
      console.warn('IndexedDB getCategories failed:', e);
    }

    try {
      const localData = localStorage.getItem('app_categories_backup');
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (e) {
      console.error('localStorage getCategories failed:', e);
    }

    return {
      kids: [], family: [], cinema: [], docs: [], quran: [], music: [], night: []
    };
  },

  async setCategories(categories: Record<Mode, string[]>) {
    try {
      await set('app_categories', categories);
    } catch (e) {
      console.warn('IndexedDB setCategories failed:', e);
    }

    try {
      localStorage.setItem('app_categories_backup', JSON.stringify(categories));
    } catch (e) {
      console.warn('LocalStorage backup setCategories failed:', e);
    }
  },

  async getCustomModes(): Promise<Record<Mode, ModeConfig>> {
    try {
      const idbData = await get<Record<Mode, ModeConfig>>('app_custom_modes');
      if (idbData && typeof idbData === 'object') return idbData;
    } catch (e) {
      console.warn('IndexedDB getCustomModes failed:', e);
    }

    try {
      const localData = localStorage.getItem('app_custom_modes_backup');
      if (localData) return JSON.parse(localData);
    } catch (e) {
      console.error('localStorage getCustomModes failed:', e);
    }

    return MODES;
  },

  async setCustomModes(modes: Record<Mode, ModeConfig>) {
    try {
      await set('app_custom_modes', modes);
    } catch (e) {
      console.warn('IndexedDB setCustomModes failed:', e);
    }

    try {
      localStorage.setItem('app_custom_modes_backup', JSON.stringify(modes));
    } catch (e) {
      console.warn('LocalStorage backup setCustomModes failed:', e);
    }
  },

  async getMode(): Promise<Mode> {
    try {
      const idbData = await get<Mode>('app_mode');
      if (idbData) return idbData;
    } catch (e) {
      console.warn('IndexedDB getMode failed:', e);
    }

    try {
      const localData = localStorage.getItem('app_mode_backup');
      if (localData) return localData as Mode;
    } catch (e) {
      console.error('localStorage getMode failed:', e);
    }

    return 'family';
  },

  async setMode(mode: Mode) {
    try {
      await set('app_mode', mode);
    } catch (e) {
      console.warn('IndexedDB setMode failed:', e);
    }

    try {
      localStorage.setItem('app_mode_backup', mode);
    } catch (e) {
      console.warn('LocalStorage backup setMode failed:', e);
    }
  },

  async getChannels(): Promise<any[]> {
    try {
      const idbData = await get<any[]>('app_channels');
      if (Array.isArray(idbData) && idbData.length > 0) return idbData;
    } catch (e) {
      console.warn('IndexedDB getChannels failed:', e);
    }

    try {
      const localData = localStorage.getItem('app_channels_backup');
      if (localData) return JSON.parse(localData);
    } catch (e) {
      console.error('localStorage getChannels failed:', e);
    }

    return [];
  },

  async setChannels(channels: any[]) {
    try {
      await set('app_channels', channels);
    } catch (e) {
      console.warn('IndexedDB setChannels failed:', e);
    }

    try {
      localStorage.setItem('app_channels_backup', JSON.stringify(channels));
    } catch (e) {
      console.warn('LocalStorage backup setChannels failed:', e);
    }
  },

  async getSchedules(): Promise<any[]> {
    try {
      const idbData = await get<any[]>('app_schedules');
      if (Array.isArray(idbData) && idbData.length > 0) return idbData;
    } catch (e) {
      console.warn('IndexedDB getSchedules failed:', e);
    }

    try {
      const localData = localStorage.getItem('app_schedules_backup');
      if (localData) return JSON.parse(localData);
    } catch (e) {
      console.error('localStorage getSchedules failed:', e);
    }

    return [];
  },

  async setSchedules(schedules: any[]) {
    try {
      await set('app_schedules', schedules);
    } catch (e) {
      console.warn('IndexedDB setSchedules failed:', e);
    }

    try {
      localStorage.setItem('app_schedules_backup', JSON.stringify(schedules));
    } catch (e) {
      console.warn('LocalStorage backup setSchedules failed:', e);
    }
  },

  async exportData() {
    const data = {
      watchlists: await this.getWatchlists(),
      sessions: await this.getSessions(),
      categories: await this.getCategories(),
      customModes: await this.getCustomModes(),
      mode: await this.getMode(),
      localStorage: Object.keys(localStorage).reduce((acc, key) => {
        acc[key] = localStorage.getItem(key);
        return acc;
      }, {} as Record<string, any>)
    };
    return data;
  },

  async importData(data: any) {
    if (data.watchlists) await this.setWatchlists(data.watchlists);
    if (data.sessions) await this.setSessions(data.sessions);
    if (data.categories) await this.setCategories(data.categories);
    if (data.customModes) await this.setCustomModes(data.customModes);
    if (data.mode) await this.setMode(data.mode);
    if (data.localStorage) {
      Object.keys(data.localStorage).forEach(key => {
        localStorage.setItem(key, data.localStorage[key]);
      });
    }
  }
};

