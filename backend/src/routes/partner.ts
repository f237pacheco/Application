import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/requireAuth';

export const partnerRouter = Router();

const submitSchema = z.object({
  url: z.string().url().max(500),
});

// POST /api/partner/submit — submit a social media link
partnerRouter.post('/submit', async (req: AuthRequest, res, next) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    const { url } = parsed.data;

    // Check for duplicate submissions
    const { data: existing } = await supabase
      .from('partner_submissions')
      .select('id')
      .eq('user_id', req.userId)
      .eq('url', url)
      .single();

    if (existing) {
      res.status(409).json({ error: 'URL already submitted' });
      return;
    }

    const { error } = await supabase.from('partner_submissions').insert({
      user_id: req.userId,
      url,
      status: 'pending',
      reward_type: 'free_month',
    });

    if (error) throw error;

    res.json({ success: true, message: 'Submission received, pending review' });
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/submissions — get user's submissions
partnerRouter.get('/submissions', async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('partner_submissions')
      .select('id, url, status, reward_type, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/promo-code — get user's promo code
partnerRouter.get('/promo-code', async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('promo_code')
      .eq('id', req.userId)
      .single();

    if (error) throw error;
    res.json({ promoCode: data.promo_code });
  } catch (err) {
    next(err);
  }
});
