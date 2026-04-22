import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

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

// GET /api/partner/stats — partner programme statistics for current user
partnerRouter.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    // Submissions breakdown
    const { data: submissions } = await supabase
      .from('partner_submissions')
      .select('status')
      .eq('user_id', req.userId);

    const totalSubmissions = submissions?.length ?? 0;
    const approvedSubmissions = submissions?.filter((s) => s.status === 'approved').length ?? 0;
    const pendingSubmissions = submissions?.filter((s) => s.status === 'pending').length ?? 0;
    const rejectedSubmissions = submissions?.filter((s) => s.status === 'rejected').length ?? 0;

    // Promo code uses
    const { count: promoUses } = await supabase
      .from('promo_code_uses')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_user_id', req.userId);

    res.json({
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions,
      promoUses: promoUses ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/validate-promo?code=XXX — check if a promo code is valid
partnerRouter.get('/validate-promo', async (req: AuthRequest, res, next) => {
  try {
    const code = (req.query.code as string)?.toUpperCase().trim();
    if (!code) {
      res.status(400).json({ error: 'Missing code' });
      return;
    }

    // Master bypass code — grants free Enterprise, no payment required
    if (code === 'VELONA237') {
      res.json({ valid: true, isMasterCode: true, referrerName: 'Velona' });
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, first_name')
      .eq('promo_code', code)
      .single();

    if (!data) {
      res.status(404).json({ valid: false, error: 'Code introuvable' });
      return;
    }

    // Can't use own promo code
    if (data.id === req.userId) {
      res.status(400).json({ valid: false, error: 'Vous ne pouvez pas utiliser votre propre code' });
      return;
    }

    res.json({ valid: true, isMasterCode: false, referrerName: data.first_name });
  } catch (err) {
    next(err);
  }
});

// ─── Admin endpoints ───────────────────────────────────────────────────────

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reward_type: z.enum(['free_month', 'plan_upgrade']).optional(),
});

// PATCH /api/partner/admin/submissions/:id — approve or reject a submission
partnerRouter.patch('/admin/submissions/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { status, reward_type } = parsed.data;
    const submissionId = req.params.id;

    // Get submission + user info
    const { data: submission, error: fetchErr } = await supabase
      .from('partner_submissions')
      .select('id, user_id, status, reward_type')
      .eq('id', submissionId)
      .single();

    if (fetchErr || !submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.status !== 'pending') {
      res.status(409).json({ error: 'Submission already reviewed' });
      return;
    }

    const effectiveRewardType = reward_type ?? submission.reward_type ?? 'free_month';

    // Update submission status
    const { error: updateErr } = await supabase
      .from('partner_submissions')
      .update({ status, reward_type: effectiveRewardType, reviewed_at: new Date().toISOString() })
      .eq('id', submissionId);

    if (updateErr) throw updateErr;

    // Apply reward on approval
    if (status === 'approved') {
      if (effectiveRewardType === 'free_month') {
        // Extend subscription by 30 days
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, current_period_end')
          .eq('user_id', submission.user_id)
          .in('status', ['trialing', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sub) {
          const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
          base.setDate(base.getDate() + 30);
          await supabase
            .from('subscriptions')
            .update({ current_period_end: base.toISOString() })
            .eq('id', sub.id);
        }
      } else if (effectiveRewardType === 'plan_upgrade') {
        // Upgrade starter plan to pro equivalent
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, plan_key')
          .eq('user_id', submission.user_id)
          .in('status', ['trialing', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sub?.plan_key?.startsWith('starter')) {
          const upgraded = sub.plan_key.replace('starter', 'pro');
          await supabase
            .from('subscriptions')
            .update({ plan_key: upgraded })
            .eq('id', sub.id);
        }
      }
    }

    res.json({ success: true, status, reward_type: effectiveRewardType });
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/admin/submissions — list all pending submissions
partnerRouter.get('/admin/submissions', requireAdmin, async (req, res, next) => {
  try {
    const statusFilter = (req.query.status as string) ?? 'pending';

    const { data, error } = await supabase
      .from('partner_submissions')
      .select('id, user_id, url, status, reward_type, created_at, reviewed_at')
      .eq('status', statusFilter)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    next(err);
  }
});
