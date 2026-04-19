'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { getService, type ServiceId } from '@/lib/services';

/* ── Per-service explanations ──────────────────────────────────────────────── */
interface ServiceExplanation {
  howItWorks: string;
  whatYouGet: string[];
  tips: string[];
}

const SERVICE_EXPLANATIONS: Record<ServiceId, ServiceExplanation> = {
  website: {
    howItWorks: "Notre IA analyse votre description, génère l'architecture, les contenus et le design de votre site en moins de 2 minutes. Le résultat est hébergé immédiatement sur une URL dédiée.",
    whatYouGet: [
      "Site multi-pages responsive (mobile + desktop)",
      "Contenu rédigé et optimisé SEO",
      "Formulaire de contact opérationnel",
      "Hébergement inclus sur votre-slug.velona.io",
    ],
    tips: [
      "Précisez votre secteur, votre cible et vos valeurs",
      "Listez les pages souhaitées (accueil, services, portfolio, contact…)",
      "Mentionnez un site de référence si vous en avez un",
    ],
  },
  voice_agent: {
    howItWorks: "L'IA est entraînée sur le contexte de votre activité pour répondre aux appels entrants 24h/7j. Elle gère les réservations, répond aux questions fréquentes et transfère les cas complexes vers vous.",
    whatYouGet: [
      "Numéro de téléphone dédié à votre marque",
      "Agent vocal avec voix naturelle personnalisée",
      "Tableau de bord des appels et transcriptions",
      "Alertes et transferts configurables",
    ],
    tips: [
      "Décrivez vos horaires, vos types de demandes et le ton souhaité",
      "Listez vos questions fréquentes avec les réponses attendues",
      "Précisez si l'agent doit prendre des réservations ou juste informer",
    ],
  },
  video_editing: {
    howItWorks: "Décrivez vos rushs, le style et la plateforme cible. L'IA génère le plan de montage, applique les coupes, ajoute la musique libre de droits et les sous-titres automatiques.",
    whatYouGet: [
      "Vidéo montée exportée en HD (MP4)",
      "Sous-titres synchronisés inclus",
      "Musique libre de droits intégrée",
      "Version optimisée par plateforme (Instagram Reels, TikTok, YouTube…)",
    ],
    tips: [
      "Précisez la durée cible et la plateforme de diffusion",
      "Décrivez l'ambiance, le rythme et les moments forts à mettre en avant",
      "Indiquez si vous souhaitez un voiceover, du texte animé ou une intro brandée",
    ],
  },
  appointments: {
    howItWorks: "L'IA crée une page de réservation en ligne, synchronisée avec votre agenda Google ou Outlook. Vos clients réservent en autonomie et reçoivent des confirmations automatiques.",
    whatYouGet: [
      "Page de réservation publique sur votre URL",
      "Synchronisation Google Calendar / Outlook",
      "Confirmations et rappels automatiques par email",
      "Gestion des annulations et reprogrammations",
    ],
    tips: [
      "Précisez la durée des créneaux et les plages horaires disponibles",
      "Indiquez si vous proposez plusieurs types de prestations",
      "Mentionnez un délai tampon entre deux rendez-vous si nécessaire",
    ],
  },
  social_media: {
    howItWorks: "L'IA génère un calendrier éditorial de 30 jours avec textes et directives visuelles adaptés à chaque réseau social. Les publications sont programmées automatiquement.",
    whatYouGet: [
      "30 publications prêtes à l'emploi (texte + brief visuel)",
      "Calendrier éditorial structuré par réseau",
      "Hashtags optimisés et ciblés par plateforme",
      "Rapport de performance mensuel automatique",
    ],
    tips: [
      "Décrivez votre audience, votre ton et vos thématiques principales",
      "Précisez les plateformes ciblées (Instagram, LinkedIn, TikTok…)",
      "Partagez vos sujets à éviter et vos visuels de marque si disponibles",
    ],
  },
  analytics: {
    howItWorks: "L'IA connecte vos sources de données (site, ventes, réseaux sociaux) et construit des tableaux de bord intelligents avec alertes automatiques sur vos indicateurs clés.",
    whatYouGet: [
      "Dashboard interactif accessible 24h/7j",
      "Rapport PDF hebdomadaire ou mensuel automatique",
      "Alertes en temps réel sur les seuils définis",
      "Comparaisons période sur période et prévisions",
    ],
    tips: [
      "Listez vos KPIs prioritaires (CA, trafic, taux de conversion…)",
      "Précisez vos sources de données et les périodes d'analyse",
      "Indiquez les équipes destinataires des rapports automatiques",
    ],
  },
};

export default function ServiceDetailPage() {
  const { service: serviceParam } = useParams<{ service: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const serviceId = serviceParam as ServiceId;
  const service = getService(serviceId);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  if (!service) {
    router.replace('/dashboard');
    return null;
  }

  const explanation = SERVICE_EXPLANATIONS[serviceId];

  const handleContinue = () => {
    if (prompt.trim().length < 10) {
      setError(t('auth.errors.required'));
      return;
    }
    const encoded = encodeURIComponent(prompt.trim());
    router.push(`/plans?service=${serviceId}&prompt=${encoded}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-900 px-6 py-4">
        <BackButton href="/dashboard" />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* Service hero */}
        <div className={`rounded-2xl bg-gradient-to-br ${service.bgGradient} border border-gray-800 overflow-hidden`}>
          <div className="h-44 p-4">
            <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
          </div>
          <div className="px-6 pb-6 pt-2 flex items-start gap-4">
            <span className="text-4xl shrink-0">{service.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{t(`${service.i18nKey}.name`)}</h1>
              <p className="text-gray-300 text-sm mt-1 leading-relaxed">{t(`${service.i18nKey}.description`)}</p>
            </div>
          </div>
        </div>

        {/* Prompt section */}
        <div className="flex flex-col gap-3">
          <label className="text-base font-semibold text-white">{t('services.describe')}</label>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(''); }}
              placeholder={t(`${service.i18nKey}.placeholder`)}
              rows={5}
              maxLength={2000}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                resize-none text-sm leading-relaxed transition-all duration-200"
            />
            <span className="absolute bottom-3 right-3 text-xs text-gray-600">{prompt.length}/2000</span>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border"
            style={{ background: `${service.color}0d`, borderColor: `${service.color}25` }}
          >
            <div
              className="w-1 h-full min-h-[2rem] rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: service.accentColor, opacity: 0.7 }}
            />
            <p className="text-xs leading-relaxed" style={{ color: service.accentColor }}>
              {t('services.helpText')}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={handleContinue}
          fullWidth
          size="lg"
          disabled={prompt.trim().length < 10}
        >
          {t('services.continue')}
        </Button>

        {/* How it works — per service explanation */}
        {explanation && (
          <div className="flex flex-col gap-5 border-t border-gray-800 pt-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Comment fonctionne ce service</h2>

            <p className="text-sm text-gray-300 leading-relaxed">{explanation.howItWorks}</p>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Ce que vous recevez</p>
              <ul className="flex flex-col gap-2">
                {explanation.whatYouGet.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <span className="text-primary-500 shrink-0 mt-0.5 font-bold">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-xl p-5 border"
              style={{ background: `${service.color}0a`, borderColor: `${service.color}25` }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: service.accentColor }}>
                Conseils pour un meilleur résultat
              </p>
              <ul className="flex flex-col gap-2">
                {explanation.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                    <span className="shrink-0 mt-0.5" style={{ color: service.accentColor }}>·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
