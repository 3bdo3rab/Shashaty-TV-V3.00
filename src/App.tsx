import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import HomeView from './views/HomeView';
import ChannelsView from './views/ChannelsView';
import LibraryView from './views/LibraryView';
import CreateWatchlistView from './views/CreateWatchlistView';
import SmartSessionsView from './views/SmartSessionsView';
import PlayerView from './views/PlayerView';
import SettingsView from './views/SettingsView';
import { ViewState, Mode, Watchlist, Session, ModeConfig, Channel, WeeklyScheduleEntry } from './types';
import { autoAssignWatchlistsToChannels, getChannelNowPlaying } from './utils/channelEngine';
import { MODES } from './data';
import { DEFAULT_CHANNELS } from './data/defaultChannels';
import { store } from './utils/store';
import { verifyPermission, getFilesFromDirectoryHandle } from './utils/fileSystem';
import { extractVideoFrameThumbnail, generateVideoCardPoster } from './utils/coverHelper';
import { FolderLock, FolderPlus, FolderTree, CheckCircle2, FolderOpen, Info, X, ShieldCheck, Play, Sparkles, Zap } from 'lucide-react';
import { useDialog } from './contexts/DialogContext';
import { ProcessingRing } from './components/ProcessingRing';
import { ScheduleNotifier } from './components/ScheduleNotifier';
import { TauriTitleBar } from './components/TauriTitleBar';
import { runFullAppInspection, QAReport, QAIssue } from './utils/inspectionEngine';
import { InspectionReportModal } from './components/InspectionReportModal';
import { setAlwaysOnTop } from './utils/tauri';

export default function App() {
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);
  const { showAlert } = useDialog();
  const [permissionRequired, setPermissionRequired] = useState<any[]>([]);
  const [needsParentFolder, setNeedsParentFolder] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [previousView, setPreviousView] = useState<ViewState>('home');
  
  const [currentMode, setCurrentMode] = useState<Mode>('family');
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [customCategories, setCustomCategories] = useState<Record<Mode, string[]>>({
    kids: [], family: [], cinema: [], docs: [], quran: [], music: [], night: []
  });
  const [customModes, setCustomModes] = useState<Record<Mode, ModeConfig>>(MODES);

  // QA Inspection Mode States
  const [qaInspectionEnabled, setQaInspectionEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('app_qa_inspection_enabled');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionProgress, setInspectionProgress] = useState({ text: '', percentage: 0 });
  const [qaReport, setQaReport] = useState<QAReport | null>(null);

  useEffect(() => {
    try {
      const isAlwaysOnTop = localStorage.getItem('app_always_on_top') === 'true';
      if (isAlwaysOnTop) {
        setAlwaysOnTop(true);
      }
      const isLiteMode = localStorage.getItem('app_lite_mode_enabled') === 'true';
      if (isLiteMode) {
        document.documentElement.classList.add('lite-mode');
      } else {
        document.documentElement.classList.remove('lite-mode');
      }
    } catch (e) {
      console.warn('Could not restore app settings:', e);
    }
  }, []);

  const handleStartInspection = async () => {
    setIsInspecting(true);
    setInspectionProgress({ text: 'بدء فحص شامل للتطبيق...', percentage: 5 });
    try {
      const report = await runFullAppInspection(
        {
          watchlists,
          channels,
          sessions,
          schedules,
          customModes,
          currentMode,
          customCategories
        },
        (text, percentage) => {
          setInspectionProgress({ text, percentage });
        }
      );
      setQaReport(report);
    } catch (err) {
      console.error('Inspection failed:', err);
      await showAlert('حدث خطأ غير متوقع أثناء إجراء الفحص الشامل.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleAutoFixIssue = async (issue: QAIssue) => {
    if (!issue.fixActionKey || !issue.fixActionData) return;

    if (issue.fixActionKey === 'delete_empty_watchlist') {
      const { watchlistId } = issue.fixActionData;
      const updated = watchlists.filter(w => w.id !== watchlistId);
      setWatchlists(updated);
      await store.setWatchlists(updated);
    } else if (issue.fixActionKey === 'clean_broken_channel_refs') {
      const { channelId, brokenIds } = issue.fixActionData;
      const updatedChannels = channels.map(ch => {
        if (ch.id === channelId) {
          return {
            ...ch,
            playlistIds: ch.playlistIds.filter(id => !brokenIds.includes(id))
          };
        }
        return ch;
      });
      setChannels(updatedChannels);
      await store.setChannels(updatedChannels);
    } else if (issue.fixActionKey === 'clean_broken_session_refs') {
      const { sessionId, invalidIds } = issue.fixActionData;
      const updatedSessions = sessions.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            selectedWatchlistIds: s.selectedWatchlistIds?.filter(id => !invalidIds.includes(id))
          };
        }
        return s;
      });
      setSessions(updatedSessions);
      await store.setSessions(updatedSessions);
    } else if (issue.fixActionKey === 'generate_missing_covers') {
      const { watchlistId } = issue.fixActionData;
      const targetWl = watchlists.find(w => w.id === watchlistId);
      if (targetWl) {
        const allFiles = [...(targetWl.files || []), ...(targetWl.seasons?.flatMap(s => s.files || []) || [])];
        const firstVid = allFiles.find(f => f instanceof File || (f && ((f as any).rawFile instanceof File || (f as any).blobUrl)));
        if (firstVid) {
          const cover = await extractVideoFrameThumbnail(firstVid);
          if (cover) {
            const updated = watchlists.map(w => w.id === watchlistId ? { ...w, coverImage: cover } : w);
            setWatchlists(updated);
            await store.setWatchlists(updated);
          }
        }
      }
    }
  };

  const hydrateLists = async (parentHandles: any[], storedWatchlists: Watchlist[]) => {
    try {
      setIsHydrating(true);
      const fileMap = new Map();
      const allPaths: string[] = [];
      
      for (const handle of parentHandles) {
         const allFiles = await getFilesFromDirectoryHandle(handle);
         allFiles.forEach(f => {
           const p = (f as any).customPath || f.webkitRelativePath;
           fileMap.set(p, f);
           allPaths.push(p);
         });
      }

      const findFile = (path: string) => {
         if (!path) return null;
         if (fileMap.has(path)) return fileMap.get(path);
         
         const targetSuffix = path.startsWith('/') ? path : '/' + path;
         const match = allPaths.find(p => p.endsWith(targetSuffix) || p === path);
         if (match) return fileMap.get(match);
         
         const fileName = path.split('/').pop();
         if (fileName) {
             const nameMatch = allPaths.find(p => p.endsWith('/' + fileName));
             if (nameMatch) return fileMap.get(nameMatch);
         }
         return null;
      };

      const hydrated = storedWatchlists.map(wl => {
        const hFiles = wl.files.map(f => {
          const path = (f as any).customPath || f.webkitRelativePath || f.name;
          return findFile(path) || f;
        });
        const hSeasons = wl.seasons?.map(s => ({
          ...s,
          files: s.files.map(f => {
             const path = (f as any).customPath || f.webkitRelativePath || f.name;
             return findFile(path) || f;
          })
        }));
        return { ...wl, files: hFiles, seasons: hSeasons };
      });
      setWatchlists(hydrated);

      // Asynchronously extract real video frame thumbnails for watchlists
      hydrated.forEach(async (wl) => {
        if (!wl.coverImage || (!wl.coverImage.startsWith('data:') && !wl.coverImage.startsWith('blob:'))) {
          const allFiles = [...(wl.files || []), ...(wl.seasons?.flatMap(s => s.files || []) || [])];
          const firstVideoFile = allFiles.find(f => f instanceof File || (f && ((f as any).rawFile instanceof File || (f as any).blobUrl)));
          if (firstVideoFile) {
            try {
              const frameDataUrl = await extractVideoFrameThumbnail(firstVideoFile);
              if (frameDataUrl) {
                setWatchlists(prev => prev.map(item => item.id === wl.id ? { ...item, coverImage: frameDataUrl } : item));
              }
            } catch (e) {
              console.warn('Frame extraction failed for watchlist:', wl.title, e);
            }
          }
        }
      });
    } catch (e) {
      console.error('Failed to hydrate watchlists:', e);
      setWatchlists(storedWatchlists);
    } finally {
      setIsHydrating(false);
      setIsStoreLoaded(true);
    }
  };

  useEffect(() => {
    async function loadData() {
      const mode = await store.getMode();
      const lists = await store.getWatchlists();
      const sess = await store.getSessions();
      const cats = await store.getCategories();
      const mods = await store.getCustomModes();
      const chs = await store.getChannels();
      const schs = await store.getSchedules();
      
      setCurrentMode(mode);
      setSessions(sess);
      setCustomCategories(cats);
      const mergedModes = { ...MODES, ...(mods || {}) };
      if (mods?.family && !mods.family.bgImage) {
        mergedModes.family = { ...mergedModes.family, bgImage: MODES.family.bgImage };
      }
      if (mods?.quran && (mods.quran.bgImage === 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=1600' || !mods.quran.bgImage)) {
        mergedModes.quran = { ...mergedModes.quran, bgImage: MODES.quran.bgImage };
      }
      setCustomModes(mergedModes);
      const loadedChannels = chs && chs.length > 0 ? chs : DEFAULT_CHANNELS;
      const sanitizedChannels = loadedChannels.map(ch => ({
        ...ch,
        title: ch.title ? ch.title.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim() : ch.title
      }));
      setChannels(sanitizedChannels);
      setSchedules(schs || []);

      const parentHandles = await store.getParentDirectoryHandles();
      if (parentHandles && parentHandles.length > 0) {
         const handlesNeedingPermission: any[] = [];
         const grantedHandles: any[] = [];
         
         for (const handle of parentHandles) {
             const hasPerm = await verifyPermission(handle);
             if (!hasPerm) {
                 handlesNeedingPermission.push(handle);
             } else {
                 grantedHandles.push(handle);
             }
         }
         
         if (handlesNeedingPermission.length > 0) {
           setWatchlists(lists); // set stale initially
           setPermissionRequired(handlesNeedingPermission);
           if (grantedHandles.length > 0) {
              await hydrateLists(grantedHandles, lists);
           } else {
              setIsStoreLoaded(true);
           }
         } else {
           await hydrateLists(grantedHandles, lists);
         }
      } else {
        setWatchlists(lists);
        setIsStoreLoaded(true);
      }
    }
    loadData();
  }, []);

  // Sync channels and smart sessions automatically whenever watchlists are updated or loaded
  useEffect(() => {
    if (!isStoreLoaded || !watchlists || watchlists.length === 0) return;

    // 1. Refresh & auto-assign watchlists to channels
    const syncedChannels = autoAssignWatchlistsToChannels(channels, watchlists);
    if (syncedChannels.length !== channels.length || syncedChannels.some((c, i) => (c.playlistIds?.length || 0) !== (channels[i]?.playlistIds?.length || 0))) {
      setChannels(syncedChannels);
      store.setChannels(syncedChannels);
    }

    // 2. Auto-sync smart sessions and super sessions with new watchlists
    let sessionsChanged = false;
    const syncedSessions = sessions.map(sess => {
      const existingWatchlistIds = new Set(sess.selectedWatchlistIds || []);
      const updatedWatchlistIds = [...(sess.selectedWatchlistIds || [])];

      const sessionModes = new Set([
        ...(sess.items || []).map(i => i.mode).filter(Boolean),
        ...(sess.scheduleSlots || []).map(s => s.mode).filter(Boolean)
      ]);

      if (sessionModes.size > 0) {
        watchlists.forEach(w => {
          if (w.targetMode && sessionModes.has(w.targetMode) && !existingWatchlistIds.has(w.id)) {
            updatedWatchlistIds.push(w.id);
            sessionsChanged = true;
          }
        });
      }

      if (updatedWatchlistIds.length !== (sess.selectedWatchlistIds?.length || 0)) {
        return { ...sess, selectedWatchlistIds: updatedWatchlistIds };
      }
      return sess;
    });

    if (sessionsChanged) {
      setSessions(syncedSessions);
      store.setSessions(syncedSessions);
    }
  }, [watchlists.length, isStoreLoaded]);

  const handleGrantPermission = async () => {
    if (permissionRequired.length > 0) {
      try {
        if (window.self !== window.top) {
          await showAlert('يرجى فتح التطبيق في علامة تبويب جديدة لتتمكن من منح الصلاحية (بسبب قيود المتصفح).');
          return;
        }
      } catch (e) {
        await showAlert('يرجى فتح التطبيق في علامة تبويب جديدة لتتمكن من منح الصلاحية (بسبب قيود المتصفح).');
        return;
      }

      try {
        const allParentHandles = await store.getParentDirectoryHandles();
        const grantedHandles: any[] = [];
        const stillNeedingPermission: any[] = [];
        
        for (const handle of permissionRequired) {
            const granted = await verifyPermission(handle, true);
            if (granted) {
                grantedHandles.push(handle);
            } else {
                stillNeedingPermission.push(handle);
            }
        }
        
        if (stillNeedingPermission.length === 0) {
          setPermissionRequired([]);
          await hydrateLists(allParentHandles, watchlists);
        } else {
          setPermissionRequired(stillNeedingPermission);
          if (grantedHandles.length > 0) {
             await hydrateLists(allParentHandles.filter(h => !stillNeedingPermission.includes(h)), watchlists);
          }
          await showAlert('بعض المجلدات لا تزال تحتاج إلى صلاحية.');
        }
      } catch (e: any) {
        if (e && (e.name === 'SecurityError' || (e.message && e.message.includes('cross origin')))) {
          await showAlert('يرجى فتح التطبيق في علامة تبويب جديدة لتتمكن من منح الصلاحية (بسبب قيود المتصفح).');
        } else {
          console.error(e);
        }
      }
    }
  };

  const handleSetupInitialFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        await showAlert('متصفحك لا يدعم هذه الميزة.');
        return;
      }
      
      try {
        if (window.self !== window.top) {
          await showAlert('يرجى فتح التطبيق في علامة تبويب جديدة لتتمكن من تحديد المجلد (بسبب قيود المتصفح).');
          return;
        }
      } catch (e) {
        // Cross-origin access blocked check
        await showAlert('يرجى فتح التطبيق في علامة تبويب جديدة لتتمكن من تحديد المجلد (بسبب قيود المتصفح).');
        return;
      }

      const dirHandle = await (window as any).showDirectoryPicker();
      if (dirHandle) {
        await store.setParentDirectoryHandles([dirHandle]);
        setNeedsParentFolder(false);
        window.location.reload();
      }
    } catch (e: any) {
      if (e && (e.name === 'SecurityError' || (e.message && e.message.includes('cross origin')))) {
        await showAlert('يرجى فتح التطبيق في علامة تبويب جديدة لتتمكن من تحديد المجلد (بسبب قيود المتصفح).');
      } else {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (!isStoreLoaded || isHydrating) return;
    store.setCustomModes(customModes).catch(err => console.error(err));
  }, [customModes, isStoreLoaded]);

  useEffect(() => {
    if (!isStoreLoaded) return;
    store.setWatchlists(watchlists).catch(err => console.error(err));
  }, [watchlists, isStoreLoaded]);

  useEffect(() => {
    if (!isStoreLoaded) return;
    store.setSessions(sessions).catch(err => console.error(err));
  }, [sessions, isStoreLoaded]);

  useEffect(() => {
    if (!isStoreLoaded) return;
    store.setCategories(customCategories).catch(err => console.error(err));
  }, [customCategories, isStoreLoaded]);

  useEffect(() => {
    if (!isStoreLoaded) return;
    store.setMode(currentMode).catch(err => console.error(err));
  }, [currentMode, isStoreLoaded]);

  useEffect(() => {
    if (!isStoreLoaded) return;
    store.setChannels(channels).catch(err => console.error(err));
  }, [channels, isStoreLoaded]);

  useEffect(() => {
    if (!isStoreLoaded) return;
    store.setSchedules(schedules).catch(err => console.error(err));
  }, [schedules, isStoreLoaded]);

  const handleAddCategory = (mode: Mode, category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    setCustomCategories(prev => {
      const existing = prev[mode] || [];
      if (existing.includes(trimmed)) return prev;
      return { ...prev, [mode]: [...existing, trimmed] };
    });
  };

  const handleDeleteCategory = (mode: Mode, category: string) => {
    setCustomCategories(prev => {
      const existing = prev[mode] || [];
      return { ...prev, [mode]: existing.filter(c => c !== category) };
    });
  };

  const handleRenameCategory = (mode: Mode, oldCategory: string, newCategory: string) => {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew || oldCategory === trimmedNew) return;

    setCustomCategories(prev => {
      const existing = prev[mode] || [];
      const hasOld = existing.includes(oldCategory);
      let updated = hasOld ? existing.map(c => c === oldCategory ? trimmedNew : c) : [...existing, trimmedNew];
      return { ...prev, [mode]: Array.from(new Set(updated)) };
    });

    setWatchlists(prev => prev.map(w => {
      if (w.section === oldCategory) {
        return { ...w, section: trimmedNew };
      }
      return w;
    }));
  };

  const handleReorderCategories = (mode: Mode, newCategories: string[]) => {
    setCustomCategories(prev => ({
      ...prev,
      [mode]: newCategories
    }));
  };
  
  const [activeFile, setActiveFile] = useState<any>(null);
  const [activeTitle, setActiveTitle] = useState<string>('الحلقة 1');
  const [activeWatchlistTitle, setActiveWatchlistTitle] = useState<string>('قائمة التشغيل');

  const [activeFiles, setActiveFiles] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeInitialTime, setActiveInitialTime] = useState<number>(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const activeTheme = customModes[currentMode] || MODES[currentMode];

  const handleAddWatchlist = (newList: Watchlist | Watchlist[]) => {
    setWatchlists(prev => {
      const itemsToAdd = Array.isArray(newList) ? newList : [newList];
      const filtered = itemsToAdd.filter(item => {
        const isDuplicate = prev.some(existing => {
          if (existing.folderPath && item.folderPath && existing.folderPath.trim().toLowerCase() === item.folderPath.trim().toLowerCase()) {
            return true;
          }
          if (existing.folderName && item.folderName && existing.title && item.title && 
              existing.folderName.trim().toLowerCase() === item.folderName.trim().toLowerCase() && 
              existing.title.trim().toLowerCase() === item.title.trim().toLowerCase()) {
            return true;
          }
          return false;
        });
        return !isDuplicate;
      });

      if (filtered.length === 0) {
        return prev;
      }
      return [...prev, ...filtered];
    });
    setCurrentView('library');
  };

  const handleUpdateWatchlist = (updatedList: Watchlist) => {
    setWatchlists(prev => prev.map(w => w.id === updatedList.id ? updatedList : w));
  };

  const handleDeleteWatchlist = (id: string) => {
    setWatchlists(prev => prev.filter(w => w.id !== id));
  };

  const handleAddSession = (newSession: Session) => {
    setSessions(prev => [newSession, ...prev]);
  };

  const handleUpdateSession = (updatedSession: Session) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handlePlay = (
    file?: any, 
    title?: string, 
    watchlistTitle?: string, 
    files?: any[], 
    index?: number,
    sessionId?: string,
    watchlistId?: string,
    initialTime?: number,
    channelId?: string
  ) => {
    setPreviousView(currentView);
    setActiveFile(file || null);
    setActiveTitle(title || 'الحلقة 1');
    setActiveWatchlistTitle(watchlistTitle || 'قائمة التشغيل');
    setActiveFiles(files || []);
    setActiveIndex(index || 0);
    setActiveInitialTime(initialTime || 0);
    setActiveSessionId(sessionId || null);
    setActiveWatchlistId(watchlistId || null);
    setActiveChannelId(channelId || null);
    setCurrentView('player');
  };

  const handlePlayChannelFromPlayer = (channel: Channel) => {
    const np = autoAssignWatchlistsToChannels(channels, watchlists);
    const resolvedChan = np.find(c => c.id === channel.id) || channel;
    const nowPlaying = getChannelNowPlaying(resolvedChan, watchlists);
    if (!nowPlaying) return;
    handlePlay(
      nowPlaying.currentFile,
      nowPlaying.currentEpisodeTitle,
      `${channel.title} - ${nowPlaying.currentWatchlistTitle}`,
      nowPlaying.allFiles,
      nowPlaying.currentEpisodeIndex,
      undefined,
      nowPlaying.currentWatchlistId,
      nowPlaying.initialTime,
      channel.id
    );
  };

  const handleProgressUpdate = useCallback((newIndex: number, currentTime?: number) => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, lastWatchedIndex: newIndex, lastWatchedTime: currentTime } : s));
    }
    if (activeWatchlistId) {
      setWatchlists(prev => prev.map(w => w.id === activeWatchlistId ? { 
        ...w, 
        lastWatchedIndex: newIndex, 
        lastWatchedTime: currentTime,
        lastWatched: `الحلقة ${newIndex + 1}`,
        progress: Math.min(100, Math.round(((newIndex + 1) / Math.max(1, w.episodesCount || w.files?.length || 1)) * 100)) 
      } : w));
    }
  }, [activeSessionId, activeWatchlistId]);

  const isBroadcastingView = currentView === 'channels' || currentView === 'schedule';

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden text-white font-sans selection:bg-white/30 dir-rtl">
      {/* Desktop Tauri TitleBar */}
      <TauriTitleBar />

      <AnimatePresence mode="wait">
        {isBroadcastingView ? (
          <motion.div
            key="broadcasting-neutral-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-gradient-to-br from-slate-950 via-zinc-900 to-stone-950"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_50%)]" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </motion.div>
        ) : (
          <motion.div
            key={`${currentMode}-${activeTheme.bgImage || 'no-bg'}-${activeTheme.gradient}`}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
          >
            {/* Base Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.gradient} opacity-85`} />

            {/* Mode Background Image */}
            {activeTheme.bgImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                style={{ 
                  backgroundImage: `url('${activeTheme.bgImage}')`,
                  opacity: (activeTheme.bgOpacity !== undefined ? activeTheme.bgOpacity : 50) / 100
                }}
              />
            )}

            {/* Dark Overlay for Readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Ambient Glass Glow Orbs driven by Custom Theme */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full dynamic-theme-orb-1 blur-[110px] opacity-70 pointer-events-none z-0 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full dynamic-theme-orb-2 blur-[110px] opacity-60 pointer-events-none z-0 transition-all duration-700" />

      {/* Special Kids Mode Floating Cartoon Elements */}
      {currentMode === 'kids' && !isBroadcastingView && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-20 text-6xl opacity-30 select-none"
          >
            ⭐
          </motion.div>
          <motion.div 
            animate={{ y: [0, 25, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-16 text-7xl opacity-25 select-none"
          >
            🎈
          </motion.div>
          <motion.div 
            animate={{ y: [-10, 15, -10], rotate: [0, -15, 15, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-1/4 text-6xl opacity-30 select-none"
          >
            🎨
          </motion.div>
          <motion.div 
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-12 left-1/3 text-7xl select-none"
          >
            ✨
          </motion.div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-yellow-300/20 via-pink-400/10 to-transparent"></div>
        </div>
      )}
      
      {/* Texture overlay for premium feel */}
      <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

      {permissionRequired.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg rounded-[2.5rem] p-10 text-center border border-white/20 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500" />
            <button 
              onClick={() => {
                setPermissionRequired([]);
                setIsStoreLoaded(true);
              }}
              className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors z-10"
              title="تخطي"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-white/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mt-4 mb-6 shadow-lg">
              <FolderLock className="w-12 h-12 text-amber-300" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">صلاحية الوصول مطلوبة</h2>
            <p className="text-white/70 mb-8 leading-relaxed text-lg">
              لحماية خصوصيتك، يطلب المتصفح إعطاء الصلاحية مرة أخرى للوصول إلى مكتبة الميديا الخاصة بك (المجلد الأب).
            </p>
            <button
              onClick={handleGrantPermission}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl flex items-center justify-center gap-2"
            >
              <FolderLock className="w-6 h-6" /> منح الصلاحية وفتح المكتبة
            </button>
          </motion.div>
        </div>
      )}

      <ProcessingRing 
        isVisible={isHydrating && permissionRequired.length === 0} 
        message="جاري مزامنة المكتبة وتجهيز الميديا..." 
        subMessage="يتم قراءة ومطابقة عناوين وملفات الوسائط" 
      />

      {/* Main Layout */}
      <div className="relative z-10 flex-1 flex w-full h-full flex-row min-h-0 overflow-hidden">
        {currentView !== 'player' && (
          <Sidebar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
          />
        )}
        
        <main className="flex-1 h-full overflow-y-auto relative no-scrollbar">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="w-full min-h-full"
            >
              {currentView === 'home' && (
                <HomeView 
                  currentMode={currentMode} 
                  setCurrentMode={setCurrentMode} 
                  customModes={customModes}
                  watchlists={watchlists}
                  onPlay={handlePlay}
                  onNavigate={setCurrentView}
                />
              )}
              {currentView === 'channels' && (
                <ChannelsView
                  initialTab="channels"
                  channels={channels}
                  watchlists={watchlists}
                  schedules={schedules}
                  onUpdateChannels={setChannels}
                  onUpdateSchedules={setSchedules}
                  onPlay={handlePlay}
                />
              )}
              {currentView === 'schedule' && (
                <ChannelsView
                  initialTab="schedule"
                  channels={channels}
                  watchlists={watchlists}
                  schedules={schedules}
                  onUpdateChannels={setChannels}
                  onUpdateSchedules={setSchedules}
                  onPlay={handlePlay}
                />
              )}
              {currentView === 'library' && (
                <LibraryView 
                  onPlay={handlePlay} 
                  watchlists={watchlists} 
                  schedules={schedules}
                  onUpdateSchedules={(newSchs) => {
                    setSchedules(newSchs);
                    store.setSchedules(newSchs);
                  }}
                  sessions={sessions}
                  onAddSession={handleAddSession}
                  onUpdateSession={handleUpdateSession}
                  currentMode={currentMode}
                  onSwitchMode={(newMode) => {
                    setCurrentMode(newMode);
                    store.setMode(newMode);
                  }}
                  customModes={customModes}
                  onUpdateModeTitle={(mode, newTitle) => setCustomModes(prev => ({ ...prev, [mode]: { ...prev[mode], title: newTitle } }))}
                  customCategories={customCategories[currentMode] || []}
                  allCustomCategories={customCategories}
                  onDeleteCategory={(cat) => handleDeleteCategory(currentMode, cat)}
                  onRenameCategory={(oldCat, newCat) => handleRenameCategory(currentMode, oldCat, newCat)}
                  onReorderCategories={(newCats) => handleReorderCategories(currentMode, newCats)}
                  onAddWatchlist={handleAddWatchlist}
                  onUpdateWatchlist={handleUpdateWatchlist}
                  onDeleteWatchlist={handleDeleteWatchlist}
                  onAddCategory={(cat) => handleAddCategory(currentMode, cat)}
                />
              )}
              {currentView === 'create_watchlist' && (
                <CreateWatchlistView 
                  onAddWatchlist={handleAddWatchlist} 
                  watchlists={watchlists}
                  currentMode={currentMode} 
                  customCategories={customCategories[currentMode] || []}
                  onAddCategory={(cat) => handleAddCategory(currentMode, cat)}
                  onDeleteCategory={(cat) => handleDeleteCategory(currentMode, cat)}
                />
              )}
              {currentView === 'sessions' && (
                <SmartSessionsView 
                  sessions={sessions}
                  onAddSession={handleAddSession}
                  onUpdateSession={handleUpdateSession}
                  onDeleteSession={handleDeleteSession}
                  watchlists={watchlists}
                  onPlay={handlePlay} 
                />
              )}
              {currentView === 'player' && (
                <PlayerView 
                  key={`${activeChannelId || 'nochan'}-${activeWatchlistId || 'nolist'}-${activeTitle || 'notitle'}`}
                  onExit={() => setCurrentView(previousView)} 
                  file={activeFile} 
                  title={activeTitle} 
                  watchlistTitle={activeWatchlistTitle} 
                  files={activeFiles} 
                  initialIndex={activeIndex} 
                  initialTime={activeInitialTime}
                  currentMode={currentMode}
                  onProgressUpdate={handleProgressUpdate}
                  channels={channels}
                  currentChannelId={activeChannelId || undefined}
                  watchlists={watchlists}
                  schedules={schedules}
                  onPlayChannel={handlePlayChannelFromPlayer}
                />
              )}
              {currentView === 'settings' && (
                <SettingsView 
                  currentMode={currentMode} 
                  setCurrentMode={setCurrentMode} 
                  customModes={customModes}
                  onUpdateModes={setCustomModes}
                  qaInspectionEnabled={qaInspectionEnabled}
                  setQaInspectionEnabled={setQaInspectionEnabled}
                  onStartInspection={handleStartInspection}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* FLOATING QA INSPECTION TRIGGER BUTTON (Only visible when QA mode is enabled) */}
      {qaInspectionEnabled && currentView !== 'player' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2"
        >
          <button
            onClick={handleStartInspection}
            disabled={isInspecting}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs transition-all hover:scale-105 border border-emerald-300 cursor-pointer"
            title="بدء الفحص الشامل وضمان الجودة (QA Mode)"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="hidden sm:inline">وضع الفحص: ابدأ الفحص الشامل</span>
          </button>

          {qaReport && (
            <button
              onClick={() => setQaReport(qaReport)}
              className="bg-zinc-900 border border-emerald-500/40 text-emerald-300 font-bold px-3 py-3 rounded-full shadow-2xl text-xs hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1.5"
              title="عرض تقرير الفحص الأخير"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>التقرير ({qaReport.issues.length})</span>
            </button>
          )}
        </motion.div>
      )}

      {/* INSPECTION PROGRESS RING */}
      <ProcessingRing
        isVisible={isInspecting}
        message={inspectionProgress.text || 'جاري الفحص الشامل للتطبيق...'}
        subMessage={`تم فحص ${inspectionProgress.percentage}% من مكونات واختبارات التطبيق`}
      />

      {/* QA REPORT MODAL */}
      <AnimatePresence>
        {qaReport && (
          <InspectionReportModal
            report={qaReport}
            onClose={() => setQaReport(null)}
            onAutoFix={handleAutoFixIssue}
          />
        )}
      </AnimatePresence>

      <ScheduleNotifier
        schedules={schedules}
        watchlists={watchlists}
        channels={channels}
        onPlay={handlePlay}
        onUpdateSchedules={(newSchs) => {
          setSchedules(newSchs);
          store.setSchedules(newSchs);
        }}
      />
    </div>
  );
}
