export const THEMATIC_IMAGES = {
  kids: [
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&q=80&w=800', // Magical Cartoon
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800', // Underwater World
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800', // Anime Art
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800', // Magical Forest
  ],
  music: [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800', // Studio Audio Wave
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800', // Music Stage
    'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800', // Piano Melody
  ],
  cinema: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800', // Cinema Theater
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800', // Film Reel
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=800', // Movie Screen
  ],
  series: [
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&q=80&w=800', // Television Drama
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=800', // TV Broadcast
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800', // Film Roll
  ],
  docs: [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800', // Mountains & Nature
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&q=80&w=800', // Wild Animals
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800', // Earth Space
  ],
  quran: [
    'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800', // Islamic Lantern
    'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=800', // Quran Book
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=800', // Mosque Architecture
  ],
  general: [
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=800',
  ]
};

function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '');
}

function pickFromList(list: string[], seedText: string): string {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
}

/**
 * Generate a video card poster SVG data URL derived directly from video file details
 */
export function generateVideoCardPoster(title: string, fileName?: string): string {
  const cleanTitle = (fileName || title || 'فيديو').replace(/\.[^/.]+$/, "");
  const displayTitle = cleanTitle.length > 32 ? cleanTitle.substring(0, 30) + '...' : cleanTitle;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#g)"/>
    <circle cx="320" cy="150" r="42" fill="rgba(255,255,255,0.12)" stroke="rgba(251,191,36,0.6)" stroke-width="2"/>
    <polygon points="312,134 338,150 312,166" fill="#fbbf24"/>
    <text x="320" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">${displayTitle}</text>
    <text x="320" y="272" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">مقابل من ملفات الفيديو المحلية 🎬</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Get an episode-inspired cover image for a watchlist strictly based on its videos, titles, or files.
 */
export function getEpisodeInspiredCover(title: string = '', section: string = '', files: any = [], targetMode?: string): string {
  const fileArray = Array.isArray(files) ? files : (files ? [files] : []);

  // 1. If a video file in the list already has an extracted frame or image, use it directly
  if (fileArray.length > 0) {
    const fileWithImage = fileArray.find(f => f && (f.coverImage || f.thumbnail || f.poster));
    if (fileWithImage) {
      return fileWithImage.coverImage || fileWithImage.thumbnail || fileWithImage.poster;
    }
    const firstFile = fileArray[0];
    const firstFileName = typeof firstFile === 'string' ? firstFile : (firstFile?.name || firstFile?.title || '');
    if (firstFileName) {
      return generateVideoCardPoster(title, firstFileName);
    }
  }

  // 2. Derive image strictly from video file names and episode titles in the playlist
  const videoNames = fileArray.map(f => (typeof f === 'string' ? f : (f?.name || f?.title || ''))).join(' ');
  const rawText = videoNames + ' ' + title + ' ' + section + ' ' + (targetMode || '');
  const normText = normalizeText(rawText);

  // Quran / Religious
  if (/قران|تلاوه|سوره|مصحب|اذكار|تفسير|حديث|اسلام|مساجد|مكه/.test(normText) || targetMode === 'quran') {
    return pickFromList(THEMATIC_IMAGES.quran, normText);
  }

  // Kids / Children / Cartoon / Anashid
  if (/اطفال|طفل|براعم|طيور|كرتون|انيميشن|انمي|سبونج|توم|جيري|ماشا|ديزني|حكايات|قصص اطفال|ماريو/.test(normText) || targetMode === 'kids') {
    if (/اناشيد|اغاني|نشيد|صوتيات/.test(normText)) {
      return THEMATIC_IMAGES.kids[0];
    }
    return pickFromList(THEMATIC_IMAGES.kids, normText);
  }

  // Music / Anashid / Songs / Audio
  if (/اناشيد|نشيد|اغاني|موسيقى|طرب|صوتيات|الحان|شيلات|معزوفه|حفله|بيانو/.test(normText) || targetMode === 'music') {
    return pickFromList(THEMATIC_IMAGES.music, normText);
  }

  // Documentaries / Science / Nature
  if (/وثايقي|طبيعه|حيوان|فضاء|علم|تاريخ|حضاره|عالم|غابه/.test(normText) || targetMode === 'docs') {
    return pickFromList(THEMATIC_IMAGES.docs, normText);
  }

  // Cinema / Movies
  if (/فيلم|افلام|سينما|هوليود|اكشن|اثاره|رعب|غموض/.test(normText) || targetMode === 'cinema') {
    return pickFromList(THEMATIC_IMAGES.cinema, normText);
  }

  // Series / Drama / Shows
  if (/مسلسل|مسلسلات|دراما|عربي|عربيه|مصريه|سوريه|تركي|رمضان|موسم|حلقات/.test(normText) || targetMode === 'family') {
    return pickFromList(THEMATIC_IMAGES.series, normText);
  }

  return pickFromList(THEMATIC_IMAGES.series, normText);
}

/**
 * Gets the best video-inspired cover for any watchlist object
 */
export function getWatchlistCover(list: { title?: string; section?: string; coverImage?: string; files?: any[]; seasons?: any[]; targetMode?: string }): string {
  const allFiles = [...(list.files || []), ...(list.seasons?.flatMap(s => s.files || []) || [])];
  
  // 1. If list.coverImage is a custom data URL or blob URL or extracted frame, use it!
  if (list.coverImage && (list.coverImage.startsWith('data:') || list.coverImage.startsWith('blob:'))) {
    return list.coverImage;
  }

  // 2. If any video file in the playlist already has an extracted frame or image, use it directly!
  const fileWithCover = allFiles.find(f => f && (f.coverImage || f.thumbnail || f.poster));
  if (fileWithCover) {
    return fileWithCover.coverImage || fileWithCover.thumbnail || fileWithCover.poster;
  }

  // 3. Generate a video poster derived from the first video file name
  const firstFile = allFiles[0];
  const firstFileName = typeof firstFile === 'string' ? firstFile : (firstFile?.name || firstFile?.title || '');
  if (firstFileName) {
    return generateVideoCardPoster(list.title || 'قائمة التشغيل', firstFileName);
  }

  // 4. Fallback to HTTP list cover or derive episode-inspired cover based on video titles
  if (list.coverImage && list.coverImage.startsWith('http') && allFiles.length === 0) {
    return list.coverImage;
  }

  return getEpisodeInspiredCover(list.title || '', list.section || '', allFiles, list.targetMode);
}

/**
 * Extract a real video frame thumbnail from a File or File-like object using HTML5 Canvas
 */
export async function extractVideoFrameThumbnail(fileInput: any): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (!fileInput) {
        resolve('');
        return;
      }

      let targetFile: any = fileInput;
      if (fileInput.rawFile) targetFile = fileInput.rawFile;
      else if (fileInput.originalFile) targetFile = fileInput.originalFile;
      else if (fileInput.file) targetFile = fileInput.file;

      let srcUrl = '';
      let isCreatedUrl = false;

      if (typeof targetFile === 'string' && targetFile.length > 0) {
        srcUrl = targetFile;
      } else if (targetFile instanceof File || targetFile instanceof Blob) {
        srcUrl = URL.createObjectURL(targetFile);
        isCreatedUrl = true;
      } else if (targetFile && typeof targetFile.blobUrl === 'string') {
        srcUrl = targetFile.blobUrl;
      } else if (targetFile && typeof targetFile.url === 'string') {
        srcUrl = targetFile.url;
      }

      if (!srcUrl) {
        resolve('');
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let resolved = false;
      const cleanup = () => {
        if (isCreatedUrl && srcUrl) {
          try { URL.revokeObjectURL(srcUrl); } catch {}
        }
      };

      const captureFrame = () => {
        if (resolved) return false;
        try {
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;
          canvas.width = Math.min(640, width);
          canvas.height = Math.round(canvas.width * (height / width)) || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            if (dataUrl && dataUrl.length > 100) {
              resolved = true;
              cleanup();
              resolve(dataUrl);
              return true;
            }
          }
        } catch (e) {
          console.warn('Canvas capture error:', e);
        }
        return false;
      };

      video.onloadedmetadata = () => {
        try {
          video.currentTime = Math.min(3, (video.duration || 10) / 10 || 1);
        } catch {
          captureFrame();
        }
      };

      video.onseeked = () => {
        if (!captureFrame()) {
          resolved = true;
          cleanup();
          resolve('');
        }
      };

      video.onloadeddata = () => {
        if (!resolved && video.currentTime === 0) {
          captureFrame();
        }
      };

      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve('');
        }
      };

      setTimeout(() => {
        if (!resolved) {
          if (!captureFrame()) {
            resolved = true;
            cleanup();
            resolve('');
          }
        }
      }, 4000);

      video.src = srcUrl;
    } catch {
      resolve('');
    }
  });
}
