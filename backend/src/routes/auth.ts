import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';

export const authRouter = Router();

const profileSchema = z.object({
  firstName: z.string().min(1).max(50),
  accountType: z.enum(['individual', 'professional']),
  companyName: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
});

// POST /api/auth/profile — save user profile after Google OAuth
authRouter.post('/profile', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { firstName, accountType, companyName, sector } = parsed.data;

    // Generate unique promo code
    const promoCode = `VELONA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await supabase.from('profiles').upsert({
      id: req.userId,
      email: req.userEmail,
      first_name: firstName,
      account_type: accountType,
      company_name: companyName ?? null,
      sector: sector ?? null,
      promo_code: promoCode,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    res.json({ success: true, promoCode });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/profile — get current user profile
authRouter.get('/profile', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
