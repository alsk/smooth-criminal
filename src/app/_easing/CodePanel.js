"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const PATH_DESC =
  "An SVG path string that traces the easing curve from (0,0) to (1,1). Used by animation tools that accept path-based custom easings.";

const CSS_DESC =
  "A CSS timing function that approximates the curve as a series of linear stops. Natively supported in all modern browsers — no JavaScript required.";

const BEZIER_DESC_EXACT =
  "An exact CSS cubic-bezier() extracted from the curve's two control points. Works natively in all browsers and in any tool that accepts a timing function.";

const BEZIER_DESC_APPROX =
  "A CSS cubic-bezier() defines a curve with two control points (P1 and P2) that shape how a value eases between 0 and 1. It's the standard timing function format for CSS animations and transitions.";

const PATH_USAGE = `// GSAP CustomEase
const ease = CustomEase.create("ease", "M0,0 C…")

gsap.to(".el", {
  ease,
  duration: 1,
})`;

function buildLinearUsage(linearCss) {
  const m = linearCss.match(/^linear\((.+)\)$/);
  if (!m) return `.element {\n  transition: transform 1s linear(…);\n}`;
  const stops = m[1].split(',').map(s => s.trim());
  const preview = stops.length > 4
    ? [stops[0], stops[1], '…', stops[stops.length - 2], stops[stops.length - 1]].join(', ')
    : stops.join(', ');
  return `.element {\n  transition: transform 1s linear(${preview});\n}`;
}

const TW_DURATION_STEPS = [75, 100, 150, 200, 300, 500, 700, 1000];
function twDuration(ms) {
  return TW_DURATION_STEPS.includes(ms) ? `duration-${ms}` : `duration-[${ms}ms]`;
}

function buildBezierUsage(duration) {
  const s = (duration / 1000).toFixed(duration % 1000 === 0 ? 0 : 2).replace(/\.?0+$/, '') + 's';
  return `.element {
  transition: transform ${s} cubic-bezier(…);
}

/* Tailwind */
<div class="ease-[cubic-bezier(…)] transition ${twDuration(duration)}"></div>`;
}

export default function CodePanel({ pathString, linearCss, linearGoesBackward, cubicBezier, duration = 300 }) {
  return (
    <div className="codeStack">
      <CodeCell label="vector path" code={pathString} description={PATH_DESC} usage={PATH_USAGE} lang="js" />
      <CodeCell label="css linear()" code={linearCss} description={CSS_DESC} usage={buildLinearUsage(linearCss)} lang="css" showAlert={linearGoesBackward} />
      {cubicBezier && (
        <CodeCell
          label="css cubic-bezier()"
          code={cubicBezier.str}
          description={cubicBezier.exact ? BEZIER_DESC_EXACT : BEZIER_DESC_APPROX}
          usage={buildBezierUsage(duration)}
          lang="css"
          showAlert={!cubicBezier.exact}
          alertDesc="CSS cubic-bezier() doesn't allow extra anchor points. Use css linear() if you need the current curve."
          hideContent={!cubicBezier.exact}
        />
      )}
    </div>
  );
}

const STR_STYLE = { color: '#b8a46a' };
const EASING_HIGHLIGHT = {
  background: 'rgba(255, 210, 80, 0.14)',
  borderRadius: '3px',
  padding: '0 3px',
  boxShadow: 'inset 0 0 0 1px rgba(255, 210, 80, 0.22)',
};

function SyntaxHighlight({ code, lang }) {
  const parts = [];
  let key = 0;

  if (lang === 'css') {
    for (const line of code.split('\n')) {
      if (parts.length > 0) parts.push('\n');
      // HTML tag line: <tag ...> or </tag>
      const closeTag = line.match(/^(\s*)(<\/[\w-]+>)(.*)$/);
      if (closeTag) {
        parts.push(closeTag[1]);
        parts.push(<span key={key++} style={{ color: '#9bb5c4' }}>{closeTag[2]}</span>);
        parts.push(closeTag[3]);
        continue;
      }
      const openTag = line.match(/^(\s*)(<)([\w-]+)(\s+class=")([^"]*)(")([^>]*>)(.*)$/);
      if (openTag) {
        parts.push(openTag[1]);
        parts.push(<span key={key++} style={{ color: '#9bb5c4' }}>{openTag[2]}{openTag[3]}</span>);
        parts.push(<span key={key++} style={{ color: '#9db87a' }}>{openTag[4]}</span>);
        // highlight the easing class inside the class value
        const cls = openTag[5];
        const cm = cls.match(/(.*)(ease-\[cubic-bezier\([^)]*…[^)]*\)\])(.*)/);
        if (cm) {
          parts.push(<span key={key++} style={STR_STYLE}>{cm[1]}</span>);
          parts.push(<span key={key++} style={{ ...STR_STYLE, ...EASING_HIGHLIGHT }}>{cm[2]}</span>);
          parts.push(<span key={key++} style={STR_STYLE}>{cm[3]}</span>);
        } else {
          parts.push(<span key={key++} style={STR_STYLE}>{cls}</span>);
        }
        parts.push(<span key={key++} style={{ color: '#9db87a' }}>{openTag[6]}</span>);
        parts.push(<span key={key++} style={{ color: '#9bb5c4' }}>{openTag[7]}</span>);
        parts.push(openTag[8]);
        continue;
      }
      const sel = line.match(/^(\s*)([.#][\w-]+)(.*)$/);
      if (sel) {
        parts.push(sel[1]);
        parts.push(<span key={key++} style={{ color: '#f0899c' }}>{sel[2]}</span>);
        parts.push(sel[3]);
      } else {
        const prop = line.match(/^(\s*)([\w-]+)(\s*:)(.*)$/);
        if (prop) {
          parts.push(prop[1]);
          parts.push(<span key={key++} style={{ color: '#9bb5c4' }}>{prop[2]}</span>);
          parts.push(<span key={key++} style={{ color: '#6b6560' }}>{prop[3]}</span>);
          const valueStr = prop[4];
          const lm = valueStr.match(/(.*)((?:linear|cubic-bezier)\([^)]*…[^)]*\))(.*)/);
          if (lm) {
            parts.push(lm[1]);
            parts.push(<span key={key++} style={EASING_HIGHLIGHT}>{lm[2]}</span>);
            parts.push(lm[3]);
          } else {
            parts.push(valueStr);
          }
        } else {
          parts.push(line);
        }
      }
    }
    return <>{parts}</>;
  }

  // JS tokenizer: comments > strings > numbers > fn-calls > identifiers > punctuation > rest
  const re = /(\/\/[^\n]*)|(["'][^"'\n]*["'])|(\b\d+\b)|([\w$]+)(?=\s*\()|([\w$]+)|([.,()\[\]{}:;])|[\s\S]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1])      parts.push(<span key={key++} style={{ color: '#6b6560' }}>{m[1]}</span>);
    else if (m[2]) parts.push(<span key={key++} style={m[2].includes('…') ? { ...STR_STYLE, ...EASING_HIGHLIGHT } : STR_STYLE}>{m[2]}</span>);
    else if (m[3]) parts.push(<span key={key++} style={{ color: '#9db87a' }}>{m[3]}</span>);
    else if (m[4]) parts.push(<span key={key++} style={{ color: '#f0899c' }}>{m[4]}</span>);
    else if (m[5]) parts.push(m[5]);
    else if (m[6]) parts.push(<span key={key++} style={{ color: '#6b6560' }}>{m[6]}</span>);
    else           parts.push(m[0]);
  }
  return <>{parts}</>;
}

function CodeCell({ label, code, description, usage, showAlert, alertDesc, lang = 'js', hideContent = false }) {
  const [copied, setCopied] = useState(false);
  const [peaches, setPeaches] = useState([]);
  const copiedTimerRef = useRef(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const infoRef = useRef(null);

  useEffect(() => {
    if (!infoOpen) return;
    const handler = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [infoOpen]);

  useEffect(() => {
    if (!alertOpen) return;
    const handler = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) {
        setAlertOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [alertOpen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {}
    const peach = {
      id: Math.random(),
      x: `${8 + Math.random() * 60}%`,
      y: `${-(12 + Math.random() * 18)}px`,
      scale: 0.5 + Math.random() * 0.6,
      rotStart: `${-50 + Math.random() * 40}deg`,
      rotEnd: `${-20 + Math.random() * 40}deg`,
    };
    setPeaches((p) => [...p, peach]);
    setTimeout(() => setPeaches((p) => p.filter((x) => x.id !== peach.id)), 800);
  };

  return (
    <div className="codePanel">
      <div className="codeHeader">
        <div className="codeLabelRow" ref={infoRef}>
          <span>{label}</span>
          <button
            type="button"
            className={`infoBtn ${infoOpen ? "infoBtnActive" : ""}`}
            onClick={() => { if (infoOpen) setInfoOpen(false); else { setInfoOpen(true); setAlertOpen(false); } }}
            aria-label="About this format"
            aria-expanded={infoOpen}
          >
            <InfoIcon />
          </button>
          <div className={`infoPopup ${infoOpen ? "infoPopupOpen" : ""}`}>
            <p className="infoDesc">{description}</p>
          </div>
          {showAlert && (
            <button
              type="button"
              className={`alertBtn ${alertOpen ? "alertBtnActive" : ""}`}
              onClick={() => { if (alertOpen) setAlertOpen(false); else { setAlertOpen(true); setInfoOpen(false); } }}
              aria-label="Why CSS linear() may be inaccurate"
              aria-expanded={alertOpen}
            >
              <AlertIcon />
            </button>
          )}
          {showAlert && (
            <div className={`alertPopup ${alertOpen ? "alertPopupOpen" : ""}`}>
              <p className="infoDesc">
                {alertDesc ?? <>CSS linear() is monotonic, meaning its values can't go backward. <span className="alertHighlight">Your curve reverses in X.</span> Use the vector path instead.</>}
              </p>
            </div>
          )}
        </div>
        <div className="copyBtnWrap" style={hideContent ? { opacity: 0, pointerEvents: "none", transition: "opacity 250ms ease" } : { opacity: 1, transition: "opacity 250ms ease" }}>
          {peaches.map(({ id, x, y, scale, rotStart, rotEnd }) => (
            <img
              key={id}
              src="/assets/emoji.png"
              className="peachPop"
              style={{ '--x': x, '--y': y, '--scale': scale, '--rot-start': rotStart, '--rot-end': rotEnd }}
              alt=""
              aria-hidden="true"
            />
          ))}
          <button
            type="button"
            onClick={copy}
            className={`pushBtn copyBlockBtn ${copied ? "copyBlockBtnDone" : ""}`}
          >
            <motion.span className="pushFace" layout style={{ overflow: "hidden", whiteSpace: "nowrap" }} transition={{ duration: 0.15, type: "tween", ease: [0.2, 0, 0, 1] }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={copied ? "done" : "idle"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.12, delay: 0.1 } }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.1, ease: [0, 0, 0.6, 1] } }}
                  transition={{ duration: 0.12 }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  {copied ? <><CheckIcon /> Copied!</> : <><ClipboardIcon /> Copy code</>}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          </button>
        </div>
      </div>
      <div className={`codePanelBody ${!hideContent ? "codePanelBodyOpen" : ""}`}>
        <div className="codePanelBodyInner">
          <pre className="codeBlock">
            <code>{code}</code>
          </pre>
          <div className="usageDrawerWrap">
            <button
              type="button"
              className="howToBtn"
              onClick={() => setHowToOpen((v) => !v)}
              aria-expanded={howToOpen}
            >
              <svg
                className={`howToChevron ${howToOpen ? "howToChevronOpen" : ""}`}
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="2,3.5 5,6.5 8,3.5" />
              </svg>
              <span>How to integrate</span>
            </button>
            <div className={`codeDrawer ${howToOpen ? "codeDrawerOpen" : ""}`}>
              <div className="codeDrawerInner">
                <pre className="codeUsageBlock">
                  <SyntaxHighlight code={usage} lang={lang} />
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 1.5L12 11.5H1L6.5 1.5Z" />
      <line x1="6.5" y1="5.5" x2="6.5" y2="8" />
      <circle cx="6.5" cy="9.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" />
      <line x1="6.5" y1="5.5" x2="6.5" y2="9" />
      <circle cx="6.5" cy="3.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="0.5" width="8" height="10" rx="1.5" />
      <path d="M2.5 2.5H1.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1.5,7 5,10.5 11.5,2.5" />
    </svg>
  );
}
