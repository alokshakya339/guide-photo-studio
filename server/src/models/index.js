import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const imageSchema = new Schema(
  {
    src: { type: String, required: true },
    alt: { type: String, default: '' },
    featured: { type: Boolean, default: false },
  },
  { _id: true }
);

/** A portfolio category such as Weddings or Birthday. */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    cover: { type: String, required: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true }, // false = hidden from the website (kept in admin)
    images: [imageSchema],
  },
  { timestamps: true }
);

const packageSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: '' },
    startingPrice: { type: Number, default: null }, // INR; null = "on request"
    unit: { type: String, default: '' }, // e.g. "per day"
    description: { type: String, default: '' },
    includes: [String],
    highlight: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true }, // false = hidden from the website (kept in admin)
  },
  { timestamps: true }
);

const testimonialSchema = new Schema(
  {
    name: { type: String, required: true },
    event: { type: String, default: '' },
    quote: { type: String, required: true },
    photo: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const faqSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const inquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    eventType: { type: String, trim: true, maxlength: 60 },
    eventDate: { type: Date },
    location: { type: String, trim: true, maxlength: 160 },
    budget: { type: String, trim: true, maxlength: 60 },
    message: { type: String, trim: true, maxlength: 3000 },
    source: { type: String, trim: true, maxlength: 60 },
    giftCode: { type: String, trim: true, uppercase: true, maxlength: 20 },
    company: { type: String, trim: true, maxlength: 120 }, // corporate enquiries
    designation: { type: String, trim: true, maxlength: 120 },
    status: { type: String, enum: ['new', 'contacted', 'booked', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

const clientPhotoSchema = new Schema({
  src: { type: String, required: true }, // URL (Drive "link only"), or "r2:<key>" for full-size copies in R2 (web-size version)
  thumb: String, // "r2:<key>" grid thumbnail (R2 photos only)
  original: String, // "r2:<key>" untouched file for downloads (R2 photos only)
  name: { type: String, maxlength: 160 }, // original file name
  w: Number, h: Number, // pixel size of the web version
  favorite: { type: Boolean, default: false },
  note: { type: String, default: '', maxlength: 500 },
});

/** A film delivered to the client: streamed from Google Drive, YouTube (unlisted) or a direct video URL. */
const clientVideoSchema = new Schema({
  kind: { type: String, enum: ['drive', 'youtube', 'file'], required: true },
  ref: { type: String, required: true }, // Drive file id / YouTube id / video URL
  title: { type: String, default: '', maxlength: 160 },
  poster: { type: String, default: '' },
});

/** A private, password-protected gallery for delivering and proofing a client's photos. */
const clientGallerySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Which website the gallery belongs to. Galleries created before this field existed are Guide Photo Studio's.
    brand: { type: String, enum: ['guide', 'babysteps'], default: 'guide', index: true },
    title: { type: String, required: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String, trim: true, maxlength: 30 },
    clientEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    passwordUpdatedAt: { type: Date },
    eventDate: { type: Date },
    cover: { type: String, default: '' },
    passwordHash: { type: String, required: true, select: false },
    allowDownload: { type: Boolean, default: true },
    selectionLimit: { type: Number, default: 0 }, // 0 = unlimited album picks
    selectionSubmittedAt: { type: Date },
    expiresAt: { type: Date }, // optional hard close by the studio (overrides everything)
    // --- Hosting subscription ---
    // The client can view/download until `accessUntil`. It starts as a free period and is
    // extended by each paid subscription cycle (or manually by the studio).
    accessUntil: { type: Date },
    subscription: {
      provider: { type: String, enum: ['razorpay', 'mock', 'manual'], default: undefined },
      subscriptionId: { type: String },
      planCode: { type: String },
      // created → authenticated (mandate set, billing starts later) → active → cancelled/halted/completed
      status: { type: String },
      currentEnd: { type: Date },
      updatedAt: { type: Date },
    },
    photos: [clientPhotoSchema],
    videos: [clientVideoSchema],
  },
  { timestamps: true }
);
clientGallerySchema.index({ 'subscription.subscriptionId': 1 }, { sparse: true });

/** Hosting plans a client can subscribe to once the free period ends. */
const planSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. "monthly"
    name: { type: String, required: true },
    period: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number, required: true, min: 100 }, // in paise (₹1 = 100)
    description: { type: String, default: '' },
    features: [String],
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    razorpayPlanId: { type: String }, // created lazily; cleared when the price changes
  },
  { timestamps: true }
);

const adminSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
});

/**
 * A customer account (website login). Email + password; email must be verified before purchase history is shown.
 * tokenVersion is embedded in session tokens: bumping it signs the customer out everywhere (password change/reset).
 * Reset / verification tokens are stored only as SHA-256 hashes.
 */
const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    passwordHash: { type: String, required: true, select: false },
    emailVerifiedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    verifyTokenHash: { type: String, select: false, default: null },
    verifyTokenExpires: { type: Date, select: false, default: null },
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpires: { type: Date, select: false, default: null },
    lastLoginAt: Date,
    disabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Category = model('Category', categorySchema);
export const Package = model('Package', packageSchema);
export const Testimonial = model('Testimonial', testimonialSchema);
export const Faq = model('Faq', faqSchema);
export const Inquiry = model('Inquiry', inquirySchema);
export const ClientGallery = model('ClientGallery', clientGallerySchema);
/** Open positions shown on the Careers page. */
const jobSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    icon: { type: String, default: 'camera' }, // video | photo | megaphone | camera
    location: { type: String, default: 'Noida studio' },
    summary: { type: String, default: '' },
    duties: [String],
    skills: [String],
    open: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const applicationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    role: { type: String, required: true, trim: true, maxlength: 80 },
    level: { type: String, enum: ['experienced', 'fresher'], default: 'fresher' },
    portfolio: { type: String, trim: true, maxlength: 500 },
    resume: { type: String, trim: true, maxlength: 500 },
    instagram: { type: String, trim: true, maxlength: 80 },
    message: { type: String, trim: true, maxlength: 3000 },
    status: { type: String, enum: ['new', 'shortlisted', 'interview', 'hired', 'rejected'], default: 'new' },
  },
  { timestamps: true }
);

/* ---------------- CMS ---------------- */

/** Uploaded or linked image in the media library. */
const mediaSchema = new Schema(
  {
    url: { type: String, required: true },
    filename: { type: String }, // set for files stored in /uploads
    originalName: { type: String },
    mime: { type: String },
    size: { type: Number },
    alt: { type: String, default: '' },
    folder: { type: String, default: 'general' },
  },
  { timestamps: true }
);

/** Key/value site settings (one document per key, e.g. "site"). */
const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

/** Long-form YouTube wedding films. */
const filmSchema = new Schema(
  {
    youtubeId: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    blurb: { type: String, default: '' },
    tags: [String],
    poster: { type: String, default: '' },
    previewStart: { type: Number, default: 30 },
    previewLength: { type: Number, default: 40 },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/** Vertical reels for the carousel: YouTube Shorts or Instagram reels. */
/** Music library: tracks the studio offers for invitations (picked in the invitation editor). */
const musicTrackSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    artist: { type: String, default: '', trim: true, maxlength: 120 },
    mood: { type: String, default: '', trim: true, maxlength: 60 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const reelSchema = new Schema(
  {
    platform: { type: String, enum: ['youtube', 'instagram'], default: 'youtube' },
    youtubeId: { type: String, default: '' },
    instagramId: { type: String, default: '' },
    title: { type: String, required: true },
    tag: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/** Blog / journal posts (/blog). `body` is simple Markdown: ## headings, **bold**, *italic*, [links](url), lists, > quotes, ![images](url). */
const blogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    date: { type: Date, default: () => new Date() }, // shown on the post; newest first
    category: { type: String, default: 'Weddings', trim: true, maxlength: 60 },
    author: { type: String, default: '', trim: true, maxlength: 120 },
    cover: { type: String, default: '' },
    excerpt: { type: String, default: '', maxlength: 400 }, // blog cards, top of the post and search snippets
    body: { type: String, default: '', maxlength: 60000 },
    tags: { type: [String], default: [] },
    published: { type: Boolean, default: false }, // drafts stay hidden until switched on
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/** Awards, honours and press features shown in the "Awards & recognition" section. */
const awardSchema = new Schema(
  {
    title: { type: String, required: true, trim: true }, // e.g. "Best Wedding Photographer"
    org: { type: String, default: '', trim: true }, // who gave it
    year: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true }, // e.g. "Winner", "Finalist", "Featured"
    note: { type: String, default: '', maxlength: 280 },
    image: { type: String, default: '' }, // badge, certificate or trophy photo
    link: { type: String, default: '' },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ---------- Gift cards ---------- */
const giftCardSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    amount: { type: Number, required: true, min: 1 }, // rupees
    recipientName: { type: String, trim: true, maxlength: 120 },
    recipientPhone: { type: String, trim: true, maxlength: 30 },
    recipientEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    senderName: { type: String, trim: true, maxlength: 120 },
    senderPhone: { type: String, trim: true, maxlength: 30 },
    senderEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 600 },
    expiresAt: Date,
    status: { type: String, enum: ['active', 'redeemed', 'cancelled'], default: 'active' },
    redeemedAt: Date,
    source: { type: String, enum: ['admin', 'online'], default: 'admin' },
    paymentId: String,
  },
  { timestamps: true }
);
/** A Razorpay order for an online gift-card purchase; the card is created only once payment is verified. */
const giftPaymentSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    paymentId: String,
    amount: { type: Number, required: true }, // rupees
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    giftCode: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    paidAt: Date,
    method: String, // card | netbanking | upi | wallet …
    methodDetail: String, // e.g. card network + last 4, bank, UPI id, wallet
  },
  { timestamps: true }
);
export const GiftCard = model('GiftCard', giftCardSchema);
export const GiftPayment = model('GiftPayment', giftPaymentSchema);

export const Admin = model('Admin', adminSchema);
export const Customer = model('Customer', customerSchema);
export const Award = model('Award', awardSchema);
export const BlogPost = model('BlogPost', blogPostSchema);
export const Media = model('Media', mediaSchema);
export const Setting = model('Setting', settingSchema);
export const Film = model('Film', filmSchema);
export const Reel = model('Reel', reelSchema);
export const MusicTrack = model('MusicTrack', musicTrackSchema);
export const Job = model('Job', jobSchema);
export const Application = model('Application', applicationSchema);
export const Plan = model('Plan', planSchema);
