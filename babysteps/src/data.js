// All studio content lives here — edit this file to change copy, prices or photos.

export const STUDIO = {
  name: 'BabySteps Guide Studio',
  parent: 'Guide Photo Studio',
  phone: '+91 92051 28749',
  phoneHref: 'tel:+919205128749',
  whatsapp: '919205128749',
  email: 'hello@babystepsbyguide.com',
  instagram: 'https://www.instagram.com/babystepsbyguide/',
  instagramHandle: '@babystepsbyguide',
  address: 'Flat No. 2013, Sector 37, Noida, Uttar Pradesh',
  mapQuery: 'Sector 37, Noida, Uttar Pradesh',
  postalCode: '201303',
  // Map pin for Google / AI search (latitude, longitude). Approximate Sector 37 — paste the studio's exact pin
  // from Google Maps (right-click the studio → copy the numbers) in /admin → Studio details.
  geo: '28.5670, 77.3420',
  hours: 'Mo-Sa 10:00-18:00',
};

const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=75`;

export const IMG = {
  maternity: '/images/maternity.jpg',
  newborn: '/images/newborn.jpg',
  milestone: '/images/milestone.jpg',
  cake: '/images/cake-smash.jpg',
  birthday: '/images/birthday.jpg',
  family: '/images/family.jpg',
};

export const CATEGORIES = [
  { key: 'maternity', label: 'Maternity', img: IMG.maternity, tint: 'var(--lilac)' },
  { key: 'newborn', label: 'Newborn', img: IMG.newborn, tint: 'var(--sky)' },
  { key: 'milestone', label: 'Milestones', img: IMG.milestone, tint: 'var(--sand)' },
  { key: 'cake', label: 'Cake Smash', img: IMG.cake, tint: 'var(--peach)' },
  { key: 'birthday', label: 'Pre-Birthday', img: IMG.birthday, tint: 'var(--blush)' },
  { key: 'family', label: 'Family', img: IMG.family, tint: 'var(--mint)' },
];

// Interactive "journey" — when to book each shoot.
export const JOURNEY = [
  {
    key: 'maternity',
    slug: 'maternity',
    stage: 'The bump',
    when: '28 – 34 weeks',
    title: 'Maternity',
    img: IMG.maternity,
    text: 'Celebrate the beautiful anticipation of motherhood. We provide elegant gowns and create artistic, flattering portraits of you and your partner.',
    perks: ['Gowns included', 'Partner & family shots', 'Instagram reel'],
    from: '4,999',
    pkg: 'maternity',
  },
  {
    key: 'newborn',
    slug: 'newborn',
    stage: 'First days',
    when: '5 – 15 days old',
    title: 'Newborn',
    img: IMG.newborn,
    text: 'Preserve the fleeting first weeks of life. Our studio is temperature-controlled, and we use the safest, gentlest posing techniques for your baby.',
    perks: ['Safe newborn handling', 'All props & wraps provided', 'Parent shots'],
    from: '5,999',
    pkg: 'newborn',
  },
  {
    key: 'milestone',
    slug: 'milestones',
    stage: 'Growing up',
    when: '3 · 6 · 9 months',
    title: 'Baby Milestones',
    img: IMG.milestone,
    text: 'Document the sits, crawls, and gummy smiles. Perfect for 3, 6, and 9-month milestones capturing their developing personality.',
    perks: ['Themed setups', 'Family participation', 'Cinematic reel'],
    from: '3,999',
    pkg: 'baby',
  },
  {
    key: 'birthday',
    slug: 'pre-birthday',
    stage: 'Almost one',
    when: '10 – 11 months',
    title: 'Pre-Birthday',
    img: IMG.birthday,
    text: 'An indoor + outdoor shoot before the big day — perfect for invitations, décor and the birthday slideshow.',
    perks: ['Indoor + outdoor', '1 cinematic reel', 'Cake smash optional'],
    from: '6,000',
    pkg: 'baby',
  },
  {
    key: 'cake',
    slug: 'cake-smash',
    stage: 'Big day',
    when: '1st birthday',
    title: 'Cake Smash',
    img: IMG.cake,
    text: 'A joyful, messy celebration for the big first birthday! We handle the custom set design and the cleanup.',
    perks: ['Custom set design', 'Pre-smash portraits', 'We clean up'],
    from: '6,499',
    pkg: 'baby',
  },
  {
    key: 'family',
    slug: 'family',
    stage: 'Forever',
    when: 'Any time',
    title: 'Family',
    img: IMG.family,
    text: "Timeless portraits showcasing your growing family's love and connection. Perfect for wall art and heirlooms.",
    perks: ['Siblings welcome', 'Outfit guidance', 'Wall-art ready'],
    from: '3,999',
    pkg: 'baby',
  },
];

export const PACKAGES = {
  maternity: {
    label: 'Maternity',
    emoji: '🤰',
    blurb: 'Celebrate your beautiful journey to motherhood.',
    plans: [
      { name: 'Little Bloom', icon: '🌸', price: '4,999', features: ['45 min shoot', '1 studio setup', '1 gown included', '10–15 edited photos', 'Soft copy delivery', '1 Instagram reel - 60seconds'] },
      { name: 'Motherhood', icon: '💕', price: '6,999', popular: true, features: ['90 min shoot', '2 creative setups', '1 gown included', 'Mom-to-be + husband', '20 edited photos', 'Soft copy delivery', '1 Instagram reel', '2 dress changes'] },
      { name: 'Motherhood Luxe', icon: '✨', price: '14,999', features: ['2 hour shoot', '3 creative setups', '2 gowns included', 'Mom-to-be + husband', 'Family portraits included', '30 edited photos', '2 Instagram reels', 'Priority editing'] },
    ],
    addons: [
      ['Fresh flower setup', '₹5,000'],
      ['Gender reveal reel', '₹2,500'],
      ['Extra gown rental', '₹3,500'],
      ['Outdoor shoot add-on', '₹3,000'],
      ['Additional edited photo', '₹250 / image'],
    ],
  },
  newborn: {
    label: 'Newborn',
    emoji: '👶',
    blurb: 'Delicate, sleepy poses capturing those fleeting first days.',
    plans: [
      { name: 'Basic', icon: '🍼', price: '5,999', features: ['1 Studio setup with props', '20 edited images', 'Online gallery', 'Parent shots (5 images)', 'Safe posing techniques', '1 Instagram reel - 60 seconds', '1 hour session'] },
      { name: 'Deluxe', icon: '🧸', price: '8,999', popular: true, features: ['2 hour session', '2 setups and props', '35 edited images', 'Online gallery with download', 'Parent & sibling shots (10)', 'Lifestyle shots at home', '1 album - 15 photos'] },
      { name: 'Ultimate', icon: '👑', price: '30,000', features: ['4 hour session', 'Premium props and setups', '60 edited images', 'Premium gallery', 'Home lifestyle session', 'Luxury album (12×16)', 'Canvas print (20×30)', 'Birth announcement cards'] },
    ],
    addons: [
      ['Fresh flower setup', 'Starting ₹3,500'],
      ['Extra theme setup', '₹1,500'],
      ['Premium reel', '₹2,500'],
    ],
  },
  baby: {
    label: 'Baby & Milestones',
    emoji: '🎈',
    blurb: 'Celebrate every milestone with premium baby photography.',
    plans: [
      { name: 'Little Star', icon: '🌟', price: '3,999', features: ['1 studio setup', '30–45 min session', '10 edited high-res photos', 'Family participation included', 'Private online gallery'] },
      { name: 'Growing Joy', icon: '🎈', price: '6,999', popular: true, features: ['2 themed setups', '1–1.5 hour session', '20 edited high-res photos', '1 short cinematic reel', 'Family & sibling photos', 'Private online gallery'] },
      { name: 'Baby Luxury', icon: '👑', price: '11,999', features: ['4–5 premium setups', '2–3 hour session', '35–40 edited high-res photos', '2 cinematic reels', 'Family portraits included', 'Premium props & styling', 'Private online gallery'] },
      { name: 'Pre-Birthday Special', icon: '🎂', price: '6,000', features: ['Indoor + outdoor shoot', '1.5 hour session', '20 selected edited photos', '~30 delivered photos total', '1 cinematic reel', 'Cake smash setup (optional)', 'Private online gallery'] },
    ],
    addons: [
      ['Cake smash setup', '₹2,500 – ₹5,000'],
      ['Fresh flower setup', 'Starting ₹3,500'],
      ['Extra theme setup', '₹1,500'],
      ['Premium reel', '₹2,500'],
    ],
  },
};

export const GALLERY = [
  { src: IMG.newborn, cat: 'newborn', alt: 'Newborn asleep on a tiny bed with teddy bears' },
  { src: IMG.maternity, cat: 'maternity', alt: 'Expecting couple holding a letter board' },
  { src: IMG.cake, cat: 'cake', alt: 'Baby girl with a pink cake and balloons' },
  { src: IMG.milestone, cat: 'milestone', alt: 'Sleeping baby with a 2-month milestone plaque' },
  { src: IMG.family, cat: 'family', alt: 'Parents swinging their toddler between them' },
  { src: IMG.birthday, cat: 'birthday', alt: 'Smiling baby in a tutu with a pastel rainbow backdrop' },
  { src: u('photo-1555252333-9f8e92e65df9'), cat: 'newborn', alt: 'Tiny feet peeking out of a soft towel' },
  { src: u('photo-1519689680058-324335c77eba'), cat: 'milestone', alt: 'Baby in sunglasses lounging on a pool float' },
  { src: u('photo-1546015720-b8b30df5aa27'), cat: 'newborn', alt: 'Newborn yawning in a knitted bear hat' },
  { src: u('photo-1493894473891-10fc1e5dbd22'), cat: 'maternity', alt: 'Mom-to-be making a heart over her bump' },
  { src: u('photo-1522771930-78848d9293e8'), cat: 'milestone', alt: 'Baby sitting up in a teddy-bear suit' },
  { src: u('photo-1535090467336-9501f96eef89'), cat: 'family', alt: 'New parents cradling their newborn' },
  { src: u('photo-1510154221590-ff63e90a136f'), cat: 'newborn', alt: 'Tiny newborn feet in a parent’s hand' },
  { src: u('photo-1617331140180-e8262094733a'), cat: 'milestone', alt: 'Smiling baby sitting on a fluffy rug' },
  { src: u('photo-1530047625168-4b29bfbbe1fc'), cat: 'family', alt: 'Mother kissing her baby' },
  { src: u('photo-1544126592-807ade215a0b'), cat: 'newborn', alt: 'Baby sleeping peacefully' },
  { src: u('photo-1566004100631-35d015d6a491'), cat: 'milestone', alt: 'Baby peeking out from under a blanket' },
  { src: u('photo-1491013516836-7db643ee125a'), cat: 'milestone', alt: 'Blue-eyed baby chewing a wooden toy' },
  { src: u('photo-1609220136736-443140cffec6'), cat: 'family', alt: 'Dad carrying his two little ones' },
];

export const FEATURES = [
  { icon: 'shield', title: 'Safety first', text: 'Specialized training in safe newborn handling — only the gentlest techniques and poses.', tint: 'var(--sky)' },
  { icon: 'sun', title: 'Cosy, warm studio', text: 'A comfortable, temperature-controlled environment designed for babies and expecting mothers.', tint: 'var(--peach)' },
  { icon: 'gift', title: 'Everything provided', text: 'From wardrobe to props, every detail is premium. Gowns, wraps and setups included.', tint: 'var(--lilac)' },
  { icon: 'heart', title: 'Made for your family', text: 'Every session is tailored to your style, colour preferences and family dynamic.', tint: 'var(--blush)' },
];

export const STEPS = [
  { n: '01', title: 'Say hello', text: 'Send an enquiry or WhatsApp us. We get back to you within 24 hours.' },
  { n: '02', title: 'Plan together', text: 'We understand your vision, pick a theme, colours and outfits for your little one.' },
  { n: '03', title: 'Shoot day', text: 'Relax in our warm studio — feeds, cuddles and breaks are all part of the plan.' },
  { n: '04', title: 'Your gallery', text: 'Hand-edited, high-resolution photos delivered to your private online gallery.' },
];

export const TESTIMONIALS = [
  { name: 'Priya Sharma', shoot: 'Maternity', text: 'The maternity shoot was absolutely magical. Tanya made me feel so comfortable and beautiful. The photos are stunning!' },
  { name: 'Rahul Verma', shoot: 'Newborn', text: 'Our newborn session was perfect. The team was so patient with our baby and captured the most precious moments.' },
  { name: 'Anjali Patel', shoot: 'Cake Smash', text: "Such a luxury experience! The studio setup for our daughter's cake smash was beautiful. Highly recommend BabySteps." },
  { name: 'Happy parents', shoot: 'Newborn', text: 'An incredibly professional team. The studio is perfectly equipped for newborns and they handled our baby with such care.' },
];

export const FAQS = [
  { q: 'When should we book a newborn session?', a: 'Newborn photos are best taken in the first 5–15 days, when babies are sleepy and curl up easily. We recommend booking during your second trimester and confirming the date once your baby arrives.' },
  { q: 'What is the best time for a maternity shoot?', a: 'Between 28 and 34 weeks — your bump is beautifully round and you are usually still comfortable moving around.' },
  { q: 'Do you provide outfits and props?', a: 'Yes. Maternity packages include gowns, and newborn and baby sessions include all props, wraps and themed setups. You are welcome to bring something personal too.' },
  { q: 'Is the studio safe for newborns?', a: 'Safety is our top priority. The studio is temperature-controlled and our team is trained in safe newborn handling. Composite poses are always done with a parent’s hand close by.' },
  { q: 'How do we receive our photos?', a: 'Your edited high-resolution photos are delivered as soft copies in a private online gallery. Albums and prints are available on selected packages.' },
  { q: 'Can you create a custom package?', a: 'Of course. Every family is unique — tell us what you have in mind and we will tailor a package to your needs and budget.' },
];

export const SHOOT_TYPES = ['Maternity', 'Newborn', 'Baby Milestone', 'Pre-Birthday', 'Cake Smash', 'Family', 'Not sure yet'];

export const sessionBySlug = (slug) => JOURNEY.find((j) => j.slug === slug);
export const sessionByKey = (key) => JOURNEY.find((j) => j.key === key);

// Instagram reels for the "Stories in motion" carousel. Covers live in public/images/reels/<id>.jpg.
export const REELS = [
  { id: 'DY3h0-sSLXL', tag: 'Podcast · Episode 01', title: 'When should you plan your newborn shoot?' },
  { id: 'DZIQSwENw-A', tag: 'Behind the scenes', title: 'Pure cuteness, one smile at a time' },
  { id: 'DabxMOPhell', tag: 'Family', title: 'Where love lives, memories begin' },
  { id: 'DY1JNzTyuBq', tag: 'Meet the team', title: 'Meet Tanya, co-founder of BabySteps' },
];

// Home page hero banner slides (editable in /admin → Hero banner).
export const HERO_SLIDES = [
  {
    kicker: 'Anything for your little one', title: 'Tiny Moments',
    text: 'Premium newborn, maternity & baby photography in Noida — gentle, safe and beautifully timeless.',
    cta: 'Book a Session', link: '/contact#book', cta2: 'View Packages', link2: '/services',
    img1: IMG.newborn, pos1: '50% 60%', label1: 'Newborn Sessions', sub1: 'from ₹5,999', href1: '/portfolio/newborn',
    img2: IMG.maternity, pos2: '50% 30%', label2: 'Maternity Shoots', sub2: 'from ₹4,999', href2: '/portfolio/maternity',
    badgeTop: 'Starting', badgeBig: '₹3,999', badgeBottom: 'only',
  },
  {
    kicker: 'Sits, crawls & first birthdays', title: 'Big Milestones',
    text: 'Themed setups for 3, 6 and 9 months, and joyful cake smash celebrations — we handle the set and the clean-up.',
    cta: 'Book a Milestone', link: '/contact?session=Baby%20Milestone#book', cta2: 'See Sessions', link2: '/portfolio/milestones',
    img1: IMG.milestone, pos1: '50% 40%', label1: 'Baby Milestones', sub1: '3 · 6 · 9 months', href1: '/portfolio/milestones',
    img2: IMG.cake, pos2: '50% 35%', label2: 'Cake Smash', sub2: 'first birthday', href2: '/portfolio/cake-smash',
    badgeTop: 'Custom', badgeBig: 'Sets', badgeBottom: 'every theme',
  },
  {
    kicker: 'Made for the whole family', title: 'Family Love',
    text: 'Pre-birthday shoots and timeless family portraits — perfect for invitations, wall art and heirlooms.',
    cta: 'Book a Family Shoot', link: '/contact?session=Family#book', cta2: 'Gift a Session', link2: '/services',
    img1: IMG.birthday, pos1: '50% 30%', label1: 'Pre-Birthday', sub1: 'indoor + outdoor', href1: '/portfolio/pre-birthday',
    img2: IMG.family, pos2: '50% 25%', label2: 'Family Portraits', sub2: 'siblings welcome', href2: '/portfolio/family',
    badgeTop: 'Gift', badgeBig: 'Cards', badgeBottom: 'available',
  },
];

// Blog posts (editable in /admin → Blog). `body` uses simple formatting:
// ## Heading · **bold** · *italic* · - list item · 1. numbered · > quote · [text](link) · ![alt](image-url)
export const BLOG_CATEGORIES = ['Newborn', 'Maternity', 'Milestones', 'Parenting', 'Studio'];
export const BLOG = [
  {
    slug: 'newborn-maternity-photoshoot-cost-noida',
    title: 'How much does a newborn or maternity photoshoot cost in Noida? (2026 price guide)',
    date: '2026-11-22',
    category: 'Parenting',
    author: 'Tanya & Sarthak',
    cover: IMG.milestone,
    excerpt: 'Real 2026 prices for newborn, maternity, baby milestone, cake smash and pre-birthday photoshoots at our Noida studio, and what each package includes.',
    tags: ['newborn', 'maternity', 'price', 'noida'],
    published: true,
    body: `**Short answer:** at BabySteps Guide Studio in Sector 37, Noida, a **newborn photoshoot starts at ₹5,999**, a **maternity photoshoot at ₹4,999**, and **baby milestone and family shoots at ₹3,999**. A **cake smash starts at ₹6,499** and a **pre-birthday shoot at ₹6,000**. Every package includes props or gowns, edited photos and a private online gallery.

Here is exactly what you get at each price, so you can compare studios with confidence.

## Newborn photoshoot prices in Noida
Best time: **5–15 days old**, when babies sleep deeply and curl up naturally.
- **Basic, ₹5,999:** 1-hour session, 1 studio setup with props, 20 edited images, 5 parent shots, 1 Instagram reel (60 seconds), online gallery.
- **Deluxe, ₹8,999:** 2-hour session, 2 setups, 35 edited images, 10 parent & sibling shots, lifestyle shots at home, 1 album (15 photos), downloadable gallery.
- **Ultimate, ₹30,000:** 4-hour session with premium setups, 60 edited images, home lifestyle session, luxury 12×16 album, 20×30 canvas print and birth announcement cards.

Add-ons: fresh flower setup (from ₹3,500), extra theme setup (₹1,500), premium reel (₹2,500).

## Maternity photoshoot prices in Noida
Best time: **28–34 weeks**.
- **Little Bloom, ₹4,999:** 45-minute shoot, 1 studio setup, 1 gown, 10–15 edited photos, 1 Instagram reel.
- **Motherhood, ₹6,999:** 90-minute shoot, 2 setups, 1 gown, mom-to-be + husband, 20 edited photos, 1 Instagram reel, 2 dress changes.
- **Motherhood Luxe, ₹14,999:** 2-hour shoot, 3 setups, 2 gowns, family portraits, 30 edited photos, 2 Instagram reels, priority editing.

Add-ons: fresh flower setup (₹5,000), extra gown (₹3,500), outdoor shoot (₹3,000), gender reveal reel (₹2,500).

## Baby milestone, cake smash & pre-birthday prices
For 3, 6 and 9-month milestones, first birthdays and family portraits.
- **Little Star, ₹3,999:** 1 setup, 30–45 minutes, 10 edited photos, family included.
- **Growing Joy, ₹6,999:** 2 themed setups, 1–1.5 hours, 20 edited photos, 1 cinematic reel.
- **Baby Luxury, ₹11,999:** 4–5 premium setups, 2–3 hours, 35–40 edited photos, 2 cinematic reels.
- **Pre-Birthday Special, ₹6,000:** indoor + outdoor shoot, 1.5 hours, 20 edited photos (about 30 delivered), 1 cinematic reel, optional cake smash setup.
- **Cake smash:** from **₹6,499** (Little Star + a custom cake smash set). The cake smash setup is ₹2,500–₹5,000 depending on the theme.

## What makes a photoshoot cost more (or less)?
- **Time and setups:** more setups mean more variety, and more time to keep a newborn settled between them.
- **Number of edited photos:** each image is individually retouched.
- **Albums and prints:** a printed album or canvas adds to the price but lasts for generations.
- **Studio vs home:** our Deluxe and Ultimate newborn packages add lifestyle shots at home.

## What's included in every package
- Gowns (maternity), or wraps, props and themed sets (newborn & baby)
- A warm, temperature-controlled studio and gentle, safe newborn posing
- Professionally edited high-resolution photos in a private online gallery

> Not sure which package fits? Tell us your budget and we'll suggest a custom package.

## Frequently asked questions
**Is a newborn photoshoot worth the cost?** The first two weeks pass quickly, and those sleepy, curled-up poses can't be recreated later. If budget is tight, a Basic newborn package now and a milestone session later still captures both stages.

**Are parents and siblings included?** Parent shots are included in the Basic newborn package, and the Deluxe package includes parent & sibling shots.

**Can we buy a photoshoot as a gift?** Yes, see our [gift cards](/gift-cards).

See every package on [Packages & prices](/services), or [book your session](/contact#book). We're in Sector 37, Noida, and families visit from Greater Noida, Delhi and Ghaziabad.`,
  },
  {
    slug: 'when-to-plan-your-newborn-shoot',
    title: 'When should you plan your newborn shoot?',
    date: '2026-11-02',
    category: 'Newborn',
    author: 'Tanya & Sarthak',
    cover: IMG.newborn,
    excerpt: 'The first two weeks pass in a blink. Here is when to book, when to shoot and how the day actually works — from our very first podcast episode.',
    tags: ['newborn', 'planning'],
    published: true,
    body: `The sleepy, curled-up newborn photos everyone loves are taken in the **first 5–15 days**. In those early days babies sleep deeply and settle easily into gentle, natural poses.

## Book in your second trimester
Newborn dates can't be fixed in advance, so we reserve a window around your due date. Get in touch during your **second trimester**, and send us a message once your little one arrives — we'll confirm the exact day.

## What happens on the day
- We warm the studio before you arrive, so your baby stays cosy.
- Feeds, cuddles and breaks are all part of the plan — there's no rush.
- Every wrap, prop and setup is ready; you just bring your baby (and a spare outfit for you!).

> Safety always comes first. Composite poses are created with a parent's hand close by, and we only use the gentlest techniques.

## Missed the window?
Don't worry — older babies make beautiful portraits too. Our [milestone sessions](/portfolio/milestones) at 3, 6 and 9 months capture all the new smiles and personality.

Ready to reserve your date? [Book a newborn session](/contact?session=Newborn#book).`,
  },
  {
    slug: 'preparing-for-your-maternity-shoot',
    title: 'Preparing for your maternity shoot',
    date: '2026-10-18',
    category: 'Maternity',
    author: 'Tanya',
    cover: IMG.maternity,
    excerpt: 'The best time to shoot, what to wear, and how to feel relaxed and beautiful in front of the camera.',
    tags: ['maternity', 'tips'],
    published: true,
    body: `A maternity session is a celebration of the beautiful anticipation of motherhood. A little planning helps you feel calm, comfortable and completely yourself.

## The best time
Between **28 and 34 weeks** your bump is beautifully round and you'll usually still feel comfortable moving between setups.

## What to wear
Our maternity packages include elegant **studio gowns**, so you don't need to shop for something special. If you'd like to bring a personal outfit too, soft fabrics and solid, neutral colours photograph beautifully.

## Bring your partner (and family)
Many of our favourite frames are the quiet moments between parents-to-be. Our *Motherhood* and *Motherhood Luxe* packages include your partner, and siblings are always welcome.

## A few small tips
- Drink water and have a light snack before you arrive.
- Wear loose clothing on the way, so there are no marks on your skin.
- Bring any meaningful extras — a scan photo, a letter board, baby shoes.

See all [maternity packages](/services?tab=maternity) or [book your session](/contact?session=Maternity#book).`,
  },
  {
    slug: 'cake-smash-first-birthday-guide',
    title: 'Cake smash: a joyful first-birthday guide',
    date: '2026-09-27',
    category: 'Milestones',
    author: 'Sarthak',
    cover: IMG.cake,
    excerpt: 'Messy, happy and over far too quickly — how to plan a cake smash session your family will treasure.',
    tags: ['cake smash', 'first birthday'],
    published: true,
    body: `A cake smash is pure joy: the first taste of cake, the giggles, the glorious mess. Here's how to make the most of it.

## Pick a theme you love
We design a **custom set** for every cake smash — balloons, florals, soft pastels or your favourite colours. Share a few ideas and we'll bring them to life.

## Start with portraits
Before the cake arrives we take a few clean, smiling **pre-smash portraits** (and family photos, if you like) — perfect for invitations and frames.

## Then let them explore
Some babies dive straight in; others need a little encouragement. Both make wonderful photos. We go at your little one's pace.

## We handle the clean-up
Bring a change of clothes for afterwards — we take care of the rest.

> Tip: plan the session for a time of day when your baby is usually well rested and happy.

Explore our [baby & milestone packages](/services?tab=baby) or [book a cake smash](/contact?session=Cake%20Smash#book).`,
  },
];
