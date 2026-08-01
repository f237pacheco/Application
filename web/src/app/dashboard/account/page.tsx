'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUsage } from '@/hooks/useUsage';
import { locales, localeNames, localeFlags, isRtl, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';
import { cropSquareImage, extensionForMimeType } from '@/lib/image';

/* ── Constants ──────────────────────────────────────────────────────────────── */

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter_individual:   { label: 'Starter',    color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  starter_professional: { label: 'Starter Pro', color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  pro_individual:       { label: 'Pro',         color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  pro_professional:     { label: 'Pro',         color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  enterprise:           { label: 'Enterprise',  color: '#a78bfa', bg: 'rgba(108,92,231,0.15)', border: 'rgba(108,92,231,0.35)' },
};

const FREE_PLAN = { label: 'Compte gratuit', color: '#6b7280', bg: 'rgba(75,85,99,0.15)', border: 'rgba(75,85,99,0.25)' };

const AVATAR_COLORS = ['#6C5CE7', '#4834d4', '#e91e8c', '#f97316', '#00b894', '#0984e3'] as const;

const BIO_MAX_LENGTH = 1000;
const MAX_GALLERY_PHOTOS = 10;
const ACCEPTED_GALLERY_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_GALLERY_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — cropped/re-encoded to 640x640 before upload anyway

interface AccountPhoto {
  id: string;
  url: string;
  path: string;
  position: number;
}

interface UploadingPhoto {
  id: string;
  name: string;
  progress: number;
}

const NOTIF_OPTIONS = [
  { key: 'creation_done' as const,       label: 'Création terminée',         desc: 'Notifié quand une génération est prête' },
  { key: 'subscription_ending' as const, label: 'Abonnement bientôt fini',   desc: 'Rappel avant expiration de votre plan' },
  { key: 'product_news' as const,        label: 'Actualités produit',         desc: 'Nouvelles fonctionnalités et mises à jour' },
  { key: 'exclusive_offers' as const,    label: 'Offres exclusives',          desc: 'Promotions réservées aux membres' },
  { key: 'push_mobile' as const,         label: 'Push mobile',                desc: 'Alertes directement sur votre téléphone', isMobile: true },
] as const;

type NotifPrefs = Record<typeof NOTIF_OPTIONS[number]['key'], boolean>;

const DAY_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1300, enabled = true) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!enabled || target === 0) { setCurrent(0); return; }
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setCurrent(Math.round((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, enabled]);
  return current;
}

/* ── Toggle component ───────────────────────────────────────────────────────── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full shrink-0"
      style={{ background: checked ? '#6366F1' : 'rgba(75,85,99,0.5)', transition: 'background 0.2s' }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

/* ── Auto-growing textarea ──────────────────────────────────────────────────── */

function AutoTextarea({
  value, onChange, placeholder, minRows = 3, className = '', style,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => { resize(); }, [value]);
  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onInput={resize}
      placeholder={placeholder}
      rows={minRows}
      className={`resize-none overflow-hidden transition-[height] duration-150 ease-out ${className}`}
      style={style}
    />
  );
}

/* ── Card wrapper ────────────────────────────────────────────────────────────── */

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`relative rounded-2xl p-6 sm:p-8 ${className}`}
      style={{ background: '#18181B', border: '1px solid #27272A' }}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactElement }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
          {icon}
        </div>
      )}
      <h2 className="text-base font-bold text-white">{children}</h2>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.35), transparent)' }} />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

interface SubscriptionRow {
  plan_key: string;
  billing: string;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
}

export default function AccountPage() {
  const { session, signOut, user } = useAuth();
  const { profile, loading } = useProfile();
  const { data: usage } = useUsage();

  const [billingLoading, setBillingLoading] = useState(false);
  const [avatarColor, setAvatarColor] = useState<string>('#6C5CE7');
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    creation_done: true, subscription_ending: true,
    product_news: false, exclusive_offers: false, push_mobile: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [currentLang, setCurrentLang] = useState<Locale>('fr');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [bioError, setBioError] = useState(false);
  const bioDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [photos, setPhotos] = useState<AccountPhoto[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<UploadingPhoto[]>([]);
  const [galleryError, setGalleryError] = useState('');
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  /* Derived data */
  const activePlanKey = subscription?.plan_key ?? profile?.plan_key ?? null;
  const planInfo = PLAN_LABELS[activePlanKey as string] ?? FREE_PLAN;
  const hasPlan = !!(activePlanKey && subscription);

  const renewalDate = subscription?.current_period_end
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(subscription.current_period_end))
    : null;

  const billingLabel = subscription?.billing === 'annual' ? 'Annuel' : 'Mensuel';

  const statusLabel: Record<string, string> = {
    active: 'Actif',
    trialing: 'Essai gratuit',
    past_due: 'Paiement en retard',
    canceled: 'Annulé',
  };
  const subStatusLabel = subscription ? (statusLabel[subscription.status] ?? subscription.status) : null;

  const totalCreations = usage ? Object.values(usage.usage).reduce((a, b) => a + b, 0) : 0;
  const hoursSaved = totalCreations * 2;
  const daysActive = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)
    : 0;

  const countCreations = useCountUp(totalCreations, 1200, !loading);
  const countHours     = useCountUp(hoursSaved, 1100, !loading);
  const countDays      = useCountUp(daysActive, 1000, !loading);

  useEffect(() => {
    setCurrentLang((i18n.language?.slice(0, 2) ?? 'fr') as Locale);
  }, []);

  const last7Days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: DAY_ABBR[d.getDay()], value: 0 };
    });
  }, []);

  /* Load notification prefs */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_preferences').select('notifications').eq('user_id', user.id).single();
      if (data?.notifications) setNotifPrefs(data.notifications as NotifPrefs);
    };
    load();
  }, [user?.id]);

  /* Load subscription data */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_key, billing, status, current_period_end, trial_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setSubscription(data as SubscriptionRow);
    };
    load();
  }, [user?.id]);

  /* Load bio */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('profiles').select('bio').eq('id', user.id).maybeSingle();
      if (error) { console.error('[account] échec du chargement de la bio', error); return; }
      if (data?.bio) setBio(data.bio);
    };
    load();
  }, [user?.id]);

  /* Load gallery photos */
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('account_photos')
        .select('id, url, path, position')
        .eq('user_id', user.id)
        .order('position', { ascending: true });
      if (error) { console.error('[account] échec du chargement de la galerie', error); setPhotosLoaded(true); return; }
      setPhotos((data ?? []) as AccountPhoto[]);
      setPhotosLoaded(true);
    };
    load();
  }, [user?.id]);

  const getInitial = () => {
    const name = (user?.user_metadata?.full_name as string) || profile?.first_name || user?.email || '?';
    return name.charAt(0).toUpperCase();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── Bio: debounced auto-save to profiles.bio ─────────────────────────── */
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value.slice(0, BIO_MAX_LENGTH);
    setBio(next);
    setBioSaved(false);
    setBioError(false);
    if (!user?.id) return;
    clearTimeout(bioDebounce.current);
    bioDebounce.current = setTimeout(async () => {
      setBioSaving(true);
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ bio: next }).eq('id', user.id);
      setBioSaving(false);
      if (error) {
        console.error('[account] échec de la sauvegarde de la bio', error);
        setBioError(true);
      } else {
        setBioSaved(true);
        setTimeout(() => setBioSaved(false), 2000);
      }
    }, 600);
  };

  /* ── Gallery: upload (crop to square, compress, store, insert row) ──────── */
  const uploadOnePhoto = async (file: File, position: number) => {
    if (!user?.id) return;
    if (!ACCEPTED_GALLERY_TYPES.includes(file.type)) {
      setGalleryError(`Format non accepté pour "${file.name}" — seuls JPG, PNG et WebP sont acceptés.`);
      return;
    }
    if (file.size > MAX_GALLERY_FILE_SIZE) {
      setGalleryError(`"${file.name}" est trop lourd (50 Mo maximum).`);
      return;
    }

    const uploadId = crypto.randomUUID();
    // Guarded (rather than a bare `[...prev, x]` append) because React 18
    // Strict Mode double-invokes functional state updaters in dev — an
    // append that isn't idempotent under that re-invocation silently
    // double-inserts the same item every time this runs under `next dev`.
    setUploadingPhotos((prev) => (prev.some((u) => u.id === uploadId) ? prev : [...prev, { id: uploadId, name: file.name, progress: 8 }]));
    const setProgress = (progress: number) =>
      setUploadingPhotos((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress } : u)));

    try {
      const cropped = await cropSquareImage(file, 640, 0.9);
      setProgress(45);

      const ext = extensionForMimeType(cropped.type || file.type);
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from('account-gallery')
        .upload(path, cropped, { contentType: cropped.type || file.type });
      if (uploadError) throw uploadError;
      setProgress(80);

      const { data: publicUrlData } = supabase.storage.from('account-gallery').getPublicUrl(path);
      const { data: row, error: insertError } = await supabase
        .from('account_photos')
        .insert({ user_id: user.id, url: publicUrlData.publicUrl, path, position })
        .select('id, url, path, position')
        .single();
      if (insertError) throw insertError;

      setProgress(100);
      const created = row as AccountPhoto;
      setPhotos((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
      setTimeout(() => setUploadingPhotos((prev) => prev.filter((u) => u.id !== uploadId)), 450);
    } catch (err) {
      console.error('[account] échec de l\'envoi de la photo', err);
      const message = (err as { message?: string })?.message;
      setGalleryError(`Échec de l'envoi de "${file.name}"${message ? ` (${message})` : ''}.`);
      setUploadingPhotos((prev) => prev.filter((u) => u.id !== uploadId));
    }
  };

  const handleGalleryFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length || !user?.id) return;
    setGalleryError('');

    const currentTotal = photos.length + uploadingPhotos.length;
    const remaining = MAX_GALLERY_PHOTOS - currentTotal;
    if (remaining <= 0) {
      setGalleryError(`Vous avez déjà ${MAX_GALLERY_PHOTOS} photos — supprimez-en une pour en ajouter une nouvelle.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    if (fileList.length > remaining) {
      setGalleryError(`Seules ${remaining} photo${remaining > 1 ? 's' : ''} supplémentaire${remaining > 1 ? 's' : ''} peuvent être ajoutées (maximum ${MAX_GALLERY_PHOTOS}).`);
    }

    let nextPosition = photos.length ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
    for (const file of files) {
      await uploadOnePhoto(file, nextPosition);
      nextPosition += 1;
    }
  };

  const handleDeletePhoto = async (photo: AccountPhoto) => {
    if (!user?.id) return;
    setDeletingPhotoId(photo.id);
    setGalleryError('');
    const supabase = createClient();
    const [{ error: storageError }, { error: dbError }] = await Promise.all([
      supabase.storage.from('account-gallery').remove([photo.path]),
      supabase.from('account_photos').delete().eq('id', photo.id),
    ]);
    setDeletingPhotoId(null);
    if (storageError || dbError) {
      console.error('[account] échec de la suppression de la photo', storageError || dbError);
      setGalleryError('Échec de la suppression de la photo — réessayez.');
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleMovePhoto = async (index: number, direction: -1 | 1) => {
    if (!user?.id) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const reordered = [...photos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const withPositions = reordered.map((p, i) => ({ ...p, position: i }));
    setPhotos(withPositions);

    const a = withPositions[index];
    const b = withPositions[targetIndex];
    const supabase = createClient();
    const [{ error: errA }, { error: errB }] = await Promise.all([
      supabase.from('account_photos').update({ position: a.position }).eq('id', a.id),
      supabase.from('account_photos').update({ position: b.position }).eq('id', b.id),
    ]);
    if (errA || errB) console.error('[account] échec de l\'enregistrement du nouvel ordre', errA || errB);
  };

  const handleBillingPortal = async () => {
    try {
      setBillingLoading(true);
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/account` }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch { /* silent */ }
    finally { setBillingLoading(false); }
  };

  const handleNotifChange = async (key: typeof NOTIF_OPTIONS[number]['key'], value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try {
      const supabase = createClient();
      await supabase.from('user_preferences').upsert(
        { user_id: user?.id, notifications: updated },
        { onConflict: 'user_id' }
      );
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch { /* silent */ }
  };

  const handleLanguageChange = async (locale: Locale) => {
    await i18n.changeLanguage(locale);
    localStorage.setItem('velona_language', locale);
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl shimmer" style={{ background: '#18181B', border: '1px solid #27272A' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="page-beam" />
      <div className="flex flex-col gap-6">

        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
          <h1 className="text-4xl font-bold text-white">Mon compte</h1>
          <p className="text-sm text-gray-500 mt-1.5">Gérez votre profil, abonnement et préférences</p>
        </motion.div>

        {/* ── PROFILE ─────────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          }>Profil</SectionTitle>

          <div className="flex flex-col sm:flex-row items-start gap-8">
            {/* Avatar column */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`, boxShadow: `0 0 28px ${avatarColor}55` }}
                >
                  {avatarPhoto ? (
                    <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover" />
                  ) : (profile?.first_name || user?.user_metadata?.full_name || user?.email) ? (
                    <span>{getInitial()}</span>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="15" r="8" fill="rgba(255,255,255,0.7)" />
                      <path d="M4 36c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                {avatarPhoto && (
                  <button
                    onClick={() => setAvatarPhoto(null)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center z-10"
                    style={{ background: '#ef4444', border: '2px solid rgba(15,12,36,1)' }}
                  >
                    <span className="text-white text-xs font-bold leading-none">×</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Choisir une photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

              {/* Color picker */}
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className="w-5 h-5 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      outline: avatarColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      transform: avatarColor === c ? 'scale(1.25)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Info column */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {(user?.user_metadata?.full_name as string) || profile?.first_name || '—'}
                  </h3>
                  <p className="text-sm text-gray-400">{profile?.email || user?.email}</p>
                  {profile?.company_name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span>🏢</span> {profile.company_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: planInfo.bg, border: `1px solid ${planInfo.border}`, color: planInfo.color }}
                    >
                      {planInfo.label}
                    </span>
                    {profile?.account_type && (
                      <span className="text-xs px-2.5 py-1 rounded-full text-gray-400" style={{ background: '#27272A', border: '1px solid #3F3F46' }}>
                        {profile.account_type === 'individual' ? 'Particulier' : 'Professionnel'}
                      </span>
                    )}
                    {profile?.sector && (
                      <span className="text-xs px-2.5 py-1 rounded-full text-gray-400" style={{ background: '#27272A', border: '1px solid #3F3F46' }}>
                        {profile.sector}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setEditMode((v) => !v)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
                  style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa', background: editMode ? 'rgba(108,92,231,0.12)' : 'transparent' }}
                >
                  {editMode ? 'Annuler' : 'Modifier le profil'}
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── BIO ──────────────────────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zM2 16h8v-2H2v2zm19.5-4.5L23 13l-6.99 7-4.51-4.5L13 14l2.99 3 6.51-6.5z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">Bio</h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.35), transparent)' }} />
            </div>
            <AnimatePresence mode="wait">
              {bioSaving ? (
                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-medium text-gray-500 shrink-0">
                  Enregistrement...
                </motion.span>
              ) : bioError ? (
                <motion.span key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-xs font-semibold text-red-400 shrink-0">
                  Échec de la sauvegarde
                </motion.span>
              ) : bioSaved ? (
                <motion.span key="saved" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Sauvegardé
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          <AutoTextarea
            value={bio}
            onChange={handleBioChange}
            placeholder="Décrivez votre activité, ce que vous faites, votre parcours..."
            minRows={3}
            className="w-full text-sm text-gray-200 placeholder:text-gray-600 rounded-xl px-4 py-3.5 focus:outline-none"
            style={{ background: '#0A0A0F', border: '1px solid #27272A' }}
          />
          <div className="flex justify-end mt-2">
            <span className="text-xs font-medium" style={{ color: bio.length >= BIO_MAX_LENGTH ? '#f87171' : '#6b7280' }}>
              {bio.length} / {BIO_MAX_LENGTH}
            </span>
          </div>
        </SectionCard>

        {/* ── GALERIE ──────────────────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[140px]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">Galerie</h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.35), transparent)' }} />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: '#27272A', border: '1px solid #3F3F46', color: '#9CA3AF' }}>
              {photos.length + uploadingPhotos.length} / {MAX_GALLERY_PHOTOS} photos
            </span>
          </div>

          <AnimatePresence>
            {galleryError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  {galleryError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3">
            <AnimatePresence initial={false}>
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                  style={{ background: '#27272A', border: '1px solid #3F3F46' }}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" draggable={false} />

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      disabled={deletingPhotoId === photo.id}
                      className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-50"
                      style={{ background: '#ef4444' }}
                      aria-label="Supprimer la photo"
                    >
                      <span className="text-white text-sm font-bold leading-none">×</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMovePhoto(index, -1)}
                        disabled={index === 0}
                        className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                        aria-label="Déplacer vers la gauche"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button
                        onClick={() => handleMovePhoto(index, 1)}
                        disabled={index === photos.length - 1}
                        className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                        aria-label="Déplacer vers la droite"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {uploadingPhotos.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="relative aspect-square rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2 px-2"
                  style={{ background: '#111117', border: '1px solid #3F3F46' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color: '#a78bfa' }}>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#27272A' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: '#a78bfa' }}
                      animate={{ width: `${u.progress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">{u.name}</span>
                </motion.div>
              ))}

              {photosLoaded && photos.length + uploadingPhotos.length < MAX_GALLERY_PHOTOS && (
                <motion.button
                  key="add-photo"
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  whileHover={{ borderColor: 'rgba(167,139,250,0.5)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed #3F3F46' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span className="text-[10px] font-medium text-gray-600">Ajouter</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { handleGalleryFilesSelected(e.target.files); e.target.value = ''; }}
          />

          {photosLoaded && photos.length === 0 && uploadingPhotos.length === 0 && (
            <p className="text-xs text-gray-600 mt-4 text-center italic">Aucune photo — ajoutez-en jusqu&apos;à {MAX_GALLERY_PHOTOS} pour illustrer votre activité</p>
          )}
        </SectionCard>

        {/* ── ABONNEMENT ──────────────────────────────────────────────────── */}
        {hasPlan ? (
          <SectionCard>
            <SectionTitle icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            }>Abonnement</SectionTitle>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{
                  backgroundColor: subscription?.status === 'trialing' ? '#fbbf24' : '#34d399',
                  boxShadow: `0 0 8px ${subscription?.status === 'trialing' ? 'rgba(251,191,36,0.6)' : 'rgba(52,211,153,0.6)'}`,
                }} />
                <div>
                  <p className="text-base font-semibold text-white">
                    {planInfo.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {subStatusLabel} · Renouvelé automatiquement via Stripe
                  </p>
                </div>
              </div>
              <button
                onClick={handleBillingPortal}
                disabled={billingLoading}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa' }}
              >
                {billingLoading ? 'Chargement...' : 'Gérer l\'abonnement →'}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Type', value: billingLabel, icon: '📅' },
                { label: 'Renouvellement', value: renewalDate ?? 'Via portail Stripe', icon: '🔄' },
                { label: 'Paiement', value: '•••• •••• via Stripe', icon: '💳' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#27272A', border: '1px solid #3F3F46' }}>
                  <span className="text-base shrink-0">{icon}</span>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-gray-300">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="relative rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            style={{ background: '#18181B', border: '1px solid rgba(249,115,22,0.4)', animation: 'no-plan-pulse 2.5s ease-in-out infinite' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fb923c">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-white">Aucun abonnement actif</p>
                <p className="text-sm text-orange-400 mt-0.5">Vos services sont limités — activez un plan pour tout débloquer</p>
              </div>
            </div>
            <motion.a
              href="/checkout/plans"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative overflow-hidden px-6 py-3 rounded-xl text-sm font-bold shrink-0 group"
              style={{ background: '#F59E0B', color: '#000', boxShadow: '0 8px 28px rgba(245,158,11,0.3)' }}
            >
              <span className="relative z-10">Activer maintenant →</span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
            </motion.a>
          </motion.section>
        )}

        {/* ── STATISTIQUES ────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          }>Statistiques</SectionTitle>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Créations totales', value: countCreations, color: '#6C5CE7', icon: '✦' },
              { label: 'Heures économisées', value: `${countHours}h`, color: '#00b894', icon: '⏱' },
              { label: 'Jours actif', value: countDays, color: '#f97316', icon: '📅' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: '#27272A', border: '1px solid #3F3F46' }}>
                <span className="text-lg shrink-0">{icon}</span>
                <div>
                  <p className="text-2xl font-extrabold leading-none" style={{ color }}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 7-day activity chart */}
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">Activité — 7 derniers jours</p>
            <div className="flex items-end gap-2 h-20">
              {last7Days.map(({ label, value }, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
                    <motion.div
                      className="w-full rounded-t-md"
                      style={{ backgroundColor: '#6366F1', minHeight: 3 }}
                      initial={{ height: 3 }}
                      whileInView={{ height: value > 0 ? Math.max(3, (value / Math.max(...last7Days.map((d) => d.value), 1)) * 52) : 3 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>
            {totalCreations === 0 && (
              <p className="text-center text-xs text-gray-700 mt-3 italic">Aucune activité — vos statistiques apparaîtront ici après vos premières créations</p>
            )}
          </div>
        </SectionCard>

        {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)', color: '#a78bfa' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">Notifications</h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.35), transparent)' }} />
            </div>
            <AnimatePresence>
              {notifSaved && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Sauvegardé
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-4">
            {NOTIF_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium">{opt.label}</p>
                    {'isMobile' in opt && opt.isMobile && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                        Mobile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
                <Toggle checked={notifPrefs[opt.key]} onChange={(v) => handleNotifChange(opt.key, v)} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── FACTURATION ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
          }>Facturation</SectionTitle>

          <div className="flex flex-col gap-0">
            {[
              {
                label: 'Plan actuel',
                value: hasPlan ? planInfo.label : 'Aucun plan actif',
                accent: hasPlan ? planInfo.color : '#f87171',
                dot: true,
              },
              {
                label: 'Statut',
                value: subStatusLabel ?? 'Aucun abonnement',
                accent: '#6b7280',
                dot: false,
              },
              {
                label: 'Renouvellement',
                value: renewalDate ? `Le ${renewalDate}` : 'Géré via Stripe',
                accent: '#6b7280',
                dot: false,
              },
              { label: 'Moyen de paiement', value: '•••• •••• via Stripe', accent: '#6b7280', dot: false },
            ].map(({ label, value, accent, dot }) => (
              <div key={label} className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{value}</p>
                </div>
                {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}80` }} />}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleBillingPortal}
              disabled={billingLoading || !hasPlan}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ border: '1px solid rgba(108,92,231,0.4)', color: '#a78bfa' }}
            >
              {billingLoading ? 'Chargement...' : 'Portail de facturation →'}
            </button>
            <button
              onClick={handleBillingPortal}
              disabled={billingLoading || !hasPlan}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              Annuler l&apos;abonnement
            </button>
            {!hasPlan && (
              <a
                href="/checkout/plans"
                className="text-sm font-bold px-5 py-2.5 rounded-xl text-white"
                style={{ background: '#4F46E5' }}
              >
                Activer un plan
              </a>
            )}
          </div>
        </SectionCard>

        {/* ── PRÉFÉRENCES ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          }>Préférences</SectionTitle>

          {/* Language picker */}
          <div className="pt-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Langue</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {locales.map((locale) => {
                const isSelected = currentLang === locale;
                return (
                  <motion.button
                    key={locale}
                    onClick={() => handleLanguageChange(locale)}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all"
                    style={{
                      border: isSelected ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.07)',
                      background: isSelected ? 'rgba(108,92,231,0.12)' : 'rgba(255,255,255,0.03)',
                      boxShadow: isSelected ? '0 0 12px rgba(108,92,231,0.2)' : 'none',
                    }}
                  >
                    <span className="text-xl">{localeFlags[locale]}</span>
                    <span className="text-[10px] font-medium" style={{ color: isSelected ? '#a78bfa' : '#6b7280' }}>
                      {localeNames[locale]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ── PROGRAMME PARTENAIRE ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative flex items-center gap-5 rounded-2xl p-5 overflow-hidden"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.5), transparent)' }} />
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.18)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#a78bfa">
              <path d="M20 6h-2.18c.07-.24.18-.47.18-.75C18 3.45 16.55 2 14.75 2c-.86 0-1.6.36-2.15.94L12 3.43l-.6-.49C10.85 2.36 10.11 2 9.25 2 7.45 2 6 3.45 6 5.25c0 .28.11.51.18.75H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-7h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5-2.5c.69 0 1.25.56 1.25 1.25S15.69 6 15 6h-2.09c.28-.64.89-2.5 2.09-2.5zM9.25 3.5c1.19 0 1.8 1.85 2.09 2.5H9.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25zM11 19H7v-7h4v7zm0-9H4V8h7v2zm2 9v-7h4v7h-4zm6-9h-7V8h7v2z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Programme Partenaire</p>
            <p className="text-xs text-gray-400 mt-0.5">Partagez Velona et gagnez jusqu&apos;à 1 mois offert par partage validé</p>
          </div>
          <Link
            href="/dashboard/partner"
            className="text-xs font-bold px-4 py-2 rounded-xl text-violet-300 hover:text-white transition-colors shrink-0"
            style={{ border: '1px solid rgba(108,92,231,0.35)' }}
          >
            Découvrir →
          </Link>
        </motion.section>

        {/* ── DANGER ZONE ─────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex items-center justify-between gap-4 rounded-2xl p-5 mb-10"
          style={{ border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Déconnexion</p>
            <p className="text-xs text-gray-500 mt-0.5">Vous serez redirigé vers l&apos;écran de connexion</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
          >
            Se déconnecter
          </button>
        </motion.section>

      </div>
    </div>
  );
}
