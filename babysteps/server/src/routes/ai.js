/**
 * AI blog drafting (mounted at /api/admin/ai behind requireAdmin).
 * Uses Claude via the official Anthropic SDK. Needs ANTHROPIC_API_KEY in the environment.
 * Returns a draft only — the studio reviews and publishes it in the blog editor.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { Setting } from '../models.js';

const router = Router();
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'AI limit reached for this hour — try again later.' } });
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const CATEGORIES = ['Newborn', 'Maternity', 'Milestones', 'Parenting', 'Studio'];

let client = null;
const getClient = () => (client ||= new Anthropic()); // reads ANTHROPIC_API_KEY

// Structured output: the response is guaranteed to match this schema.
const POST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'excerpt', 'category', 'tags', 'body'],
  properties: {
    title: { type: 'string', description: 'Warm, specific headline, under 70 characters' },
    excerpt: { type: 'string', description: 'One or two sentences for the blog card and preview, under 200 characters' },
    category: { type: 'string', enum: CATEGORIES },
    tags: { type: 'array', items: { type: 'string' }, description: '3 to 5 short lowercase tags' },
    body: { type: 'string', description: 'The article in the simple formatting described in the instructions' },
  },
};

const SYSTEM = `You write blog posts for BabySteps Guide Studio, a boutique maternity, newborn and baby photography studio in Noida, India, run by Tanya and Sarthak Chopra (a sub-brand of Guide Photo Studio).

Audience: expecting and new parents in Noida / Delhi NCR, often planning their first shoot. Voice: warm, calm, reassuring and practical — like a friendly photographer explaining things over chai. Use Indian English and ₹ for money.

Write genuinely helpful advice. Only state studio-specific facts that appear in the studio details provided; never invent prices, policies, awards, statistics, client names or testimonials. When unsure about a studio detail, keep the advice general.

Formatting for "body" (this is the only formatting the site understands):
- Paragraphs separated by a blank line.
- "## " for section headings (3–5 sections), "### " for sub-headings if needed.
- **bold** and *italic* sparingly; "- " bullet lists; "1. " numbered lists; "> " for one helpful tip or quote.
- Links as [text](/path). Useful site paths: /portfolio/newborn, /portfolio/maternity, /portfolio/milestones, /portfolio/cake-smash, /portfolio/family, /services, /gift-cards, /contact#book.
- No title or H1 inside the body (the title is separate), no images, no HTML.
- End with a short, gentle invitation to book or ask a question, linking to /contact#book.`;

function studioFacts(content) {
  const s = content?.studio || {};
  const sessions = (content?.sessions || []).map((x) => `${x.title} (best time: ${x.when}; from ₹${x.from})`).join('; ');
  return [
    `Studio: ${s.name || 'BabySteps Guide Studio'}, ${s.address || 'Sector 37, Noida'}`,
    sessions && `Sessions: ${sessions}`,
    'Gowns, wraps and props are provided; the studio is temperature-controlled; safe newborn handling is the top priority; edited photos are delivered in a private online gallery.',
  ].filter(Boolean).join('\n');
}

router.post('/blog', aiLimiter, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI writing is not set up yet: add ANTHROPIC_API_KEY to the server environment.' });
  }
  const topic = String(req.body?.topic || '').trim().slice(0, 300);
  if (topic.length < 4) return res.status(400).json({ error: 'Describe the topic in a few words.' });
  const length = ['short', 'medium', 'long'].includes(req.body?.length) ? req.body.length : 'medium';
  const words = { short: '400–600', medium: '700–1000', long: '1200–1600' }[length];
  const notes = String(req.body?.notes || '').trim().slice(0, 1000);
  const doc = await Setting.findOne({ key: 'babysteps' }).lean();

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Server-side fallback: if Claude Opus 5.5's safety classifiers decline, Anthropic re-runs the request on its
      // recommended fallback model in the same call. Harmless for normal requests.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: POST_SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Studio details (the only studio facts you may state):\n${studioFacts(doc?.data)}\n\nWrite a ${words} word blog post about: ${topic}${notes ? `\n\nExtra notes from the studio: ${notes}` : ''}`,
      }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'The AI couldn’t write about this topic. Try rephrasing it.' });
    }
    if (response.stop_reason === 'max_tokens') {
      return res.status(502).json({ error: 'The draft came out too long. Try the "short" or "medium" length.' });
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const post = JSON.parse(text);
    post.tags = (post.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 6);
    res.json({ post, model: response.model });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'The ANTHROPIC_API_KEY on the server is invalid.' });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'The AI service is busy — please try again in a minute.' });
    if (err instanceof Anthropic.BadRequestError) { console.error('AI bad request:', err.message); return res.status(502).json({ error: 'The AI request was rejected. Please try again.' }); }
    if (err instanceof Anthropic.APIConnectionError) return res.status(502).json({ error: 'Could not reach the AI service. Check the server’s internet connection.' });
    if (err instanceof Anthropic.APIError) { console.error('AI error:', err.status, err.message); return res.status(502).json({ error: 'The AI service had a problem. Please try again.' }); }
    if (err instanceof SyntaxError) return res.status(502).json({ error: 'The AI returned an unexpected format. Please try again.' });
    throw err;
  }
});

export default router;
