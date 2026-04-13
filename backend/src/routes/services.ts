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

    // In a real implementation, trigger the AI service here
    res.json({ success: true, jobId: `job_${Date.now()}`, status: 'queued' });
  } catch (err) {
    next(err);
  }
});
