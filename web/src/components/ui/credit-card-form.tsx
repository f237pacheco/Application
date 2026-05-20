"use client";

import React, { useEffect, useId, useMemo, useState } from "react";

type CardState = {
  number: string;
  holder: string;
  month: string;
  year: string;
  cvv: string;
};

type CardValidity = {
  number: boolean;
  holder: boolean;
  month: boolean;
  year: boolean;
  cvv: boolean;
  allValid: boolean;
};

type Props = {
  defaultNumber?: string;
  defaultHolder?: string;
  defaultMonth?: string;
  defaultYear?: string;
  defaultCVV?: string;
  maskMiddle?: boolean;
  ring1?: string;
  ring2?: string;
  showSubmit?: boolean;
  onChange?: (state: CardState, validity: CardValidity) => void;
  onSubmit?: (state: CardState, validity: CardValidity) => void;
  className?: string;
  dark?: boolean;
  /** Stack card above form instead of side-by-side */
  stacked?: boolean;
};

function formatNumberSpaces(num: string): string {
  return num.replace(/\s+/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}

function clampDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

const CreditCardForm = ({
  defaultNumber = "",
  defaultHolder = "",
  defaultMonth = "",
  defaultYear = "",
  defaultCVV = "",
  maskMiddle = true,
  ring1 = "#ff6be7",
  ring2 = "#7288ff",
  showSubmit = true,
  onChange,
  onSubmit,
  className = "",
  dark = false,
  stacked = false,
}: Props) => {
  const [number, setNumber] = useState(clampDigits(defaultNumber, 19));
  const [holder, setHolder] = useState(defaultHolder.toUpperCase());
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [cvv, setCVV] = useState(clampDigits(defaultCVV, 4));
  const [focusField, setFocusField] = useState<null | "number" | "holder" | "expire" | "cvv">(null);

  const id = useId();
  const scope = `ccf${id.replace(/:/g, '')}`;

  const flip = focusField === "cvv";
  const years = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(start + i));
  }, []);

  const validity: CardValidity = useMemo(() => {
    const numberValid = number.length >= 13;
    const holderValid = holder.trim().length >= 2;
    const monthValid = !!month && +month >= 1 && +month <= 12;
    const yearValid = !!year && +year >= new Date().getFullYear();
    const cvvValid = /^\d{3,4}$/.test(cvv);
    return {
      number: numberValid,
      holder: holderValid,
      month: monthValid,
      year: yearValid,
      cvv: cvvValid,
      allValid: numberValid && holderValid && monthValid && yearValid && cvvValid,
    };
  }, [number, holder, month, year, cvv]);

  useEffect(() => {
    onChange?.({ number, holder, month, year, cvv }, validity);
  }, [number, holder, month, year, cvv, validity, onChange]);

  const displayDigits = useMemo(() => number.slice(0, 16).split(""), [number]);

  const displayedSlots = useMemo(() => {
    const arr: { textTop: string; filed: boolean }[] = [];
    for (let i = 0; i < 16; i++) {
      let content = "#";
      if (i < displayDigits.length) {
        const d = displayDigits[i];
        content = maskMiddle && i >= 4 && i <= 11 ? "*" : d;
      }
      arr.push({ textTop: content, filed: i < displayDigits.length });
    }
    return arr;
  }, [displayDigits, maskMiddle]);

  const highlightClass = (() => {
    switch (focusField) {
      case "number":  return `${scope}-highlight--number`;
      case "holder":  return `${scope}-highlight--holder`;
      case "expire":  return `${scope}-highlight--expire`;
      case "cvv":     return `${scope}-highlight--cvv`;
      default:        return `${scope}-highlight--hidden`;
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ number, holder, month, year, cvv }, validity);
  };

  /* Dynamic CSS variables set via inline style on root element */
  const cssVars = {
    "--ccf-ring1": ring1,
    "--ccf-ring2": ring2,
    "--ccf-color": dark ? "#fff" : "#0d0c22",
    "--ccf-form-bg": dark ? "rgba(15,12,36,0.82)" : "#fff",
    "--ccf-form-border": dark ? "rgba(255,255,255,0.07)" : "#f1f1f1",
    "--ccf-form-shadow": dark ? "none" : "0 0 40px rgba(50,55,63,0.16)",
    "--ccf-form-backdrop": dark ? "blur(12px)" : "none",
    "--ccf-label-color": dark ? "#9ca3af" : "#0d0c22",
    "--ccf-input-bg": dark ? "rgba(255,255,255,0.04)" : "#fff",
    "--ccf-input-border": dark ? "rgba(255,255,255,0.09)" : "#6b7280",
    "--ccf-input-color": dark ? "#fff" : "#0d0c22",
    "--ccf-input-placeholder": dark ? "rgba(255,255,255,0.25)" : "#9ca3af",
    "--ccf-input-focus-border": dark ? "rgba(108,92,231,0.7)" : "#000",
    "--ccf-input-focus-outline": dark ? "3px solid rgba(108,92,231,0.18)" : "4px solid rgba(0,0,0,0.1)",
    "--ccf-option-bg": dark ? "#1a1730" : "#fff",
    "--ccf-err-color": dark ? "#f87171" : "#b42318",
    "--ccf-submit-bg": dark ? "linear-gradient(135deg,#6C5CE7,#4834d4)" : "#0d0c22",
    "--ccf-submit-opacity": validity.allValid ? "1" : "0.6",
  } as React.CSSProperties;

  /* Scoped static CSS injected once */
  const staticCss = useMemo(() => `
    .${scope} { width:100%; display:flex; justify-content:center; padding:0; background:transparent; background-color:transparent; color:var(--ccf-color); }
    .${scope}-wrap { width:100%; display:grid; grid-template-columns:${stacked ? "1fr" : "1fr 1fr"}; gap:24px; align-items:start; }
    @media(max-width:920px){ .${scope}-wrap { grid-template-columns:1fr; } }
    .${scope} *{ box-sizing:border-box; }

    .${scope}-highlight { position:absolute; border:1px solid #fff; border-radius:12px; z-index:0; width:0; height:0; top:0; left:0; box-shadow:0 0 5px #fff; transition:0.3s; }
    .${scope}-highlight--hidden { display:none; }
    .${scope}-highlight--number { width:346px; height:40px; top:92px; left:18px; }
    .${scope}-highlight--holder { width:264px; height:56px; top:156px; left:18px; }
    .${scope}-highlight--expire { width:86px; height:56px; top:156px; left:323px; }
    .${scope}-highlight--cvv { width:381px; height:91px; top:83px; left:18px; }
    @media(max-width:450px){
      .${scope}-highlight--number { width:300px; left:14px; }
      .${scope}-highlight--holder { width:220px; left:14px; }
      .${scope}-highlight--expire { left:280px; }
      .${scope}-highlight--cvv { width:330px; left:14px; }
    }

    .${scope}-card { position:relative; width:100%; max-width:${stacked ? "100%" : "420px"}; margin:0 auto; transform-style:preserve-3d; transition:0.8s; perspective:1000px; }
    .${scope}-card--flip { transform:rotateY(180deg); }

    .${scope}-front, .${scope}-back {
      width:100%; max-width:${stacked ? "100%" : "420px"}; height:233px; border-radius:20px; padding:24px 30px 30px;
      background:linear-gradient(to right bottom,#323941,#061018);
      box-shadow:0 33px 50px -15px rgba(50,55,63,0.66);
      color:#fff; overflow:hidden; margin:0 auto; backface-visibility:hidden; position:relative;
    }
    @media(max-width:450px){ .${scope}-front,.${scope}-back { padding:12px 14px 16px; height:206px; } }

    .${scope}-back { position:absolute; top:0; left:0; transform:rotateY(180deg); padding:24px 0 0; }

    .${scope}-front::before,.${scope}-back::before {
      content:""; position:absolute; border:16px solid var(--ccf-ring1); border-radius:100%;
      left:-17%; top:-45px; height:300px; width:300px; filter:blur(13px);
    }
    .${scope}-front::after,.${scope}-back::after {
      content:""; position:absolute; border:16px solid var(--ccf-ring2); border-radius:100%;
      width:300px; top:55%; left:-200px; height:300px; filter:blur(13px);
    }

    .${scope}-hide-line { height:40px; width:100%; background-color:#6b7280; position:relative; z-index:2; }

    .${scope}-cvv { position:relative; z-index:2; margin-top:24px; padding:0 32px; display:flex; flex-direction:column; align-items:flex-end; font-size:14px; font-weight:600; text-transform:uppercase; }
    .${scope}-cvv-field { margin-top:6px; background-color:#fff; border-radius:12px; height:44px; width:100%; color:#000; display:flex; align-items:center; justify-content:flex-end; padding:0 12px; font-size:25px; line-height:21px; }

    .${scope}-header { display:flex; align-items:center; justify-content:space-between; font-weight:600; margin-bottom:32px; position:relative; z-index:2; }

    .${scope}-number { font-size:22px; margin-bottom:32px; position:relative; z-index:2; display:flex; height:33px; overflow:hidden; color:#fff; }
    .${scope}-number .slot { display:inline-flex; margin-right:0; }
    .${scope}-number .slot:nth-child(4n) { margin-right:10px; }
    .${scope}-number .digit { display:flex; flex-direction:column; height:33px; line-height:33px; transition:transform 0.2s; }
    .${scope}-number .digit.filed { transform:translateY(-33px); }
    .${scope}-number .row { height:33px; display:block; }

    .${scope}-footer { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:2; }
    .${scope}-holder { text-transform:uppercase; }
    .${scope}-section-title { font-size:14px; font-weight:600; text-transform:uppercase; }

    .${scope}-form { border-radius:12px; background:var(--ccf-form-bg); width:100%; max-width:600px; margin:0 auto; padding:24px; border:1px solid var(--ccf-form-border); box-shadow:var(--ccf-form-shadow); display:grid; gap:12px; color:var(--ccf-color); backdrop-filter:var(--ccf-form-backdrop); }

    .${scope}-form label { display:block; margin:6px 0 4px; color:var(--ccf-label-color); font-weight:500; font-size:13px; }

    .${scope}-form input,.${scope}-form select {
      height:52px; display:block; width:100%; border:1px solid var(--ccf-input-border);
      padding:18px 20px; transition:outline 200ms ease,box-shadow 200ms ease,border-color 200ms ease;
      border-radius:12px; outline:none; background-color:var(--ccf-input-bg);
      color:var(--ccf-input-color); font-size:16px;
    }
    .${scope}-form input::placeholder { color:var(--ccf-input-placeholder); }
    .${scope}-form input:focus,.${scope}-form select:focus {
      border:1px solid var(--ccf-input-focus-border);
      outline:var(--ccf-input-focus-outline);
    }
    .${scope}-form select { padding:0 20px; }
    .${scope}-form select option { background:var(--ccf-option-bg); color:var(--ccf-input-color); }

    .${scope}-group { display:grid; grid-template-columns:2fr 1fr; gap:24px; }
    @media(max-width:560px){ .${scope}-group { grid-template-columns:1fr; } }
    .${scope}-date { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

    .${scope}-err { color:var(--ccf-err-color); font-size:12px; margin-top:4px; }

    .${scope}-submit {
      margin-top:8px; height:48px; border:none; border-radius:10px;
      background:var(--ccf-submit-bg); color:#fff; font-weight:600; cursor:pointer;
      opacity:var(--ccf-submit-opacity); transition:opacity 0.2s; width:100%;
    }
  `, [scope, stacked]);

  return (
    <section className={`${scope} ${className}`} style={cssVars}>
      {/* Inject scoped CSS once */}
      <style dangerouslySetInnerHTML={{ __html: staticCss }} />

      <div className={`${scope}-wrap`}>
        {/* CARD */}
        <section className={`${scope}-card${flip ? ` ${scope}-card--flip` : ""}`}>
          <div className={`${scope}-highlight ${highlightClass}`} />

          {/* FRONT */}
          <section className={`${scope}-front`}>
            <div className={`${scope}-header`}>
              <div>CreditCard</div>
              <svg xmlns="http://www.w3.org/2000/svg" height="40" width="60" viewBox="-96 -98.908 832 593.448">
                <path fill="#ff5f00" d="M224.833 42.298h190.416v311.005H224.833z" />
                <path d="M244.446 197.828a197.448 197.448 0 0175.54-155.475 197.777 197.777 0 100 311.004 197.448 197.448 0 01-75.54-155.53z" fill="#eb001b" />
                <path d="M621.101 320.394v-6.372h2.747v-1.319h-6.537v1.319h2.582v6.373zm12.691 0v-7.69h-1.978l-2.307 5.493-2.308-5.494h-1.977v7.691h1.428v-5.823l2.143 5h1.483l2.143-5v5.823z" fill="#f79e1b" />
                <path d="M640 197.828a197.777 197.777 0 01-320.015 155.474 197.777 197.777 0 000-311.004A197.777 197.777 0 01640 197.773z" fill="#f79e1b" />
              </svg>
            </div>

            <div className={`${scope}-number`} aria-label="Numéro de carte">
              {displayedSlots.map((slot, idx) => (
                <span key={idx} className="slot">
                  <span className={`digit${slot.filed ? " filed" : ""}`}>
                    <span className="row placeholder">#</span>
                    <span className="row value">{slot.textTop}</span>
                  </span>
                </span>
              ))}
            </div>

            <div className={`${scope}-footer`}>
              <div className={`${scope}-holder`}>
                <div className={`${scope}-section-title`}>Titulaire</div>
                <div>{holder || "NOM SUR LA CARTE"}</div>
              </div>
              <div>
                <div className={`${scope}-section-title`}>Expire</div>
                <span>{month || "MM"}</span>/
                <span>{year ? year.slice(-2) : "AA"}</span>
              </div>
            </div>
          </section>

          {/* BACK */}
          <section className={`${scope}-back`}>
            <div className={`${scope}-hide-line`} />
            <div className={`${scope}-cvv`}>
              <span>CVV</span>
              <div className={`${scope}-cvv-field`}>{"*".repeat(cvv.length)}</div>
            </div>
          </section>
        </section>

        {/* FORM */}
        <form className={`${scope}-form`} onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor={`${scope}-number`}>Numéro de carte</label>
            <input
              id={`${scope}-number`}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={formatNumberSpaces(number)}
              onChange={(e) => setNumber(clampDigits(e.target.value, 19))}
              onFocus={() => setFocusField("number")}
              onBlur={() => setFocusField(null)}
              aria-invalid={!validity.number}
            />
            {!validity.number && number.length >= 13 && (
              <small className={`${scope}-err`}>Numéro de carte invalide</small>
            )}
          </div>

          <div>
            <label htmlFor={`${scope}-holder`}>Titulaire de la carte</label>
            <input
              id={`${scope}-holder`}
              type="text"
              autoComplete="cc-name"
              placeholder="JEAN DUPONT"
              value={holder}
              onChange={(e) => setHolder(e.target.value.toUpperCase())}
              onFocus={() => setFocusField("holder")}
              onBlur={() => setFocusField(null)}
              aria-invalid={!validity.holder}
            />
          </div>

          <div className={`${scope}-group`}>
            <div>
              <label>Date d&apos;expiration</label>
              <div className={`${scope}-date`}>
                <select
                  id={`${scope}-month`}
                  value={month || ""}
                  onChange={(e) => setMonth(e.target.value)}
                  onFocus={() => setFocusField("expire")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.month}
                >
                  <option value="" disabled>Mois</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  id={`${scope}-year`}
                  value={year || ""}
                  onChange={(e) => setYear(e.target.value)}
                  onFocus={() => setFocusField("expire")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.year}
                >
                  <option value="" disabled>Année</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={`${scope}-cvv`}>CVV</label>
              <input
                id={`${scope}-cvv`}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="***"
                value={cvv}
                onChange={(e) => setCVV(clampDigits(e.target.value, 4))}
                onFocus={() => setFocusField("cvv")}
                onBlur={() => setFocusField(null)}
                aria-invalid={!validity.cvv}
              />
            </div>
          </div>

          {showSubmit && (
            <button
              className={`${scope}-submit`}
              type="submit"
              disabled={!validity.allValid}
              aria-disabled={!validity.allValid}
            >
              {validity.allValid ? "Confirmer" : "Remplissez tous les champs"}
            </button>
          )}
        </form>
      </div>
    </section>
  );
};

export { CreditCardForm };
export type { CardState, CardValidity };
