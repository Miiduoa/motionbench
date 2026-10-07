import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BEZIER_PRESETS,
  SPRING_PRESETS,
  bezierCurve,
  exportCSS,
  exportJS,
  springCurve,
} from './motion';
import type { Bezier, Curve, Spring } from './motion';

type Mode = 'spring' | 'bezier';
type Locale = 'en' | 'zh';
// Preset thumbnails are static; keep numerical work outside the animation render loop.
const presetPaths = Object.fromEntries(
  [...SPRING_PRESETS, ...BEZIER_PRESETS].map((p) => [
    p.name,
    ('stiffness' in p ? springCurve(p) : bezierCurve(p)).points
      .filter((_, index) => index % 6 === 0)
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'}${(point.time * 52 + 2).toFixed(1)},${(22 - point.value * 16).toFixed(1)}`,
      )
      .join(' '),
  ]),
);
const words = {
  en: {
    subtitle: 'Spring & Bézier timing',
    title: 'Tune the feeling.',
    desc: 'Compare response curves and export CSS or JavaScript.',
    spring: 'Spring',
    bezier: 'Bézier',
    configure: 'CONFIGURATION',
    presets: 'START SOMEWHERE',
    stiffness: 'Stiffness',
    damping: 'Damping',
    mass: 'Mass',
    duration: 'Duration',
    settled: 'SETTLES IN',
    time: 'DURATION',
    overshoot: 'OVERSHOOT',
    regime: 'DAMPING',
    under: 'Under',
    critical: 'Critical',
    over: 'Over',
    replay: 'Replay',
    loop: 'Loop',
    preview: 'FEEL THE MOTION',
    live: 'Live preview',
    export: 'TAKE IT WITH YOU',
    exportDesc: 'The same curve, ready for your interface.',
    copy: 'Copy code',
    copied: 'Copied',
    download: 'Download',
    source: '181 samples · zero dependencies at runtime',
    foot: 'Position, timing, and the code between them.',
    reduced: 'Reduced motion is on. Preview stays at its final position.',
    capped: '12-second limit reached. Export snaps to its final position.',
    fine: 'Fine-tune with arrow keys',
    local: 'Runs entirely in your browser',
    position: 'POSITION',
    default: 'Reset',
    paused: 'At rest',
    moving: 'In motion',
    start: 'START',
    end: 'REST',
    copiedMessage: 'Code copied to clipboard.',
    copyError: 'Clipboard unavailable. Download the file instead.',
    downloadMessage: 'File download started.',
    downloadError: 'Download unavailable. Select and copy the code below.',
    numeric: 'Edit numeric value',
    type: 'Export format',
    snippet: 'Exported code',
    status: 'Preview status',
    now: 'TIME',
    control: 'CONTROL POINTS',
    help: 'Positive damping dissipates energy. Less damping means more bounce.',
  },
  zh: {
    subtitle: '彈簧與貝茲時間曲線',
    title: '調出對的節奏。',
    desc: '比較響應曲線，匯出 CSS 或 JavaScript。',
    spring: '彈簧',
    bezier: '貝茲',
    configure: '參數設定',
    presets: '從這裡開始',
    stiffness: '剛度',
    damping: '阻尼',
    mass: '質量',
    duration: '時間',
    settled: '穩定時間',
    time: '持續時間',
    overshoot: '超越幅度',
    regime: '阻尼狀態',
    under: '欠阻尼',
    critical: '臨界',
    over: '過阻尼',
    replay: '重播',
    loop: '循環',
    preview: '感受動態',
    live: '即時預覽',
    export: '帶走這條曲線',
    exportDesc: '與預覽相同的曲線，可直接用在介面。',
    copy: '複製程式碼',
    copied: '已複製',
    download: '下載',
    source: '181 個取樣點 · 執行時不需外部套件',
    foot: '從位置與時間，到實際程式碼。',
    reduced: '已啟用減少動態效果；預覽停在終點。',
    capped: '已達 12 秒上限；匯出會在終點吸附至靜止位置。',
    fine: '方向鍵可微調',
    local: '完全在瀏覽器內執行',
    position: '位置',
    default: '重設',
    paused: '已靜止',
    moving: '移動中',
    start: '起點',
    end: '終點',
    copiedMessage: '已複製程式碼。',
    copyError: '無法存取剪貼簿，請下載檔案。',
    downloadMessage: '已開始下載檔案。',
    downloadError: '無法下載，請選取下方程式碼複製。',
    numeric: '編輯數值',
    type: '匯出格式',
    snippet: '匯出程式碼',
    status: '預覽狀態',
    now: '時間',
    control: '控制點',
    help: '阻尼會消耗能量；數值越小，彈跳越明顯。',
  },
};
function Icon({ name }: { name: 'replay' | 'copy' | 'download' | 'arrow' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {name === 'replay' ? (
        <>
          <path d="M4 7a6 6 0 1 1 0 6M4 3v4h4" />
        </>
      ) : name === 'copy' ? (
        <>
          <rect x="7" y="7" width="9" height="10" rx="1" />
          <path d="M12 7V3H3v10h4" />
        </>
      ) : name === 'download' ? (
        <>
          <path d="M10 2v11m-4-4 4 4 4-4M3 13v4h14v-4" />
        </>
      ) : (
        <path d="m5 15 10-10M5 5h10v10" />
      )}
    </svg>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  unit?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const id = React.useId();
  useEffect(() => {
    setDraft(String(value));
    setInvalid(false);
  }, [value]);
  function commit() {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed) || parsed < min || parsed > max) {
      setInvalid(true);
      return;
    }
    const rounded = Math.round((parsed - min) / step) * step + min;
    onChange(Number(rounded.toFixed(3)));
    setDraft(String(Number(rounded.toFixed(3))));
    setInvalid(false);
  }
  return (
    <div className="parameter">
      <div className="parameter-top">
        <label htmlFor={id}>{label}</label>
        <div className={`number-box ${invalid ? 'invalid' : ''}`}>
          <input
            aria-label={`${label} value`}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commit();
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                setDraft(String(value));
                setInvalid(false);
                e.currentTarget.blur();
              }
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      <div className="range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {invalid && (
        <span className="field-error" id={`${id}-error`}>
          {min}–{max}
        </span>
      )}
    </div>
  );
}
function readCurve(curve: Curve, t: number) {
  const index = Math.min(curve.points.length - 1, Math.max(0, t) * (curve.points.length - 1));
  const left = Math.floor(index),
    right = Math.min(curve.points.length - 1, left + 1);
  return (
    curve.points[left].value +
    (curve.points[right].value - curve.points[left].value) * (index - left)
  );
}
function Chart({
  curve,
  time,
  locale,
  pinned,
}: {
  curve: Curve;
  time: number;
  locale: Locale;
  pinned: { curve: Curve; name: string } | null;
}) {
  const w = words[locale];
  const width = 850,
    height = 350,
    left = 52,
    top = 38,
    plotWidth = 753,
    plotHeight = 248;
  const allPoints = [...curve.points, ...(pinned?.curve.points ?? [])];
  const lower = Math.min(-0.1, ...allPoints.map((p) => p.value - 0.08));
  const upper = Math.max(1.2, ...allPoints.map((p) => p.value + 0.15));
  const x = (v: number) => left + v * plotWidth;
  const y = (v: number) => top + plotHeight - ((v - lower) / (upper - lower)) * plotHeight;
  const path = curve.points
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(2)},${y(p.value).toFixed(2)}`)
    .join(' ');
  const pinnedPath = pinned?.curve.points
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(2)},${y(p.value).toFixed(2)}`)
    .join(' ');
  const current = readCurve(curve, time);
  return (
    <svg
      className="curve-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${locale === 'en' ? 'Position versus time curve' : '位置與時間曲線'}; ${curve.duration} ms; ${w.overshoot} ${(curve.overshoot * 100).toFixed(1)}%`}
    >
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#d9be85" stopOpacity=".13" />
          <stop offset="1" stopColor="#d9be85" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={top} y2={top + plotHeight} className="grid-line" />
          <text x={x(t)} y={top + plotHeight + 27} textAnchor="middle" className="axis-text">
            {Math.round(t * curve.duration)}
          </text>
        </g>
      ))}
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1={left}
            x2={left + plotWidth}
            y1={y(t)}
            y2={y(t)}
            className={t === 1 ? 'rest-line' : 'grid-line'}
          />
          <text x={left - 15} y={y(t) + 4} textAnchor="end" className="axis-text">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={left} y={17} className="axis-label">
        {w.position}
      </text>
      <text x={left + plotWidth} y={height - 12} textAnchor="end" className="axis-label">
        {w.now} / ms
      </text>
      <text x={left + plotWidth - 4} y={y(1) - 10} textAnchor="end" className="target-label">
        {locale === 'en' ? 'TARGET' : '目標位置'}
      </text>
      <path d={pinnedPath} stroke="#9aab94" strokeWidth="1.8" strokeDasharray="5 5" fill="none" />
      <path d={`${path} L${x(1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#fill)" />
      <path
        d={path}
        stroke="#d9be85"
        strokeWidth="2.7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={x(time)}
        x2={x(time)}
        y1={top}
        y2={top + plotHeight}
        stroke="#d9be85"
        strokeOpacity=".25"
        strokeDasharray="3 5"
      />
      <circle cx={x(time)} cy={y(current)} r="9" fill="#d9be85" opacity=".12" />
      <circle
        cx={x(time)}
        cy={y(current)}
        r="4.5"
        fill="#efdab1"
        stroke="#1b201f"
        strokeWidth="2"
      />
    </svg>
  );
}
export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const w = words[locale];
  const [mode, setMode] = useState<Mode>('spring');
  const [spring, setSpring] = useState<Spring>(SPRING_PRESETS[0]);
  const [bezier, setBezier] = useState<Bezier>(BEZIER_PRESETS[0]);
  const [format, setFormat] = useState<'css' | 'js'>('css');
  const [pinned, setPinned] = useState<{ curve: Curve; name: string } | null>(null);
  const [time, setTime] = useState(0);
  const [loop, setLoop] = useState(true);
  const [run, setRun] = useState(0);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const curve = useMemo(
    () => (mode === 'spring' ? springCurve(spring) : bezierCurve(bezier)),
    [mode, spring, bezier],
  );
  const code = useMemo(
    () =>
      format === 'css' ? exportCSS(curve, mode === 'bezier' ? bezier : undefined) : exportJS(curve),
    [format, curve, mode, bezier],
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-Hant';
  }, [locale]);
  useEffect(() => {
    if (reduced) {
      setTime(1);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    let pausedAt: number | null = null;
    function tick(now: number) {
      if (document.hidden) {
        pausedAt ??= now;
        frame = requestAnimationFrame(tick);
        return;
      }
      if (pausedAt !== null && start !== null) {
        start += now - pausedAt;
        pausedAt = null;
      }
      start ??= now;
      const elapsed = now - start;
      setTime(Math.min(1, elapsed / curve.duration));
      if (elapsed < curve.duration || loop) {
        if (elapsed > curve.duration + 1100) start = now;
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [curve, loop, run, reduced]);
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );
  function notify(message: string) {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 5000);
  }
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      notify(w.copiedMessage);
    } catch {
      notify(w.copyError);
    }
  }
  function download() {
    try {
      const blob = new Blob([code], {
        type: format === 'css' ? 'text/css;charset=utf-8' : 'text/javascript;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `motionbench-${mode}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(w.downloadMessage);
    } catch {
      notify(w.downloadError);
    }
  }
  const z = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  const regime = Math.abs(z - 1) < 0.001 ? w.critical : z < 1 ? w.under : w.over;
  const selected =
    mode === 'spring'
      ? SPRING_PRESETS.find(
          (p) =>
            p.stiffness === spring.stiffness &&
            p.damping === spring.damping &&
            p.mass === spring.mass,
        )?.name
      : BEZIER_PRESETS.find(
          (p) =>
            p.x1 === bezier.x1 &&
            p.y1 === bezier.y1 &&
            p.x2 === bezier.x2 &&
            p.y2 === bezier.y2 &&
            p.duration === bezier.duration,
        )?.name;
  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="brand" href="#" aria-label="Motionbench home">
          <svg viewBox="0 0 34 27" width="33" height="27" fill="none" aria-hidden="true">
            <path d="M1 22 9 5l7 17L25 5l8 17" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="25" cy="5" r="3.2" fill="currentColor" />
          </svg>
          <span>
            motionbench<span className="brand-period">.</span>
          </span>
        </a>
        <div className="masthead-center">
          <span className="status-dot" />
          {w.subtitle}
        </div>
        <button
          className="locale-button"
          onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
          aria-label={locale === 'en' ? '切換繁體中文' : 'Switch to English'}
        >
          {locale === 'en' ? '繁中' : 'EN'}
          <span>↗</span>
        </button>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">
              THE MOTION WORKBENCH <span> / 001</span>
            </div>
            <h1>{w.title}</h1>
            <p>{w.desc}</p>
          </div>
          <div
            className="mode-switch"
            role="group"
            aria-label={locale === 'en' ? 'Curve model' : '曲線模型'}
          >
            <button aria-pressed={mode === 'spring'} onClick={() => setMode('spring')}>
              <span className="model-icon">∿</span>
              {w.spring}
            </button>
            <button aria-pressed={mode === 'bezier'} onClick={() => setMode('bezier')}>
              <span className="model-icon">⌁</span>
              {w.bezier}
            </button>
          </div>
        </div>
        <div className="workbench">
          <section
            className="visual-panel"
            aria-label={locale === 'en' ? 'Motion visualization' : '動態視覺化'}
          >
            <div className="chart-top">
              <div className="section-label">
                <span className="index">01</span>
                {locale === 'en' ? 'THE CURVE' : '動態曲線'}
              </div>
              <span className="precision">
                <span className="mini-cross">＋</span>
                {mode === 'spring' ? 'mẍ + cẋ + k(x−1) = 0' : 'B(t) = (1−t)³P₀ + … + t³P₃'}
              </span>
            </div>
            <div className="metrics">
              <div>
                <span>{mode === 'spring' ? w.settled : w.time}</span>
                <strong>
                  {curve.duration}
                  <small>ms</small>
                </strong>
              </div>
              <div>
                <span>{w.overshoot}</span>
                <strong>
                  {(curve.overshoot * 100).toFixed(1)}
                  <small>%</small>
                </strong>
              </div>
              <div className="regime-metric">
                <span>{mode === 'spring' ? w.regime : w.control}</span>
                <strong className="regime">
                  {mode === 'spring' ? regime : 'Cubic'}
                  <small>{mode === 'spring' ? `ζ ${z.toFixed(2)}` : '4 points'}</small>
                </strong>
              </div>
            </div>
            <Chart curve={curve} time={time} locale={locale} pinned={pinned} />
            <div className="chart-legend">
              <span>
                <i className="legend-line" />
                {mode === 'spring' ? w.spring : w.bezier} {locale === 'en' ? 'response' : '響應'}
              </span>
              <span>
                <i className="legend-dash" />
                {locale === 'en' ? 'Resting position' : '靜止位置'}
              </span>
              <button
                className="pin-button"
                onClick={() =>
                  setPinned(
                    pinned
                      ? null
                      : {
                          curve,
                          name: selected ?? (mode === 'spring' ? 'Custom spring' : 'Custom Bézier'),
                        },
                  )
                }
              >
                {pinned
                  ? locale === 'en'
                    ? '× Clear reference'
                    : '× 清除參考'
                  : locale === 'en'
                    ? '+ Pin to compare'
                    : '+ 固定並比較'}
              </button>
            </div>
            {pinned && (
              <p className="comparison-note">
                {locale === 'en' ? 'Reference' : '參考'}: {pinned.name} · {pinned.curve.duration} ms{' '}
                <span>
                  {' '}
                  /{' '}
                  {locale === 'en'
                    ? 'overlaid at normalized time (0–100%)'
                    : '以正規化時間（0–100%）疊合比較'}
                </span>
              </p>
            )}
            <div className="preview">
              <div className="preview-top">
                <div className="section-label">
                  <span className="index">02</span>
                  {w.preview}
                </div>
                <div className="playback-controls">
                  <label className="loop-toggle">
                    <input
                      type="checkbox"
                      checked={loop}
                      disabled={reduced}
                      onChange={(e) => setLoop(e.target.checked)}
                    />
                    <span className="toggle-track" />
                    {w.loop}
                  </label>
                  <button
                    className="replay-button"
                    disabled={reduced}
                    onClick={() => setRun((r) => r + 1)}
                  >
                    <Icon name="replay" />
                    {w.replay}
                  </button>
                </div>
              </div>
              <div className="motion-track">
                <div className="track-line" />
                <div className="start-mark" />
                <div className="end-mark" />
                <div
                  className="motion-object"
                  style={{ left: `${12 + readCurve(curve, time) * 63}%` }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 25 25" width="25" height="25" fill="none">
                    <path d="M4 18 9 7l4 11 5-11 4 11" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                </div>
                <span className="track-start">{w.start}</span>
                <span className="track-end">{w.end}</span>
              </div>
              <div className="preview-bottom">
                <span className={`preview-status ${time < 1 ? 'active' : ''}`}>
                  <i />
                  {time < 1 ? w.moving : w.paused}
                </span>
                <span>
                  {Math.round(time * curve.duration)}{' '}
                  <span className="muted">/ {curve.duration} ms</span>
                </span>
              </div>
              {reduced && <p className="notice">{w.reduced}</p>}
              {curve.capped && <p className="notice">{w.capped}</p>}
            </div>
          </section>
          <aside className="control-panel">
            <div className="control-heading">
              <span className="section-label">{w.configure}</span>
              <button
                className="text-button"
                onClick={() => {
                  if (mode === 'spring') setSpring(SPRING_PRESETS[0]);
                  else setBezier(BEZIER_PRESETS[0]);
                }}
              >
                {w.default}
              </button>
            </div>
            <div className="parameters">
              {mode === 'spring' ? (
                <>
                  <Slider
                    label={w.stiffness}
                    value={spring.stiffness}
                    min={40}
                    max={500}
                    step={1}
                    onChange={(stiffness) => setSpring((s) => ({ ...s, stiffness }))}
                  />
                  <Slider
                    label={w.damping}
                    value={spring.damping}
                    min={5}
                    max={50}
                    step={1}
                    onChange={(damping) => setSpring((s) => ({ ...s, damping }))}
                  />
                  <Slider
                    label={w.mass}
                    value={spring.mass}
                    min={0.2}
                    max={2}
                    step={0.1}
                    onChange={(mass) => setSpring((s) => ({ ...s, mass }))}
                  />
                </>
              ) : (
                <>
                  <div className="bezier-fields">
                    {(['x1', 'y1', 'x2', 'y2'] as const).map((key) => (
                      <Slider
                        key={key}
                        label={key.toUpperCase()}
                        value={bezier[key]}
                        min={key.startsWith('x') ? 0 : -0.5}
                        max={key.startsWith('x') ? 1 : 1.5}
                        step={0.01}
                        onChange={(value) => setBezier((b) => ({ ...b, [key]: value }))}
                      />
                    ))}
                  </div>
                  <Slider
                    label={w.duration}
                    value={bezier.duration}
                    min={100}
                    max={2000}
                    step={10}
                    unit="ms"
                    onChange={(duration) => setBezier((b) => ({ ...b, duration }))}
                  />
                </>
              )}
              <p className="control-help">
                {mode === 'spring'
                  ? w.help
                  : locale === 'en'
                    ? 'X controls time. Y controls position — including overshoot.'
                    : 'X 控制時間；Y 控制位置，也允許超越終點。'}
              </p>
            </div>
            <div className="presets">
              <div className="section-label">
                {w.presets}
                <span className="muted">04</span>
              </div>
              {(mode === 'spring' ? SPRING_PRESETS : BEZIER_PRESETS).map((p, i) => (
                <button
                  className={`preset ${selected === p.name ? 'selected' : ''}`}
                  key={p.name}
                  aria-pressed={selected === p.name}
                  onClick={() => {
                    if ('stiffness' in p) setSpring(p);
                    else setBezier(p);
                  }}
                >
                  <span className="preset-number">0{i + 1}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.note}</small>
                  </span>
                  <svg viewBox="0 0 56 25" width="56" height="25" aria-hidden="true">
                    <path
                      d={presetPaths[p.name]}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <p className="keyboard-note">
              <kbd>←</kbd>
              <kbd>→</kbd>
              {w.fine}
            </p>
          </aside>
        </div>
        <section className="export-panel" aria-labelledby="export-heading">
          <div className="export-description">
            <div className="section-label">
              <span className="index">03</span>
              <h2 id="export-heading">{w.export}</h2>
            </div>
            <p>{w.exportDesc}</p>
          </div>
          <div className="export-actions">
            <div className="format-switch" role="group" aria-label={w.type}>
              <button aria-pressed={format === 'css'} onClick={() => setFormat('css')}>
                CSS
              </button>
              <button aria-pressed={format === 'js'} onClick={() => setFormat('js')}>
                JavaScript
              </button>
            </div>
            <button
              className="download-button"
              onClick={download}
              title={w.download}
              aria-label={w.download}
            >
              <Icon name="download" />
            </button>
            <button className="copy-button" onClick={copy}>
              <Icon name="copy" />
              {w.copy}
            </button>
          </div>
          <details className="code-disclosure">
            <summary>
              <span>
                {format === 'css'
                  ? `animation: travel ${curve.duration}ms ${mode === 'spring' ? 'linear(…)' : `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`} both;`
                  : `playMotion(element, 240) // ${curve.duration} ms`}
              </span>
              <span className="expand-code">{locale === 'en' ? 'View code' : '檢視程式碼'} ＋</span>
            </summary>
            <pre tabIndex={0} aria-label={w.snippet}>
              <code>{code}</code>
            </pre>
          </details>
          <div className="export-note">
            <span>
              {format === 'css' && mode === 'bezier'
                ? locale === 'en'
                  ? 'Exact cubic-bezier() timing · reduced-motion fallback included'
                  : '原生 cubic-bezier() 曲線 · 包含減少動態效果處理'
                : w.source}
            </span>
            <span role="status" className="feedback">
              {feedback}
            </span>
          </div>
        </section>
      </main>
      <footer>
        <span>{w.foot}</span>
        <span>
          <i className="status-dot" />
          {w.local}
        </span>
        <span className="version">
          v0.1 <span>↗</span>
        </span>
      </footer>
    </div>
  );
}
