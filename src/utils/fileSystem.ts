import { Watchlist, Mode } from '../types';
import { generateVideoCardPoster, extractVideoFrameThumbnail } from './coverHelper';
import { sortSmartMediaFiles, naturalCompare } from './sorter';

export function isCrossOriginIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function verifyPermission(fileHandle: any, withRequest: boolean = false): Promise<boolean> {
  try {
    const options = { mode: 'read' as const };
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if (withRequest) {
      if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
      }
    }
  } catch (e) {
    console.error('Permission check failed:', e);
  }
  return false;
}

export async function getFilesFromDirectoryHandle(dirHandle: any, path: string = ''): Promise<File[]> {
  try {
    const iterator = typeof dirHandle.values === 'function' ? dirHandle.values() : (dirHandle as any).entries();
    const entries = [];
    for await (let entry of iterator) {
      if (Array.isArray(entry)) entry = entry[1];
      entries.push(entry);
    }

    const promises = entries.map(async (entry) => {
      if (entry.kind === 'file') {
        // Optimistically filter by extension before getting the File object to save time if possible
        const isLikelyMedia = entry.name.match(/\.(mp4|mkv|webm|avi|mov|ts|m4v|flv|wmv|3gp|mp3|m4a|aac|wav|flac|ogg)$/i);
        if (!isLikelyMedia) {
           // We might miss files without extensions, but usually media has extensions.
           // If we strictly want to check mime type we still have to get the file.
           // To be safe and fast, we check extension first.
        }
        
        // Fast path for non-media files
        if (entry.name.startsWith('.') || entry.name.match(/\.(txt|srt|vtt|jpg|png|nfo)$/i)) {
           return [];
        }

        const file = await entry.getFile();
        const isMedia = file.type.startsWith('video/') || file.type.startsWith('audio/') || file.name.match(/\.(mp4|mkv|webm|avi|mov|ts|m4v|flv|wmv|3gp|mp3|m4a|aac|wav|flac|ogg)$/i);
        if (isMedia) {
          const fullPath = path ? `${path}/${file.name}` : file.name;
          try {
            Object.defineProperty(file, 'customPath', { value: fullPath, writable: true });
          } catch (e) {
            (file as any).customPath = fullPath;
          }
          return [file];
        }
        return [];
      } else if (entry.kind === 'directory') {
        return await getFilesFromDirectoryHandle(entry, path ? `${path}/${entry.name}` : entry.name);
      }
      return [];
    });

    const results = await Promise.all(promises);
    return results.flat();
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

export async function createWatchlistsFromDirectoryHandle(dirHandle: any, currentMode: Mode = 'family'): Promise<Watchlist[]> {
  const watchlists: Watchlist[] = [];
  const rootFiles: File[] = [];
  
  try {
    const iterator = typeof dirHandle.values === 'function' ? dirHandle.values() : (dirHandle as any).entries();
    const entries = [];
    for await (let entry of iterator) {
      if (Array.isArray(entry)) entry = entry[1];
      entries.push(entry);
    }
    
    const promises = entries.map(async (entry) => {
      if (entry.kind === 'directory') {
        const watchlistName = entry.name;
        const files = await getFilesFromDirectoryHandle(entry, entry.name);
        
        if (files.length > 0) {
          const seasonsMap = new Map<string, File[]>();
          const looseFiles: File[] = [];
          
          files.forEach(f => {
            const parts = ((f as any).customPath || f.webkitRelativePath || '').split('/');
            if (parts.length > 2) {
               const seasonName = parts[1];
               if (!seasonsMap.has(seasonName)) seasonsMap.set(seasonName, []);
               seasonsMap.get(seasonName)!.push(f);
            } else {
               looseFiles.push(f);
            }
          });

          const seasons = Array.from(seasonsMap.entries())
            .map(([name, sFiles]) => ({ name, files: sortSmartMediaFiles(sFiles) }))
            .sort((a, b) => naturalCompare(a.name, b.name));

          let finalSeasons = seasons.length > 0 ? seasons : undefined;
          if (finalSeasons && looseFiles.length > 0) {
            finalSeasons = [{ name: 'الملفات المباشرة', files: sortSmartMediaFiles(looseFiles) }, ...finalSeasons];
          }

          const sortedAllFiles = sortSmartMediaFiles(files);
          const firstFile = looseFiles[0] || sortedAllFiles[0];
          const initialCover = firstFile ? generateVideoCardPoster(watchlistName, firstFile.name) : '';

          return {
            id: generateId(),
            title: watchlistName,
            files: sortedAllFiles,
            seasons: finalSeasons,
            targetMode: currentMode,
            section: 'تمت إضافتها من المجلد الأب',
            coverImage: initialCover,
            seriesCount: finalSeasons ? finalSeasons.length : 1,
            episodesCount: sortedAllFiles.length,
            lastWatched: 'لم يتم المشاهدة بعد',
            progress: 0,
            timeRemaining: '',
          };
        }
      } else if (entry.kind === 'file') {
        const isLikelyMedia = entry.name.match(/\.(mp4|mkv|webm|avi|mov|ts|m4v|flv|wmv|3gp|mp3|m4a|aac|wav|flac|ogg)$/i);
        if (!isLikelyMedia) return null;
        
        const file = await entry.getFile();
        const isMedia = file.type.startsWith('video/') || file.type.startsWith('audio/') || file.name.match(/\.(mp4|mkv|webm|avi|mov|ts|m4v|flv|wmv|3gp|mp3|m4a|aac|wav|flac|ogg)$/i);
        if (isMedia) {
          const fullPath = file.name;
          try {
            Object.defineProperty(file, 'customPath', { value: fullPath, writable: true });
          } catch (e) {
            (file as any).customPath = fullPath;
          }
          rootFiles.push(file);
        }
      }
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res) watchlists.push(res);
    });

  } catch (error) {
    console.error('Error in createWatchlistsFromDirectoryHandle:', error);
  }
  
  // For root files, each file becomes its own individual watchlist
  if (rootFiles.length > 0) {
    rootFiles.forEach(file => {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      watchlists.push({
        id: generateId(),
        title: fileNameWithoutExt,
        files: [file],
        targetMode: currentMode,
        section: 'مقاطع مفردة',
        coverImage: generateVideoCardPoster(fileNameWithoutExt, file.name),
        seriesCount: 0,
        episodesCount: 1,
        lastWatched: 'لم يتم المشاهدة بعد',
        progress: 0,
        timeRemaining: '',
      });
    });
  }
  
  return watchlists;
}
