import { Link } from 'react-router-dom';
import { STUDIO } from '../data.js';
import { PageHero, useSeo, useReveal, waLink } from '../lib.jsx';

const UPDATED = '15 November 2026';

const SECTIONS = [
  ['collect', 'Information we collect', (
    <>
      <p>We only ask for what we need to plan your session and deliver your photographs.</p>
      <ul>
        <li><b>Booking &amp; enquiry form</b> — your name, phone number, email (optional), the session and package you're interested in, your baby's age or due date, your preferred date, any gift-card code and the message you write to us.</li>
        <li><b>Phone, WhatsApp, email &amp; Instagram</b> — whatever you share with us when you get in touch through these channels.</li>
        <li><b>Client galleries</b> — your name, phone, email and session date, the photographs and films from your shoot, and the favourites, notes and album selections you make in your gallery.</li>
        <li><b>Gift cards</b> — the names, phone numbers and emails of the person buying the gift card and the person receiving it, and a reference to the payment if you pay online.</li>
        <li><b>Technical data</b> — like most websites, our server keeps basic logs (such as IP address, browser type and the pages requested) to keep the site secure and working.</li>
      </ul>
    </>
  )],
  ['use', 'How we use it', (
    <ul>
      <li>To reply to your enquiry, check availability and confirm your booking.</li>
      <li>To plan your session — outfits, props, timing and any safety needs for your little one.</li>
      <li>To deliver your photographs and films through your private online gallery.</li>
      <li>To issue and redeem gift cards.</li>
      <li>To send you important updates about your booking or gallery. We don't send marketing messages without your permission.</li>
    </ul>
  )],
  ['photos', 'Your photographs', (
    <>
      <p>Your photographs belong to your family's story, and we treat them with care — especially images of newborns and children.</p>
      <ul>
        <li>Your gallery is private and protected by a password that only you receive.</li>
        <li>We will only use images from your session in our portfolio, on this website or on social media <b>with your consent</b>. You can say no, or change your mind later, and we'll take them down.</li>
        <li>We never sell your photographs or let anyone else use them for advertising.</li>
      </ul>
    </>
  )],
  ['share', 'Who we share it with', (
    <>
      <p>We do not sell or rent your personal information. We share it only with services that help us run the studio, and only as much as they need:</p>
      <ul>
        <li><b>Hosting &amp; database providers</b> that store this website and its data.</li>
        <li><b>Email services</b> that deliver enquiry notifications to our team.</li>
        <li><b>Google Drive and YouTube</b>, where some gallery photos and films may be stored or streamed. Films are embedded in privacy-enhanced mode.</li>
        <li><b>Razorpay</b>, our payment partner, when you buy a gift card online. Your card, UPI or bank details are entered directly with Razorpay — we never see or store them.</li>
        <li><b>WhatsApp (Meta)</b>, if you choose to chat with us there.</li>
        <li>Our parent studio, <b>{STUDIO.parent}</b>, which powers BabySteps.</li>
      </ul>
      <p>We may also share information if the law requires it.</p>
    </>
  )],
  ['cookies', 'Cookies & browser storage', (
    <p>
      We don't use advertising or tracking cookies. When you log in to your client gallery, a secure access key is
      saved in your browser so you stay signed in. You can remove it at any time by clearing your browser's site data.
    </p>
  )],
  ['security', 'How we keep it safe', (
    <p>
      Gallery passwords are stored in encrypted (hashed) form, never as plain text. Access to client data is limited to
      our team, and we use secure connections and rate limits to protect the site. No system is perfect, but we take
      reasonable care to protect your information.
    </p>
  )],
  ['retention', 'How long we keep it', (
    <p>
      We keep enquiries and booking details for as long as we need them to serve you and meet our accounting and legal
      obligations. Client galleries stay online for the access period agreed with you; after that we may archive or
      delete them. Ask us any time if you'd like your data deleted sooner.
    </p>
  )],
  ['rights', 'Your choices & rights', (
    <>
      <p>Under India's Digital Personal Data Protection Act, 2023, you can ask us to:</p>
      <ul>
        <li>tell you what personal information we hold about you;</li>
        <li>correct or update it;</li>
        <li>delete it, or withdraw consent you've given (for example, for portfolio use of your photos).</li>
      </ul>
      <p>Just contact us using the details below. We'll respond as quickly as we can.</p>
    </>
  )],
  ['children', "Children's information", (
    <p>
      Our work is with babies and young children, so we only collect information about a child from their parent or
      guardian, and only to plan and deliver the session. Our website is meant for parents and adults, not for children
      to use on their own.
    </p>
  )],
  ['changes', 'Changes to this policy', (
    <p>
      We may update this policy from time to time. The latest version will always be on this page, with the date it was
      last updated at the top.
    </p>
  )],
];

export default function Privacy() {
  useSeo('privacy');
  useReveal();
  return (
    <>
      <PageHero
        crumb={[[null, 'Privacy Policy']]}
        title={<>Privacy <em>policy</em></>}
        intro={`How ${STUDIO.name} looks after your personal information and your family's photographs.`}
      />

      <section className="wrap legal">
        <aside className="legal-toc" aria-label="On this page">
          <p className="legal-updated">Last updated · {UPDATED}</p>
          <ol>
            {SECTIONS.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
            <li><a href="#contact">Contact us</a></li>
          </ol>
        </aside>

        <div className="legal-body md">
          <p className="legal-lead">
            At {STUDIO.name} (“BabySteps”, “we”, “us”), powered by {STUDIO.parent}, we photograph some of the most
            personal moments in a family's life. This policy explains, in plain words, what information we collect
            through this website and our services, why we collect it, and how we keep it safe.
          </p>

          {SECTIONS.map(([id, title, body], i) => (
            <section key={id} id={id} className="legal-sec" data-reveal>
              <h2><span>{String(i + 1).padStart(2, '0')}</span>{title}</h2>
              {body}
            </section>
          ))}

          <section id="contact" className="legal-sec legal-contact" data-reveal>
            <h2><span>{String(SECTIONS.length + 1).padStart(2, '0')}</span>Contact us</h2>
            <p>Questions about this policy or your information? We're happy to help.</p>
            <ul>
              <li><b>Email:</b> <a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a></li>
              <li><b>Phone:</b> <a href={STUDIO.phoneHref}>{STUDIO.phone}</a></li>
              <li><b>WhatsApp:</b> <a href={waLink('Hi BabySteps! I have a question about your privacy policy.')} target="_blank" rel="noreferrer">Chat with us</a></li>
              <li><b>Studio:</b> {STUDIO.address}</li>
            </ul>
            <p><Link className="btn btn-dark" to="/contact">Get in touch</Link></p>
          </section>
        </div>
      </section>
    </>
  );
}
