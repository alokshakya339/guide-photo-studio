/** Default site settings (used when nothing has been saved yet, and by the seed). */
export const DEFAULT_SITE = {
  name: 'Guide Photo Studio',
  tagline: 'Cinematic Wedding Photography Studio',
  location: 'Noida, with services across Delhi NCR & destinations',
  phone: '+91 92051 28749',
  phoneRaw: '+919205128749',
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
  hero: {
    eyebrow: 'Wedding & portrait photographers · Noida, Delhi NCR',
    title: 'Moments pass.',
    titleAccent: 'Memories',
    titleRest: ', captured right, are eternal.',
    lead: 'Cinematic wedding photography and films, pre-wedding, maternity, baby and portrait shoots, crafted by a family of photographers across two generations.',
    leadMobile: 'Cinematic weddings, films & portraits by a family studio in Noida.',
  },
  heroSlides: [
    { src: '/images/wedding/w05.jpg', alt: 'Bride and groom under fireworks' },
    { src: '/images/home/couple-2.jpg', alt: 'Couple at Jal Mahal, Jaipur' },
    { src: '/images/wedding/w15.jpg', alt: 'Bride and groom embracing' },
    { src: '/images/home/couple-3.jpg', alt: 'Couple in a palace hall' },
    { src: '/images/wedding/w21.jpg', alt: 'Bridal entry with dancers' },
  ],
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
  studioPhotos: Array.from({ length: 8 }, (_, i) => `/images/studio/s${i + 1}.jpg`),
  footer: {
    eyebrow: '',
    title: 'Let’s tell',
    titleAccent: 'your story',
    titleRest: ', beautifully.',
    instagramLabel: '',
    strip: ['/images/wedding/w05.jpg', '/images/home/couple-2.jpg', '/images/wedding/w15.jpg', '/images/wedding/w09.jpg', '/images/home/couple-3.jpg', '/images/wedding/w21.jpg'],
  },
  promo: { label: 'Now booking 2026 – 27', text: 'Wedding pricing on request', image: '/images/wedding/w05.jpg' },
};

export const DEFAULT_FILMS = [
  {
    youtubeId: 'YRIeljUijh0',
    title: 'Subhangi & Manu',
    subtitle: 'The Tree House, Jaipur',
    blurb: 'A destination wedding among the trees of Jaipur, told the way it felt: candid, cinematic and full of family.',
    tags: ['Destination wedding', 'Jaipur', '2025', '4K'],
    poster: '/images/home/film-thumb.jpg',
    previewStart: 30,
    previewLength: 40,
    order: 1,
  },
];

export const DEFAULT_REELS = [
  { youtubeId: 'ovEbUj1dL2o', title: 'Bridal Getting Ready', tag: 'Bride', thumbnail: '/images/reels/ovEbUj1dL2o.jpg' },
  { youtubeId: 'C_yd0dDb89s', title: 'Harshit & Muskan · Engagement Teaser', tag: 'Engagement', thumbnail: '/images/reels/C_yd0dDb89s.jpg' },
  { youtubeId: '3vuFdPCOJ8k', title: 'Grand Couple Entry', tag: 'Reception', thumbnail: '/images/reels/3vuFdPCOJ8k.jpg' },
  { youtubeId: 'KS2ikPJeVXc', title: 'Priyanka & Mayank · Maternity Shoot', tag: 'Maternity', thumbnail: '/images/reels/KS2ikPJeVXc.jpg' },
  { youtubeId: 'dQnY2o7FcG8', title: 'Beautiful Bride', tag: 'Bride', thumbnail: '/images/reels/dQnY2o7FcG8.jpg' },
].map((r, i) => ({ ...r, order: i + 1 }));

/** Accepts any YouTube URL (watch, youtu.be, shorts, embed) or a bare 11-char id. */
export function youtubeId(input) {
  const s = String(input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
