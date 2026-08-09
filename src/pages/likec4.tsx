import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Layout from "@theme/Layout";
import {
    LikeC4View,
    LikeC4ModelProvider,
    isLikeC4ViewId,
    likec4model,
    useLikeC4Model,
} from "../components/likec4/likec4.generated";

/**
 * LikeC4 SlideView
 * - Fullscreen-friendly slide deck for LikeC4 views
 * - Arrow keys (← →), Home/End to navigate
 * - Space to Play/Pause autoplay
 * - "F" to toggle fullscreen
 * - Syncs current slide with URL hash
 */
export default function Likec4SlideViewPage() {
    return (
        <LikeC4ModelProvider>
            <Layout title="Architecture Slides" description="LikeC4 Slide Deck Viewer">
                <SlideDeck />
            </Layout>
        </LikeC4ModelProvider>
    );
}

function SlideDeck() {
    const model = useLikeC4Model();
    const containerRef = useRef<HTMLDivElement | null>(null);

    // --- utils ---------------------------------------------------------------
    const extractViewIds = useCallback((m: any): string[] => {
        if (!m) return [];
        if (m.views instanceof Map) return Array.from(m.views.keys());
        if (m.views && typeof m.views === "object") return Object.keys(m.views);
        if (m.$model?.views && typeof m.$model.views === "object")
            return Object.keys(m.$model.views);
        if (typeof m.toJSON === "function") {
            const json = m.toJSON();
            if (json?.views && typeof json.views === "object")
                return Object.keys(json.views);
        }
        return [];
    }, []);

    // --- collect & order slides --------------------------------------------
    const viewIds = useMemo(() => {
        const primary = extractViewIds(model);
        const ids = primary.length ? primary : extractViewIds(likec4model);
        const sorted = [...ids].sort();
        const i = sorted.indexOf("index");
        if (i > 0) {
            sorted.splice(i, 1);
            sorted.unshift("index");
        }
        return sorted.filter((v) => typeof v === "string" && v.trim().length > 0);
    }, [model, extractViewIds]);

    // --- url/hash sync ------------------------------------------------------
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (!viewIds.length) return;
        const fromHash = decodeURIComponent((typeof window !== 'undefined' ? window.location.hash : "").replace(/^#/, ""));
        if (fromHash && viewIds.includes(fromHash)) {
            setIdx(viewIds.indexOf(fromHash));
        } else if (idx >= viewIds.length) {
            setIdx(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewIds.join("|")]);

    useEffect(() => {
        if (!viewIds.length) return;
        const current = viewIds[idx] ?? "";
        if (typeof window !== 'undefined') {
            const newHash = `#${encodeURIComponent(current)}`;
            if (window.location.hash !== newHash) {
                history.replaceState(null, "", newHash);
            }
        }
    }, [idx, viewIds]);

    const currentId = viewIds[idx];

    // --- navigation helpers -------------------------------------------------
    const canPrev = idx > 0;
    const canNext = idx < viewIds.length - 1;
    const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const goNext = useCallback(() => setIdx((i) => Math.min(viewIds.length - 1, i + 1)), [viewIds.length]);
    const goTo = useCallback((i: number) => setIdx(() => Math.min(Math.max(i, 0), viewIds.length - 1)), [viewIds.length]);

    // --- keyboard shortcuts -------------------------------------------------
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            switch (e.key) {
                case "ArrowLeft": e.preventDefault(); goPrev(); break;
                case "ArrowRight": e.preventDefault(); goNext(); break;
                case "Home": e.preventDefault(); goTo(0); break;
                case "End": e.preventDefault(); goTo(viewIds.length - 1); break;
                case "f":
                case "F":
                    e.preventDefault();
                    toggleFullscreen();
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [goPrev, goNext, goTo, viewIds.length]);

    // --- fullscreen ---------------------------------------------------------
    const isFullscreen = () => !!document.fullscreenElement;
    const toggleFullscreen = () => {
        const el = containerRef.current ?? document.documentElement;
        if (!isFullscreen()) el.requestFullscreen?.();
        else document.exitFullscreen?.();
    };

    // --- autoplay -----------------------------------------------------------  // --- progress -----------------------------------------------------------
    const progress = viewIds.length ? ((idx + 1) / viewIds.length) * 100 : 0;

    // --- render -------------------------------------------------------------
    return (
        <div
            ref={containerRef}
            style={{
                height: "calc(100vh - var(--ifm-navbar-height))",
                display: "flex",
                flexDirection: "column",
                background: "var(--ifm-background-color)",
            }}
        >
            {/* Header bar */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--ifm-toc-border-color)",
                    background: "var(--ifm-background-surface-color)",
                }}
            >
                <strong style={{ fontSize: 14 }}>LikeC4 Slides</strong>
                <div style={{ flex: 1 }} />
                <select
                    aria-label="Jump to view"
                    value={currentId ?? ""}
                    onChange={(e) => goTo(viewIds.indexOf(e.target.value))}
                    style={{
                        minWidth: 220,
                        padding: "6px 8px",
                        borderRadius: "var(--ifm-global-radius)",
                        border: "1px solid var(--ifm-toc-border-color)",
                        background: "var(--ifm-background-color)",
                    }}
                >
                    {viewIds.map((id) => (
                        <option key={id} value={id}>{id}</option>
                    ))}
                </select>
                <div style={{ width: 12 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={!canPrev}
                        title="Previous (←)"
                        style={btnWideStyle(!canPrev)}
                    >
                        ‹ Prev
                    </button>
                    <span aria-hidden>|</span>
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={!canNext}
                        title="Next (→)"
                        style={btnWideStyle(!canNext)}
                    >
                        Next ›
                    </button>
                    <span aria-hidden>|</span>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        title="Fullscreen (F)"
                        style={btnWideStyle(false)}
                    >
                        ⛶
                    </button>
                </div>
            </div>

            {/* Viewer area */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {/* Progress bar */}
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: 3,
                        width: `${progress}%`,
                        background: "var(--ifm-color-primary)",
                        transition: "width 250ms ease",
                        zIndex: 2,
                    }}
                />

                {/* Slide content */}
                <div style={{ height: "100%", width: "100%", overflow: "auto" }}>
                    {isLikeC4ViewId(currentId) ? (
                        <LikeC4View viewId={currentId} browser />
                    ) : (
                        <div style={{ padding: 24, opacity: 0.7 }}>
                            Invalid viewId: <code>{String(currentId)}</code>
                        </div>
                    )}
                </div>

                {/* Footer HUD */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "color-mix(in oklab, var(--ifm-background-surface-color) 60%, transparent)",
                        boxShadow: "0 4px 16px rgba(0,0,0,.15)",
                        backdropFilter: "blur(6px)",
                    }}
                >
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
            {viewIds.length ? idx + 1 : 0}/{viewIds.length}
          </span>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, viewIds.length - 1)}
                        step={1}
                        value={idx}
                        onChange={(e) => goTo(parseInt(e.target.value, 10))}
                        style={{ width: 220 }}
                    />
                </div>

                {/* Click areas for prev/next */}
                <button
                    aria-label="Previous slide"
                    onClick={goPrev}
                    disabled={!canPrev}
                    style={clickZoneStyle("left", !canPrev)}
                />
                <button
                    aria-label="Next slide"
                    onClick={goNext}
                    disabled={!canNext}
                    style={clickZoneStyle("right", !canNext)}
                />
            </div>
        </div>
    );
}

// --- styles ---------------------------------------------------------------
function btnStyle(disabled: boolean): React.CSSProperties {
    return {
        height: 32,
        width: 36,
        border: `1px solid ${disabled ? "var(--ifm-color-emphasis-300)" : "var(--ifm-toc-border-color)"}`,
        color: disabled ? "var(--ifm-color-emphasis-500)" : "inherit",
        background: "var(--ifm-background-color)",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
    };
}

function btnWideStyle(disabled: boolean): React.CSSProperties {
    return {
        height: 32,
        padding: "6px 12px",
        border: `1px solid ${disabled ? "var(--ifm-color-emphasis-300)" : "var(--ifm-toc-border-color)"}`,
        color: disabled ? "var(--ifm-color-emphasis-500)" : "inherit",
        background: "var(--ifm-background-color)",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
    };
}

function clickZoneStyle(side: "left" | "right", disabled: boolean): React.CSSProperties {
    return {
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: "18%",
        background: "transparent",
        border: "none",
        cursor: disabled ? "default" : side === "left" ? "w-resize" : "e-resize",
    } as React.CSSProperties;
}
