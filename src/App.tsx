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

import { curveProgress, readCurve } from './playback';

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
    subtitle: 'Motion parameters',
    spring: 'Spring',
    bezier: 'Bézier',
    configure: 'Parameters',
    presets: 'Presets',
    stiffness: 'Stiffness',
    damping: 'Damping',
    mass: 'Mass',
    duration: 'Duration',
    settled: 'Settles in',
    time: 'Duration',
    overshoot: 'Overshoot',
    regime: 'Damping',
    under: 'Underdamped',
    critical: 'Critical',
    over: 'Overdamped',
    replay: 'Replay',
    loop: 'Loop',
    preview: 'Component preview',
    export: 'Export current curve',
    exportDesc:
      'Translation timing for your own element. The preview component markup is not included.',
    copy: 'Copy code',
    download: 'Download',
    source: '181 samples · no runtime dependency in the exported code',
    reduced: 'Reduced motion is on. Both previews stay at their final positions.',
    capped: '12-second limit reached. Export snaps to its final position.',
    fine: 'Arrow keys adjust sliders.',
    local: 'Calculated in your browser',
    position: 'Position',
    default: 'Reset',
    paused: 'Finished',
    moving: 'Playing',
    copiedMessage: 'Code copied to clipboard.',
    copyError: 'Clipboard unavailable. Download the file instead.',
    downloadMessage: 'File download started.',
    downloadError: 'Download unavailable. Select and copy the code below.',
    type: 'Export format',
    snippet: 'Exported code',
    now: 'Time',
    control: 'Control points',
    help: 'Lower damping increases bounce. Mass and stiffness also change the settling time.',
    current: 'Current',
    reference: 'Reference',
    pin: 'Keep as reference',
    clear: 'Clear reference',
    comparison: 'Both start together and keep their own durations.',
    choose: 'Preview component',
    drawer: 'Side panel',
    tabs: 'Tab indicator',
    toast: 'Toast',
    empty: 'Keep a reference, then change a parameter or preset to compare the two motions.',
    response: 'Response curve',
    analysis: 'Use the graph to inspect overshoot and settling.',
    custom: 'Custom',
    normal:
      'Curves are overlaid at normalized time (0–100%); previews above use elapsed milliseconds.',
  },
  zh: {
    subtitle: '動畫參數比較',
    spring: '彈簧',
    bezier: '貝茲',
    configure: '參數',
    presets: '預設值',
    stiffness: '剛度',
    damping: '阻尼',
    mass: '質量',
    duration: '持續時間',
    settled: '穩定時間',
    time: '持續時間',
    overshoot: '超越幅度',
    regime: '阻尼狀態',
    under: '欠阻尼',
    critical: '臨界',
    over: '過阻尼',
    replay: '重播',
    loop: '循環',
    preview: '元件預覽',
    export: '匯出目前曲線',
    exportDesc: '匯出供其他元素使用的位移時間曲線，不含此處的元件樣式。',
    copy: '複製程式碼',
    download: '下載',
    source: '181 個取樣點 · 匯出程式碼不需執行時套件',
    reduced: '已啟用減少動態效果，兩個預覽都停在終點。',
    capped: '已達 12 秒上限，匯出會在終點吸附至靜止位置。',
    fine: '方向鍵可調整滑桿。',
    local: '在瀏覽器內計算',
    position: '位置',
    default: '重設',
    paused: '已完成',
    moving: '播放中',
    copiedMessage: '已複製程式碼。',
    copyError: '無法存取剪貼簿，請下載檔案。',
    downloadMessage: '已開始下載檔案。',
    downloadError: '無法下載，請選取下方程式碼複製。',
    type: '匯出格式',
    snippet: '匯出程式碼',
    now: '時間',
    control: '控制點',
    help: '阻尼較小時，彈跳較明顯。質量與剛度也會影響穩定時間。',
    current: '目前',
    reference: '參考',
    pin: '保留為參考',
    clear: '清除參考',
    comparison: '兩者同時開始，各自使用原本的持續時間。',
    choose: '預覽元件',
    drawer: '側邊面板',
    tabs: '頁籤指示',
    toast: '提示訊息',
    empty: '先保留一組參考，再調整參數或切換預設值，就能比較兩者的動態。',
    response: '響應曲線',
    analysis: '用曲線檢查超越幅度與穩定時間。',
    custom: '自訂',
    normal: '曲線以正規化時間（0–100%）疊合；上方元件則以實際毫秒數播放。',
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
            aria-label={label}
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
    height = 250,
    left = 52,
    top = 27,
    plotWidth = 753,
    plotHeight = 164;
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
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={top} y2={top + plotHeight} className="grid-line" />
          <text x={x(t)} y={top + plotHeight + 27} textAnchor="middle" className="axis-text">
            {pinned ? `${Math.round(t * 100)}%` : Math.round(t * curve.duration)}
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
        {pinned ? (locale === 'en' ? 'Normalized time' : '正規化時間') : `${w.now} / ms`}
      </text>
      <text x={left + plotWidth - 4} y={y(1) - 10} textAnchor="end" className="target-label">
        {locale === 'en' ? 'TARGET' : '目標位置'}
      </text>
      <path
        d={pinnedPath}
        stroke="var(--reference)"
        strokeWidth="1.8"
        strokeDasharray="5 5"
        fill="none"
      />
      <path
        d={path}
        stroke="var(--accent)"
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
        stroke="var(--accent)"
        strokeOpacity=".25"
        strokeDasharray="3 5"
      />
      <circle cx={x(time)} cy={y(current)} r="9" fill="var(--accent)" opacity=".12" />
      <circle
        cx={x(time)}
        cy={y(current)}
        r="4.5"
        fill="var(--accent)"
        stroke="#242320"
        strokeWidth="2"
      />
    </svg>
  );
}
type PreviewKind = 'drawer' | 'tabs' | 'toast';
function ComponentPreview({
  kind,
  curve,
  progress,
  locale,
  label,
  name,
  reference = false,
}: {
  kind: PreviewKind;
  curve: Curve;
  progress: number;
  locale: Locale;
  label: string;
  name: string;
  reference?: boolean;
}) {
  const value = readCurve(curve, progress);
  const w = words[locale];
  return (
    <figure className={`component-preview ${reference ? 'reference-preview' : ''}`}>
      <figcaption>
        <div>
          <span className="curve-key" />
          {label}
          <strong>{name}</strong>
        </div>
        <span>{curve.duration} ms</span>
      </figcaption>
      <div className={`component-stage stage-${kind}`} aria-hidden="true">
        {kind === 'drawer' ? (
          <>
            <div className="mock-app">
              <span className="mock-heading" />
              {[0, 1, 2].map((i) => (
                <div className="mock-row" key={i}>
                  <i />
                  <span />
                </div>
              ))}
            </div>
            <div
              className="drawer-component"
              style={{ transform: `translateX(${(1 - value) * 108}%)` }}
            >
              <div className="drawer-title">
                {locale === 'en' ? 'Details' : '詳細資料'}
                <span>×</span>
              </div>
              <div className="drawer-content">
                <span>{locale === 'en' ? 'Name' : '名稱'}</span>
                <i />
                <span>{locale === 'en' ? 'Description' : '說明'}</span>
                <i className="tall" />
              </div>
            </div>
          </>
        ) : kind === 'tabs' ? (
          <div className="tabs-component">
            <div className="mock-tabs">
              <span>{locale === 'en' ? 'Overview' : '總覽'}</span>
              <span>{locale === 'en' ? 'Activity' : '動態'}</span>
              <span>{locale === 'en' ? 'Settings' : '設定'}</span>
              <i style={{ transform: `translateX(${value * 100}%)` }} />
            </div>
            <div className="tab-content">
              <i />
              <i />
              <i />
            </div>
          </div>
        ) : (
          <>
            <div className="mock-app">
              <span className="mock-heading" />
              {[0, 1, 2].map((i) => (
                <div className="mock-row" key={i}>
                  <i />
                  <span />
                </div>
              ))}
            </div>
            <div
              className="toast-component"
              style={{ transform: `translateX(${(1 - value) * 130}%)` }}
            >
              <span className="toast-check">✓</span>
              <div>
                {locale === 'en' ? 'Changes saved' : '已儲存變更'}
                <small>
                  {locale === 'en' ? 'Your changes are up to date.' : '所有變更已更新。'}
                </small>
              </div>
              <span className="toast-close">×</span>
            </div>
          </>
        )}
      </div>
      <div className="component-progress">
        <span>{progress < 1 ? w.moving : w.paused}</span>
        <span>
          {Math.round(progress * curve.duration)} / {curve.duration} ms
        </span>
      </div>
    </figure>
  );
}
export default function App() {
  const [locale, setLocale] = useState<Locale>('zh');
  const w = words[locale];
  const [mode, setMode] = useState<Mode>('spring');
  const [spring, setSpring] = useState<Spring>(SPRING_PRESETS[0]);
  const [bezier, setBezier] = useState<Bezier>(BEZIER_PRESETS[0]);
  const [format, setFormat] = useState<'css' | 'js'>('css');
  const [pinned, setPinned] = useState<{ curve: Curve; name: string } | null>(null);
  const [time, setTime] = useState(0);
  const [previewKind, setPreviewKind] = useState<PreviewKind>('drawer');
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
  const playbackDuration = Math.max(curve.duration, pinned?.curve.duration ?? 0);
  const elapsed = time * playbackDuration;
  const currentProgress = reduced ? 1 : curveProgress(elapsed, curve.duration);
  const referenceProgress = reduced
    ? 1
    : curveProgress(elapsed, pinned?.curve.duration ?? curve.duration);
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
    setTime(0);
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
      setTime(Math.min(1, elapsed / playbackDuration));
      if (elapsed < playbackDuration || loop) {
        if (elapsed > playbackDuration + 1100) start = now;
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [curve, loop, run, reduced, pinned, playbackDuration]);
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
  const currentName = selected ?? w.custom;
  function toggleReference() {
    setPinned(pinned ? null : { curve, name: currentName });
    setRun((r) => r + 1);
  }
  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="brand" href="#" aria-label="Motionbench">
          Motionbench
        </a>
        <h1>{w.subtitle}</h1>
        <nav>
          <a href="https://github.com/Miiduoa/motionbench" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <button
            className="locale-button"
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            aria-label={locale === 'en' ? '切換繁體中文' : 'Switch to English'}
          >
            {locale === 'en' ? '繁體中文' : 'English'}
          </button>
        </nav>
      </header>
      <main>
        <div className="workbench">
          <aside className="control-panel" aria-label={w.configure}>
            <div
              className="mode-switch"
              role="group"
              aria-label={locale === 'en' ? 'Curve model' : '曲線模型'}
            >
              <button aria-pressed={mode === 'spring'} onClick={() => setMode('spring')}>
                {w.spring}
              </button>
              <button aria-pressed={mode === 'bezier'} onClick={() => setMode('bezier')}>
                {w.bezier}
              </button>
            </div>
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
              <div className="section-label">{w.presets}</div>
              {(mode === 'spring' ? SPRING_PRESETS : BEZIER_PRESETS).map((p) => (
                <button
                  className={`preset ${selected === p.name ? 'selected' : ''}`}
                  key={p.name}
                  aria-pressed={selected === p.name}
                  onClick={() => {
                    if ('stiffness' in p) setSpring(p);
                    else setBezier(p);
                  }}
                >
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {'stiffness' in p
                        ? `k ${p.stiffness} · c ${p.damping} · m ${p.mass}`
                        : `${p.x1}, ${p.y1}, ${p.x2}, ${p.y2}`}
                    </small>
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
          <section className="visual-panel" aria-label={w.preview}>
            <div className="preview-toolbar">
              <h2>{w.preview}</h2>
              <div className="playback-controls">
                <label className="loop-toggle">
                  <input
                    type="checkbox"
                    checked={loop}
                    disabled={reduced}
                    onChange={(e) => setLoop(e.target.checked)}
                  />
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
            <div className="component-picker" role="group" aria-label={w.choose}>
              {(['drawer', 'tabs', 'toast'] as const).map((kind) => (
                <button
                  key={kind}
                  aria-pressed={previewKind === kind}
                  onClick={() => {
                    setPreviewKind(kind);
                    setRun((r) => r + 1);
                  }}
                >
                  {w[kind]}
                </button>
              ))}
            </div>
            <div className={`comparison-stage ${pinned ? 'has-reference' : ''}`}>
              <ComponentPreview
                kind={previewKind}
                curve={curve}
                progress={currentProgress}
                locale={locale}
                label={w.current}
                name={currentName}
              />
              {pinned ? (
                <ComponentPreview
                  kind={previewKind}
                  curve={pinned.curve}
                  progress={referenceProgress}
                  locale={locale}
                  label={w.reference}
                  name={pinned.name}
                  reference
                />
              ) : (
                <div className="reference-placeholder">
                  <p>{w.empty}</p>
                  <button className="pin-button" onClick={toggleReference}>
                    {w.pin}
                  </button>
                </div>
              )}
            </div>
            <div className="comparison-toolbar">
              <p>
                {pinned
                  ? w.comparison
                  : locale === 'en'
                    ? 'Change a parameter to replay the component.'
                    : '調整參數後，元件會重新播放。'}
              </p>
              {pinned && (
                <button className="text-button" onClick={toggleReference}>
                  {w.clear}
                </button>
              )}
            </div>
            {reduced && (
              <p className="notice" role="status">
                {w.reduced}
              </p>
            )}
            {(curve.capped || pinned?.curve.capped) && <p className="notice">{w.capped}</p>}
            <div className="metrics">
              <span>
                {mode === 'spring' ? w.settled : w.time}
                <strong>
                  {curve.duration} <small>ms</small>
                </strong>
              </span>
              <span>
                {w.overshoot}
                <strong>
                  {(curve.overshoot * 100).toFixed(1)} <small>%</small>
                </strong>
              </span>
              <span>
                {mode === 'spring' ? w.regime : w.control}
                <strong>
                  {mode === 'spring'
                    ? `${regime} · ζ ${z.toFixed(2)}`
                    : `(${bezier.x1}, ${bezier.y1}) (${bezier.x2}, ${bezier.y2})`}
                </strong>
              </span>
            </div>
            <section className="curve-section" aria-labelledby="curve-heading">
              <div className="chart-top">
                <h2 id="curve-heading">{w.response}</h2>
                <span>{w.analysis}</span>
              </div>
              <Chart curve={curve} time={currentProgress} locale={locale} pinned={pinned} />
              <div className="chart-legend">
                <span>
                  <i className="legend-line" />
                  {w.current}: {currentName} · {curve.duration} ms
                </span>
                {pinned && (
                  <span>
                    <i className="legend-reference" />
                    {w.reference}: {pinned.name} · {pinned.curve.duration} ms
                  </span>
                )}
                <span>
                  <i className="legend-dash" />
                  {locale === 'en' ? 'Target position' : '目標位置'}
                </span>
              </div>
              {pinned && <p className="comparison-note">{w.normal}</p>}
            </section>
          </section>
        </div>
        <section className="export-panel" aria-labelledby="export-heading">
          <div className="export-description">
            <div className="section-label">
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
        <span>{w.local}</span>
        <span>
          {locale === 'en'
            ? 'One-dimensional translation, with zero initial velocity.'
            : '單一方向位移，初始速度為零。'}
        </span>
      </footer>
    </div>
  );
}
