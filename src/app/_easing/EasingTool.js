"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Graph from "./Graph";
import PresetGrid from "./PresetGrid";
import SavedGrid from "./SavedGrid";
import CodePanel from "./CodePanel";
import { DEFAULT_ANCHORS, DEFAULT_ACTIVE_KEY, PRESETS } from "./presets";
import { buildPathString, buildLinearCss, buildCubicBezierCss, curveGoesBackward, sampleCurve } from "./bezier";
import { useSavedCurves } from "./useSavedCurves";

const CubeScene = dynamic(() => import("./CubeScene"), { ssr: false });

export default function EasingTool() {
  const [anchors, setAnchors] = useState(DEFAULT_ANCHORS);
  const [activeKey, setActiveKey] = useState(DEFAULT_ACTIVE_KEY);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const [duration, setDuration] = useState(1500);

  const { saved, add, remove, rename, reorder, exportJSON, importJSON } = useSavedCurves();

  const animStartRef = useRef(performance.now());

  const samples = useMemo(() => sampleCurve(anchors, 96), [anchors]);
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  const anchorsRef = useRef(anchors);
  useEffect(() => { anchorsRef.current = anchors; }, [anchors]);
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  const saveHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-49), cloneAnchors(anchorsRef.current)];
    redoRef.current = [];
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) {
        const next = redoRef.current.pop();
        if (!next) return;
        historyRef.current = [...historyRef.current.slice(-49), cloneAnchors(anchorsRef.current)];
        setAnchors(next);
        setActiveKey(null);
      } else {
        const prev = historyRef.current.pop();
        if (!prev) return;
        redoRef.current = [...redoRef.current.slice(-49), cloneAnchors(anchorsRef.current)];
        setAnchors(prev);
        setActiveKey(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pathString = useMemo(() => buildPathString(anchors), [anchors]);
  const linearCss = useMemo(() => buildLinearCss(anchors), [anchors]);
  const linearGoesBackward = useMemo(() => curveGoesBackward(anchors), [anchors]);
  const cubicBezier = useMemo(() => buildCubicBezierCss(anchors, samples), [anchors, samples]);

  const onPickPreset = (name, variant) => {
    const preset = PRESETS[name];
    if (!preset) return;
    const data = preset.variants[variant];
    if (!data) return;
    saveHistory();
    setAnchors(cloneAnchors(data));
    setActiveKey(`${name}.${variant}`);
  };

  const onPickSaved = (cell) => {
    setAnchors(cloneAnchors(cell.anchors));
    setActiveKey(`saved.${cell.id}`);
  };

  const onSaveCurrent = () => {
    const id = add(anchors);
    setActiveKey(`saved.${id}`);
    setNewlyAddedId(id);
  };

  const onDeleteSaved = (id) => {
    remove(id);
    if (activeKey === `saved.${id}`) setActiveKey(null);
  };

  const onFlip = () => {
    saveHistory();
    setAnchors(flipAnchors(anchors));
    setActiveKey(null);
  };

  const handleSetAnchors = (updater) => {
    setAnchors(updater);
    setActiveKey(null);
  };

  const activeLabel = useMemo(() => {
    if (!activeKey) return "custom";
    if (activeKey.startsWith("saved.")) {
      const id = activeKey.slice("saved.".length);
      const found = saved.find((s) => s.id === id);
      return found ? found.name : "custom";
    }
    return activeKey;
  }, [activeKey, saved]);

  return (
    <div className="shell">
      <div className="wrap">
        <header className="header">
          {/* <div>🍑</div> */}
          {/* <img src="/assets/logo.png" alt="" className="headerLogo" aria-hidden="true" /> */}
          <div className="titleBlock">
            <h1><img src="/assets/emoji.png" alt="🍑" className="titleEmoji" />Smooth Criminal</h1>
            {/* <h2>Stop butchering your animations</h2> */}
            <img src="/sticks/howdy.png" alt="Howdy!" className="sticker" />
            {/* <div className="headerPreview">
              <CubeScene samplesRef={samplesRef} duration={duration} animStartRef={animStartRef} />
            </div> */}
          </div>
          <p className="tagline">
            Drag handles. Click the curve to add a point. Double-click to remove.
          </p>
          <a href="https://x.com/_alexand_re" target="_blank" rel="noopener noreferrer" className="xHandle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.254 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
            </svg>
            @_alexand_re
          </a>
        </header>

        <div className="layout">
          <div className="left">
            <div className="graphCard">
              <Graph anchors={anchors} setAnchors={handleSetAnchors} duration={duration} onDurationChange={setDuration} onWillChange={saveHistory} animStartRef={animStartRef} cubicBezier={cubicBezier} onFlip={onFlip} />
            </div>
          </div>

          <div className="right">
            <PresetGrid onPick={onPickPreset} activeKey={activeKey} />
            <SavedGrid
              saved={saved}
              activeKey={activeKey}
              onSave={onSaveCurrent}
              onPick={onPickSaved}
              onRename={rename}
              onDelete={onDeleteSaved}
              onReorder={reorder}
              onExport={exportJSON}
              onImport={importJSON}
              newlyAddedId={newlyAddedId}
              onClearNewlyAdded={() => setNewlyAddedId(null)}
            />
            <CodePanel pathString={pathString} linearCss={linearCss} linearGoesBackward={linearGoesBackward} cubicBezier={cubicBezier} duration={duration} />
          </div>
        </div>
      </div>
    </div>
  );
}

function cloneAnchors(anchors) {
  return anchors.map((a) => ({
    ...a,
    hIn: a.hIn ? { ...a.hIn } : null,
    hOut: a.hOut ? { ...a.hOut } : null,
  }));
}

function flipAnchors(anchors) {
  return [...anchors].reverse().map((a) => ({
    x: 1 - a.x,
    y: 1 - a.y,
    hIn:  a.hOut ? { dx: -a.hOut.dx, dy: -a.hOut.dy } : null,
    hOut: a.hIn  ? { dx: -a.hIn.dx,  dy: -a.hIn.dy  } : null,
  }));
}
