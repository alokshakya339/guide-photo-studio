import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const eventSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 }, // Haldi, Mehendi, Sangeet, Wedding, Reception…
  date: { type: String, trim: true, maxlength: 10 }, // YYYY-MM-DD
  time: { type: String, trim: true, maxlength: 40 }, // "7:00 PM onwards"
  venue: { type: String, trim: true, maxlength: 120 },
  address: { type: String, trim: true, maxlength: 240 },
  mapUrl: { type: String, trim: true, maxlength: 500 },
  dressCode: { type: String, trim: true, maxlength: 120 },
  note: { type: String, trim: true, maxlength: 400 },
  colors: [{ type: String, match: /^#[0-9a-fA-F]{6}$/ }], // dress-code palette swatches
});

const invitationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/ },
    template: { type: String, default: 'royal' },
    status: { type: String, enum: ['draft', 'preview', 'published', 'archived'], default: 'draft' },
    previewToken: { type: String, required: true },
    // couple
    partner1: { type: String, required: true, trim: true, maxlength: 60 }, // bride
    partner2: { type: String, required: true, trim: true, maxlength: 60 }, // groom
    families: { type: String, trim: true, maxlength: 240 }, // "Together with their families…"
    headline: { type: String, trim: true, maxlength: 120 }, // "We're getting married"
    weddingDate: { type: String, trim: true, maxlength: 10 }, // YYYY-MM-DD (countdown)
    city: { type: String, trim: true, maxlength: 80 },
    story: { type: String, trim: true, maxlength: 2000 },
    hashtag: { type: String, trim: true, maxlength: 60 },
    // "The couple" cards (Editorial theme)
    couple: {
      p1Parents: { type: String, trim: true, maxlength: 160 }, p1Bio: { type: String, trim: true, maxlength: 300 }, p1Photo: { type: String, default: '' },
      p2Parents: { type: String, trim: true, maxlength: 160 }, p2Bio: { type: String, trim: true, maxlength: 300 }, p2Photo: { type: String, default: '' },
    },
    timeline: [{ _id: false, year: { type: String, trim: true, maxlength: 20 }, title: { type: String, trim: true, maxlength: 80 }, text: { type: String, trim: true, maxlength: 400 } }],
    family: [{ _id: false, name: { type: String, trim: true, maxlength: 80 }, relation: { type: String, trim: true, maxlength: 80 }, photo: { type: String, default: '' } }],
    contacts: [{ _id: false, name: { type: String, trim: true, maxlength: 80 }, role: { type: String, trim: true, maxlength: 80 }, phone: { type: String, trim: true, maxlength: 20 } }],
    // media
    coverPhoto: { type: String, default: '' },
    heroScene: { type: String, default: '' }, // Cinema Reel: film loop in the hero window (see SCENES in Cinema.jsx)
    couplePhoto: { type: String, default: '' },
    gallery: [{ type: String }],
    videoId: { type: String, default: '' }, // YouTube id
    music: { type: String, default: '' }, // audio URL
    musicTitle: { type: String, default: '' },
    events: [eventSchema],
    // look
    theme: {
      primary: { type: String, default: '' },
      accent: { type: String, default: '' },
      background: { type: String, default: '' },
      font: { type: String, default: '' },
    },
    // guest features
    rsvpEnabled: { type: Boolean, default: true },
    rsvpDeadline: { type: String, default: '' },
    wishesEnabled: { type: Boolean, default: true },
    passwordHash: { type: String, select: false, default: '' },
    showStudioCta: { type: Boolean, default: true },
    // business
    package: { type: String, default: 'signature' },
    client: {
      name: { type: String, trim: true, maxlength: 120 },
      phone: { type: String, trim: true, maxlength: 30 },
      email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'waived'], default: 'pending' },
    // customer self-service: the account that created it, and when they sent it to the studio for review
    owner: { type: Schema.Types.ObjectId, ref: 'Customer', index: true, default: null },
    submittedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    paidAmount: { type: Number, default: null }, // rupees actually paid online
    clientApprovedAt: Date,
    publishedAt: Date,
    views: { type: Number, default: 0 },
    notes: { type: String, default: '', maxlength: 4000 },
  },
  { timestamps: true }
);

const rsvpSchema = new Schema(
  {
    invitation: { type: Schema.Types.ObjectId, ref: 'Invitation', index: true, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 30 },
    attending: { type: String, enum: ['yes', 'no', 'maybe'], required: true },
    guests: { type: Number, min: 1, max: 20, default: 1 },
    events: [{ type: String }],
    message: { type: String, trim: true, maxlength: 600 },
    marketingConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const wishSchema = new Schema(
  {
    invitation: { type: Schema.Types.ObjectId, ref: 'Invitation', index: true, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const invitePackageSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // rupees
    tagline: { type: String, default: '' },
    features: [String],
    highlight: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/** An online purchase of an invitation package (Razorpay order). The invitation goes live once it's paid. */
const invitePaymentSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    invitation: { type: Schema.Types.ObjectId, ref: 'Invitation', index: true, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    package: { type: String, required: true },
    amount: { type: Number, required: true }, // rupees
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    paymentId: String, method: String, methodDetail: String, paidAt: Date,
  },
  { timestamps: true }
);
export const InvitePayment = model('InvitePayment', invitePaymentSchema);

/** Most photos an invitation's gallery can hold (editor, API and the guest page all respect it). */
export const MAX_GALLERY = 5;

export const Invitation = model('Invitation', invitationSchema);
export const InviteRsvp = model('InviteRsvp', rsvpSchema);
export const InviteWish = model('InviteWish', wishSchema);
export const InvitePackage = model('InvitePackage', invitePackageSchema);

export const DEFAULT_PACKAGES = [
  { code: 'essential', name: 'Essential Invite', price: 2999, order: 1, tagline: 'A beautiful, personalised invitation website.',
    features: ['Your names, date & story', 'All wedding functions with maps', 'Add-to-calendar & WhatsApp sharing', 'Unique link: guidephotostudio.com/invite/you'] },
  { code: 'signature', name: 'Signature Invite', price: 5999, order: 2, highlight: true, tagline: 'Animated, musical and ready for every guest.',
    features: ['Everything in Essential', 'Animated envelope opening', 'Photo gallery & pre-wedding film', 'Background music', 'Countdown timer', 'Guest RSVP & blessings wall'] },
  { code: 'luxury', name: 'Luxury Invite', price: 11999, order: 3, tagline: 'A bespoke invitation, designed and set up for you.',
    features: ['Everything in Signature', 'Custom colours, fonts & design touches', 'Advanced animations', 'Private / password option', 'RSVP export for your planner', 'Dedicated setup & revisions'] },
];

/**
 * What each package unlocks on the guest-facing invitation (enforced by the API, shown in Admin).
 * Essential: names, story, functions, maps, calendar, sharing. Signature: + envelope, media, music,
 * countdown, RSVP, blessings. Luxury: + custom theme, advanced animations, password, RSVP export.
 */
const ALL = ['envelope', 'media', 'music', 'countdown', 'rsvp', 'wishes', 'customTheme', 'animations', 'password', 'rsvpExport'];
const SIGNATURE = ['envelope', 'media', 'music', 'countdown', 'rsvp', 'wishes'];
export const PACKAGE_FEATURES = {
  essential: Object.fromEntries(ALL.map((k) => [k, false])),
  signature: Object.fromEntries(ALL.map((k) => [k, SIGNATURE.includes(k)])),
  luxury: Object.fromEntries(ALL.map((k) => [k, true])),
};
export const featuresOf = (inv) => PACKAGE_FEATURES[inv?.package] || PACKAGE_FEATURES.signature;
