import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ImageObj { id: string; title: string; description?: string; filename?: string; src?: string; assetSrc?: string; blobSrc?: string }
interface ShowcaseObj { id: string; title: string; images?: ImageObj[] }

interface MeBloggyDB extends DBSchema {
  images: {
    key: string;
    value: { id: string; blob?: Blob; title: string; description?: string; filename?: string }
  }
  showcases: {
    key: string;
    value: { id: string; title: string; images: string[] }
  }
  avatars: {
    key: string;
    value: { key: string; id: string; blob: Blob }
  }
}

@Injectable()
export class ImageService {
  public selectedShowcaseIds$ = new BehaviorSubject<string[]>([]);
  // ...existing code...
  /**
   * Update the order of images in a showcase and persist to DB
   */
  async updateShowcaseImageOrder(showcaseId: string, imageIds: string[]) {
    if (!this.db) await this.openDb();
    const showcase = await this.db.get('showcases', showcaseId);
    if (showcase) {
      showcase.images = imageIds;
      await this.db.put('showcases', showcase);
      await this._loadFromDbToMemory();
    }
  }
  // toggle this to true to prefer using blob object URLs for images (default is false to use asset paths)
  public useBlobUrls = false;
  private db!: IDBPDatabase<MeBloggyDB>;
  public showcases$ = new BehaviorSubject<ShowcaseObj[]>([]);
  public featured$ = new BehaviorSubject<ImageObj | null>(null);
  public avatar$ = new BehaviorSubject<{ id?: string; src?: string } | null>(null);
  public avatarError$ = new BehaviorSubject<string | null>(null);
  private _currentAvatarUrl: string | null = null;

  constructor(private http: HttpClient) {
    this.init();
  }

  async init() {
    await this.openDb();

      // Check DB for existing stores to determine whether to seed from assets or load from DB
      const dbImages = await this.db.getAll('images');
      const dbShowcases = await this.db.getAll('showcases');
      console.log('[ImageService] DB images:', dbImages.length, 'DB showcases:', dbShowcases.length);

      if (dbImages.length === 0 && dbShowcases.length === 0) {
        // No DB content, seed from JSON assets
        const showcasesJson: ShowcaseObj[] = await this.http.get<ShowcaseObj[]>('/assets/data/showcases.json').toPromise();
        const imagesJson: ImageObj[] = await this.http.get<ImageObj[]>('/assets/data/images.json').toPromise();

        // seed images into DB, and create assetSrc
        for (const img of imagesJson) {
          img.assetSrc = '/assets/' + img.filename;
          img.src = img.assetSrc;
          try {
            const res = await fetch(img.assetSrc as string);
            const blob = await res.blob();
            await this.db.put('images', { id: img.id, blob, title: img.title, description: img.description || '', filename: img.filename });
            if (this.useBlobUrls) { img.blobSrc = URL.createObjectURL(blob); img.src = img.blobSrc; }
          } catch (err) { console.warn('Could not fetch asset', img.assetSrc, err); }
        }

        // seed showcases into DB and in-memory
        for (const s of showcasesJson) {
          const ids = (s.images || []).map(i => i.id ? i.id : (i as any).id);
          await this.db.put('showcases', { id: s.id, title: s.title, images: ids });
        }

          // Now load from DB to memory
          await this._loadFromDbToMemory();
      } else {
        // Ensure if there are images but no showcases, create a default showcase
        if (dbImages.length > 0 && dbShowcases.length === 0) {
          const ids = dbImages.map(i => i.id);
          try {
            await this.db.put('showcases', { id: 's_auto_all', title: 'All Photos', images: ids });
            console.log('[ImageService] Created default showcase for existing DB images.');
          } catch (err) {
            console.warn('[ImageService] Failed to create default showcase', err);
          }
        }
        // Load existing DB content into memory (preserve user uploaded items)
        await this._loadFromDbToMemory();
      }
    
    // Also load avatar if it exists
    try {
      const avatarItem = await this.db.get('avatars', 'user');
      if (avatarItem && avatarItem.blob) {
        const url = URL.createObjectURL(avatarItem.blob);
        // revoke old url if present
        if (this._currentAvatarUrl) { URL.revokeObjectURL(this._currentAvatarUrl); }
        this._currentAvatarUrl = url;
        this.avatar$.next({ id: avatarItem.id, src: url });
      }
    } catch (err) { console.warn('[ImageService] avatar read failed', err); }
  }
    public async moveImageToShowcase(imageId: string, showcaseId: string) {
    // Remove image from all showcases and delete any that become empty
    const showcasesDb = await this.db.getAll('showcases');
    let targetShowcaseObj = null;
    for (const s of showcasesDb) {
      if (s.images && s.images.includes(imageId)) {
        s.images = s.images.filter((id: string) => id !== imageId);
        if (s.images.length === 0) {
          await this.db.delete('showcases', s.id);
        } else {
          await this.db.put('showcases', s);
        }
      }
      if (s.id === showcaseId) {
        targetShowcaseObj = s;
      }
    }
    // Add image to target showcase
    if (targetShowcaseObj) {
      targetShowcaseObj.images = targetShowcaseObj.images || [];
      if (!targetShowcaseObj.images.includes(imageId)) {
        targetShowcaseObj.images.unshift(imageId);
        await this.db.put('showcases', targetShowcaseObj);
      }
    }
    // Reload in-memory state from DB
    await this._loadFromDbToMemory();
  }

  private async openDb() {
    // bump DB version to 2 to allow upgrades that add new stores (showcases)
    this.db = await openDB<MeBloggyDB>('mebloggy-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('showcases')) db.createObjectStore('showcases', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('avatars')) db.createObjectStore('avatars', { keyPath: 'key' });
      }
    });
  }

  // Ensure a specific object store exists; if not, bump DB version and create it.
  private async ensureStore(storeName: string, keyPath?: string) {
    if (!this.db) await this.openDb();
    try {
        if ((this.db.objectStoreNames as any).contains(storeName)) return;
    } catch (err) {
      // If reading objectStoreNames throws, try to reopen DB
      console.warn('[ImageService] ensureStore: error reading objectStoreNames', err);
      await this.openDb();
        if ((this.db.objectStoreNames as any).contains(storeName)) return;
    }
    const newVersion = (this.db?.version || 1) + 1;
    console.log('[ImageService] ensureStore: creating store', storeName, 'by upgrading to version', newVersion);
    this.db = await openDB<MeBloggyDB>('mebloggy-db', newVersion, {
      upgrade(db) {
          if (!(db.objectStoreNames as any).contains(storeName)) {
            (db as any).createObjectStore(storeName, { keyPath: keyPath || 'id' });
          }
      }
    });
  }

  // Load images and showcases from DB into in-memory structures and BehaviorSubjects
  private async _loadFromDbToMemory() {
    let imagesDb: any[] = [];
    let showcasesDb: any[] = [];
    try {
      imagesDb = await this.db.getAll('images');
    } catch (err) { console.warn('[ImageService] error reading images store', err); }
    try {
      showcasesDb = await this.db.getAll('showcases');
    } catch (err) { console.warn('[ImageService] error reading showcases store', err); }
    console.log('[ImageService] Loading from DB: images', imagesDb.length, 'showcases', showcasesDb.length, 'images sample', imagesDb[0] && { id: imagesDb[0].id, filename: imagesDb[0].filename });

    // Build an image map for quick lookup
    const imgMap = new Map<string, ImageObj>();
    for (const it of imagesDb) {
      const img: ImageObj = {
        id: it.id,
        title: it.title,
        description: it.description || '',
        filename: it.filename,
        assetSrc: it.filename ? '/assets/' + it.filename : undefined,
        blobSrc: it.blob ? URL.createObjectURL(it.blob) : undefined,
        src: it.filename ? '/assets/' + it.filename : undefined
      };
      // prefer blob URLs for display if setting enabled
      if (this.useBlobUrls && it.blob) img.src = img.blobSrc as string;
      imgMap.set(it.id, img);
    }

    const showcases: ShowcaseObj[] = [];
    for (const s of showcasesDb) {
      const images: ImageObj[] = (s.images || []).map(id => imgMap.get(id)).filter(Boolean) as ImageObj[];
      showcases.push({ id: s.id, title: s.title, images });
    }

    this.showcases$.next(showcases);

    // set a default featured if none
    if (!this.featured$.value && showcases.length > 0) {
      const firstShowcase = showcases[0];
      if (firstShowcase.images && firstShowcase.images.length) this.setFeaturedImage(firstShowcase.images[0]);
    }
  }

  public async getShowcases() {
    return this.showcases$.value;
  }

  public async getShowcase(id: string) {
    return this.showcases$.value.find(s => s.id === id) || null;
  }

  public async createShowcase(title: string) {
    const id = 's' + Date.now();
    try {
      await this.db.put('showcases', { id, title, images: [] });
      // update in-memory
      const shows = this.showcases$.value;
      shows.push({ id, title, images: [] });
      this.showcases$.next(shows);
      return id;
    } catch (err) {
      console.warn('Failed to create showcase', err);
      return null;
    }
  }

  public async setAvatar(file: File) {
    try {
      const blob = file;
      const id = 'avatar-' + Date.now();
      // ensure DB open
      if (!this.db) {
        console.warn('[ImageService] setAvatar: DB not initialized yet, calling openDb()');
        try { await this.openDb(); } catch (e) { console.error('[ImageService] openDb() failed while setting avatar', e); }
      }
      if (!this.db) { console.error('[ImageService] setAvatar: no DB to write to'); return false; }

      // store the avatar in the avatars store using key 'user'
      try {
        await this.db.put('avatars', { key: 'user', id, blob });
      } catch (err: any) {
        console.warn('[ImageService] setAvatar: db.put failed, trying fallback via arrayBuffer', err);
        try {
          // fallback: convert file to a plain Blob to ensure put succeeds
          const ab = await blob.arrayBuffer();
          const conv = new Blob([ab], { type: blob.type });
          await this.db.put('avatars', { key: 'user', id, blob: conv });
        } catch (err2: any) {
          console.error('[ImageService] setAvatar: db.put fallback failed', err2);
          this.avatarError$.next(err2?.message || String(err2));
          return false;
        }
      }

      console.log('[ImageService] setAvatar: persisted avatar id', id);
      const check = await this.db.get('avatars', 'user');
      console.log('[ImageService] setAvatar: DB now has', !!check, check && { id: check.id, key: check.key });
      try {
        const all = await this.db.getAll('avatars');
        console.log('[ImageService] avatars store contents', all.map(a => ({ key: a.key, id: a.id })));
      } catch (err) { console.warn('[ImageService] failed to list avatars', err); }

      // set object URL for preview and update BehaviorSubject
      const url = URL.createObjectURL(blob);
      if (this._currentAvatarUrl) { URL.revokeObjectURL(this._currentAvatarUrl); }
      this._currentAvatarUrl = url;
      this.avatar$.next({ id, src: url });
      // verify persisted result by re-reading
      await this.getAvatar();
      return true;
    } catch (e: any) {
      console.error('[ImageService] setAvatar: unexpected error', e);
      this.avatarError$.next(e?.message || String(e));
      return false;
    }
  }

  public async getAvatar() {
    try {
      if (!this.db) await this.openDb();
      const avatarItem = await this.db.get('avatars', 'user');
      if (avatarItem && avatarItem.blob) {
        const url = URL.createObjectURL(avatarItem.blob);
        if (this._currentAvatarUrl) { URL.revokeObjectURL(this._currentAvatarUrl); }
        this._currentAvatarUrl = url;
        this.avatar$.next({ id: avatarItem.id, src: url });
        console.log('[ImageService] getAvatar: loaded avatar from DB', avatarItem.id);
        return avatarItem;
      }
      return null;
    } catch (err: any) {
      console.warn('[ImageService] getAvatar failed', err);
      this.avatarError$.next(err?.message || String(err));
      return null;
    }
  }

  public async removeAvatar() {
    try {
      if (!this.db) await this.openDb();
      await this.db.delete('avatars', 'user');
      if (this._currentAvatarUrl) { URL.revokeObjectURL(this._currentAvatarUrl); this._currentAvatarUrl = null; }
      this.avatar$.next(null);
      console.log('[ImageService] removeAvatar: deleted avatar from DB');
      return true;
    } catch (err: any) {
      console.warn('[ImageService] removeAvatar failed', err);
      this.avatarError$.next(err?.message || String(err));
      return false;
    }
  }

  public async deleteImage(id: string) {
    // delete from DB
    try {
      await this.db.delete('images', id);
    } catch (err) {
      console.warn('Failed to delete from DB', err);
    }

    // remove from any showcase both in-memory and DB
    try {
      const dbShowcases = await this.db.getAll('showcases');
      for (const s of dbShowcases) {
        if (!s.images) continue;
        const idx = s.images.findIndex(x => x === id);
        if (idx >= 0) {
          s.images.splice(idx, 1);
          if (s.images.length === 0) {
            // Remove empty showcase
            await this.db.delete('showcases', s.id);
            console.log('[ImageService] Deleted empty showcase', s.id);
          } else {
            await this.db.put('showcases', s);
          }
        }
      }
    } catch (err) { console.warn('Failed to update showcases in DB', err); }
    let showcases = this.showcases$.value;
    // remove deleted image from loaded showcases and remove any now-empty showcases
    showcases = showcases.reduce((acc: ShowcaseObj[], s) => {
      if (!s.images) { acc.push(s); return acc; }
      const idx = s.images.findIndex(i => i.id === id);
      if (idx >= 0) s.images.splice(idx, 1);
      // After splicing, if still has images, keep it
      if (s.images && s.images.length > 0) acc.push(s);
      else console.log('[ImageService] Removing empty showcase in memory', s.id);
      return acc;
    }, []);
    this.showcases$.next(showcases);
    this.showcases$.next(showcases);

    // if featured image is the deleted one, pick the first available
    const featured = this.featured$.value;
    if (featured && featured.id === id) {
      if (showcases.length && showcases[0].images && showcases[0].images.length) {
        this.setFeaturedImage(showcases[0].images[0]);
      } else {
        this.featured$.next(null);
      }
    }
    // Assuming the DB update already occurred, hydrate memory from DB again to keep state consistent
    await this._loadFromDbToMemory();
    // if the last-used showcase has been deleted, clear it or set to first available
    const last = localStorage.getItem('mebloggy.lastShowcase');
    if (last) {
      const stillExists = this.showcases$.value.find(s => s.id === last);
      if (!stillExists) {
        localStorage.removeItem('mebloggy.lastShowcase');
        // optionally set to first showcase
        if (this.showcases$.value.length) localStorage.setItem('mebloggy.lastShowcase', this.showcases$.value[0].id);
      }
    }
    return true;
  }

  public async updateImageMetadata(id: string, title: string, description?: string) {
    try {
      const item = await this.db.get('images', id);
      if (item) {
        await this.db.put('images', { id, blob: item.blob, title, description: description || '' });
      } else {
        // No blob in DB; try to find asset path in showcases and then fetch it and store it
        const showcases = this.showcases$.value;
        let found: ImageObj | undefined;
        for (const s of showcases) {
          const img = (s.images || []).find(i => i && i.id === id);
          if (img) { found = img; break; }
        }
        if (found) {
          try {
            const res = await fetch(found.assetSrc || found.src || '');
            const blob = await res.blob();
            await this.db.put('images', { id, blob, title, description: description || '' });
          } catch (err) {
            console.warn('Failed to fetch asset to store metadata', err);
            // still proceed to update in-memory objects
          }
        }
      }

      // Update in-memory list of showcases
      const showcases = this.showcases$.value;
      for (const s of showcases) {
        if (!s.images) continue;
        const idx = s.images.findIndex(i => i.id === id);
        if (idx >= 0) {
          s.images[idx].title = title;
          s.images[idx].description = description || '';
        }
      }
      this.showcases$.next(showcases);

      // Update featured image if it's the same one
      const featured = this.featured$.value;
      if (featured && featured.id === id) {
        this.featured$.next({ ...featured, title, description: description || '' });
      }

      // reload memory from DB to ensure UI sees persisted changes
      await this._loadFromDbToMemory();
      return true;
    } catch (err) {
      console.warn('Error updating metadata', err);
      return false;
    }
  }

  public async setFeaturedImage(img: ImageObj) {
    // if the dev preference is to use asset paths, do that when possible
    if (!this.useBlobUrls) {
      // prefer assetSrc if present, otherwise fall back to existing src
      const asset = (img as any).assetSrc || img.src;
      this.featured$.next({ ...img, src: asset });
      return;
    }

    // Otherwise, try to use blob from IndexedDB when available
    try {
      const item = await this.db.get('images', img.id);
      if (item && item.blob) {
        const url = URL.createObjectURL(item.blob);
        this.featured$.next({ ...img, src: url, blobSrc: url });
        return;
      }
    } catch (err) {
      console.warn('Error loading from DB', err);
    }
    // fallback to whatever src we have
    this.featured$.next(img as ImageObj);
  }

  public async addImageFromFile(file: File, showcaseId?: string | null, title?: string, description?: string) {
    const id = 'img' + Date.now();
    const t = title || file.name;
    const blob = file; // File extends Blob

    // Save to DB
    await this.db.put('images', { id, blob, title: t, description: description || '' });

    // Create object URL
    const src = URL.createObjectURL(blob);

    // Create new image object
    const newImg: ImageObj = { id, title: t, description: description || '', filename: '', src };

    // Add to the first showcase or specified showcase
    const showcases = this.showcases$.value;
    if (!showcases.length) return newImg;
    let targetShowcaseId = showcaseId;
    if (!targetShowcaseId && showcases.length) targetShowcaseId = showcases[0].id;
    if (targetShowcaseId) {
      const target = showcases.find(s => s.id === targetShowcaseId);
      if (target) { target.images = target.images || []; target.images.unshift(newImg); }
      // persist to DB
      try {
        const sc = await this.db.get('showcases', targetShowcaseId);
        if (sc) {
          sc.images = sc.images || [];
          sc.images.unshift(id);
          await this.db.put('showcases', sc);
        }
      } catch (err) { console.warn('Failed updating showcase in DB', err); }
    } else {
      showcases[0].images = showcases[0].images || []; showcases[0].images.unshift(newImg);
    }
    this.showcases$.next(showcases);
    // set the newly uploaded image as featured
    this.setFeaturedImage(newImg);
    // reload memory from DB to ensure persistence matches in-memory state
    await this._loadFromDbToMemory();
    return newImg;
  }
}
