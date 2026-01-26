/**
 * Google Drive Service
 *
 * Handles file uploads and downloads to Google Drive
 * Uses a shared folder for all app files
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { refreshToken, triggerLogout, AuthError } from './tokenService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRIVE_FOLDER_ID = import.meta.env.VITE_DRIVE_FOLDER_ID;
const APP_FOLDER_NAME = 'Fertilizer Tracker Files';

// ============================================================================
// AXIOS INSTANCE FOR DRIVE API
// ============================================================================

export const driveApi = axios.create({
  baseURL: 'https://www.googleapis.com/drive/v3',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds access token
driveApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles 401 errors
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

driveApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(driveApi(originalRequest));
          });
        });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();

        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);
          onTokenRefreshed(newToken);
          isRefreshing = false;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return driveApi(originalRequest);
        }

        throw new AuthError();
      } catch (refreshError) {
        isRefreshing = false;
        triggerLogout('session_expired');
        return Promise.reject(new AuthError());
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// TYPES
// ============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  size?: string;
  createdTime?: string;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  viewLink: string;
  downloadLink: string;
  thumbnailLink?: string;
}

// ============================================================================
// FOLDER MANAGEMENT
// ============================================================================

/**
 * Get or create the app folder in Drive
 * Uses VITE_DRIVE_FOLDER_ID if set, otherwise creates/finds folder by name
 */
export async function getOrCreateAppFolder(): Promise<string> {
  if (DRIVE_FOLDER_ID) {
    return DRIVE_FOLDER_ID;
  }

  const searchResponse = await driveApi.get('/files', {
    params: {
      q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    },
  });

  const folders = searchResponse.data.files;

  if (folders && folders.length > 0) {
    return folders[0].id;
  }

  const createResponse = await driveApi.post('/files', {
    name: APP_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  });

  return createResponse.data.id;
}

/**
 * Get or create a subfolder within the app folder
 */
export async function getOrCreateSubfolder(
  subfolderName: string,
  parentFolderId?: string
): Promise<string> {
  const parentId = parentFolderId || (await getOrCreateAppFolder());

  const searchResponse = await driveApi.get('/files', {
    params: {
      q: `name='${subfolderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    },
  });

  const folders = searchResponse.data.files;

  if (folders && folders.length > 0) {
    return folders[0].id;
  }

  const createResponse = await driveApi.post('/files', {
    name: subfolderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  });

  return createResponse.data.id;
}

// ============================================================================
// FILE UPLOAD
// ============================================================================

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fcbvcwszzxpgilconwky.supabase.co';
const R2_UPLOAD_URL = `${SUPABASE_URL}/functions/v1/upload-to-r2`;

/**
 * Upload a file to Cloudflare R2 via Supabase Edge Function
 * Used when VITE_USE_SUPABASE=true
 */
async function uploadFileToR2(
  file: File,
  subfolder?: string,
  customFileName?: string
): Promise<UploadResult> {
  const fileName = customFileName || file.name;

  const formData = new FormData();
  formData.append('file', new File([file], fileName, { type: file.type }));
  if (subfolder) {
    formData.append('subfolder', subfolder);
  }

  const response = await fetch(R2_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`R2 upload failed: ${errorData.error || response.statusText}`);
  }

  const data = await response.json();

  return {
    fileId: data.fileId,
    fileName: data.fileName,
    viewLink: data.viewLink,
    downloadLink: data.downloadLink,
    thumbnailLink: data.thumbnailLink,
  };
}

/**
 * Upload a file to Google Drive directly using user's OAuth token
 * Used when VITE_USE_SUPABASE is disabled (traditional Google Sheets mode)
 */
async function uploadFileDirectly(
  file: File,
  subfolder?: string,
  customFileName?: string
): Promise<UploadResult> {
  const accessToken = useAuthStore.getState().accessToken;

  if (!accessToken) {
    throw new AuthError('Not authenticated');
  }

  let folderId: string;
  if (subfolder) {
    folderId = await getOrCreateSubfolder(subfolder);
  } else {
    folderId = await getOrCreateAppFolder();
  }

  const fileName = customFileName || file.name;

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        useAuthStore.getState().setAccessToken(newToken);
        return uploadFileDirectly(file, subfolder, customFileName);
      }
      throw new AuthError();
    }
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data: DriveFile = await response.json();

  return {
    fileId: data.id,
    fileName: data.name,
    viewLink: `https://drive.google.com/file/d/${data.id}/view`,
    downloadLink: `https://drive.google.com/uc?export=download&id=${data.id}`,
    thumbnailLink: data.thumbnailLink,
  };
}

/**
 * Upload a file to storage
 * Routes based on VITE_USE_SUPABASE:
 * - true: Upload to Cloudflare R2 via Edge Function
 * - false: Upload to Google Drive directly with user OAuth
 */
export async function uploadFile(
  file: File,
  subfolder?: string,
  customFileName?: string
): Promise<UploadResult> {
  if (USE_SUPABASE) {
    return uploadFileToR2(file, subfolder, customFileName);
  } else {
    return uploadFileDirectly(file, subfolder, customFileName);
  }
}

/**
 * Upload multiple files at once
 */
export async function uploadMultipleFiles(
  files: File[],
  subfolder?: string
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadFile(file, subfolder))
  );
  return results;
}

// ============================================================================
// FILE RETRIEVAL
// ============================================================================

export async function getFileInfo(fileId: string): Promise<DriveFile> {
  const response = await driveApi.get(`/files/${fileId}`, {
    params: {
      fields: 'id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime',
    },
  });
  return response.data;
}

export function getViewLink(fileId: string): string {
  if (USE_SUPABASE) {
    // For R2, fileId is the object key - return download URL
    return `${SUPABASE_URL}/functions/v1/get-r2-download-url?key=${encodeURIComponent(fileId)}`;
  }
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function getDownloadLink(fileId: string): string {
  if (USE_SUPABASE) {
    // For R2, fileId is the object key - get presigned URL from edge function
    return `${SUPABASE_URL}/functions/v1/get-r2-download-url?key=${encodeURIComponent(fileId)}`;
  }
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function getThumbnailLink(fileId: string, size: number = 200): string {
  if (USE_SUPABASE) {
    // R2 doesn't have thumbnails, return download link
    return getDownloadLink(fileId);
  }
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

export async function listFiles(subfolder?: string): Promise<DriveFile[]> {
  let folderId: string;

  if (subfolder) {
    folderId = await getOrCreateSubfolder(subfolder);
  } else {
    folderId = await getOrCreateAppFolder();
  }

  const response = await driveApi.get('/files', {
    params: {
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime)',
      orderBy: 'createdTime desc',
    },
  });

  return response.data.files || [];
}

// ============================================================================
// FILE DELETION
// ============================================================================

export async function deleteFile(fileId: string): Promise<void> {
  await driveApi.delete(`/files/${fileId}`);
}

export async function trashFile(fileId: string): Promise<void> {
  await driveApi.patch(`/files/${fileId}`, {
    trashed: true,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function generateUniqueFileName(originalName: string, prefix?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const prefixStr = prefix ? `${prefix}_` : '';
  return `${prefixStr}${baseName}_${timestamp}.${extension}`;
}

export function formatFileSize(bytes: number | string): string {
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
