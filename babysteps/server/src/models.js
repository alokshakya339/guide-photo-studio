import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/** Studio admin who signs in to /admin. */
const adminSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

/** Key/value documents — the website content lives under key "babysteps". */
const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

/** Media library (uploaded files or registered external links). */
const mediaSchema = new Schema({
  url: { type: String, required: true },
  filename: String,
  originalName: String,
  alt: { type: String, default: '' },
  mime: String,
  size: Number,
  folder: { type: String, default: 'general' },
}, { timestamps: true });

const clientPhotoSchema = new Schema({
  src: { type: String, required: true }, // URL, or "r2:<key>" for photos stored in Cloudflare R2 (web-size version)
  thumb: String, // "r2:<key>" grid thumbnail (R2 photos only)
  original: String, // "r2:<key>" untouched file for downloads (R2 photos only)
  name: { type: String, maxlength: 160 }, // original file name
  w: Number, h: Number, // pixel size of the web version — lets the grid reserve the right space before it loads
  favorite: { type: Boolean, default: false },
  note: { type: String, default: '', maxlength: 500 },
});

/** A film delivered to the client: Google Drive, YouTube (unlisted) or a direct video URL. */
const clientVideoSchema = new Schema({
  kind: { type: String, enum: ['drive', 'youtube', 'file'], required: true },
  ref: { type: String, required: true },
  title: { type: String, default: '', maxlength: 160 },
  poster: { type: String, default: '' },
});

/** Private, password-protected gallery for delivering and proofing a client's photos. */
const clientGallerySchema = new Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  clientName: { type: String, required: true },
  clientPhone: { type: String, trim: true, maxlength: 30 },
  clientEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
  eventDate: Date,
  cover: { type: String, default: '' },
  passwordHash: { type: String, required: true, select: false },
  passwordUpdatedAt: Date,
  allowDownload: { type: Boolean, default: true },
  selectionLimit: { type: Number, default: 0 }, // 0 = unlimited album picks
  selectionSubmittedAt: Date,
  expiresAt: Date, // optional hard close by the studio
  accessUntil: Date,
  photos: [clientPhotoSchema],
  videos: [clientVideoSchema],
}, { timestamps: true });

/** Booking enquiry from the website form (also sent to WhatsApp by the visitor). */
const inquirySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true, maxlength: 160 },
  session: { type: String, trim: true, maxlength: 60 },
  package: { type: String, trim: true, maxlength: 80 },
  babyAge: { type: String, trim: true, maxlength: 80 },
  preferredDate: { type: String, trim: true, maxlength: 20 },
  giftCode: { type: String, trim: true, uppercase: true, maxlength: 20 },
  message: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'contacted', 'booked', 'closed'], default: 'new' },
  notes: { type: String, default: '', maxlength: 4000 },
  source: { type: String, default: 'website', maxlength: 40 },
}, { timestamps: true });

/** Photography gift card / voucher. */
const giftCardSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  amount: { type: Number, required: true, min: 1 }, // in rupees
  recipientName: { type: String, trim: true, maxlength: 120 },
  recipientPhone: { type: String, trim: true, maxlength: 30 },
  recipientEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
  senderName: { type: String, trim: true, maxlength: 120 },
  senderPhone: { type: String, trim: true, maxlength: 30 },
  senderEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
  message: { type: String, trim: true, maxlength: 600 },
  source: { type: String, enum: ['admin', 'online'], default: 'admin' },
  paymentId: { type: String, trim: true },
  expiresAt: Date,
  status: { type: String, enum: ['active', 'redeemed', 'cancelled'], default: 'active' },
  redeemedAt: Date,
  redeemedNote: { type: String, trim: true, maxlength: 400 },
}, { timestamps: true });

/** A Razorpay order for an online gift-card purchase. The card is created only once the payment is verified. */
const paymentSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  paymentId: String,
  purpose: { type: String, enum: ['gift-card'], default: 'gift-card' },
  amount: { type: Number, required: true }, // gift-card value, rupees
  charges: { // what was actually charged, in paise (absent on orders made before fees existed → amount × 100)
    platformFee: Number, gst: Number, total: Number, gstPercent: Number, platformFeePercent: Number, platformFeeFlat: Number,
  },
  status: { type: String, enum: ['created', 'paid'], default: 'created' },
  giftCode: { type: String, default: null },
  details: { type: Schema.Types.Mixed, default: {} }, // buyer & recipient details for the card
  paidAt: Date,
}, { timestamps: true });

export const Inquiry = model('Inquiry', inquirySchema);
export const Payment = model('Payment', paymentSchema);
export const GiftCard = model('GiftCard', giftCardSchema);
export const Admin = model('Admin', adminSchema);
export const Setting = model('Setting', settingSchema);
export const Media = model('Media', mediaSchema);
export const ClientGallery = model('ClientGallery', clientGallerySchema);
