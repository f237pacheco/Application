import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/requireAuth';

export const servicesRouter = Router();

const SERVICE_LIMITS: Record<string, Record<string, number>> = {
  starter_individual: {},
  starter_professional: {},
  pro_individual: { default: 30 },
  pro_professional: { default: 30 },
  enterprise: { default: Infinity },
};

const STARTER_LIMIT = 5;

// GET /api/services/usage — get current month usage
servicesRouter.get('/usage', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('service_usage')
      .select('service_type, count')
      .eq('user_id', req.userId)
      .gte('created_at', startOfMonth);

    if (error) throw error;

    // Aggregate by service type
    const usage: Record<string, number> = {};
    data?.forEach((row) => {
      usage[row.service_type] = (usage[row.service_type] ?? 0) + row.count;
    });

    res.json({ usage, period: { start: startOfMonth, end: now.toISOString() } });
  } catch (err) {
    next(err);
  }
});

const generateSchema = z.object({
  serviceType: z.enum(['website', 'voice_agent', 'video_editing', 'appointments', 'social_media', 'analytics']),
  prompt: z.string().min(10).max(2000),
});

// POST /api/services/generate — log a service generation
servicesRouter.post('/generate', async (req: AuthRequest, res, next) => {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { serviceType, prompt } = parsed.data;

    // Check subscription and usage limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_key, status')
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      res.status(403).json({ error: 'No active subscription' });
      return;
    }

    if (subscription.plan_key !== 'enterprise') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const limit = subscription.plan_key.startsWith('starter') ? STARTER_LIMIT : 30;

      const { count } = await supabase
        .from('service_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('service_type', serviceType)
        .gte('created_at', startOfMonth);

      if ((count ?? 0) >= limit) {
        res.status(429).json({ error: 'Monthly limit reached', limit, used: count });
        return;
      }
    }

    // Log usage
    const { error } = await supabase.from('service_usage').insert({
      user_id: req.userId,
      service_type: serviceType,
      prompt,
      count: 1,
    });

    if (error) throw error;

    // Also log to service_orders (history)
    await supabase.from('service_orders').insert({
      user_id: req.userId,
      service_type: serviceType,
      prompt,
      status: 'queued',
    });

    res.json({ success: true, jobId: `job_${Date.now()}`, status: 'queued' });
  } catch (err) {
    next(err);
  }
});

// GET /api/services/history — paginated history of orders
servicesRouter.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('service_orders')
      .select('id, service_type, prompt, status, result_url, created_at, completed_at', {
        count: 'exact',
      })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/services/usage/summary — usage per service for current month + limits
servicesRouter.get('/usage/summary', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_key, status')
      .eq('user_id', req.userId)
      .in('status', ['trialing', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get usage grouped by service
    const { data: usageRows } = await supabase
      .from('service_usage')
      .select('service_type, count')
      .eq('user_id', req.userId)
      .gte('created_at', startOfMonth);

    const usage: Record<string, number> = {};
    usageRows?.forEach((row) => {
      usage[row.service_type] = (usage[row.service_type] ?? 0) + row.count;
    });

    // Determine limits from plan
    let limit: number | null = null;
    if (subscription) {
      if (subscription.plan_key === 'enterprise') {
        limit = null; // unlimited
      } else if (subscription.plan_key.startsWith('pro')) {
        limit = 30;
      } else {
        limit = 5;
      }
    }

    res.json({
      usage,
      limit,
      planKey: subscription?.plan_key ?? null,
      periodStart: startOfMonth,
    });
  } catch (err) {
    next(err);
  }
});
