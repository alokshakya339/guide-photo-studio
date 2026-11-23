/** Studio details used across the site. Edit here to update everywhere. */
export const SITE = {
  name: 'Guide Photo Studio',
  tagline: 'Cinematic Wedding Photography Studio',
  location: 'Noida, with services across Delhi NCR & destinations',
  phone: '+91 92051 28749',
  phoneRaw: '+919205128749',
  // Confirm this number is on WhatsApp before going live.
  whatsapp: '919205128749',
  email: 'Guidestudio7@gmail.com',
  hours: 'Monday – Sunday, 9 AM – 9 PM',
  address: '2013, near AVCC Club, Arun Vihar, Sector 37, Noida, Uttar Pradesh 201301',
  mapQuery: 'Guide Photo Studio, Arun Vihar, Sector 37, Noida',
  social: {
    instagram: 'https://www.instagram.com/guidephotostudio/',
    facebook: 'https://www.facebook.com/guidestudio37',
    youtube: 'https://www.youtube.com/channel/UCyTqj9jdKRetSGEq14uzURQ',
  },
  films: [
    {
      id: 'YRIeljUijh0',
      title: 'Subhangi & Manu',
      subtitle: 'The Tree House, Jaipur',
      poster: '/images/home/film-thumb.jpg',
      blurb: 'A destination wedding among the trees of Jaipur, told the way it felt: candid, cinematic and full of family.',
      tags: ['Destination wedding', 'Jaipur', '2025', '4K'],
      previewStart: 30, // seconds into the film where the silent background loop starts
      previewLength: 40,
    },
  ],
  // Vertical YouTube Shorts shown in the "Reels" carousel. Add more by appending { id, title, tag }.
  reels: [
    { id: 'ovEbUj1dL2o', title: 'Bridal Getting Ready', tag: 'Bride' },
    { id: 'C_yd0dDb89s', title: 'Harshit & Muskan · Engagement Teaser', tag: 'Engagement' },
    { id: '3vuFdPCOJ8k', title: 'Grand Couple Entry', tag: 'Reception' },
    { id: 'KS2ikPJeVXc', title: 'Priyanka & Mayank · Maternity Shoot', tag: 'Maternity' },
    { id: 'dQnY2o7FcG8', title: 'Beautiful Bride', tag: 'Bride' },
  ],
  heroSlides: [
    { src: '/images/wedding/w05.jpg', alt: 'Bride and groom under fireworks' },
    { src: '/images/home/couple-2.jpg', alt: 'Couple at Jal Mahal, Jaipur' },
    { src: '/images/wedding/w15.jpg', alt: 'Bride and groom embracing' },
    { src: '/images/home/couple-3.jpg', alt: 'Couple in a palace hall' },
    { src: '/images/wedding/w21.jpg', alt: 'Bridal entry with dancers' },
  ],
  // TODO: replace `photo` with real portraits of Sandeep and Sarthak.
  team: [
    {
      name: 'Sandeep Chopra',
      role: 'Founder · By appointment only',
      bio: 'Carrying forward the artistry of his late father, Shri Parvesh Chopra, Sandeep built Guide into a trusted name for warmth and artistic excellence.',
      photo: '/images/wedding/w04.jpg',
    },
    {
      name: 'Sarthak Chopra',
      role: 'Creative Director',
      bio: 'The next generation of Guide: new techniques, cinematic storytelling and an uncompromising eye for quality.',
      photo: '/images/wedding/w11.jpg',
    },
  ],
  hero: {
    eyebrow: 'Wedding & portrait photographers · Noida, Delhi NCR',
    title: 'Moments pass.',
    titleAccent: 'Memories',
    titleRest: ', captured right, are eternal.',
    lead: 'Cinematic wedding photography and films, pre-wedding and portrait shoots, crafted by a family of photographers across four generations.',
    leadMobile: 'Cinematic weddings, films & portraits by a family studio in Noida.',
  },
  footer: {
    eyebrow: '',
    title: 'Let’s tell',
    titleAccent: 'your story',
    titleRest: ', beautifully.',
    instagramLabel: '',
    strip: ['/images/wedding/w05.jpg', '/images/home/couple-2.jpg', '/images/wedding/w15.jpg', '/images/wedding/w09.jpg', '/images/home/couple-3.jpg', '/images/wedding/w21.jpg'],
  },
  promo: { label: 'Now booking 2026 – 27', text: 'Wedding pricing on request', image: '/images/wedding/w05.jpg' },
  studioPhotos: Array.from({ length: 8 }, (_, i) => `/images/studio/s${i + 1}.jpg`),
  awards: [], // managed in Admin → Awards
};

/** Merge CMS content from /api/site into SITE (static values above are the offline fallback). */
export async function loadSite() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/site`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return;
    const data = await res.json();
    Object.entries(data).forEach(([k, v]) => {
      if (v == null) return;
      // films/reels are managed in the CMS: an empty list means "none published". Other empty lists keep the fallback.
      if (!['films', 'reels', 'awards'].includes(k) && Array.isArray(v) && v.length === 0 && Array.isArray(SITE[k]) && SITE[k].length) return;
      SITE[k] = v;
    });
    if (data.name) document.title = document.title.replace('Guide Photo Studio', data.name);
  } catch {
    /* offline / API down: keep the bundled defaults */
  }
}

/** Google Drive share link → embeddable image URL (files must be shared "Anyone with the link"). */
export function driveToImage(url) {
  const s = String(url || '').trim();
  const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([-\w]{20,})/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w2000` : s;
}

/** Resized URL where the host supports it (Google Drive). Local/other images are returned unchanged. */
export function sized(src, width) {
  const s = String(src || '');
  if (/drive\.google\.com\/thumbnail\?/.test(s)) return s.replace(/([?&])sz=w\d+/, `$1sz=w${width}`);
  return s;
}

/** Download URL for a photo: Drive images download the original file; others download as-is. */
export function downloadUrl(src) {
  const m = String(src || '').match(/drive\.google\.com\/thumbnail\?id=([-\w]{20,})/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : src;
}

export const EVENT_TYPES = ['Wedding', 'Wedding Film', 'Pre-Wedding', 'Head Shots', 'Product Shoot', 'Digital Invitation', 'Other'];

export const formatINR = (n) =>
  n == null ? 'On request' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
