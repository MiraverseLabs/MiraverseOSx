from __future__ import annotations

import html
import json
import threading
from collections import Counter
from typing import Callable

import solara
import solara.lab
from mesa.visualization import make_plot_component
from mesa.visualization.utils import force_update, update_counter

from editor import PopulationEditor
from integrity import DataIntegrity, analyze_population_integrity
from overrides_store import load_all_overrides
from population import PopulationModel
from living_world import RunConflictError
from registry import ACTIVITY_ICONS, CitizenRegistry
import entertainment


DEFAULT_SEED = 42

ALL_ACTIVITIES: tuple[str, ...] = (
    "Sleeping",
    "Resting",
    "Eating",
    "Civic & professional duties",
    "Creative & studio work",
    "Socializing",
    "Entertainment",
    "Personal activities",
    "Relaxing",
    "Companion duties",
    "Commuting",
    "Hygiene",
    "Exercise",
    "Leisure",
)

SPEED_PRESETS: tuple[tuple[str, int], ...] = (
    ("0.5×", 600),
    ("1×", 300),
    ("2×", 150),
    ("5×", 60),
    ("10×", 25),
)

NAV_PAGES: tuple[tuple[str, str], ...] = (
    ("World Overview", "🌐"),
    ("Living World Engine", "🧭"),
    ("Entertainment & Fame", "🎭"),
    ("Citizen Registry", "👥"),
    ("Data Integrity", "🛡️"),
    ("Population Editor", "✎"),
)


OBSERVATORY_CSS = """
:root {
  --obs-lavender-light: #6d4aff;
  --obs-lavender-dark: #a78bfa;
  --obs-blue-light: #2563eb;
  --obs-blue-dark: #60a5fa;
  --obs-indigo-light: #4f46e5;
  --obs-indigo-dark: #818cf8;

  --obs-bg: #f5f6fc;
  --obs-surface: #ffffff;
  --obs-surface-alt: #eef1fa;
  --obs-sidebar-bg: #eeeef8;
  --obs-toolbar-bg: rgba(255, 255, 255, 0.94);
  --obs-code-bg: #f1f3fb;

  --obs-text: #161b2e;
  --obs-text-secondary: #434c66;
  --obs-text-muted: #5a6480;

  --obs-border: #cfd6ea;
  --obs-border-strong: #94a0c2;

  --obs-lavender: var(--obs-lavender-light);
  --obs-lavender-soft: #ede9fe;
  --obs-lavender-ink: #4c1d95;

  --obs-blue: var(--obs-blue-light);
  --obs-blue-soft: #dbeafe;
  --obs-blue-ink: #1e3a8a;

  --obs-indigo: var(--obs-indigo-light);

  --obs-ok-bg: #dcfce7;
  --obs-ok-ink: #14532d;
  --obs-warn-bg: #fef3c7;
  --obs-warn-ink: #92400e;
  --obs-alert-bg: #ffe4e6;
  --obs-alert-ink: #9f1239;

  --obs-shadow: 0 1px 3px rgba(22, 27, 46, 0.06), 0 1px 2px rgba(22, 27, 46, 0.04);
  --obs-toolbar-h: 62px;

  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --obs-bg: #0e1222;
    --obs-surface: #171c32;
    --obs-surface-alt: #1f2642;
    --obs-sidebar-bg: #13172b;
    --obs-toolbar-bg: rgba(19, 23, 43, 0.95);
    --obs-code-bg: #111629;

    --obs-text: #edf0fb;
    --obs-text-secondary: #b7c0da;
    --obs-text-muted: #8f9ab8;

    --obs-border: #2c3557;
    --obs-border-strong: #4e5b88;

    --obs-lavender: var(--obs-lavender-dark);
    --obs-lavender-soft: rgba(139, 92, 246, 0.2);
    --obs-lavender-ink: #e2d9ff;

    --obs-blue: var(--obs-blue-dark);
    --obs-blue-soft: rgba(59, 130, 246, 0.2);
    --obs-blue-ink: #cfe2ff;

    --obs-indigo: var(--obs-indigo-dark);

    --obs-ok-bg: rgba(20, 184, 102, 0.18);
    --obs-ok-ink: #86efac;
    --obs-warn-bg: rgba(245, 158, 11, 0.2);
    --obs-warn-ink: #fcd34d;
    --obs-alert-bg: rgba(244, 63, 94, 0.22);
    --obs-alert-ink: #fda4af;

    --obs-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
  }
}

.v-application.v-theme--light,
.v-application.v-theme--light .obs-shell,
.obs-shell.theme-light {
  color-scheme: light;
  --obs-bg: #f5f6fc;
  --obs-surface: #ffffff;
  --obs-surface-alt: #eef1fa;
  --obs-sidebar-bg: #eeeef8;
  --obs-toolbar-bg: rgba(255, 255, 255, 0.94);
  --obs-code-bg: #f1f3fb;
  --obs-text: #161b2e;
  --obs-text-secondary: #434c66;
  --obs-text-muted: #5a6480;
  --obs-border: #cfd6ea;
  --obs-border-strong: #94a0c2;
  --obs-lavender: var(--obs-lavender-light);
  --obs-lavender-soft: #ede9fe;
  --obs-lavender-ink: #4c1d95;
  --obs-blue: var(--obs-blue-light);
  --obs-blue-soft: #dbeafe;
  --obs-blue-ink: #1e3a8a;
  --obs-indigo: var(--obs-indigo-light);
  --obs-ok-bg: #dcfce7;
  --obs-ok-ink: #14532d;
  --obs-warn-bg: #fef3c7;
  --obs-warn-ink: #92400e;
  --obs-alert-bg: #ffe4e6;
  --obs-alert-ink: #9f1239;
  --obs-shadow: 0 1px 3px rgba(22, 27, 46, 0.06), 0 1px 2px rgba(22, 27, 46, 0.04);
}

.v-application.v-theme--dark,
.v-application.v-theme--dark .obs-shell,
.obs-shell.theme-dark {
  color-scheme: dark;
  --obs-bg: #0e1222;
  --obs-surface: #171c32;
  --obs-surface-alt: #1f2642;
  --obs-sidebar-bg: #13172b;
  --obs-toolbar-bg: rgba(19, 23, 43, 0.95);
  --obs-code-bg: #111629;
  --obs-text: #edf0fb;
  --obs-text-secondary: #b7c0da;
  --obs-text-muted: #8f9ab8;
  --obs-border: #2c3557;
  --obs-border-strong: #4e5b88;
  --obs-lavender: var(--obs-lavender-dark);
  --obs-lavender-soft: rgba(139, 92, 246, 0.2);
  --obs-lavender-ink: #e2d9ff;
  --obs-blue: var(--obs-blue-dark);
  --obs-blue-soft: rgba(59, 130, 246, 0.2);
  --obs-blue-ink: #cfe2ff;
  --obs-indigo: var(--obs-indigo-dark);
  --obs-ok-bg: rgba(20, 184, 102, 0.18);
  --obs-ok-ink: #86efac;
  --obs-warn-bg: rgba(245, 158, 11, 0.2);
  --obs-warn-ink: #fcd34d;
  --obs-alert-bg: rgba(244, 63, 94, 0.22);
  --obs-alert-ink: #fda4af;
  --obs-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
}

/* Reset Solara / Vuetify outer wrappers for full-width normal page scrolling */
html, body {
  margin: 0;
  padding: 0;
  inline-size: 100%;
  min-block-size: 100%;
  overflow-x: clip;
  overflow-y: auto !important;
  background: var(--obs-bg);
  color: var(--obs-text);
}

.v-application,
.v-application__wrap,
.solara-autorouter-content,
.jupyter-widgets,
.widget-vbox,
.widget-hbox {
  inline-size: 100% !important;
  max-inline-size: none !important;
  min-block-size: 0;
}

.v-application,
.v-application__wrap,
.solara-autorouter-content {
  min-block-size: 100dvh !important;
  block-size: auto !important;
  max-block-size: none !important;
  overflow: visible !important;
  padding: 0 !important;
  margin: 0 !important;
  background: var(--obs-bg) !important;
  color: var(--obs-text) !important;
}

/* Shell Layout */
.obs-shell {
  min-block-size: 100dvh;
  inline-size: 100%;
  background: var(--obs-bg);
  color: var(--obs-text);
  font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
}

/* Horizontal Top Toolbar */
.obs-toolbar {
  position: sticky;
  inset-block-start: 0;
  z-index: 40;
  min-block-size: var(--obs-toolbar-h);
  padding-block: 7px;
  padding-inline: 14px;
  background: var(--obs-toolbar-bg);
  backdrop-filter: blur(10px);
  border-block-end: 1px solid var(--obs-border);
  display: flex;
  flex-wrap: wrap;
  align-items: safe center;
  gap: 8px 12px;
}

.obs-toolbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-inline-size: 0;
}

.obs-brand-mark {
  inline-size: 32px;
  block-size: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6d4aff 0%, #2563eb 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.obs-brand-title {
  font-weight: 700;
  font-size: 0.98rem;
  letter-spacing: -0.01em;
  color: var(--obs-text);
  white-space: nowrap;
}

.obs-clock-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.obs-clock-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--obs-lavender-soft);
  color: var(--obs-lavender-ink);
  border: 1px solid var(--obs-border);
  font-size: 0.84rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.obs-state-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--obs-border);
}

.obs-state-running {
  background: var(--obs-ok-bg);
  color: var(--obs-ok-ink);
}

.obs-state-paused {
  background: var(--obs-surface-alt);
  color: var(--obs-text-secondary);
}

.obs-toolbar-controls {
  display: flex;
  align-items: safe center;
  flex-wrap: wrap;
  gap: 8px;
  margin-inline-start: auto;
}

.obs-sim-btn-group,
.obs-speed-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: var(--obs-surface-alt);
  border: 1px solid var(--obs-border);
}

.obs-speed-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--obs-text-secondary);
  padding-inline: 8px 4px;
  white-space: nowrap;
}

/* Body Grid: Compact Sidebar + Full-Width Main */
.obs-body {
  flex: 1 1 auto;
  inline-size: 100%;
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  align-items: start;
}

.obs-body.sidebar-collapsed {
  grid-template-columns: minmax(0, 1fr);
}

/* Compact Sidebar */
.obs-sidebar {
  position: sticky;
  inset-block-start: var(--obs-toolbar-h);
  min-block-size: calc(100dvh - var(--obs-toolbar-h));
  background: var(--obs-sidebar-bg);
  border-inline-end: 1px solid var(--obs-border);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.obs-nav-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--obs-text-muted);
  padding-inline: 8px;
  margin-block-end: 6px;
}

.obs-nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.obs-nav-btn.v-btn {
  inline-size: 100%;
  justify-content: flex-start !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  font-size: 0.88rem !important;
  border-radius: 8px !important;
  padding-inline: 12px !important;
  min-block-size: 38px !important;
  color: var(--obs-text-secondary) !important;
  background: transparent !important;
  box-shadow: none !important;
}

.obs-nav-btn.v-btn:hover {
  background: var(--obs-surface-alt) !important;
  color: var(--obs-text) !important;
}

.obs-nav-btn-active.v-btn {
  background: var(--obs-lavender-soft) !important;
  color: var(--obs-lavender-ink) !important;
  border: 1px solid var(--obs-lavender) !important;
  font-weight: 700 !important;
}

.obs-sidebar-footer {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--obs-surface);
  border: 1px solid var(--obs-border);
  font-size: 0.78rem;
  color: var(--obs-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Main Content Area */
.obs-main {
  inline-size: 100%;
  min-inline-size: 0;
  padding: 20px 24px 36px;
  box-sizing: border-box;
}

.obs-page {
  inline-size: 100%;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.obs-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.obs-page-title {
  margin: 0;
  font-size: 1.38rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--obs-text);
}

.obs-page-subtitle {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--obs-text-secondary);
}

.obs-count-pill,
.obs-readonly-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--obs-surface);
  border: 1px solid var(--obs-border-strong);
  font-size: 0.82rem;
  color: var(--obs-text-secondary);
}

/* Cards & Grids */
.obs-surface-card {
  background: var(--obs-surface);
  border: 1px solid var(--obs-border);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: var(--obs-shadow);
  min-inline-size: 0;
  box-sizing: border-box;
}

.obs-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  inline-size: 100%;
}

.obs-kpi-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-block-start: 3px solid var(--obs-lavender);
}

.obs-kpi-card.obs-kpi-blue {
  border-block-start-color: var(--obs-blue);
}

.obs-kpi-label {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--obs-text-muted);
}

.obs-kpi-value {
  font-size: 1.55rem;
  font-weight: 750;
  color: var(--obs-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.obs-kpi-unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--obs-text-secondary);
}

.obs-kpi-foot {
  font-size: 0.8rem;
  color: var(--obs-text-secondary);
}

.obs-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-block-end: 14px;
}

.obs-section-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--obs-text);
}

.obs-section-desc {
  margin: 2px 0 0;
  font-size: 0.84rem;
  color: var(--obs-text-secondary);
}

.obs-muted {
  color: var(--obs-text-muted);
  font-size: 0.82rem;
}

/* Overview Two-Column Grids */
.obs-overview-mid-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 16px;
  inline-size: 100%;
}

.obs-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 16px;
  inline-size: 100%;
}

.obs-chart-wrap {
  inline-size: 100%;
  min-inline-size: 0;
}

.obs-chart-wrap img,
.obs-chart-wrap svg {
  display: block;
  inline-size: 100% !important;
  max-inline-size: 100% !important;
  block-size: auto !important;
}

/* Progress / Distribution Bars */
.obs-dist-list,
.obs-coverage-list,
.obs-vitals-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.obs-dist-row,
.obs-coverage-row,
.obs-vital-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.obs-dist-meta,
.obs-coverage-meta,
.obs-vital-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
}

.obs-dist-label,
.obs-coverage-label,
.obs-vital-label {
  font-weight: 600;
  color: var(--obs-text);
}

.obs-dist-count,
.obs-coverage-stats,
.obs-vital-num {
  font-variant-numeric: tabular-nums;
  color: var(--obs-text-secondary);
}

.obs-meter-track {
  inline-size: 100%;
  block-size: 8px;
  border-radius: 999px;
  background: var(--obs-surface-alt);
  border: 1px solid var(--obs-border);
  overflow: clip;
}

.obs-meter-fill {
  block-size: 100%;
  border-radius: 999px;
  transition: width 180ms ease-out;
}

.obs-meter-lavender {
  background: linear-gradient(90deg, var(--obs-lavender) 0%, var(--obs-blue) 100%);
}

.obs-meter-blue {
  background: var(--obs-blue);
}

.obs-meter-indigo {
  background: var(--obs-indigo);
}

/* Badges & Pills */
.obs-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 600;
  border: 1px solid var(--obs-border);
  white-space: nowrap;
}

.obs-badge-lavender {
  background: var(--obs-lavender-soft);
  color: var(--obs-lavender-ink);
}

.obs-badge-blue {
  background: var(--obs-blue-soft);
  color: var(--obs-blue-ink);
}

.obs-badge-neutral {
  background: var(--obs-surface-alt);
  color: var(--obs-text-secondary);
}

.obs-badge-ok {
  background: var(--obs-ok-bg);
  color: var(--obs-ok-ink);
}

.obs-badge-warn {
  background: var(--obs-warn-bg);
  color: var(--obs-warn-ink);
}

.obs-badge-alert {
  background: var(--obs-alert-bg);
  color: var(--obs-alert-ink);
}

.obs-activity-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--obs-lavender-soft);
  color: var(--obs-lavender-ink);
  border: 1px solid var(--obs-lavender);
  font-size: 0.82rem;
  font-weight: 700;
}

.obs-id-pill {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.76rem;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--obs-code-bg);
  color: var(--obs-text-secondary);
  border: 1px solid var(--obs-border);
}

/* Filter Bar */
.obs-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.obs-filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.obs-filter-item {
  flex: 1 1 180px;
  min-inline-size: 160px;
}

.obs-filter-search {
  flex: 2 1 260px;
}

.obs-filter-bar .v-input__details {
  display: none !important;
}

.obs-filter-summary {
  font-size: 0.83rem;
  color: var(--obs-text-secondary);
}

/* Citizen Registry Side-by-Side Layout */
.obs-registry-grid {
  display: grid;
  grid-template-columns: minmax(320px, 410px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  inline-size: 100%;
}

.obs-directory-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.obs-dir-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 9px;
  border: 1px solid var(--obs-border);
  background: var(--obs-surface);
  transition: background-color 120ms ease, border-color 120ms ease;
}

.obs-dir-item:hover {
  border-color: var(--obs-border-strong);
  background: var(--obs-surface-alt);
}

.obs-dir-item-active {
  border-color: var(--obs-lavender);
  border-inline-start: 4px solid var(--obs-lavender);
  background: var(--obs-lavender-soft);
}

.obs-dir-item-main {
  flex: 1 1 auto;
  min-inline-size: 0;
}

.obs-dir-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.obs-dir-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--obs-text);
  overflow-wrap: anywhere;
}

.obs-dir-profiles {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--obs-surface-alt);
  color: var(--obs-text-muted);
  border: 1px solid var(--obs-border);
}

.obs-dir-meta {
  font-size: 0.79rem;
  color: var(--obs-text-secondary);
  margin-block-top: 2px;
  overflow-wrap: anywhere;
}

.obs-dir-vitals {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-block-top: 4px;
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}

.obs-dir-act {
  font-weight: 600;
  color: var(--obs-blue);
}

.obs-dir-vital {
  color: var(--obs-text-muted);
}

/* Sticky Citizen Inspector on Wide Viewports (normal document scroll, zero clipping) */
.obs-inspector-column {
  position: sticky;
  inset-block-start: calc(var(--obs-toolbar-h) + 16px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-inline-size: 0;
}

.obs-inspector-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 14px;
}

.obs-inspector-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 750;
  color: var(--obs-text);
}

.obs-inspector-id-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-block-top: 6px;
}

.obs-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
  gap: 10px;
}

.obs-meta-cell {
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--obs-surface-alt);
  border: 1px solid var(--obs-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.obs-meta-missing {
  background: var(--obs-warn-bg);
}

.obs-meta-key {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--obs-text-muted);
}

.obs-meta-val {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--obs-text);
  overflow-wrap: anywhere;
}

.obs-meta-missing .obs-meta-val {
  color: var(--obs-warn-ink);
}

.obs-sim-traits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-block-end: 14px;
}

.obs-trait-box {
  padding: 8px 11px;
  border-radius: 8px;
  background: var(--obs-surface-alt);
  border: 1px solid var(--obs-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.obs-trait-label {
  font-size: 0.73rem;
  color: var(--obs-text-muted);
  font-weight: 600;
}

.obs-trait-value {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--obs-text);
  font-variant-numeric: tabular-nums;
}

/* Source Profiles Details */
.obs-profiles-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.obs-profile-details {
  border: 1px solid var(--obs-border);
  border-radius: 9px;
  background: var(--obs-surface-alt);
  overflow: clip;
}

.obs-profile-summary {
  cursor: pointer;
  padding: 9px 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
  user-select: none;
}

.obs-profile-summary-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.obs-collection-tag {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.77rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--obs-lavender-soft);
  color: var(--obs-lavender-ink);
  border: 1px solid var(--obs-border);
}

.obs-profile-ctx {
  font-size: 0.8rem;
  color: var(--obs-text-secondary);
}

.obs-json-pre {
  margin: 0;
  padding: 12px 14px;
  background: var(--obs-code-bg);
  color: var(--obs-text);
  border-block-start: 1px solid var(--obs-border);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  overflow-x: auto;
  max-inline-size: 100%;
}

/* Data Integrity Conflict Cards & Ledger */
.obs-conflict-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.obs-conflict-card {
  padding: 13px 15px;
  border-radius: 10px;
  border: 1px solid var(--obs-border);
  background: var(--obs-surface-alt);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.obs-conflict-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.obs-conflict-title-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.obs-conflict-name {
  font-weight: 750;
  font-size: 0.98rem;
  color: var(--obs-text);
}

.obs-conflict-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obs-conflict-field {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--obs-surface);
  border: 1px solid var(--obs-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obs-conflict-field-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.obs-field-code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--obs-lavender);
}

.obs-resolved-pill {
  font-size: 0.78rem;
  color: var(--obs-text-secondary);
  margin-inline-start: auto;
}

.obs-conflict-entries {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}

.obs-conflict-entry {
  padding: 7px 9px;
  border-radius: 6px;
  background: var(--obs-code-bg);
  border: 1px solid var(--obs-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.obs-conflict-val {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--obs-text);
  overflow-wrap: anywhere;
}

/* Integrity Ledger Grid */
.obs-ledger-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--obs-border);
  border-radius: 10px;
  overflow: clip;
}

.obs-ledger-head,
.obs-ledger-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) 86px repeat(4, minmax(115px, 1fr)) 86px;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
}

.obs-ledger-head {
  background: var(--obs-surface-alt);
  border-block-end: 1px solid var(--obs-border);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--obs-text-muted);
}

.obs-ledger-row {
  border-block-end: 1px solid var(--obs-border);
  font-size: 0.83rem;
  background: var(--obs-surface);
}

.obs-ledger-row:last-child {
  border-block-end: none;
}

.obs-ledger-name {
  font-weight: 700;
  color: var(--obs-text);
}

.obs-ledger-cell {
  min-inline-size: 0;
  overflow: clip;
  text-overflow: ellipsis;
}

.obs-field-label-mobile {
  display: none;
  font-weight: 700;
  color: var(--obs-text-muted);
  margin-inline-end: 4px;
}

.obs-status-ok {
  color: var(--obs-ok-ink);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.obs-status-missing {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--obs-warn-bg);
  color: var(--obs-warn-ink);
  font-size: 0.76rem;
  font-weight: 700;
}

.obs-empty-state {
  padding: 20px;
  text-align: center;
  color: var(--obs-text-secondary);
  background: var(--obs-surface-alt);
  border-radius: 8px;
  border: 1px dashed var(--obs-border-strong);
}

/* Compact Toolbar & Action Button Overrides */
.obs-ctrl-btn.v-btn,
.obs-speed-btn.v-btn,
.obs-btn-inspect.v-btn,
.obs-btn-inspect-active.v-btn,
.obs-btn-compact.v-btn,
.obs-btn-secondary.v-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  border-radius: 7px !important;
}

.obs-ctrl-btn.v-btn {
  height: 32px !important;
  min-width: 62px !important;
  padding-inline: 9px !important;
  font-size: 0.81rem !important;
}

.obs-speed-btn.v-btn {
  height: 28px !important;
  min-width: 42px !important;
  padding-inline: 7px !important;
  font-size: 0.78rem !important;
}

.obs-speed-btn-active.v-btn {
  background: var(--obs-lavender) !important;
  color: #ffffff !important;
}

.v-application.v-theme--dark .obs-speed-btn-active.v-btn,
.obs-shell.theme-dark .obs-speed-btn-active.v-btn {
  color: #0e1222 !important;
}

.obs-icon-toggle.v-btn {
  min-width: 34px !important;
  width: 34px !important;
  height: 34px !important;
  padding: 0 !important;
  border-radius: 8px !important;
}

/* Realm & Alert Snapshot Mini Grid */
.obs-realm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obs-realm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--obs-surface-alt);
  border: 1px solid var(--obs-border);
  font-size: 0.84rem;
}

.obs-needs-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-block-end: 14px;
}

.obs-need-tile {
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--obs-surface-alt);
  border: 1px solid var(--obs-border);
  text-align: center;
}

.obs-need-num {
  font-size: 1.2rem;
  font-weight: 750;
  color: var(--obs-lavender);
  font-variant-numeric: tabular-nums;
}

.obs-need-lbl {
  font-size: 0.74rem;
  color: var(--obs-text-secondary);
}

/* Taxonomy Pills & Population Editor */
.obs-taxonomy-grid,
.obs-editor-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.obs-editor-tabs {
  margin-block-top: 12px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--obs-border);
}

.obs-editor-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  inline-size: 100%;
  margin-block-top: 12px;
}

.obs-tax-btn.v-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  font-size: 0.8rem !important;
  border-radius: 999px !important;
  height: 32px !important;
  padding-inline: 12px !important;
}

.obs-tax-btn-active.v-btn {
  background: var(--obs-lavender-soft) !important;
  color: var(--obs-lavender-ink) !important;
  border: 1.5px solid var(--obs-lavender) !important;
  font-weight: 700 !important;
  box-shadow: none !important;
}

.obs-editor-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-inline-size: 0;
}

.obs-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
  margin-block-bottom: 8px;
}

.obs-editor-column .v-input__details {
  display: none !important;
}

.obs-banner-ok {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--obs-ok-bg);
  color: var(--obs-ok-ink);
  border: 1px solid var(--obs-border);
  font-size: 0.86rem;
  font-weight: 600;
}

.obs-banner-err {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--obs-alert-bg);
  color: var(--obs-alert-ink);
  border: 1px solid var(--obs-border);
  font-size: 0.86rem;
  font-weight: 600;
  margin-block-bottom: 10px;
}

.obs-banner-err ul {
  margin: 0;
  padding-inline-start: 18px;
}

.obs-diff-table {
  border: 1px solid var(--obs-border);
  border-radius: 10px;
  overflow: clip;
  margin-block-bottom: 14px;
}

.obs-table-wrap {
  overflow-x: auto;
  inline-size: 100%;
}

.obs-table {
  inline-size: 100%;
  border-collapse: collapse;
  color: var(--obs-text-secondary);
  font-size: 0.8rem;
}

.obs-table th,
.obs-table td {
  padding: 8px 10px;
  border-block-end: 1px solid var(--obs-border);
  text-align: start;
  vertical-align: top;
}

.obs-table th {
  background: var(--obs-surface-alt);
  color: var(--obs-text);
  font-size: 0.72rem;
  text-transform: uppercase;
}

.obs-diff-head,
.obs-diff-row {
  display: grid;
  grid-template-columns: minmax(150px, 0.9fr) minmax(180px, 1.2fr) minmax(180px, 1.2fr);
  gap: 12px;
  padding: 9px 12px;
  align-items: start;
  font-size: 0.83rem;
}

.obs-diff-head {
  background: var(--obs-surface-alt);
  border-block-end: 1px solid var(--obs-border);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--obs-text-muted);
}

.obs-diff-row {
  border-block-end: 1px solid var(--obs-border);
  background: var(--obs-surface);
}

.obs-diff-row:last-child {
  border-block-end: none;
}

.obs-diff-label {
  font-weight: 700;
  color: var(--obs-text);
}

.obs-diff-before {
  color: var(--obs-text-muted);
  overflow-wrap: anywhere;
}

.obs-diff-after {
  color: var(--obs-lavender);
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .obs-overview-mid-grid,
  .obs-registry-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .obs-inspector-column {
    position: static;
  }

  .obs-ledger-head {
    display: none;
  }

  .obs-ledger-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
  }

  .obs-ledger-citizen {
    grid-column: 1 / -1;
  }

  .obs-field-label-mobile {
    display: inline;
  }
}

@media (max-width: 860px) {
  .obs-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .obs-sidebar {
    position: static;
    min-block-size: auto;
    border-inline-end: none;
    border-block-end: 1px solid var(--obs-border);
    padding: 10px 14px;
  }

  .obs-nav-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .obs-nav-btn.v-btn {
    inline-size: auto !important;
    flex: 1 1 auto;
  }

  .obs-sidebar-footer {
    display: none;
  }

  .obs-main {
    padding: 14px 14px 28px;
  }

  .obs-charts-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (forced-colors: active) {
  .obs-surface-card,
  .obs-dir-item,
  .obs-badge,
  .obs-clock-pill {
    border: 1px solid CanvasText;
  }

  .obs-nav-btn-active.v-btn,
  .obs-dir-item-active {
    outline: 2px solid Highlight;
  }
}

.obs-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-block-start: 10px;
  margin-block-top: 8px;
  border-block-start: 1px solid var(--obs-border);
}
"""


def resolve_component(component):
    if isinstance(component, tuple):
        return component[0]
    return component


def _world_phase(hour: int) -> tuple[str, str]:
    if hour >= 23 or hour < 6:
        return ("🌙", "Late Night")
    if hour < 12:
        return ("🌅", "Morning")
    if hour < 18:
        return ("☀️", "Afternoon")
    return ("🌆", "Evening")


def _elapsed_steps(model: PopulationModel) -> int:
    if hasattr(model, "world_clock"):
        return model.world_clock.tick_count
    if hasattr(model, "steps") and isinstance(model.steps, int):
        return model.steps
    return (model.day - 1) * 48 + model.hour * 2 + (1 if model.minute >= 30 else 0)


def _make_chart_post_process(is_dark: bool, title_ylabel: str, fill_single: bool = False):
    fg = "#e2e8f0" if is_dark else "#1e293b"
    muted = "#94a3b8" if is_dark else "#64748b"
    grid_color = "#2c3557" if is_dark else "#e2e8f0"
    fill_color = "#818cf8" if is_dark else "#6366f1"

    def post_process(ax):
        fig = ax.figure
        fig.set_size_inches(6.4, 3.0)
        fig.patch.set_alpha(0.0)
        ax.patch.set_alpha(0.0)

        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color(grid_color)
        ax.spines["bottom"].set_color(grid_color)

        ax.tick_params(colors=muted, labelsize=9)
        ax.xaxis.label.set_color(muted)
        ax.yaxis.label.set_color(muted)
        ax.set_xlabel("Simulation Step (30 min / step)", fontsize=9)
        ax.set_ylabel(title_ylabel, fontsize=9)
        ax.grid(True, axis="y", linestyle="--", linewidth=0.7, color=grid_color, alpha=0.8)

        has_points = any(len(line.get_xdata()) > 0 for line in ax.lines)
        for line in ax.lines:
            line.set_linewidth(2.2)
            if fill_single and len(ax.lines) == 1 and len(line.get_xdata()) > 0:
                ax.fill_between(
                    line.get_xdata(),
                    line.get_ydata(),
                    alpha=0.14,
                    color=fill_color,
                )

        leg = ax.get_legend()
        if leg is not None:
            frame = leg.get_frame()
            frame.set_facecolor("#171c32" if is_dark else "#ffffff")
            frame.set_edgecolor(grid_color)
            frame.set_alpha(0.9)
            for txt in leg.get_texts():
                txt.set_color(fg)
                txt.set_fontsize(8.5)

        if not has_points:
            ax.text(
                0.5,
                0.5,
                "Press Play or Step to record population time-series",
                transform=ax.transAxes,
                ha="center",
                va="center",
                fontsize=9.5,
                color=muted,
            )

    return post_process


@solara.component  # pyright: ignore[reportPrivateImportUsage]
def WorldOverview(model: PopulationModel, is_dark: bool):
    """World Overview page with statistics, world clock, activity distributions, eligibility breakdown, and Mesa plots."""
    update_counter.get()

    all_agents = list(model.agents)
    living_agents = [a for a in all_agents if a.eligible_for_living_sim]
    excluded_count = len(all_agents) - len(living_agents)

    pop_count = len(living_agents)
    denom = max(1, pop_count)

    avg_energy = sum(a.energy for a in living_agents) / denom
    avg_hunger = sum(a.hunger for a in living_agents) / denom
    avg_social = sum(a.social_need for a in living_agents) / denom

    low_energy_count = sum(1 for a in living_agents if a.energy < 25)
    high_hunger_count = sum(1 for a in living_agents if a.hunger >= 70)
    high_social_count = sum(1 for a in living_agents if a.social_need >= 65)

    activities = Counter(a.activity for a in living_agents)
    class_counts = Counter(
        (a.character_classification, a.eligible_for_living_sim)
        for a in all_agents
    )
    realm_counts = Counter(str(a.realm) for a in living_agents)

    top_activity, top_count = (
        activities.most_common(1)[0] if activities else ("Resting", 0)
    )
    top_pct = (top_count / denom) * 100.0
    phase_icon, phase_name = _world_phase(model.hour)
    steps = _elapsed_steps(model)

    activity_colors = (
        {"Entertainment": "#a78bfa", "Socializing": "#60a5fa"}
        if is_dark
        else {"Entertainment": "#7c3aed", "Socializing": "#2563eb"}
    )
    energy_colors = (
        {"Average Energy": "#818cf8"}
        if is_dark
        else {"Average Energy": "#4f46e5"}
    )

    activity_plot = solara.use_memo(
        lambda: resolve_component(
            make_plot_component(
                activity_colors,
                post_process=_make_chart_post_process(is_dark, "Living Citizens"),
                save_format="svg",
            )
        ),
        [is_dark],
    )
    energy_plot = solara.use_memo(
        lambda: resolve_component(
            make_plot_component(
                energy_colors,
                post_process=_make_chart_post_process(
                    is_dark, "Average Energy", fill_single=True
                ),
                save_format="svg",
            )
        ),
        [is_dark],
    )

    ordered_acts = sorted(
        ALL_ACTIVITIES,
        key=lambda name: (-activities.get(name, 0), ALL_ACTIVITIES.index(name)),
    )
    for extra_act in activities:
        if extra_act not in ordered_acts:
            ordered_acts.append(extra_act)

    dist_rows_html = []
    for act in ordered_acts:
        cnt = activities.get(act, 0)
        if cnt == 0 and act in ("Companion duties", "Creative & studio work", "Civic & professional duties"):
            continue
        pct = (cnt / denom) * 100.0
        icon = ACTIVITY_ICONS.get(act, "•")
        dist_rows_html.append(
            f'<div class="obs-dist-row">'
            f'  <div class="obs-dist-meta">'
            f'    <span class="obs-dist-label">{icon} {html.escape(str(act))}</span>'
            f'    <span class="obs-dist-count"><strong>{cnt}</strong> ({pct:.0f}%)</span>'
            f"  </div>"
            f'  <div class="obs-meter-track" role="progressbar" '
            f'       aria-valuenow="{pct:.0f}" aria-valuemin="0" aria-valuemax="100" '
            f'       aria-label="{html.escape(str(act))} share">'
            f'    <div class="obs-meter-fill obs-meter-lavender" style="width: {pct:.1f}%;"></div>'
            f"  </div>"
            f"</div>"
        )

    elig_rows_html = []
    by_cls_summary: dict[str, list[int]] = {}
    for (cls_name, is_elig), cnt in class_counts.items():
        pair = by_cls_summary.setdefault(cls_name, [0, 0])
        if is_elig:
            pair[0] += cnt
        else:
            pair[1] += cnt

    for cls_name, (liv_c, exc_c) in sorted(
        by_cls_summary.items(), key=lambda kv: -(kv[1][0] + kv[1][1])
    ):
        status_note = (
            f"{liv_c} living"
            if exc_c == 0
            else (
                f"{exc_c} excluded"
                if liv_c == 0
                else f"{liv_c} living · {exc_c} excluded"
            )
        )
        elig_rows_html.append(
            f'<div class="obs-realm-row">'
            f"  <span><strong>{html.escape(cls_name)}</strong></span>"
            f'  <span class="obs-muted">{status_note}</span>'
            f"</div>"
        )

    with solara.Div(classes=["obs-page"]):
        # Header
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-page-header">'
                "  <div>"
                '    <h1 class="obs-page-title">World Overview</h1>'
                '    <p class="obs-page-subtitle">'
                "      Real-time living population telemetry, circadian activity distribution, and eligibility breakdown."
                "    </p>"
                "  </div>"
                f'  <div class="obs-count-pill">'
                f"    <span>{phase_icon}</span>"
                f"    <span><strong>{phase_name}</strong> · Step {steps}</span>"
                f"  </div>"
                "</div>"
            ),
        )

        # KPI Cards
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-kpi-grid">'
                '  <div class="obs-surface-card obs-kpi-card">'
                '    <div class="obs-kpi-label">World Clock</div>'
                f'    <div class="obs-kpi-value">{model.hour:02d}:{model.minute:02d}'
                f'      <span class="obs-kpi-unit">Day {model.day}</span></div>'
                f'    <div class="obs-kpi-foot">{phase_icon} {phase_name} cycle · 30m/step</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card obs-kpi-blue">'
                '    <div class="obs-kpi-label">Living Population</div>'
                f'    <div class="obs-kpi-value">{pop_count}'
                f'      <span class="obs-kpi-unit">/ {len(all_agents)}</span></div>'
                f'    <div class="obs-kpi-foot">{excluded_count} archival/case/player records excluded · {len(realm_counts)} realms</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card">'
                '    <div class="obs-kpi-label">Average Energy</div>'
                f'    <div class="obs-kpi-value">{avg_energy:.1f}'
                '      <span class="obs-kpi-unit">/ 100</span></div>'
                f'    <div class="obs-kpi-foot">Hunger {avg_hunger:.1f} · Social need {avg_social:.1f}</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card obs-kpi-blue">'
                '    <div class="obs-kpi-label">Dominant Activity</div>'
                f'    <div class="obs-kpi-value" style="font-size:1.22rem;">{html.escape(str(top_activity))}</div>'
                f'    <div class="obs-kpi-foot">{top_count} living citizens ({top_pct:.0f}%)</div>'
                "  </div>"
                "</div>"
            ),
        )

        # Activity Distribution & Eligibility Breakdown
        with solara.Div(classes=["obs-overview-mid-grid"]):
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Living Activity Distribution</h2>'
                        f'  <span class="obs-badge obs-badge-lavender">Day {model.day} · {model.hour:02d}:{model.minute:02d}</span>'
                        "</div>"
                        f'<div class="obs-dist-list">{"".join(dist_rows_html)}</div>'
                    ),
                )

            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Threshold Pulse &amp; Eligibility</h2>'
                        '  <span class="obs-muted">Classification participation</span>'
                        "</div>"
                        '<div class="obs-needs-grid">'
                        '  <div class="obs-need-tile">'
                        f'    <div class="obs-need-num">{low_energy_count}</div>'
                        '    <div class="obs-need-lbl">Low Energy (&lt;25)</div>'
                        "  </div>"
                        '  <div class="obs-need-tile">'
                        f'    <div class="obs-need-num">{high_hunger_count}</div>'
                        '    <div class="obs-need-lbl">Hungry (≥70)</div>'
                        "  </div>"
                        '  <div class="obs-need-tile">'
                        f'    <div class="obs-need-num">{high_social_count}</div>'
                        '    <div class="obs-need-lbl">Seeking Social (≥65)</div>'
                        "  </div>"
                        "</div>"
                        f'<div class="obs-realm-list">{"".join(elig_rows_html)}</div>'
                    ),
                )

        # Existing Mesa Population Graphs (Side-by-Side Responsive Grid)
        with solara.Div(classes=["obs-charts-grid"]):
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Population Activities</h2>'
                        '  <span class="obs-badge obs-badge-lavender">Entertainment &amp; Socializing</span>'
                        "</div>"
                    ),
                )
                with solara.Div(classes=["obs-chart-wrap"]):
                    activity_plot(model)

            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Population Energy</h2>'
                        '  <span class="obs-badge obs-badge-blue">Mean Living Citizen Energy</span>'
                        "</div>"
                    ),
                )
                with solara.Div(classes=["obs-chart-wrap"]):
                    energy_plot(model)


@solara.component
def EntertainmentAndFame(
    model: PopulationModel,
    on_inspect_citizen: Callable[[str], None],
):
    """Live Section XIX Entertainment Industry, 8-Axis Fame, Releases, Venues, Royalties & Sync Observatory."""
    update_counter.get()
    state = model._export_state()
    run_env = {
        "run_id": model.run_id,
        "name": model.run_name,
        "revision": model._revision,
        "calendar": model.calendar_config,
        "state": state,
    }
    snap = entertainment.industry_snapshot(run_env)
    metrics = snap["metrics"]
    orgs = snap["organizations"]
    artists = snap["artists"]
    fame_profiles = snap["fameProfiles"]
    tracks = snap["charts"]["songbirdTopTracks"]
    concerts = snap["concerts"]
    releases = snap["releases"]
    contracts = snap["contracts"]
    controversies = snap["controversies"]
    media_items = snap["mediaItems"]
    awards = snap["awards"]

    living = model.living_agents
    ent_employed = [
        c
        for c in living
        if any(
            kw in f"{c.primary_occupation} {getattr(c, 'affiliation', '')} {getattr(c, 'employment', '')}".casefold()
            for kw in (
                "artist",
                "music",
                "actor",
                "danc",
                "theatre",
                "model",
                "radio",
                "journal",
                "starstruck",
                "marlie",
                "limelight",
                "mirrora",
                "songbird",
                "marigold",
                "kaji",
            )
        )
    ]
    recent_tx = model.store.recent_transactions(model.run_id, 40) if getattr(model, "run_id", None) else []
    ent_tx = [
        tx
        for tx in recent_tx
        if any(
            k in str(tx.get("kind", "")).casefold() or k in str(tx.get("description", "")).casefold()
            for k in ("royalt", "concert", "audition", "sponsorship", "entertainment", "player_mirror", "ticket")
        )
    ]
    player_linked_artists = [a for a in artists if a.get("origin") == "player"]
    has_mirror_sync = any(tx.get("kind") == "player_mirror" for tx in recent_tx)

    # Mean across all 8 canonical fame axes
    axis_means: dict[str, float] = {}
    for axis in entertainment.FAME_AXES:
        vals = [float(a.get(axis, 0.0)) for a in artists]
        axis_means[axis] = round(sum(vals) / len(vals), 1) if vals else 0.0

    axis_bars_html = []
    for axis, avg_val in axis_means.items():
        pct = max(2.0, min(100.0, avg_val))
        axis_bars_html.append(
            '<div class="obs-dist-row">'
            f'  <div class="obs-dist-label"><span>{html.escape(axis)}</span></div>'
            '  <div class="obs-dist-track">'
            f'    <div class="obs-dist-fill" style="width:{pct:.1f}%;"></div>'
            "  </div>"
            f'  <div class="obs-dist-val">{avg_val:.1f} / 100</div>'
            "</div>"
        )

    # Venue utilization summary
    venue_map: dict[str, dict[str, float | int | str]] = {}
    for c in concerts:
        v_name = str(c.get("venue") or "Venue")
        entry = venue_map.setdefault(v_name, {"shows": 0, "sold": 0, "cap": 0, "gross": 0.0})
        entry["shows"] = int(entry["shows"]) + 1
        entry["sold"] = int(entry["sold"]) + int(c.get("ticketsSold", 0))
        entry["cap"] = int(entry["cap"]) + max(1, int(c.get("capacity", 180)))
        entry["gross"] = float(entry["gross"]) + float(c.get("grossRevenue", 0.0))

    venue_rows_html = []
    for v_name, st in venue_map.items():
        util = (int(st["sold"]) / max(1, int(st["cap"]))) * 100.0
        venue_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span><strong>{html.escape(v_name)}</strong> ({st['shows']} bookings)</span>"
            f'  <span class="obs-muted">{int(st["sold"]):,} / {int(st["cap"]):,} seats ({util:.0f}%) · {float(st["gross"]):,.0f} ₢</span>'
            "</div>"
        )
    if not venue_rows_html:
        venue_rows_html.append('<div class="obs-empty-state">Advance the simulation clock to populate live venue bookings and attendance.</div>')

    # Organization contract & roster counts
    org_contract_counts = Counter(c.get("orgId") for c in contracts if c.get("status") == "active")
    org_rows_html = []
    for org in orgs[:25]:
        oid = org["id"]
        c_count = org_contract_counts.get(oid, 0)
        org_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span><strong>{html.escape(org['name'])}</strong> <small class='obs-muted'>({html.escape(org['domain'])})</small></span>"
            f'  <span class="obs-muted">{html.escape(org["sector"])} · {c_count} active deal{"s" if c_count != 1 else ""}</span>'
            "</div>"
        )

    # Tracks & Radio table rows
    track_rows_html = []
    for idx, trk in enumerate(tracks[:8], start=1):
        sticker_badge = (
            f' · <span class="obs-badge obs-badge-lavender">{html.escape(str(trk.get("stickerEdition")))}</span>'
            if trk.get("stickerEdition")
            else ""
        )
        track_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span><strong>#{idx} {html.escape(str(trk.get('title')))}</strong> — {html.escape(str(trk.get('stageName')))}{sticker_badge}</span>"
            f'  <span class="obs-muted">{int(trk.get("streams", 0)):,} streams · {int(trk.get("radioSpins", 0))} Pop Sticker spins</span>'
            "</div>"
        )
    if not track_rows_html:
        track_rows_html.append('<div class="obs-empty-state">No tracks released yet in this run; step the world clock to trigger studio sessions.</div>')

    # Releases & Concerts feed
    schedule_rows_html = []
    for rel in releases[-5:]:
        schedule_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span>🎵 <strong>{html.escape(str(rel.get('platform', 'Songbird')))} Release</strong> · {html.escape(str(rel.get('status', 'scheduled')))}</span>"
            f'  <span class="obs-muted">Royalty split {float(rel.get("royaltyRate", 0.8)) * 100:.0f}%</span>'
            "</div>"
        )
    for con in concerts[-5:]:
        schedule_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span>🎟️ <strong>{html.escape(str(con.get('title') or con.get('venue')))}</strong> ({html.escape(str(con.get('status')))})</span>"
            f'  <span class="obs-muted">{int(con.get("ticketsSold", 0)):,} sold · {float(con.get("grossRevenue", 0.0)):,.0f} ₢</span>'
            "</div>"
        )
    if not schedule_rows_html:
        schedule_rows_html.append('<div class="obs-empty-state">No releases or performances scheduled yet in this run.</div>')

    # Controversies, Press & Radiance Awards
    press_rows_html = []
    for aw in awards[:2]:
        winners_str = ", ".join(w.get("stageName", "") for w in aw.get("winners", [])) or f"{len(aw.get('nominees', []))} nominees on ballot"
        press_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span>🏆 <strong>{html.escape(str(aw.get('awardCycleId')))}</strong> ({html.escape(str(aw.get('status')))})</span>"
            f'  <span class="obs-muted">{html.escape(winners_str)}</span>'
            "</div>"
        )
    for cnv in controversies[:4]:
        press_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span>⚠️ <strong>{html.escape(str(cnv.get('stageName')))}</strong>: {html.escape(str(cnv.get('topic')))}</span>"
            f'  <span class="obs-muted">{html.escape(str(cnv.get("status")))} (sev {cnv.get("severity")})</span>'
            "</div>"
        )
    for med in media_items[:5]:
        press_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span>📰 <strong>{html.escape(str(med.get('headline')))}</strong></span>"
            f'  <span class="obs-muted">{html.escape(str(med.get("kind", "press")))} · Day {int(med.get("dayIndex", 0)) + 1}</span>'
            "</div>"
        )
    if not press_rows_html:
        press_rows_html.append('<div class="obs-empty-state">Limelight press desk and Radiance Academy logs will appear as events unfold.</div>')

    tx_rows_html = []
    for tx in ent_tx[:8]:
        tx_rows_html.append(
            '<div class="obs-realm-row">'
            f"  <span><strong>{html.escape(str(tx.get('kind')))}</strong> — {html.escape(str(tx.get('description') or tx.get('character_id')))}</span>"
            f'  <span class="obs-muted">{float(tx.get("amount", 0.0)):+,.2f} ₢</span>'
            "</div>"
        )
    if not tx_rows_html:
        tx_rows_html.append('<div class="obs-empty-state">No entertainment royalty, ticket, or mirror ledger entries recorded yet in this run.</div>')

    sync_label = (
        f"Synchronized ({len(player_linked_artists)} player persona(s), credit mirror {'active' if has_mirror_sync else 'standby'})"
        if (player_linked_artists or has_mirror_sync)
        else f"Autonomous NPC Mode · Run {model.run_id[:8]} Ready for OS Link"
    )

    with solara.Div(classes=["obs-page"]):
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-page-header">'
                "  <div>"
                '    <h1 class="obs-page-title">Entertainment &amp; Fame</h1>'
                '    <p class="obs-page-subtitle">'
                "      Live Section XIX industry telemetry: artists, 8-axis fame distribution, Songbird &amp; Pop Sticker charts, venue box office, royalties, and OS sync."
                "    </p>"
                "  </div>"
                '  <div class="obs-count-pill">'
                "    <span>🎭</span>"
                f"    <span><strong>{html.escape(sync_label)}</strong></span>"
                "  </div>"
                "</div>"
            ),
        )

        # KPI Cards
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-kpi-grid">'
                '  <div class="obs-surface-card obs-kpi-card">'
                '    <div class="obs-kpi-label">Industry Workforce &amp; Artists</div>'
                f'    <div class="obs-kpi-value">{metrics["activeArtists"]}'
                f'      <span class="obs-kpi-unit">artists · {len(ent_employed)} staff</span></div>'
                f'    <div class="obs-kpi-foot">{metrics["organizationCount"]} Section XIX organizations · {metrics["activeContracts"]} active contracts</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card obs-kpi-blue">'
                '    <div class="obs-kpi-label">Streams &amp; Radio Airplay</div>'
                f'    <div class="obs-kpi-value">{metrics["totalStreams"]:,}'
                f'      <span class="obs-kpi-unit">streams</span></div>'
                f'    <div class="obs-kpi-foot">{metrics["totalTracks"]} catalog tracks · {metrics["totalRadioSpins"]:,} Pop Sticker spins</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card">'
                '    <div class="obs-kpi-label">Venues &amp; Ticket Sales</div>'
                f'    <div class="obs-kpi-value">{metrics["totalTicketsSold"]:,}'
                f'      <span class="obs-kpi-unit">tickets</span></div>'
                f'    <div class="obs-kpi-foot">{metrics["scheduledConcerts"]} scheduled · {metrics["completedConcerts"]} completed · {metrics["openAuditions"]} open calls</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card obs-kpi-blue">'
                '    <div class="obs-kpi-label">Box Office &amp; Royalties</div>'
                f'    <div class="obs-kpi-value">{metrics["totalBoxOfficeCredits"] + metrics["totalRoyaltiesCredits"]:,.0f}'
                '      <span class="obs-kpi-unit">₢</span></div>'
                f'    <div class="obs-kpi-foot">Box office {metrics["totalBoxOfficeCredits"]:,.0f} ₢ · Royalties {metrics["totalRoyaltiesCredits"]:,.0f} ₢</div>'
                "  </div>"
                "</div>"
            ),
        )

        # Row 1: 8-Axis Fame Distribution + Active Celebrity Roster (with Citizen Registry Inspector Jump)
        with solara.Div(classes=["obs-overview-mid-grid"]):
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">8-Axis Fame Distribution (Mean Across Active Roster)</h2>'
                        f'  <span class="obs-badge obs-badge-lavender">{len(artists)} Tracked Profiles</span>'
                        "</div>"
                        f'<div class="obs-dist-list">{"".join(axis_bars_html)}</div>'
                    ),
                )

            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Active Artists, Celebrities &amp; Community Reception</h2>'
                        '  <span class="obs-badge obs-badge-blue">Live Fame Roster</span>'
                        "</div>"
                    ),
                )
                if not fame_profiles:
                    solara.HTML(
                        tag="div",
                        unsafe_innerHTML='<div class="obs-empty-state">Step or Play the simulation to discover emerging artists from the citizen population.</div>',
                    )
                else:
                    for prof in fame_profiles[:8]:
                        cid = str(prof.get("characterId") or "")
                        rec_map = prof.get("communityReception", {})
                        with solara.Div(classes=["obs-realm-row"]):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    f"<strong>{html.escape(str(prof.get('stageName')))}</strong> "
                                    f"<span class='obs-badge obs-badge-lavender'>{html.escape(str(prof.get('tier')))}</span>"
                                    f"<div class='obs-muted' style='font-size:0.76rem;'>"
                                    f"Rec {prof.get('recognition', 0):.1f} · Cred {prof.get('artisticCredibility', 0):.1f} · "
                                    f"Fav {prof.get('favorability', 0):.1f} · Critics {rec_map.get('criticsAndPeers', 0):.0f} · Fans {rec_map.get('dedicatedFans', 0):.0f}"
                                    "</div>"
                                ),
                            )
                            if cid and any(a.character_id == cid for a in model.agents):
                                solara.Button(
                                    label="Inspect Citizen",
                                    outlined=True,
                                    on_click=lambda target=cid: on_inspect_citizen(target),
                                    classes=["obs-btn-compact"],
                                )

        # Row 2: Songbird & Pop Sticker Activity + Venue Utilization & Schedule
        with solara.Div(classes=["obs-overview-mid-grid"]):
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Songbird Streaming &amp; Pop Sticker Radio Charts</h2>'
                        '  <span class="obs-badge obs-badge-lavender">Catalog Telemetry</span>'
                        "</div>"
                        f'<div class="obs-realm-list">{"".join(track_rows_html)}</div>'
                    ),
                )

            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Venue Utilization, Releases &amp; Performances</h2>'
                        '  <span class="obs-badge obs-badge-blue">Box Office &amp; Schedule</span>'
                        "</div>"
                        f'<div class="obs-realm-list" style="margin-bottom:10px;">{"".join(venue_rows_html)}</div>'
                        f'<div class="obs-realm-list">{"".join(schedule_rows_html)}</div>'
                    ),
                )

        # Row 3: Reputation, Controversies & Awards + Financial Flows & Section XIX Organizations
        with solara.Div(classes=["obs-overview-mid-grid"]):
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        '  <h2 class="obs-section-title">Limelight Press, Controversies &amp; Radiance Awards</h2>'
                        '  <span class="obs-badge obs-badge-lavender">Reputation &amp; Honors</span>'
                        "</div>"
                        f'<div class="obs-realm-list">{"".join(press_rows_html)}</div>'
                        '<div class="obs-section-head" style="margin-top:14px;">'
                        '  <h2 class="obs-section-title">Financial Flows, Royalties &amp; Sync Ledger</h2>'
                        "</div>"
                        f'<div class="obs-realm-list">{"".join(tx_rows_html)}</div>'
                    ),
                )

            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head">'
                        f'  <h2 class="obs-section-title">Section XIX Entertainment Organizations ({len(orgs)})</h2>'
                        '  <span class="obs-badge obs-badge-blue">Canonical Registry</span>'
                        "</div>"
                        f'<div class="obs-realm-list" style="max-height:420px;overflow-y:auto;">{"".join(org_rows_html)}</div>'
                    ),
                )


@solara.component
def LivingWorldEngine(
    model: PopulationModel,
    selected_run_id: str | None,
    on_select_run: Callable[[str], None],
    on_load_run: Callable[[str], None],
    on_action: Callable | None = None,
):
    """Integrated calendar, routines, geography, work, economy, and social telemetry."""
    update_counter.get()
    date = model.current_world_date()
    living = model.living_agents
    employed = [
        citizen
        for citizen in living
        if citizen.primary_occupation
        and citizen.primary_occupation.casefold() not in ("unknown", "none")
    ]
    commuting = [citizen for citizen in living if citizen.activity == "Commuting"]
    total_savings = sum(citizen.savings for citizen in living)
    total_balances = sum(citizen.balance for citizen in living)
    living_count = max(1, len(living))
    average_hygiene = sum(citizen.hygiene_need for citizen in living) / living_count
    average_exercise = sum(citizen.exercise_need for citizen in living) / living_count
    average_leisure = sum(citizen.leisure_need for citizen in living) / living_count
    relationship_counts = Counter(
        link["kind"]
        for citizen in living
        for link in citizen.relationship_links
    )
    lifecycle_counts = Counter(citizen.life_stage for citizen in living)
    realm_counts = Counter(citizen.realm for citizen in living)
    event_names = [
        html.escape(event["name"])
        + (f" · {html.escape(event['realm'])}" if event.get("realm") else "")
        for event in date["events"]
    ]
    event_html = (
        " · ".join(event_names)
        if event_names
        else "No holiday or recurring event today"
    )

    calendar_drafts, set_calendar_drafts = solara.use_state({})
    calendar_text = calendar_drafts.get(
        model.run_id,
        json.dumps(model.calendar_config, ensure_ascii=False, indent=2),
    )

    apply_action = on_action or (lambda action: action())
    run_records = model.store.list_runs()
    run_ids = [record["RunId"] for record in run_records]
    active_selection = (
        selected_run_id if selected_run_id in run_ids else model.run_id
    )
    schedules = sorted(
        living,
        key=lambda citizen: (citizen.activity, citizen.name.casefold()),
    )[:12]
    schedule_rows = "".join(
        "<tr>"
        f"<td>{html.escape(citizen.name)}</td>"
        f"<td>{html.escape(citizen.schedule_mode)} · {html.escape(citizen.schedule_preset)}</td>"
        f"<td>{html.escape(citizen.activity)}</td>"
        f"<td>{html.escape(str(citizen.current_location.get('label') or 'Unassigned'))}"
        f"{', ' + html.escape(str(citizen.current_location.get('district'))) if citizen.current_location.get('district') else ''}</td>"
        f"<td>{html.escape(str(citizen.destination.get('label') or '—'))}</td>"
        f"<td>{html.escape(citizen.transport_mode or '—')}</td>"
        "</tr>"
        for citizen in schedules
    )
    institution_rows = "".join(
        "<div class='obs-realm-row'>"
        f"<span><strong>{html.escape(item['name'])}</strong></span>"
        f"<span class='obs-muted'>{html.escape(item['kind'].title())} · "
        f"{len(item['citizen_ids'])} citizens</span></div>"
        for item in model.institutions[:16]
    )
    if not institution_rows:
        institution_rows = (
            "<div class='obs-empty-state'>No institutions mapped.</div>"
        )
    recent_transactions = model.store.recent_transactions(model.run_id, 12)
    names_by_id = {citizen.character_id: citizen.name for citizen in model.agents}
    transaction_rows = "".join(
        "<tr>"
        f"<td>{html.escape(str(item['world_date']))}</td>"
        f"<td>{html.escape(names_by_id.get(item['character_id'], item['character_id']))}</td>"
        f"<td>{html.escape(str(item['kind']).title())}</td>"
        f"<td>{float(item['amount']):+.2f}</td>"
        f"<td>{html.escape(str(item['description']))}</td>"
        "</tr>"
        for item in recent_transactions
    )
    calendar_title = (
        f"Year {date['year']} · {html.escape(date['weekday'])}, "
        f"{html.escape(date['month'])} {date['day']} · {date['time']}"
    )
    realm_seasons = {
        str(item.get("name") or ""): str(item.get("season") or "")
        for item in model.world_reference["realms"]
    }
    realm_rows = "".join(
        f"<div class='obs-realm-row'><span>{html.escape(str(realm))}"
        f"{' · ' + html.escape(realm_seasons.get(str(realm), '')) if realm_seasons.get(str(realm)) else ''}</span>"
        f"<span class='obs-muted'>{count} citizens</span></div>"
        for realm, count in sorted(realm_counts.items())
    )
    lifecycle_text = " · ".join(
        f"{html.escape(stage)}: {count}"
        for stage, count in sorted(lifecycle_counts.items())
    )
    relationship_text = " · ".join(
        f"{html.escape(kind.title())}: {count}"
        for kind, count in sorted(relationship_counts.items())
    ) or "No linked relationships yet"

    with solara.Div(classes=["obs-page"]):
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-page-header"><div>'
                '<h1 class="obs-page-title">Living World Engine</h1>'
                '<p class="obs-page-subtitle">One run-scoped clock coordinates citizen routines, '
                "travel, employment, institutions, relationships, and the economy.</p>"
                "</div>"
                f'<div class="obs-count-pill">{html.escape(str(date["season"]))} · '
                f"{html.escape(str(date.get('realm_climate') or 'Shared civil calendar'))}</div>"
                "</div>"
            ),
        )
        with solara.Div(classes=["obs-surface-card"]):
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    '<div class="obs-section-head"><div>'
                    '<h2 class="obs-section-title">World Calendar</h2>'
                    f'<span class="obs-muted">{calendar_title} · {html.escape(date["era_name"])}</span>'
                    "</div>"
                    f'<span class="obs-badge obs-badge-lavender">{event_html}</span>'
                    "</div>"
                ),
            )
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-kpi-grid">'
                f'<div class="obs-surface-card obs-kpi-card"><div class="obs-kpi-label">Living Citizens</div><div class="obs-kpi-value">{len(living)}</div><div class="obs-kpi-foot">{len(model.agents) - len(living)} records excluded</div></div>'
                f'<div class="obs-surface-card obs-kpi-card obs-kpi-blue"><div class="obs-kpi-label">Employment</div><div class="obs-kpi-value">{len(employed)}</div><div class="obs-kpi-foot">Citizens with active occupations</div></div>'
                f'<div class="obs-surface-card obs-kpi-card"><div class="obs-kpi-label">Commuting</div><div class="obs-kpi-value">{len(commuting)}</div><div class="obs-kpi-foot">{html.escape(", ".join(sorted({c.transport_mode for c in commuting if c.transport_mode})) or "No active routes")}</div></div>'
                f'<div class="obs-surface-card obs-kpi-card obs-kpi-blue"><div class="obs-kpi-label">Economy</div><div class="obs-kpi-value">{total_balances:,.0f} cr</div><div class="obs-kpi-foot">Savings {total_savings:,.0f} cr · experimental ledger</div></div>'
                f'<div class="obs-surface-card obs-kpi-card"><div class="obs-kpi-label">Daily Needs</div><div class="obs-kpi-value">{(average_hygiene + average_exercise + average_leisure) / 3:.0f}</div><div class="obs-kpi-foot">Hygiene {average_hygiene:.0f} · Exercise {average_exercise:.0f} · Leisure {average_leisure:.0f}</div></div>'
                "</div>"
            ),
        )
        with solara.Div(classes=["obs-overview-mid-grid"]):
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head"><h2 class="obs-section-title">Schedules &amp; Destinations</h2>'
                        f'<span class="obs-muted">{html.escape(str(model.step_minutes))} in-game minutes / step</span></div>'
                        '<div class="obs-table-wrap"><table class="obs-table"><thead><tr>'
                        "<th>Citizen</th><th>Schedule</th><th>Activity</th><th>Current location</th><th>Destination</th><th>Transport</th>"
                        f"</tr></thead><tbody>{schedule_rows}</tbody></table></div>"
                    ),
                )
            with solara.Div(classes=["obs-surface-card"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head"><h2 class="obs-section-title">Institutions &amp; Population</h2>'
                        f'<span class="obs-muted">{len(model.institutions)} mapped institutions</span></div>'
                        f'<div class="obs-realm-list">{institution_rows}</div>'
                        f'<div class="obs-muted" style="margin-top:12px;">Life stages · {lifecycle_text}</div>'
                        f'<div class="obs-muted" style="margin-top:8px;">Relationships · {relationship_text}</div>'
                        f'<div class="obs-muted" style="margin-top:8px;">Realms · {realm_rows}</div>'
                    ),
                )
        with solara.Div(classes=["obs-surface-card"]):
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    '<div class="obs-section-head"><h2 class="obs-section-title">Experimental Run Persistence</h2>'
                    f'<span class="obs-badge obs-badge-blue">{html.escape(model.run_id[:8])} · '
                    "SQLite-backed, canonical records read-only</span></div>"
                ),
            )
            solara.Select(
                label="Saved experiment",
                value=active_selection,
                values=run_ids,
                on_value=on_select_run,
            )
            with solara.Div(classes=["obs-sim-btn-group"]):
                solara.Button(
                    label="Save current run",
                    outlined=True,
                    on_click=lambda: apply_action(model.save),
                    classes=["obs-ctrl-btn"],
                )
                solara.Button(
                    label="Load selected run",
                    color="primary",
                    on_click=lambda: on_load_run(active_selection),
                    disabled=not active_selection,
                    classes=["obs-ctrl-btn"],
                )
            solara.Select(
                label="In-game minutes per step",
                value=model.step_minutes,
                values=[15, 30, 60, 120],
                on_value=lambda value: apply_action(lambda: model.set_step_minutes(value)),
            )
            solara.InputTextArea(
                label="Calendar configuration (JSON draft; saved to this run when applied)",
                value=calendar_text,
                on_value=lambda val: set_calendar_drafts(
                    lambda prev: {**prev, model.run_id: val or ""}
                ),
                continuous_update=True,
                rows=10,
            )
            solara.Button(
                label="Apply calendar configuration",
                outlined=True,
                on_click=lambda: apply_action(lambda: model.configure_calendar(json.loads(calendar_text))),
                classes=["obs-ctrl-btn"],
            )
        with solara.Div(classes=["obs-surface-card"]):
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    '<div class="obs-section-head"><h2 class="obs-section-title">Recent Economic Transactions</h2>'
                    '<span class="obs-muted">Each entry belongs to this experimental run.</span></div>'
                    '<div class="obs-table-wrap"><table class="obs-table"><thead><tr>'
                    "<th>World time</th><th>Citizen</th><th>Type</th><th>Amount</th><th>Memo</th>"
                    f"</tr></thead><tbody>{transaction_rows}</tbody></table></div>"
                ),
            )


@solara.component
def ToolbarClockStrip(model: PopulationModel, playing: bool):
    """Isolated live clock component so toolbar buttons never re-render on simulation ticks."""
    update_counter.get()
    steps = _elapsed_steps(model)
    phase_icon, _ = _world_phase(model.hour)
    solara.HTML(
        tag="div",
        unsafe_innerHTML=(
            '<div class="obs-clock-strip">'
            '  <div class="obs-clock-pill">'
            f"    <span>{phase_icon} Day {model.day}</span>"
            "    <span>·</span>"
            f"    <span>{model.hour:02d}:{model.minute:02d}</span>"
            "    <span>·</span>"
            f"    <span>Step {steps}</span>"
            "  </div>"
            + (
                '<span class="obs-state-pill obs-state-running">● Running</span>'
                if playing
                else '<span class="obs-state-pill obs-state-paused">⏸ Paused</span>'
            )
            + "</div>"
        ),
    )


@solara.component
def SidebarTelemetryFooter(model: PopulationModel, play_interval_ms: int):
    """Isolated sidebar status footer so navigation buttons stay static during fast playback."""
    update_counter.get()
    _, phase_name = _world_phase(model.hour)
    solara.HTML(
        tag="div",
        unsafe_innerHTML=(
            '<div class="obs-sidebar-footer">'
            f"  <div><strong>Mesa {__import__('mesa').__version__}</strong> · Seed {DEFAULT_SEED}</div>"
            f"  <div>Pace: {play_interval_ms} ms / step ({phase_name})</div>"
            "  <div>Canonical records read-only · run saves in miraverse.db</div>"
            "</div>"
        ),
    )


@solara.component
def Layout(children=[]):
    """Bypass Solara's default 400px-drawer AppLayout so the observatory fills 100% width with native scrolling."""
    return solara.Div(
        children=children,
        style={"width": "100%", "min-height": "100dvh"},
    )


@solara.component
def Page():
    """Miraverse Population Observatory responsive Solara shell."""
    solara.Title("Miraverse Population Observatory")
    solara.Style(OBSERVATORY_CSS)

    theme_pref = solara.use_trait_observe(solara.lab.theme, "dark")
    dark_effective = solara.lab.use_dark_effective()
    is_dark = bool(dark_effective) if theme_pref is None else bool(theme_pref)

    initial_model = solara.use_memo(lambda: PopulationModel(seed=DEFAULT_SEED), [])
    model, set_model = solara.use_state(initial_model)

    nav_state, set_nav_state = solara.use_state(("World Overview", None))
    current_page, selected_citizen_id = nav_state
    sidebar_open, set_sidebar_open = solara.use_state(True)
    selected_run_id, set_selected_run_id = solara.use_state(model.run_id)

    playing, set_playing = solara.use_state(False)
    play_interval_ms, set_play_interval_ms = solara.use_state(300)
    reset_generation, set_reset_generation = solara.use_state(0)
    override_revision, set_override_revision = solara.use_state(0)
    persistence_notice, set_persistence_notice = solara.use_state("")

    step_lock = solara.use_memo(threading.Lock, [])
    model_ref = solara.use_ref(model)
    playing_ref = solara.use_ref(playing)
    interval_ref = solara.use_ref(play_interval_ms)

    model_ref.current = model
    playing_ref.current = playing
    interval_ref.current = play_interval_ms

    def run_model_action(action):
        try:
            action()
            set_persistence_notice("")
        except RunConflictError:
            playing_ref.current = False
            set_playing(False)
            current = model_ref.current
            loaded = PopulationModel(seed=DEFAULT_SEED, database=current.store.database, run_id=current.run_id)
            model_ref.current = loaded
            set_model(loaded)
            set_selected_run_id(loaded.run_id)
            set_persistence_notice("Another client updated this run. Its latest saved state has been loaded; the conflicting local action was not saved. Retry your action to continue.")
        except ValueError as error:
            set_persistence_notice(str(error))
        force_update()

    def simulation_worker(cancel: threading.Event):
        if not playing_ref.current:
            return
        while not cancel.is_set() and playing_ref.current:
            wait_seconds = max(0.02, interval_ref.current / 1000.0)
            if cancel.wait(timeout=wait_seconds):
                break
            if cancel.is_set() or not playing_ref.current:
                break
            with step_lock:
                if cancel.is_set() or not playing_ref.current:
                    break
                active_model = model_ref.current
                run_model_action(active_model.step)
                if not getattr(active_model, "running", True):
                    playing_ref.current = False
                    set_playing(False)
            force_update()

    # Managed single background loop per session; auto-cancels on pause, reset, or unmount
    solara.use_thread(
        simulation_worker,
        dependencies=[playing, reset_generation],
        intrusive_cancel=False,
    )

    def handle_toggle_play():
        next_state = not playing_ref.current
        playing_ref.current = next_state
        set_playing(next_state)
        run_model_action(lambda: model_ref.current.set_playing(next_state))

    def handle_step():
        if playing_ref.current:
            return
        with step_lock:
            run_model_action(model_ref.current.step)
        force_update()

    def handle_reset():
        playing_ref.current = False
        set_playing(False)
        run_model_action(lambda: model_ref.current.set_playing(False))
        with step_lock:
            fresh_model = PopulationModel(seed=DEFAULT_SEED)
            model_ref.current = fresh_model
            set_model(fresh_model)
            set_selected_run_id(fresh_model.run_id)
        set_reset_generation(lambda g: g + 1)
        force_update()

    def handle_load_run(run_id: str):
        if not run_id:
            return
        playing_ref.current = False
        set_playing(False)
        run_model_action(lambda: model_ref.current.set_playing(False))
        with step_lock:
            loaded_model = PopulationModel(seed=DEFAULT_SEED, run_id=run_id)
            model_ref.current = loaded_model
            set_model(loaded_model)
            set_selected_run_id(loaded_model.run_id)
        set_reset_generation(lambda g: g + 1)
        force_update()

    def set_current_page(target_page: str):
        set_nav_state(lambda prev: (target_page, prev[1]))

    def set_selected_citizen_id(cid: str | None):
        set_nav_state(lambda prev: (prev[0], cid))

    def handle_inspect_from_integrity(character_id: str):
        set_nav_state(("Citizen Registry", character_id))

    def handle_edit_citizen(character_id: str):
        set_nav_state(("Population Editor", character_id))

    audit_summary = solara.use_memo(
        lambda: analyze_population_integrity(model.agents),
        [model, override_revision],
    )
    staged_count = solara.use_memo(
        lambda: len(load_all_overrides()),
        [override_revision],
    )
    living_count = len(model.living_agents)

    shell_classes = ["obs-shell"]
    if theme_pref is True:
        shell_classes.append("theme-dark")
    elif theme_pref is False:
        shell_classes.append("theme-light")

    with solara.Div(classes=shell_classes):
        # Horizontal Top Simulation Toolbar
        with solara.Div(classes=["obs-toolbar"]):
            with solara.Div(classes=["obs-toolbar-brand"]):
                solara.Button(
                    icon_name="mdi-menu",
                    icon=True,
                    on_click=lambda: set_sidebar_open(not sidebar_open),
                    classes=["obs-icon-toggle"],
                )
                solara.HTML(
                    tag="div",
                    style="display: flex; align-items: center; gap: 10px;",
                    unsafe_innerHTML=(
                        '<div class="obs-brand-mark" aria-hidden="true">M</div>'
                        '<span class="obs-brand-title">Miraverse Observatory</span>'
                    ),
                )

            ToolbarClockStrip(model, playing)

            with solara.Div(classes=["obs-toolbar-controls"]):
                with solara.Div(classes=["obs-sim-btn-group"]):
                    solara.Button(
                        label="❚❚ Pause" if playing else "▶ Play",
                        color="primary",
                        on_click=handle_toggle_play,
                        disabled=not getattr(model, "running", True),
                        classes=["obs-ctrl-btn"],
                    )
                    solara.Button(
                        label="⏭ Step",
                        outlined=True,
                        on_click=handle_step,
                        disabled=playing or not getattr(model, "running", True),
                        classes=["obs-ctrl-btn"],
                    )
                    solara.Button(
                        label="↺ New Run",
                        outlined=True,
                        on_click=handle_reset,
                        classes=["obs-ctrl-btn"],
                    )

                with solara.Div(classes=["obs-speed-group"]):
                    solara.HTML(
                        tag="span",
                        unsafe_innerHTML='<span class="obs-speed-label">Speed</span>',
                    )
                    for label, ms in SPEED_PRESETS:
                        is_speed = play_interval_ms == ms
                        btn_classes = ["obs-speed-btn"]
                        if is_speed:
                            btn_classes.append("obs-speed-btn-active")
                        solara.Button(
                            label=label,
                            text=not is_speed,
                            on_click=lambda interval=ms: set_play_interval_ms(interval),
                            classes=btn_classes,
                        )

                solara.lab.ThemeToggle(enable_auto=True)

        # Body: Compact Sidebar + Full-Width Main View
        body_classes = ["obs-body"]
        if not sidebar_open:
            body_classes.append("sidebar-collapsed")

        with solara.Div(classes=body_classes):
            if sidebar_open:
                with solara.Div(classes=["obs-sidebar"]):
                    with solara.Div():
                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML='<div class="obs-nav-section-label">Observatory Views</div>',
                        )
                        with solara.Div(classes=["obs-nav-list"]):
                            nav_badges = {
                                "World Overview": f"{living_count}/{len(model.agents)}",
                                "Living World Engine": f"{len(model.institutions)}",
                                "Entertainment & Fame": f"{len(model._extensions.get('artists', []))}/{len(entertainment.load_entertainment_organizations())}",
                                "Citizen Registry": f"{len(model.agents)}",
                                "Data Integrity": f"{audit_summary['actionable_citizens']}",
                                "Population Editor": f"{staged_count}",
                            }
                            for page_title, icon in NAV_PAGES:
                                active = current_page == page_title
                                nav_cls = ["obs-nav-btn"]
                                if active:
                                    nav_cls.append("obs-nav-btn-active")
                                solara.Button(
                                    label=f"{icon}  {page_title}  ({nav_badges[page_title]})",
                                    text=True,
                                    on_click=lambda target=page_title: set_current_page(
                                        target
                                    ),
                                    classes=nav_cls,
                                )

                    SidebarTelemetryFooter(model, play_interval_ms)

            with solara.Div(classes=["obs-main"]):
                if persistence_notice:
                    solara.Warning(persistence_notice)
                with solara.Div().key(f"route-{current_page}"):
                    if current_page == "World Overview":
                        WorldOverview(model, is_dark=is_dark)
                    elif current_page == "Living World Engine":
                        LivingWorldEngine(
                            model,
                            selected_run_id,
                            on_select_run=set_selected_run_id,
                            on_load_run=handle_load_run,
                            on_action=run_model_action,
                        )
                    elif current_page == "Entertainment & Fame":
                        EntertainmentAndFame(
                            model,
                            on_inspect_citizen=handle_inspect_from_integrity,
                        )
                    elif current_page == "Citizen Registry":
                        CitizenRegistry(
                            model,
                            selected_id=selected_citizen_id,
                            on_select_id=set_selected_citizen_id,
                            on_edit_citizen=handle_edit_citizen,
                        )
                    elif current_page == "Data Integrity":
                        DataIntegrity(
                            model,
                            on_inspect_citizen=handle_inspect_from_integrity,
                            on_edit_citizen=handle_edit_citizen,
                            revision=override_revision,
                        )
                    elif current_page == "Population Editor":
                        PopulationEditor(
                            model,
                            selected_id=selected_citizen_id,
                            on_select_id=set_selected_citizen_id,
                            on_inspect_citizen=handle_inspect_from_integrity,
                            on_overrides_changed=lambda: set_override_revision(
                                lambda r: r + 1
                            ),
                            revision=override_revision,
                        )


page = Page
