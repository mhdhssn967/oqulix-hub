import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Helper to clean environment variable values in case `KEY=VALUE` was pasted into the Value field in Vercel
 */
const cleanEnvValue = (val) => {
  if (!val) return '';
  let cleaned = String(val).trim();
  const eqIndex = cleaned.indexOf('=');
  if (eqIndex !== -1 && cleaned.slice(0, eqIndex).startsWith('VITE_')) {
    cleaned = cleaned.slice(eqIndex + 1).trim();
  }
  return cleaned.replace(/^["']|["']$/g, '').trim();
};

const rawAccountId = cleanEnvValue(import.meta.env.VITE_R2_ACCOUNT_ID);
// Guard against accidental duplicate paste (e.g. 64 chars of the same 32-char hex string twice)
const R2_ACCOUNT_ID =
  rawAccountId.length === 64 &&
  rawAccountId.slice(0, 32) === rawAccountId.slice(32)
    ? rawAccountId.slice(0, 32)
    : rawAccountId;

const R2_ACCESS_KEY_ID = cleanEnvValue(import.meta.env.VITE_R2_ACCESS_KEY_ID);
const R2_SECRET_ACCESS_KEY = cleanEnvValue(import.meta.env.VITE_R2_SECRET_ACCESS_KEY);
const R2_BUCKET_NAME = cleanEnvValue(import.meta.env.VITE_R2_BUCKET_NAME);
const R2_PUBLIC_URL = cleanEnvValue(import.meta.env.VITE_R2_PUBLIC_URL);

export const isR2Configured = () => {
  return Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    R2_PUBLIC_URL
  );
};

let r2Client = null;

const getR2Client = () => {
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured. Please add VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME, and VITE_R2_PUBLIC_URL to your .env file.'
    );
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return r2Client;
};

/**
 * Upload a profile picture to Cloudflare R2 using a Presigned URL + native fetch
 * @param {File} file - The image File object
 * @param {string} userId - The unique user ID
 * @returns {Promise<{ url: string, key: string }>}
 */
export const uploadProfilePictureToR2 = async (file, userId) => {
  const client = getR2Client();

  const sanitizedOriginalName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'avatar.jpg';
  const timestamp = Date.now();
  const key = `profile_pictures/${userId}/${timestamp}_${sanitizedOriginalName}`;
  const contentType = file.type || 'image/jpeg';

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const signedPutUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  const response = await fetch(signedPutUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`R2 upload failed (${response.status}): ${errText || response.statusText}`);
  }

  const baseUrl = R2_PUBLIC_URL.replace(/\/+$/, '');
  const publicUrl = `${baseUrl}/${key}`;

  return {
    url: publicUrl,
    key,
  };
};

/**
 * Upload a resume file to Cloudflare R2 using a Presigned URL + native fetch
 * @param {File} file - The browser File object
 * @param {string} positionId - The ID of the hiring position
 * @param {string} candidateName - Name of the candidate for clean file naming
 * @returns {Promise<{ url: string, key: string, fileName: string, fileSize: number, fileType: string }>}
 */
export const uploadResumeToR2 = async (file, positionId, candidateName = 'candidate') => {
  const client = getR2Client();

  const sanitizedName =
    candidateName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'candidate';

  const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const key = `resumes/${positionId}/${timestamp}_${sanitizedName}_${sanitizedOriginalName}`;
  const contentType = file.type || 'application/pdf';

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const signedPutUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  const response = await fetch(signedPutUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`R2 upload failed (${response.status}): ${errText || response.statusText}`);
  }

  const baseUrl = R2_PUBLIC_URL.replace(/\/+$/, '');
  const publicUrl = `${baseUrl}/${key}`;

  return {
    url: publicUrl,
    key,
    fileName: file.name,
    fileSize: file.size,
    fileType: contentType,
  };
};

/**
 * Delete a resume file from Cloudflare R2 using a Presigned URL
 * @param {string} key - The object key stored in R2
 */
export const deleteResumeFromR2 = async (key) => {
  if (!key || !isR2Configured()) return;
  try {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    const signedDeleteUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    await fetch(signedDeleteUrl, { method: 'DELETE' });
  } catch (error) {
    console.error('Error deleting file from Cloudflare R2:', error);
  }
};

/**
 * Upload a general document file to Cloudflare R2
 * @param {File} file - The browser File object
 * @param {string} companyId - Company ID
 * @param {string} folderId - ID of the folder (or 'root')
 * @returns {Promise<{ url: string, key: string, fileName: string, fileSize: number, fileType: string }>}
 */
export const uploadDocumentToR2 = async (file, companyId, folderId = 'root') => {
  const client = getR2Client();

  const sanitizedOriginalName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'document.bin';
  const timestamp = Date.now();
  const key = `documents/${companyId}/${folderId}/${timestamp}_${sanitizedOriginalName}`;
  const contentType = file.type || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const signedPutUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  const response = await fetch(signedPutUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`R2 document upload failed (${response.status}): ${errText || response.statusText}`);
  }

  const baseUrl = R2_PUBLIC_URL.replace(/\/+$/, '');
  const publicUrl = `${baseUrl}/${key}`;

  return {
    url: publicUrl,
    key,
    fileName: file.name,
    fileSize: file.size,
    fileType: contentType,
  };
};

/**
 * Delete a document from Cloudflare R2
 * @param {string} key - The object key stored in R2
 */
export const deleteDocumentFromR2 = async (key) => {
  if (!key || !isR2Configured()) return;
  try {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    const signedDeleteUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    await fetch(signedDeleteUrl, { method: 'DELETE' });
  } catch (error) {
    console.error('Error deleting document from Cloudflare R2:', error);
  }
};
