import { Queue, Worker, Job } from 'bullmq';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { listingPhotos, listings } from '../db/schema.js';
import { getObjectBuffer, putObjectBuffer } from './storage.js';

const connection = { url: config.redisUrl };

export const imageQueue = new Queue('image-processing', { connection });

export interface ProcessImageJob {
  photoId: number;
  listingId: number;
  storageKey: string;
}

export async function enqueueImageProcessing(data: ProcessImageJob): Promise<void> {
  await imageQueue.add('processListingImage', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

export const offerQueue = new Queue('offer-notifications', { connection });

export async function enqueueOfferNotification(offerId: number): Promise<void> {
  await offerQueue.add('sendOfferNotification', { offerId });
}

async function processImage(job: Job<ProcessImageJob>): Promise<void> {
  const { photoId, listingId, storageKey } = job.data;
  const buffer = await getObjectBuffer(storageKey);

  const thumbnailKey = storageKey
    .replace('/original/', '/thumb/')
    .replace(/\.[^.]+$/, '.webp');

  const thumbBuffer = await sharp(buffer)
    .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await putObjectBuffer(thumbnailKey, thumbBuffer, 'image/webp');

  await db
    .update(listingPhotos)
    .set({
      thumbnailKey,
      processingStatus: 'complete',
    })
    .where(eq(listingPhotos.id, photoId));

  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));

  const hasCover = photos.some((p) => p.isCover && p.processingStatus === 'complete');
  if (!hasCover) {
    await db
      .update(listingPhotos)
      .set({ isCover: true })
      .where(eq(listingPhotos.id, photoId));
  }
}

async function sendOfferNotification(job: Job<{ offerId: number }>): Promise<void> {
  const { offerId } = job.data;
  if (!config.email.host || !config.email.notifyEmail) {
    console.log(`Offer notification skipped (no SMTP): offer ${offerId}`);
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: config.email.user
      ? { user: config.email.user, pass: config.email.pass }
      : undefined,
  });

  await transporter.sendMail({
    from: config.email.user ?? 'noreply@property-rental.local',
    to: config.email.notifyEmail,
    subject: `New rental offer #${offerId}`,
    text: `A new offer was submitted. Offer ID: ${offerId}`,
  });
}

export function startWorkers(): void {
  new Worker<ProcessImageJob>('image-processing', processImage, { connection });
  new Worker<{ offerId: number }>('offer-notifications', sendOfferNotification, {
    connection,
  });
  console.log('Background workers started');
}
