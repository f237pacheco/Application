'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUsage } from '@/hooks/useUsage';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { UsageBar } from '@/components/ui/UsageBar';
import { LimitWarning } from '@/components/ui/LimitWarning';
import { VerticalCutReveal } from '@/components/ui/vertical-cut-reveal';
import { SERVICES } from '@/lib/services';
import { clsx } from 'clsx';

/* ── Floating background elements ─────────────────────────────────────────── */
function FloatingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* 1 — Instagram story phone — top left */}
      <div className="absolute top-2 left-[-12px] rotate-[-8deg] opacity-[0.12]">
        <div className="bg-black border border-gray-700 rounded-[18px] w-16 h-[120px] overflow-hidden flex flex-col">
          <div className="flex gap-0.5 px-1.5 pt-1.5">
            {[100, 100, 60].map((w, i) => (
              <div key={i} className="h-0.5 flex-1 rounded-full bg-gray-600">
                <div className="h-full rounded-full bg-white" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 px-1.5 py-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500" />
            <span className="text-white text-[6px] font-semibold">sophie_b</span>
          </div>
          <div className="flex-1 bg-gradient-to-b from-indigo-900/80 to-purple-900/60 flex items-center justify-center px-2">
            <div className="text-white text-[7px] text-center font-medium leading-tight">
              Mon site créé en 2min par Velona 🤯
            </div>
          </div>
          <div className="px-1.5 py-1 flex items-center gap-1">
            <div className="flex-1 h-3 rounded-full bg-gray-800 border border-gray-600" />
            <span className="text-white text-[6px]">↗</span>
          </div>
        </div>
      </div>

      {/* 2 — Revenue KPI card — top, between TikTok and calendar */}
      <div className="absolute top-[6%] left-[22%] rotate-[5deg] opacity-[0.12]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-36 shadow-xl">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Revenus ce mois</div>
          <div className="text-white text-2xl font-extrabold leading-none">12 480€</div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-success-DEFAULT text-[9px] font-bold">↑ +24%</span>
            <span className="text-gray-600 text-[8px]">vs M-1</span>
          </div>
          <div className="mt-2 h-1 bg-gray-800 rounded-full">
            <div className="h-full w-[72%] bg-success-DEFAULT rounded-full" />
          </div>
        </div>
      </div>

      {/* 3 — TikTok phone — top center */}
      <div className="absolute top-[-10px] left-[42%] rotate-[-5deg] opacity-[0.11]">
        <div className="bg-black border border-gray-600 rounded-[20px] w-[68px] h-[132px] overflow-hidden flex flex-col">
          <div className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center gap-1 p-2">
            <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[8px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
            </div>
            <div className="text-white text-[6px] font-bold text-center">@velona_app</div>
            <div className="text-gray-400 text-[5px] text-center leading-tight">Site en 2min</div>
          </div>
          <div className="bg-black px-1.5 py-1">
            <div className="flex gap-2">
              <span className="text-[6px] text-gray-400">♥ 4.2k</span>
              <span className="text-[6px] text-gray-400">↗ 1.1k</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 — Notification stack — top center-right */}
      <div className="absolute top-[4%] left-[60%] rotate-[-2deg] opacity-[0.11]">
        <div className="flex flex-col gap-1.5 w-48">
          {[
            { color: '#6C5CE7', text: 'Nouveau RDV — Thomas M. 14h30', label: 'Agenda' },
            { color: '#00b894', text: 'Site généré avec succès — coiffure-jade.velona.io', label: 'Site web' },
            { color: '#0984e3', text: '3 nouveaux leads via votre agent vocal', label: 'Agent' },
          ].map((n, i) => (
            <div key={i} className="bg-gray-900/90 border border-gray-700 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[7px] font-semibold text-gray-400 uppercase tracking-wider">{n.label}</div>
                <div className="text-[8px] text-white leading-tight truncate">{n.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 — Calendar with 3 appointments — top right */}
      <div className="absolute top-4 right-[-18px] rotate-[3deg] opacity-[0.13]">
        <div className="bg-gray-800 border border-gray-600 rounded-2xl p-4 w-52 shadow-xl">
          <div className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider mb-2">Mercredi 14 mai 2026</div>
          {[
            { name: 'Claire Martin', time: '09h00 → 10h00', color: '#6C5CE7' },
            { name: 'Paul Renard', time: '13h00 → 14h30', color: '#00b894' },
            { name: 'Julie Fabre', time: '16h00 → 17h00', color: '#e17055' },
          ].map((appt, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <div className="w-1 h-7 rounded-full shrink-0" style={{ backgroundColor: appt.color }} />
              <div>
                <div className="text-white text-[9px] font-bold">{appt.name}</div>
                <div className="text-gray-400 text-[8px]">{appt.time}</div>
              </div>
            </div>
          ))}
          <div className="text-[9px] text-success-DEFAULT mt-1.5">✓ 3 confirmations envoyées</div>
          <div className="mt-2 grid grid-cols-7 gap-0.5">
            {['L','M','M','J','V','S','D'].map((d, i) => (
              <div key={i} className="text-center text-[7px] text-gray-500">{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className="text-center text-[8px] rounded py-0.5"
                style={{
                  backgroundColor: i === 13 ? '#6C5CE7' : 'transparent',
                  color: i === 13 ? 'white' : i === 7 || i === 20 ? '#00b894' : '#6b7280',
                  fontWeight: i === 13 ? 'bold' : 'normal',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6 — YouTube video card — upper right area */}
      <div className="absolute top-[18%] right-[22%] rotate-[2deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-44 shadow-xl">
          <div className="h-20 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[11px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
            </div>
            <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1">
              <span className="text-white text-[7px]">2:34</span>
            </div>
          </div>
          <div className="p-2">
            <div className="text-white text-[8px] font-semibold leading-tight mb-1">Comment Velona génère votre site en 2 minutes</div>
            <div className="text-gray-500 text-[7px]">Velona App · 14k vues · il y a 3j</div>
          </div>
        </div>
      </div>

      {/* 7 — Email campaign stats — right side mid */}
      <div className="absolute top-[28%] right-[-14px] rotate-[-2deg] opacity-[0.11]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-44 shadow-xl">
          <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Campagne email</div>
          <div className="text-[8px] text-gray-300 mb-2 truncate">Offre printemps — cabinet Martin</div>
          {[
            { label: 'Ouverture', value: '64%', w: '64%', color: '#6C5CE7' },
            { label: 'Clics',     value: '18%', w: '18%', color: '#00b894' },
            { label: 'Converti',  value: '7%',  w: '7%',  color: '#e17055' },
          ].map((stat, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between mb-0.5">
                <span className="text-[7px] text-gray-500">{stat.label}</span>
                <span className="text-[7px] font-bold text-white">{stat.value}</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full">
                <div className="h-full rounded-full" style={{ width: stat.w, backgroundColor: stat.color }} />
              </div>
            </div>
          ))}
          <div className="text-[7px] text-gray-600 mt-1">2 340 destinataires</div>
        </div>
      </div>

      {/* 8 — Website preview — middle left */}
      <div className="absolute top-[38%] left-[-28px] rotate-[-2deg] opacity-[0.11]">
        <div className="bg-gray-900 border border-gray-600 rounded-xl overflow-hidden w-56 shadow-xl">
          <div className="bg-gray-700 px-3 py-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="flex-1 bg-gray-600 rounded px-2 py-0.5 ml-2">
              <div className="text-[7px] text-gray-400">cabinet-martin.velona.io</div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="h-12 bg-gradient-to-r from-primary-500/20 to-primary-500/5 rounded-lg flex items-center px-3">
              <div className="space-y-1">
                <div className="w-20 h-1.5 bg-white/30 rounded" />
                <div className="w-14 h-1 bg-white/20 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-700 rounded-lg" />)}
            </div>
            <div className="space-y-1">
              {[90, 75, 55].map((w, i) => <div key={i} className="h-1.5 bg-gray-700 rounded" style={{ width: `${w}%` }} />)}
            </div>
          </div>
        </div>
      </div>

      {/* 9 — WhatsApp conversation — center */}
      <div className="absolute top-[35%] left-[34%] rotate-[-3deg] opacity-[0.10]">
        <div className="bg-[#111b21] border border-gray-700 rounded-xl overflow-hidden w-44 shadow-xl">
          <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-600/60" />
            <div>
              <div className="text-white text-[8px] font-semibold">Velona Business</div>
              <div className="text-gray-400 text-[7px]">en ligne</div>
            </div>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="bg-[#202c33] rounded-lg rounded-tl-none px-2 py-1 max-w-[80%]">
              <div className="text-gray-200 text-[7px]">Bonjour ! Votre RDV de 14h est confirmé.</div>
            </div>
            <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-2 py-1 max-w-[80%] ml-auto">
              <div className="text-gray-100 text-[7px]">Merci ! À demain</div>
            </div>
            <div className="bg-[#202c33] rounded-lg rounded-tl-none px-2 py-1 max-w-[90%]">
              <div className="text-gray-200 text-[7px]">Un rappel vous sera envoyé 1h avant.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 10 — Voice waveform / AI agent card — center right */}
      <div className="absolute top-[42%] right-[14%] rotate-[3deg] opacity-[0.11]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-40 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Agent vocal</div>
            <div className="w-2 h-2 rounded-full bg-success-DEFAULT" />
          </div>
          <div className="text-white text-[9px] font-bold mb-1">En appel · 02:14</div>
          <div className="flex items-end gap-0.5 h-8 mb-2">
            {[2,4,6,8,5,9,7,4,8,6,9,5,3,7,4,8,5,3,6,4].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${h * 3}px`, backgroundColor: i % 3 === 0 ? '#6C5CE7' : '#374151' }}
              />
            ))}
          </div>
          <div className="text-[7px] text-gray-500">3 appels traités aujourd'hui</div>
        </div>
      </div>

      {/* 11 — Appointment time-slots card — center left */}
      <div className="absolute top-[53%] left-[10%] rotate-[6deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-44 shadow-xl">
          <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Aujourd'hui</div>
          {[
            { time: '09:00', name: 'Lucie Morel', color: '#6C5CE7' },
            { time: '11:30', name: 'Ahmed Benali', color: '#00b894' },
            { time: '14:00', name: 'Camille Roy', color: '#6C5CE7' },
            { time: '16:30', name: 'Nathalie V.', color: '#e17055' },
          ].map((slot, i) => (
            <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-800 last:border-0">
              <span className="text-[8px] text-gray-500 w-8 shrink-0">{slot.time}</span>
              <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: slot.color }} />
              <span className="text-[8px] text-white">{slot.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 12 — Instagram post card — center */}
      <div className="absolute top-[50%] left-[50%] rotate-[-4deg] opacity-[0.09]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-36 shadow-xl">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500" />
            <span className="text-white text-[7px] font-semibold">velona.app</span>
          </div>
          <div className="h-24 bg-gradient-to-br from-primary-500/30 via-purple-900/40 to-gray-900 flex items-center justify-center">
            <div className="text-white text-[9px] font-bold text-center px-2 leading-tight">Votre site pro<br/>en 2 minutes</div>
          </div>
          <div className="px-2 py-1.5">
            <div className="flex gap-3 mb-1">
              <span className="text-[7px] text-white">♥ 1 284</span>
              <span className="text-[7px] text-gray-400">💬 47</span>
            </div>
            <div className="text-[6px] text-gray-400 leading-tight">velona.app Générez votre site en quelques secondes avec notre IA</div>
          </div>
        </div>
      </div>

      {/* 13 — Analytics bar chart — bottom right */}
      <div className="absolute bottom-12 right-[-10px] rotate-[4deg] opacity-[0.12]">
        <div className="bg-gray-900 border border-gray-600 rounded-xl p-4 w-44 shadow-xl">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Trafic mensuel</div>
          <div className="text-white text-xl font-bold mb-0.5">+38%</div>
          <div className="text-success-DEFAULT text-[9px] mb-3">vs mois précédent</div>
          <div className="flex items-end gap-1 h-12">
            {[3,5,4,7,5,8,9,7,10,9,11,12].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ height: `${h * 4}px`, backgroundColor: i >= 9 ? '#6C5CE7' : '#374151' }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-gray-600">Jan</span>
            <span className="text-[7px] text-gray-600">Déc</span>
          </div>
        </div>
      </div>

      {/* 14 — Revenue area chart — bottom center */}
      <div className="absolute bottom-[14%] left-[38%] rotate-[-3deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-48 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Revenus</div>
            <div className="text-[8px] text-success-DEFAULT font-bold">+31% ce trimestre</div>
          </div>
          <div className="relative h-14">
            <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,35 L10,30 L20,28 L30,22 L40,24 L50,18 L60,14 L70,16 L80,10 L90,8 L100,4 L100,40 L0,40 Z" fill="url(#areaGrad)" />
              <path d="M0,35 L10,30 L20,28 L30,22 L40,24 L50,18 L60,14 L70,16 L80,10 L90,8 L100,4" fill="none" stroke="#6C5CE7" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-gray-600">Jan</span>
            <span className="text-[7px] text-gray-600">Mar</span>
          </div>
        </div>
      </div>

      {/* 15 — Second website browser — bottom left */}
      <div className="absolute bottom-[8%] left-[-15px] rotate-[5deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-600 rounded-xl overflow-hidden w-48 shadow-xl">
          <div className="bg-gray-700 px-3 py-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <div className="flex-1 bg-gray-600 rounded px-2 py-0.5 ml-1">
              <div className="text-[6px] text-gray-400">resto-bella.velona.io</div>
            </div>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="h-10 bg-gradient-to-r from-orange-500/20 to-red-500/10 rounded-lg flex items-center justify-center">
              <div className="text-[7px] text-orange-300 font-bold">Ristorante Bella</div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-gray-800 rounded" />)}
            </div>
            <div className="h-5 bg-orange-500/20 rounded flex items-center justify-center">
              <div className="text-[6px] text-orange-400">Réserver une table →</div>
            </div>
          </div>
        </div>
      </div>

      {/* 16 — Twitter/X post — bottom center-left */}
      <div className="absolute bottom-0 left-[23%] rotate-[2deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-52 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-sky-500/40" />
            <div>
              <div className="text-[9px] text-white font-semibold">Marie D.</div>
              <div className="text-[8px] text-gray-500">@mariedupont · 2h</div>
            </div>
            <div className="ml-auto text-gray-400 text-xs font-bold">✕</div>
          </div>
          <div className="text-[9px] text-gray-300 leading-relaxed">
            L'agent vocal <span className="text-sky-400">@Velona_app</span> répond à tous nos appels. 3h/semaine économisées
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-[8px] text-gray-500">47 RT</span>
            <span className="text-[8px] text-gray-500">286 ♥</span>
          </div>
        </div>
      </div>

      {/* 17 — Analytics donut widget — bottom right area */}
      <div className="absolute bottom-[28%] right-[8%] rotate-[-5deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-36 shadow-xl">
          <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-2">Satisfaction</div>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#374151" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#6C5CE7" strokeWidth="4"
                  strokeDasharray="75 25" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">87%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <span className="text-[7px] text-gray-400">Satisfaits</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                <span className="text-[7px] text-gray-400">Neutres</span>
              </div>
              <div className="text-[8px] text-white font-semibold">248 avis</div>
            </div>
          </div>
        </div>
      </div>

      {/* 18 — Social media performance card — right center */}
      <div className="absolute top-[63%] right-[-8px] rotate-[4deg] opacity-[0.10]">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 w-44 shadow-xl">
          <div className="text-[8px] text-gray-400 uppercase tracking-wider mb-2">Réseaux sociaux</div>
          {[
            { platform: 'Instagram', followers: '2.4k', color: '#e1306c' },
            { platform: 'TikTok',    followers: '8.1k', color: '#69c9d0' },
            { platform: 'LinkedIn',  followers: '1.2k', color: '#0077b5' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[8px] text-gray-300">{s.platform}</span>
              </div>
              <span className="text-[8px] font-bold text-white">{s.followers}</span>
            </div>
          ))}
          <div className="text-[7px] text-success-DEFAULT mt-1.5">↑ +340 abonnés ce mois</div>
        </div>
      </div>

    </div>
  );
}

/* ── Marquee cards data ────────────────────────────────────────────────────── */
const ROW1_CARDS = [
  {
    type: 'tweet',
    avatar: 'bg-sky-500/40',
    name: 'Julien Tech',
    handle: '@julien_tech · 2h',
    text: `Mon site professionnel créé en 2 minutes ✨ Impossible de croire que c'est de l'IA`,
    likes: '1.2k',
    rt: '380',
  },
  {
    type: 'stat',
    label: 'Revenus ce mois',
    value: '12 480€',
    change: '+24%',
    color: '#00b894',
    barWidth: '72%',
  },
  {
    type: 'site',
    url: 'cabinet-martin.velona.io',
    accent: '#6C5CE7',
  },
  {
    type: 'kpi',
    label: "RDV confirmés aujourd'hui",
    value: '18',
    sub: 'automatiquement',
    color: '#6C5CE7',
  },
  {
    type: 'tweet',
    avatar: 'bg-pink-500/40',
    name: 'Jade Coiffure',
    handle: '@coiffure_jade · 5h',
    text: 'Velona génère mes posts Instagram chaque semaine, je gagne 3h 🙌',
    likes: '847',
    rt: '156',
  },
  {
    type: 'video',
    title: 'Montage vidéo IA — créé en 45s',
    duration: '0:45',
    views: '3.2k vues',
  },
  {
    type: 'tweet',
    avatar: 'bg-emerald-500/40',
    name: 'Kiné Montpellier',
    handle: '@kine_mtp · 1j',
    text: 'Agent vocal gère 100% de mes appels. Incroyable, je ne rate plus aucun RDV.',
    likes: '632',
    rt: '91',
  },
  {
    type: 'kpi',
    label: 'Nouveaux abonnés Instagram',
    value: '+340',
    sub: 'ce mois · ↑ +28%',
    color: '#e1306c',
  },
] as const;

const ROW2_CARDS = [
  {
    type: 'site',
    url: 'resto-bella.velona.io',
    accent: '#f97316',
  },
  {
    type: 'tweet',
    avatar: 'bg-indigo-500/40',
    name: 'Entrepreneur FR',
    handle: '@entrepreneur_fr · 3h',
    text: `Email campaign : 64% d'ouverture. Record absolu pour notre agence 📈`,
    likes: '2.1k',
    rt: '478',
  },
  {
    type: 'stat',
    label: 'Croissance CA',
    value: '+38%',
    change: 'ce trimestre',
    color: '#6C5CE7',
    barWidth: '38%',
  },
  {
    type: 'tweet',
    avatar: 'bg-amber-500/40',
    name: 'Artisan Manu',
    handle: '@artisanat_manu · 6h',
    text: 'Site e-commerce en ligne en 2min. Premier achat 3h après 🎉',
    likes: '923',
    rt: '267',
  },
  {
    type: 'kpi',
    label: 'Trafic organique',
    value: '+28%',
    sub: 'vs mois précédent',
    color: '#0984e3',
  },
  {
    type: 'site',
    url: 'avocats-dubois.velona.io',
    accent: '#0984e3',
  },
  {
    type: 'tweet',
    avatar: 'bg-violet-500/40',
    name: 'Coach Émilie',
    handle: '@coach_emilie · 2j',
    text: 'Velona automatise mes réseaux, mon agenda, mes emails. Passée à 4j/semaine 💜',
    likes: '1.8k',
    rt: '412',
  },
  {
    type: 'kpi',
    label: 'Satisfaction client',
    value: '4.9/5',
    sub: '248 avis vérifiés',
    color: '#f59e0b',
  },
] as const;

type CardData = (typeof ROW1_CARDS)[number] | (typeof ROW2_CARDS)[number];

function MarqueeCard({ card }: { card: CardData }) {
  if (card.type === 'tweet') {
    return (
      <div className="flex-shrink-0 w-64 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={clsx('w-7 h-7 rounded-full', card.avatar)} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{card.name}</p>
            <p className="text-[10px] text-gray-500">{card.handle}</p>
          </div>
          <span className="text-gray-600 text-xs font-bold shrink-0">✕</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{card.text}</p>
        <div className="flex gap-4 mt-2.5 text-[10px] text-gray-500">
          <span>♥ {card.likes}</span>
          <span>↗ {card.rt}</span>
        </div>
      </div>
    );
  }

  if (card.type === 'stat') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl p-4 shadow-xl">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
        <p className="text-2xl font-extrabold text-white">{card.value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-bold" style={{ color: card.color }}>↑ {card.change}</span>
        </div>
        <div className="mt-2 h-1 bg-gray-800 rounded-full">
          <div className="h-full rounded-full" style={{ width: card.barWidth, backgroundColor: card.color }} />
        </div>
      </div>
    );
  }

  if (card.type === 'site') {
    return (
      <div className="flex-shrink-0 w-52 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-gray-700/50 px-3 py-1.5 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <div className="flex-1 bg-gray-600/50 rounded px-2 py-0.5 ml-1">
            <p className="text-[8px] text-gray-400 truncate">{card.url}</p>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${card.accent}22, ${card.accent}08)` }} />
          <div className="grid grid-cols-3 gap-1">
            {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-gray-700/50 rounded" />)}
          </div>
          <div className="space-y-1">
            {[85, 65, 45].map((w, i) => <div key={i} className="h-1 bg-gray-700/50 rounded" style={{ width: `${w}%` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (card.type === 'video') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-white border-b-[6px] border-b-transparent ml-1" />
          </div>
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 rounded px-1.5 py-0.5">
            <span className="text-white text-[8px]">{card.duration}</span>
          </div>
        </div>
        <div className="p-3">
          <p className="text-[9px] text-white font-semibold leading-tight">{card.title}</p>
          <p className="text-[8px] text-gray-500 mt-0.5">Velona Video · {card.views}</p>
        </div>
      </div>
    );
  }

  if (card.type === 'kpi') {
    return (
      <div className="flex-shrink-0 w-44 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-2xl p-4 shadow-xl">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
        <p className="text-2xl font-extrabold text-white">{card.value}</p>
        <p className="text-xs mt-0.5" style={{ color: card.color }}>{card.sub}</p>
      </div>
    );
  }

  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: usage, loading: usageLoading, isNearLimit } = useUsage();

  const firstName = profile?.first_name
    ?? (user?.user_metadata?.full_name as string)?.split(' ')[0]
    ?? 'vous';

  const hasPlan = !!profile?.plan_key;
  const isEnterprise = profile?.plan_key === 'enterprise';

  // Trial countdown — 3 days from now (hours:minutes)
  const [trialCountdown, setTrialCountdown] = useState({ hours: 71, minutes: 59 });
  useEffect(() => {
    const trialEndsAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, trialEndsAt - Date.now());
      const totalMinutes = Math.floor(diff / 60000);
      setTrialCountdown({
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const row1Doubled = [...ROW1_CARDS, ...ROW1_CARDS];
  const row2Doubled = [...ROW2_CARDS, ...ROW2_CARDS];

  return (
    <div className="flex flex-col gap-8">

      {/* Immersive marquee hero */}
      <section className="flex flex-col gap-4">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-xl font-bold"
          style={{ background: 'linear-gradient(90deg, #a78bfa, #6C5CE7, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          <VerticalCutReveal
            staggerDuration={0.08}
            staggerFrom="first"
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            Découvrez ce que Velona génère déjà
          </VerticalCutReveal>
        </motion.h2>

        {/* Row 1 — scroll left */}
        <div className="marquee-pause overflow-hidden">
          <div className="flex gap-3 marquee-left">
            {row1Doubled.map((card, i) => (
              <MarqueeCard key={i} card={card} />
            ))}
          </div>
        </div>

        {/* Row 2 — scroll right */}
        <div className="marquee-pause overflow-hidden">
          <div className="flex gap-3 marquee-right">
            {row2Doubled.map((card, i) => (
              <MarqueeCard key={i} card={card} />
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-600 text-center">
          <Link href="/dashboard/help" className="hover:text-gray-400 transition-colors underline underline-offset-2">
            Conditions générales d'utilisation
          </Link>
        </p>
      </section>

      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">
          {t('home.welcome', { name: firstName })}
        </h1>
        <p className="text-gray-400">{t('home.services')}</p>
        <p className="text-red-400 text-sm font-medium mt-2">
          ⏰ 3 jours d'essai restants —{' '}
          {String(trialCountdown.hours).padStart(2, '0')}h{String(trialCountdown.minutes).padStart(2, '0')}m
        </p>
      </div>

      <LimitWarning nearLimit={isNearLimit()} isEnterprise={isEnterprise} />

      {/* Usage summary */}
      {hasPlan && !isEnterprise && usage && !usageLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">{t('dashboard.usageThisMonth')}</h2>
            <span className="text-xs text-gray-500">Réinitialisé le 1er du mois</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map((s) => (
              <UsageBar
                key={s.id}
                icon={s.icon}
                label={t(`${s.i18nKey}.name`)}
                used={usage.usage[s.id] ?? 0}
                limit={usage.limit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Service cards — with floating background */}
      <div className="relative">
        <FloatingBackground />

        <div className="relative z-10">
          <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.activeServices')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((service) => {
              const serviceUsed = usage?.usage[service.id] ?? 0;
              const serviceLimit = usage?.limit ?? 0;
              const pct = serviceLimit > 0 ? Math.min(100, (serviceUsed / serviceLimit) * 100) : 0;

              return (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className={clsx(
                    'group relative overflow-hidden rounded-2xl border',
                    'border-gray-700 bg-gray-900/80 backdrop-blur-sm',
                    'hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10',
                    'transition-all duration-300 active:scale-[0.98]'
                  )}
                >
                  {/* Accent top bar */}
                  <div
                    className="h-0.5 w-full opacity-60"
                    style={{ backgroundColor: service.accentColor }}
                  />

                  <div className="p-5 pb-3 flex items-center gap-3">
                    <span className="text-3xl">{service.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-snug">
                        {t(`${service.i18nKey}.name`)}
                      </h3>
                      {usage && usage.limit !== null && (
                        <p className="text-xs mt-0.5" style={{ color: service.accentColor }}>
                          {serviceUsed}/{usage.limit} utilisations
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mx-4 mb-3 h-28 overflow-hidden rounded-lg border border-gray-700/50">
                    <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
                  </div>

                  {/* Animated usage progress bar */}
                  <div className="mx-4 mb-4">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: service.accentColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      />
                    </div>
                  </div>

                  <div
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                    style={{ color: service.accentColor }}
                  >
                    →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
