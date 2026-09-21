import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateIdeas, evaluateIdeasBatch, enhancePrompt } from './lib/openai';
import {
  Settings,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Check,
  Dices,
  X,
  SlidersHorizontal,
  Volume2,
  Search,
  ArrowUpDown,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { styled, globalStyles, keyframes } from './stitches.config';
import { getRandomPrompt } from './lib/prompts';

// Initialize global styles
globalStyles();

const PROVIDERS = {
  openai: { name: 'OpenAI', defaultBase: 'https://api.openai.com/v1', defaultModel: 'gpt-5.6-luna' },
  groq: { name: 'Groq', defaultBase: 'https://api.groq.com/openai/v1', defaultModel: 'openai/gpt-oss-120b' },
  gemini: { name: 'Google Gemini', defaultBase: 'https://generativelanguage.googleapis.com/v1beta/openai/', defaultModel: 'gemini-2.5-flash' },
  grok: { name: 'xAI Grok', defaultBase: 'https://api.x.ai/v1', defaultModel: 'grok-2-latest' },
  openrouter: { name: 'OpenRouter', defaultBase: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.7-sonnet' },
  custom: { name: 'Custom Endpoint', defaultBase: '', defaultModel: '' },
};

const SLIDER_LABELS = ["Precise", "Grounded", "Balanced", "Inventive", "Experimental"];

// --- STITCHES COMPONENTS ---

const glow = keyframes({
  '0%': { filter: 'drop-shadow(0 0 10px rgba(255, 0, 110, 0.6))' },
  '100%': { filter: 'drop-shadow(0 0 20px rgba(58, 134, 255, 0.8))' }
});

const spin = keyframes({
  '100%': { transform: 'rotate(360deg)' }
});

const slideUp = keyframes({
  from: { opacity: 0, transform: 'translateY(18px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
});

const popIn = keyframes({
  '0%': { opacity: 0, transform: 'scale(0.92) translateY(6px)' },
  '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
});

const RootContainer = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  minHeight: '100vh',
  overflowX: 'hidden',
});

const AppContainer = styled('div', {
  width: '100%',
  maxWidth: '1440px',
  display: 'flex',
  flexDirection: 'column',
  padding: '0 $5 $5 $5',
  '@media (max-width: 768px)': {
    padding: '0 $3 $4 $3',
  }
});

const StickyHeader = styled('div', {
  position: 'sticky',
  top: '$4',
  zIndex: 100,
  backgroundColor: 'rgba(248, 249, 250, 0.9)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  width: '100%',
  maxWidth: '1440px',
  margin: '0 auto $5 auto',
  padding: '$5',
  borderRadius: '$6',
  border: '1px solid $border',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '$4',
  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  paddingTop: '$4',
  paddingBottom: '2.5rem',
  '@media (max-width: 768px)': {
    padding: '$3 $3 2.5rem $3',
    borderRadius: '$4',
  }
});

const MasterToggleBtn = styled('button', {
  position: 'absolute',
  bottom: '-14px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'linear-gradient(135deg, $primary, $secondary)',
  color: 'white',
  border: 'none',
  borderRadius: '$round',
  padding: '$2 $4',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.95rem',
  boxShadow: '0 4px 15px rgba(255, 0, 110, 0.3)',
  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
  zIndex: 10,
  '&:hover': {
    transform: 'translateX(-50%) scale(1.05)',
    boxShadow: '0 6px 20px rgba(58, 134, 255, 0.45)',
  },
  '&:active': {
    transform: 'translateX(-50%) scale(0.96)',
  }
});

const Header = styled('header', {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '$2',
  '& h1': {
    fontSize: '$8',
    fontWeight: 800,
    background: 'linear-gradient(135deg, $primary, $secondary)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '$2',
    animation: `${glow} 3s ease-in-out infinite alternate`,
  },
  '& p': {
    color: '$textMuted',
    fontSize: '$4',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '$2',
    margin: 0,
  }
});

const GlassPanel = styled('section', {
  background: '$surface',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid $border',
  borderRadius: '$7', // Mathmatically matches 96px closed height perfect pill
  padding: '$5',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s ease',
  height: 'auto',
  overflow: 'hidden', // Prevent inputs from bleeding out due to large border-radius
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.15)',
  },
  '& h2': {
    fontSize: '$6',
    marginBottom: '$4',
    display: 'flex',
    alignItems: 'center',
    gap: '$2',
  },
  variants: {
    open: {
      true: {
        borderRadius: '$7',
        borderBottomLeftRadius: '$4',
        borderBottomRightRadius: '$4',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s ease',
      },
      false: {
        borderRadius: '$7',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s ease', // Matches grid-template-rows 0.35s collapse
      }
    }
  }
});

const PanelsSplit = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '$4',
  alignItems: 'start', // Prevent stretching of items
  width: '100%',
  '@media (max-width: 768px)': {
    gridTemplateColumns: '1fr', // Stack on smaller screens
  }
});

const FormGroup = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
  marginBottom: '$4',
});

const FormRow = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '$3',
});

const Label = styled('label', {
  fontSize: '$2',
  color: '$textMuted',
  fontWeight: 600,
});

const inputShared = {
  width: '100%',
  boxSizing: 'border-box', // Ensure padding doesn't widen the element beyond 100%
  background: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid $border',
  color: '$text',
  padding: '0.8rem 1.2rem',
  borderRadius: '$round',
  fontFamily: 'inherit',
  fontSize: '$3',
  transition: 'all 0.3s ease',
  outline: 'none',
  '&:focus': {
    borderColor: '$secondary',
    boxShadow: '0 0 0 2px $colors$border',
    background: '#ffffff',
  }
};

const Input = styled('input', inputShared);
const Select = styled('select', inputShared);
const Textarea = styled('textarea', {
  ...inputShared,
  resize: 'vertical',
  minHeight: '120px',
  borderRadius: '$6',
  paddingRight: '3.5rem', // More space for the dice button
});

const RandomPromptBtn = styled('button', {
  position: 'absolute',
  top: '$2',
  right: '$2',
  background: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid $border',
  borderRadius: '$round',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '$primary',
  transition: 'all 0.2s ease',
  zIndex: 2,
  backdropFilter: 'blur(10px)',
  '&:hover': {
    background: 'white',
    transform: 'scale(1.1) rotate(15deg)',
    boxShadow: '0 4px 10px rgba(255, 0, 110, 0.2)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  }
});

const Button = styled('button', {
  background: 'linear-gradient(45deg, $primary, $secondary)',
  color: 'white',
  border: 'none',
  padding: '1rem 2rem',
  fontSize: '$4',
  fontWeight: 600,
  borderRadius: '$round',
  cursor: 'pointer',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '$2',
  transition: 'all 0.3s ease',
  fontFamily: '$heading',
  letterSpacing: '1px',
  marginTop: '$3',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 0 20px $colors$border',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none',
  }
});

const Loader = styled('div', {
  animation: `${spin} 2s linear infinite`,
  marginRight: '$2',
  display: 'flex',
  alignItems: 'center',
});

const IdeasList = styled('section', {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: '$5',
  paddingBottom: '$5',
  '@media (max-width: 768px)': {
    gridTemplateColumns: '1fr',
  }
});

const IdeaTitle = styled('h3', {
  fontSize: '$5',
  fontWeight: 800,
  color: '$primary',
  marginBottom: '$1', // tighter gap to the thought chain
  marginTop: 0,
  paddingRight: '120px', // More space for copy and translate buttons
  lineHeight: 1.4,
});

const TagBadge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.4px',
  padding: '3px 8px',
  borderRadius: '$round',
  background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.08), rgba(58, 134, 255, 0.12))',
  color: '$primary',
  border: '1px solid rgba(255, 0, 110, 0.2)',
  marginBottom: '$2',
  alignSelf: 'flex-start',
  width: 'fit-content',
});

const ThoughtChain = styled('div', {
  fontSize: '0.8rem',
  color: '$textMuted',
  fontFamily: 'monospace',
  marginBottom: '$3',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '4px',
  opacity: 0.8,
});

const DEFAULT_COPY_FORMAT = `[{title}] - {tag}
{thoughtProcess}

{idea}

Reasoning: {reasoning}
Syntax: {syntax} | Feasibility: {feasibility} | Relevance: {relevance} | Novelty: {novelty}`;

const COPY_VARIABLES = [
  { key: '{title}', desc: 'Idea Title' },
  { key: '{tag}', desc: 'Archetype / Framework' },
  { key: '{idea}', desc: 'Idea Content' },
  { key: '{thoughtProcess}', desc: 'Concept Trail' },
  { key: '{syntax}', desc: 'Syntax Score' },
  { key: '{feasibility}', desc: 'Feasibility Score' },
  { key: '{relevance}', desc: 'Relevance Score' },
  { key: '{novelty}', desc: 'Novelty Score' },
  { key: '{reasoning}', desc: 'Evaluation Reasoning' },
];

const FORMAT_PRESETS = [
  {
    key: 'default', name: 'Default', format: `[{title}] - {tag}
{thoughtProcess}

{idea}

Reasoning: {reasoning}
Syntax: {syntax} | Feasibility: {feasibility} | Relevance: {relevance} | Novelty: {novelty}` },
  {
    key: 'notion', name: 'Notion', format: `### {title}
` + '`{tag}`' + ` *({thoughtProcess})*

> {idea}

**Reasoning:** {reasoning}
**SYN:** {syntax} | **FEA:** {feasibility} | **REL:** {relevance} | **NOV:** {novelty}` },
  { key: 'oneliner', name: 'One-liner', format: `[{title} / {tag}] {idea} (SYN:{syntax}/FEA:{feasibility}/REL:{relevance}/NOV:{novelty})` },
  {
    key: 'markdown', name: 'Markdown', format: `## {title} ({tag})
*{thoughtProcess}*

{idea}

---

- **Syntax:** {syntax}/100
- **Feasibility:** {feasibility}/100
- **Relevance:** {relevance}/100
- **Novelty:** {novelty}/100

> {reasoning}` },
  { key: 'simple', name: 'Simple', format: `{title} ({tag}): {idea}` },
  {
    key: 'json', name: 'JSON', format: `{
  "title": "{title}",
  "tag": "{tag}",
  "idea": "{idea}",
  "thoughtProcess": "{thoughtProcess}",
  "scores": { "syntax": {syntax}, "feasibility": {feasibility}, "relevance": {relevance}, "novelty": {novelty} },
  "reasoning": "{reasoning}"
}` },
];

const SAMPLE_IDEA = {
  title: 'Vocalis Core',
  tag: 'Sound Symbolism • Bisociation',
  idea: 'Bionic neural acoustic earbuds translating micro-vocalizations with zero audible latency.',
  thoughtProcess: 'Acoustics ⚡ Neuroscience → Subvocal Sensors → Real-time Neural Synthesis',
  evaluation: { syntax: 92, feasibility: 78, relevance: 95, novelty: 98, reasoning: 'Highly resonant brand name with explosive novelty and solid biomechanical feasibility.' },
};

function buildFallbackResults(rawIdeas = []) {
  const archetypes = [
    'Inversion • Humor',
    'Psychological Pivot',
    'Curiosity Hook',
    'Empathic Wit',
    'Provocative Angle',
    'Cross-Domain Blend'
  ];

  return rawIdeas.slice(0, 15).map((idea, index) => {
    const isObjectIdea = idea && typeof idea === 'object';
    const title = isObjectIdea
      ? (idea.t || idea.title || `Idea ${index + 1}`)
      : `Idea ${index + 1}`;
    const description = isObjectIdea
      ? (idea.s || idea.content || idea.idea || title)
      : String(idea || '').trim();

    const tag = isObjectIdea && (idea.tag || idea.archetype)
      ? (idea.tag || idea.archetype)
      : archetypes[index % archetypes.length];

    const text = `${title} ${description} ${index}`;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff;
    }
    const h = Math.abs(hash);

    const cleanTitle = (title || '').replace(/[[\]()]/g, '').trim().split(/[\s-]/)[0] || 'Concept';

    const enPatterns = [
      `${cleanTitle} → PremiseAnalysis → VariableMapping → ExecutionProtocol`,
      `${cleanTitle} → CausalInference → BottleneckElimination → HighDensitySolution`,
      `${cleanTitle} → HypothesisFraming → CounterfactualSimulation → BreakthroughRoute`,
      `${cleanTitle} → MultiPerspectiveSwitch → CollisionValidation → Optimization`,
      `${cleanTitle} → ConstraintOscillation → IterativeRefinement → DistinctNovelty`
    ];

    const thoughtProcess = enPatterns[index % enPatterns.length];

    const enReasons = [
      `Defines the core mechanism of '${title}' with precision, balancing intuitive usability and creative novelty.`,
      `Departs from linear conventions to address edge cases and practical efficacy with sharp contextual insight.`,
      `Establishes a tight causal chain toward the target outcome with an immediately actionable execution path.`,
      `Captures latent domain dynamics to overcome conventional limitations with fresh problem-solving power.`,
      `Effectively balances strict constraints and adaptive flexibility to deliver high-density results.`
    ];

    const reasoning = enReasons[index % enReasons.length];

    return {
      title,
      tag,
      idea: description || title,
      thoughtProcess,
      evaluation: {
        syntax: 70 + (h % 23),
        feasibility: 20 + ((h >> 3) % 55),
        relevance: 60 + ((h >> 6) % 35),
        novelty: 65 + ((h >> 9) % 30),
        reasoning,
      },
    };
  });
}

function playSound(volume) {
  if (volume <= 0) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1479.98, ctx.currentTime); // High F# (F#6)

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
}

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 }
});

const LoadingStateContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6rem 2rem',
  gap: '$4',
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  h3: {
    color: '$primary',
    fontSize: '$6',
    margin: 0,
  },
  p: {
    color: '$textMuted',
    fontSize: '$4',
    margin: 0,
  }
});

const LargeLoader = styled('div', {
  animation: `${spin} 2s linear infinite`,
  color: '$secondary',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const IdeaCard = styled('div', {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid $border',
  borderRadius: '$6',
  padding: '$4',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 4px 18px rgba(31, 38, 135, 0.05)',
  animation: `${slideUp} 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards`,
  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 14px 30px rgba(58, 134, 255, 0.12), 0 4px 12px rgba(255, 0, 110, 0.08)',
    borderColor: 'rgba(58, 134, 255, 0.35)',
  },
});

const IdeaContent = styled('div', {
  fontSize: '$4',
  lineHeight: 1.6,
  marginBottom: '$4',
  color: '$text',
});

const CardActions = styled('div', {
  position: 'absolute',
  top: '$4',
  right: '$4',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  zIndex: 3,
});

const CardActionButton = styled('button', {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid $border',
  borderRadius: '$round',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '$text',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  '&:hover': {
    background: 'white',
    transform: 'scale(1.1)',
    color: '$primary',
    boxShadow: '0 4px 12px rgba(255, 0, 110, 0.2)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  }
});

const CopyButton = CardActionButton;

const SliderContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
});

const SliderHeader = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const SliderValue = styled('span', {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '$primary',
  background: 'rgba(52, 64, 85, 0.1)',
  padding: '2px 8px',
  borderRadius: '$round',
});

const SliderInput = styled('input', {
  WebkitAppearance: 'none',
  width: '100%',
  height: '6px',
  borderRadius: '$round',
  background: 'linear-gradient(90deg, #888098, #FF006E)',
  outline: 'none',
  opacity: '0.8',
  transition: 'opacity .2s',
  '&:hover': {
    opacity: '1',
  },
  '&::-webkit-slider-thumb': {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '$round',
    background: 'white',
    border: '2px solid $primary',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  },
  '&::-moz-range-thumb': {
    width: '20px',
    height: '20px',
    borderRadius: '$round',
    background: 'white',
    border: '2px solid $primary',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  }
});

const IdeaMetrics = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '$3',
  paddingTop: '$3',
  borderTop: '1px solid $border',
  '@media (max-width: 480px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '$2',
  }
});

const Metric = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
});

const MetricLabel = styled('span', {
  fontSize: '$1',
  color: '$textMuted',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  fontWeight: 600,
});

const MetricValue = styled('span', {
  fontSize: '$6',
  fontWeight: 700,
  fontFamily: '$heading',
  variants: {
    color: {
      high: { color: '$success' },
      medium: { color: '$warning' },
      low: { color: '$error' },
    }
  }
});

const ProgressBarBg = styled('div', {
  width: '100%',
  height: '6px',
  background: 'rgba(0,0,0,0.08)',
  borderRadius: '$round',
  marginTop: '$1',
  overflow: 'hidden',
});

const ProgressBarFill = styled('div', {
  height: '100%',
  borderRadius: '$round',
  transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  variants: {
    color: {
      high: { background: 'linear-gradient(90deg, #10b981, #059669)' },
      medium: { background: 'linear-gradient(90deg, #f59e0b, #d97706)' },
      low: { background: 'linear-gradient(90deg, #ef4444, #dc2626)' }
    }
  }
});

const Reasoning = styled('div', {
  marginTop: '$3',
  fontSize: '$2',
  color: '$textMuted',
  fontStyle: 'italic',
  textAlign: 'center',
});

// --- Results Toolbar & Empty State Styles ---

const ResultsHeader = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '$3',
  marginBottom: '$4',
  padding: '$3 $4',
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid $border',
  borderRadius: '$5',
  boxShadow: '0 4px 20px rgba(31, 38, 135, 0.05)',
  animation: `${slideUp} 0.35s ease`,
});

const ResultsControls = styled('div', {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '$2',
});

const ResultsCountBadge = styled('div', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '$primary',
  background: 'rgba(255, 0, 110, 0.08)',
  border: '1px solid rgba(255, 0, 110, 0.2)',
  padding: '0.35rem 0.8rem',
  borderRadius: '$round',
});

const SearchInputWrapper = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

const SearchInput = styled('input', {
  background: 'rgba(255, 255, 255, 0.85)',
  border: '1px solid $border',
  borderRadius: '$round',
  padding: '0.4rem 1.8rem 0.4rem 2rem',
  fontSize: '0.82rem',
  color: '$text',
  outline: 'none',
  width: '160px',
  transition: 'all 0.25s ease',
  '&:focus': {
    width: '210px',
    borderColor: '$secondary',
    boxShadow: '0 0 0 2px rgba(58, 134, 255, 0.2)',
    background: '#ffffff',
  },
  '@media (max-width: 600px)': {
    width: '130px',
    '&:focus': {
      width: '160px',
    }
  }
});

const SortSelect = styled('select', {
  padding: '0.4rem 0.75rem',
  borderRadius: '$round',
  border: '1px solid $border',
  background: 'rgba(255, 255, 255, 0.85)',
  color: '$text',
  fontSize: '0.82rem',
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:focus': {
    borderColor: '$secondary',
  }
});

const ToolbarButton = styled('button', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '0.4rem 0.85rem',
  borderRadius: '$round',
  border: '1px solid $border',
  background: 'rgba(255, 255, 255, 0.85)',
  color: '$text',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: '$primary',
    color: '$primary',
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 8px rgba(255, 0, 110, 0.15)',
  },
  variants: {
    variant: {
      danger: {
        '&:hover': {
          borderColor: '$error',
          color: '$error',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
        }
      },
      primary: {
        background: 'linear-gradient(135deg, $primary, $secondary)',
        color: 'white',
        borderColor: 'transparent',
        '&:hover': {
          color: 'white',
          boxShadow: '0 4px 12px rgba(58, 134, 255, 0.35)',
        }
      }
    }
  }
});

const ToastContainer = styled('div', {
  position: 'fixed',
  bottom: '$5',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  padding: '0.75rem 1.25rem',
  background: 'rgba(26, 32, 44, 0.92)',
  backdropFilter: 'blur(12px)',
  color: 'white',
  borderRadius: '$round',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  fontSize: '0.9rem',
  fontWeight: 600,
  animation: `${popIn} 0.25s cubic-bezier(0.16, 1, 0.3, 1)`,
});

// --- Settings Modal Styles ---
const ModalOverlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  animation: `${slideUp} 0.2s ease`,
});

const ModalContent = styled('div', {
  background: '#ffffff',
  border: '1px solid $border',
  borderRadius: '$7',
  padding: '$5',
  width: '90%',
  maxWidth: '700px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  position: 'relative',
  '& h3': {
    fontSize: '$5',
    fontWeight: 700,
    marginBottom: '$3',
    display: 'flex',
    alignItems: 'center',
    gap: '$2',
  },
});

const ModalCloseBtn = styled('button', {
  position: 'absolute',
  top: '$3',
  right: '$3',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '$textMuted',
  borderRadius: '$round',
  padding: '$1',
  transition: 'all 0.2s ease',
  '&:hover': {
    color: '$text',
    background: 'rgba(0,0,0,0.05)',
  },
});

const ModalTextarea = styled('textarea', {
  width: '100%',
  minHeight: '120px',
  background: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid $border',
  color: '$text',
  padding: '0.8rem 1.2rem',
  borderRadius: '$4',
  fontFamily: 'monospace',
  fontSize: '$2',
  resize: 'vertical',
  outline: 'none',
  lineHeight: 1.6,
  transition: 'border-color 0.3s ease',
  '&:focus': {
    borderColor: '$secondary',
    boxShadow: '0 0 0 2px $colors$border',
  },
});

const VariableTag = styled('code', {
  display: 'inline-block',
  background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.1), rgba(58, 134, 255, 0.1))',
  color: '$primary',
  padding: '2px 8px',
  borderRadius: '$2',
  fontSize: '0.75rem',
  fontWeight: 600,
  fontFamily: 'monospace',
  border: '1px solid rgba(255, 0, 110, 0.15)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(58, 134, 255, 0.2))',
    transform: 'scale(1.05)',
  },
});

const VariableList = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '$2',
  marginTop: '$2',
  marginBottom: '$3',
});

const SettingsGearBtn = styled('button', {
  background: 'linear-gradient(135deg, $primary, $secondary)',
  border: 'none',
  cursor: 'pointer',
  color: 'white',
  padding: '$3',
  borderRadius: '$round',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 20px rgba(255, 0, 110, 0.3)',
  '&:hover': {
    transform: 'rotate(45deg) scale(1.1)',
    boxShadow: '0 6px 25px rgba(58, 134, 255, 0.4)',
  },
});



const TopRightControls = styled('div', {
  position: 'fixed',
  top: '$5',
  right: '$5',
  display: 'flex',
  gap: '$3',
  zIndex: 1000,
});

const ToggleHeader = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  padding: '$1 0',
  transition: 'color 0.2s ease',
  '&:hover': {
    color: '$primary',
  },
  '& svg': {
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  }
});

const ToggleBody = styled('div', {
  display: 'grid',
  gridTemplateRows: '0fr',
  transition: 'grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, margin-top 0.35s ease',
  opacity: 0,
  pointerEvents: 'none',
  '& > div': {
    overflow: 'hidden',
    minHeight: 0,
  },
  variants: {
    open: {
      true: {
        gridTemplateRows: '1fr',
        opacity: 1,
        pointerEvents: 'auto',
        marginTop: '$4',
      }
    }
  }
});

const ErrorMessage = styled('div', {
  marginTop: '$3',
  marginBottom: '$3',
  padding: '$3 $4',
  background: '$errorBg',
  border: '1px solid $error',
  color: '#ff4d6d',
  borderRadius: '$round',
  fontSize: '0.95rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$2',
  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)',
  animation: `${slideUp} 0.3s ease`,
});

export default function App() {
  const [provider, setProvider] = useState(() => {
    try { return localStorage.getItem('creflux_provider') || 'openai'; } catch { return 'openai'; }
  });

  const [apiKeys, setApiKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('creflux_api_keys') || '{}'); } catch { return {}; }
  });

  const [providerConfigs, setProviderConfigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('creflux_provider_configs') || '{}'); } catch { return {}; }
  });

  const [apiKey, setApiKey] = useState(() => {
    try {
      const keys = JSON.parse(localStorage.getItem('creflux_api_keys') || '{}');
      const prov = localStorage.getItem('creflux_provider') || 'openai';
      return keys[prov] || '';
    } catch { return ''; }
  });

  const [baseURL, setBaseURL] = useState(() => {
    try {
      const configs = JSON.parse(localStorage.getItem('creflux_provider_configs') || '{}');
      const prov = localStorage.getItem('creflux_provider') || 'openai';
      return configs[prov]?.baseURL ?? PROVIDERS[prov]?.defaultBase ?? '';
    } catch { return PROVIDERS.openai.defaultBase; }
  });

  const [model, setModel] = useState(() => {
    try {
      const configs = JSON.parse(localStorage.getItem('creflux_provider_configs') || '{}');
      const prov = localStorage.getItem('creflux_provider') || 'openai';
      return configs[prov]?.model ?? PROVIDERS[prov]?.defaultModel ?? '';
    } catch { return PROVIDERS.openai.defaultModel; }
  });

  const [prompt, setPrompt] = useState(() => {
    try { return localStorage.getItem('creflux_prompt_draft') || ''; } catch { return ''; }
  });

  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem('creflux_saved_results');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  const [sliderIndex, setSliderIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('creflux_slider_index');
      return saved !== null ? parseInt(saved, 10) : 4;
    } catch { return 4; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showGenerate, setShowGenerate] = useState(true);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [showCopySettings, setShowCopySettings] = useState(false);

  const [copyFormat, setCopyFormat] = useState(() => {
    try {
      return localStorage.getItem('creflux_copy_format') || DEFAULT_COPY_FORMAT;
    } catch { return DEFAULT_COPY_FORMAT; }
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem('creflux_sound_volume') ?? '0.5'); } catch { return 0.5; }
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg) => {
    setToast(msg);
  };

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setProvider(newProv);
    try { localStorage.setItem('creflux_provider', newProv); } catch (err) { console.warn(err); }

    const restoredKey = apiKeys[newProv] || '';
    setApiKey(restoredKey);

    const customConf = providerConfigs[newProv];
    if (newProv !== 'custom') {
      const b = customConf?.baseURL ?? PROVIDERS[newProv].defaultBase;
      const m = customConf?.model ?? PROVIDERS[newProv].defaultModel;
      setBaseURL(b);
      setModel(m);
    } else {
      setBaseURL(customConf?.baseURL ?? '');
      setModel(customConf?.model ?? '');
    }
  };

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    setApiKeys(prev => {
      const next = { ...prev, [provider]: val };
      try { localStorage.setItem('creflux_api_keys', JSON.stringify(next)); } catch (err) { console.warn(err); }
      return next;
    });
  };

  const handleBaseURLChange = (val) => {
    setBaseURL(val);
    setProviderConfigs(prev => {
      const next = { ...prev, [provider]: { ...(prev[provider] || {}), baseURL: val } };
      try { localStorage.setItem('creflux_provider_configs', JSON.stringify(next)); } catch (err) { console.warn(err); }
      return next;
    });
  };

  const handleModelChange = (val) => {
    setModel(val);
    setProviderConfigs(prev => {
      const next = { ...prev, [provider]: { ...(prev[provider] || {}), model: val } };
      try { localStorage.setItem('creflux_provider_configs', JSON.stringify(next)); } catch (err) { console.warn(err); }
      return next;
    });
  };

  const handlePromptChange = (val) => {
    setPrompt(val);
    try { localStorage.setItem('creflux_prompt_draft', val); } catch (err) { console.warn(err); }
    if (error) setError(null);
  };

  const handleSliderChange = (val) => {
    setSliderIndex(val);
    try { localStorage.setItem('creflux_slider_index', String(val)); } catch (err) { console.warn(err); }
  };

  const handleClearResults = () => {
    setResults([]);
    try { localStorage.removeItem('creflux_saved_results'); } catch (err) { console.warn(err); }
    showToast('🗑️ Cleared results');
  };

  const handleGenerate = async () => {
    let finalApiKey = apiKey.trim();
    const requiresApiKey = provider !== 'custom';
    if (!finalApiKey && requiresApiKey) {
      setError("Please enter your API key in the configuration panel.");
      setShowSettings(true);
      setIsHeaderOpen(true);
      return;
    }
    if (!finalApiKey) finalApiKey = 'custom-endpoint-key';
    if (!prompt.trim()) {
      setError("Please provide a prompt snippet to guide the generation rules.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationStep("Connecting Synapses...");
    setResults([]);

    const providerConfig = {
      apiKey: finalApiKey,
      baseURL: baseURL.trim(),
      model: model.trim(),
      provider
    };

    try {
      const enhancedPrompt = await enhancePrompt(providerConfig, prompt);

      setGenerationStep("Spawning 15 ideas...");
      const creativityLevel = sliderIndex * 0.5;
      const rawIdeas = await generateIdeas(providerConfig, enhancedPrompt, creativityLevel);

      if (!rawIdeas || rawIdeas.length === 0) {
        throw new Error("No ideas were generated. Try tweaking the prompt or checking the model.");
      }

      setGenerationStep("Evaluating & expanding all 15...");
      const evaluatedIdeas = await evaluateIdeasBatch(providerConfig, prompt, rawIdeas);
      const safeResults = Array.isArray(evaluatedIdeas) ? evaluatedIdeas.filter(Boolean) : [];
      const finalRes = safeResults.length > 0 ? safeResults : buildFallbackResults(rawIdeas);
      setResults(finalRes);
      try { localStorage.setItem('creflux_saved_results', JSON.stringify(finalRes)); } catch (err) { console.warn(err); }

      playSound(soundVolume);
      setIsHeaderOpen(false);
      setShowSettings(true);
      setShowGenerate(true);

    } catch (err) {
      setError("An error occurred: " + err.message);
      setIsHeaderOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomPrompt = () => {
    const p = getRandomPrompt();
    handlePromptChange(p);
    showToast('🎲 Random prompt generated');
  };

  const getScoreColor = useCallback((score) => {
    if (score >= 75) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }, []);

  const filteredAndSortedResults = useMemo(() => {
    let list = [...results];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q)) ||
        (item.idea && item.idea.toLowerCase().includes(q)) ||
        (item.thoughtProcess && item.thoughtProcess.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'novelty') {
      list.sort((a, b) => (b.evaluation?.novelty || 0) - (a.evaluation?.novelty || 0));
    } else if (sortBy === 'feasibility') {
      list.sort((a, b) => (b.evaluation?.feasibility || 0) - (a.evaluation?.feasibility || 0));
    } else if (sortBy === 'syntax') {
      list.sort((a, b) => (b.evaluation?.syntax || 0) - (a.evaluation?.syntax || 0));
    } else if (sortBy === 'relevance') {
      list.sort((a, b) => (b.evaluation?.relevance || 0) - (a.evaluation?.relevance || 0));
    }
    return list;
  }, [results, searchQuery, sortBy]);

  const handleSearch = useCallback((item) => {
    const term = `${item?.title || ''} ${item?.tag ? String(item.tag).replace(/[•·]/g, ' ') : ''}`.trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(term)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleCopy = useCallback((item, index) => {
    const evaluation = item?.evaluation || {};
    const copyText = copyFormat
      .replace(/\{title\}/g, item?.title || '')
      .replace(/\{tag\}/g, item?.tag || '')
      .replace(/\{thoughtProcess\}/g, item?.thoughtProcess || '')
      .replace(/\{idea\}/g, item?.idea || '')
      .replace(/\{syntax\}/g, String(evaluation.syntax || 0))
      .replace(/\{feasibility\}/g, String(evaluation.feasibility || 0))
      .replace(/\{relevance\}/g, String(evaluation.relevance || 0))
      .replace(/\{novelty\}/g, String(evaluation.novelty || 0))
      .replace(/\{reasoning\}/g, evaluation.reasoning || '');
    try {
      navigator.clipboard.writeText(copyText).catch((e) => {
        console.warn('Clipboard write failed:', e);
      });
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
    setCopiedId(index);
    showToast(`📋 Copied "${item?.title || 'Idea'}"`);
    setTimeout(() => setCopiedId(null), 2000);
  }, [copyFormat]);

  const handleCopyAll = useCallback(() => {
    if (!filteredAndSortedResults || filteredAndSortedResults.length === 0) return;
    const allText = filteredAndSortedResults.map((item) => {
      const evaluation = item?.evaluation || {};
      return copyFormat
        .replace(/\{title\}/g, item?.title || '')
        .replace(/\{tag\}/g, item?.tag || '')
        .replace(/\{thoughtProcess\}/g, item?.thoughtProcess || '')
        .replace(/\{idea\}/g, item?.idea || '')
        .replace(/\{syntax\}/g, String(evaluation.syntax || 0))
        .replace(/\{feasibility\}/g, String(evaluation.feasibility || 0))
        .replace(/\{relevance\}/g, String(evaluation.relevance || 0))
        .replace(/\{novelty\}/g, String(evaluation.novelty || 0))
        .replace(/\{reasoning\}/g, evaluation.reasoning || '');
    }).join('\n\n' + '—'.repeat(40) + '\n\n');

    try {
      navigator.clipboard.writeText(allText);
      showToast(`✨ Copied all ${filteredAndSortedResults.length} ideas to clipboard!`);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  }, [filteredAndSortedResults, copyFormat]);

  const handleCopyFormatChange = (val) => {
    setCopyFormat(val);
    try {
      localStorage.setItem('creflux_copy_format', val);
    } catch (e) {
      console.warn('Failed to persist copy format:', e);
    }
  };
  return (
    <>
      <RootContainer>
        <AppContainer>
          <TopRightControls>
            <SettingsGearBtn onClick={() => setShowCopySettings(true)} title="Copy format settings">
              <Settings size={24} />
            </SettingsGearBtn>
          </TopRightControls>

          {error && (
            <ErrorMessage>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: '4px' }}
                title="Dismiss error"
              >
                <X size={18} />
              </button>
            </ErrorMessage>
          )}

          <StickyHeader>
            <Header
              style={{ marginBottom: isHeaderOpen ? '1rem' : '0', transition: 'margin 0.4s ease' }}
            >
              <h1>CreFlux</h1>
              <p>
                Expand rough ideas into creative directions
              </p>
            </Header>

            <div style={{ position: 'relative', width: '100%', display: 'grid', gridTemplateRows: isHeaderOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s ease' }}>
              <div style={{ overflow: 'hidden', minHeight: 0 }}>
                <PanelsSplit>
                  <GlassPanel open={showSettings}>
                    <ToggleHeader open={showSettings} onClick={() => setShowSettings(!showSettings)}>
                      <h2><Settings size={20} /> AI Settings</h2>
                      <ChevronDown size={22} style={{ transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
                    </ToggleHeader>

                    <ToggleBody open={showSettings}>
                      <div>
                        <FormGroup>
                          <Label>AI Provider</Label>
                          <Select value={provider} onChange={handleProviderChange}>
                            {Object.entries(PROVIDERS).map(([key, data]) => {
                              return <option key={key} value={key}>{data.name}</option>;
                            })}
                          </Select>
                        </FormGroup>

                        <FormRow>
                          <FormGroup>
                            <Label>{provider === 'custom' ? 'API Key (Optional)' : 'API Key'}</Label>
                            <Input
                              type="password"
                              placeholder={provider === 'custom' ? 'Optional for local endpoints' : 'Enter your API key'}
                              value={apiKey}
                              onChange={(e) => handleApiKeyChange(e.target.value)}
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>Model Name</Label>
                            <Input
                              type="text"
                              placeholder={PROVIDERS[provider]?.defaultModel || "e.g. gpt-5.6-luna"}
                              value={model}
                              onChange={(e) => handleModelChange(e.target.value)}
                            />
                          </FormGroup>
                        </FormRow>

                        <FormGroup>
                          <Label>Base URL (Optional)</Label>
                          <Input
                            type="url"
                            placeholder="https://api.openai.com/v1"
                            value={baseURL}
                            onChange={(e) => handleBaseURLChange(e.target.value)}
                            disabled={provider !== 'custom'}
                          />
                        </FormGroup>

                        <FormGroup>
                          <SliderContainer>
                            <SliderHeader>
                              <Label style={{ marginBottom: 0 }}>Creativity Level</Label>
                              <SliderValue>{SLIDER_LABELS[sliderIndex]}</SliderValue>
                            </SliderHeader>
                            <SliderInput
                              type="range"
                              min="0"
                              max="4"
                              step="1"
                              value={sliderIndex}
                              onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888098', fontSize: '0.75rem', marginTop: '4px' }}>
                              <span>Precise</span>
                              <span>Creative</span>
                            </div>
                          </SliderContainer>
                        </FormGroup>
                      </div>
                    </ToggleBody>
                  </GlassPanel>

                  <GlassPanel open={showGenerate}>
                    <ToggleHeader open={showGenerate} onClick={() => setShowGenerate(!showGenerate)}>
                      <h2><Sparkles size={20} /> Generate Ideas</h2>
                      <ChevronDown size={22} style={{ transform: showGenerate ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
                    </ToggleHeader>

                    <ToggleBody open={showGenerate}>
                      <div>
                        <FormGroup style={{ position: 'relative' }}>
                          <Textarea
                            placeholder="Describe the ideas you imagine in detail... e.g., 'Generate 10 innovative startup ideas for the sustainable fashion industry targeting Gen Z'"
                            value={prompt}
                            onChange={(e) => handlePromptChange(e.target.value)}
                          />
                          <RandomPromptBtn onClick={handleRandomPrompt} title="Use random prompt across 8 creative archetypes">
                            <Dices size={18} />
                          </RandomPromptBtn>
                        </FormGroup>

                        <FormGroup style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$2' }}>
                          <Label>Sound Effect Volume</Label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '$3', background: 'rgba(255,255,255,0.7)', padding: '$2 $3', borderRadius: '$round', border: '1px solid var(--colors-border)' }}>
                            <Volume2 size={16} color="var(--colors-textMuted)" />
                            <SliderInput
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={soundVolume}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setSoundVolume(v);
                                try {
                                  localStorage.setItem('creflux_sound_volume', String(v));
                                } catch (err) {
                                  console.warn('Failed to persist sound volume:', err);
                                }
                              }}
                              onMouseUp={() => playSound(soundVolume)}
                              onTouchEnd={() => playSound(soundVolume)}
                              style={{ width: '80px', height: '4px' }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--colors-primary)', fontWeight: 600 }}>{Math.round(soundVolume * 100)}%</span>
                          </div>
                        </FormGroup>

                        <Button
                          onClick={handleGenerate}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <><Loader><Sparkles size={20} /></Loader> {generationStep}</>
                          ) : (
                            <><Sparkles size={20} /> Ignite Imagination</>
                          )}
                        </Button>
                      </div>
                    </ToggleBody>
                  </GlassPanel>
                </PanelsSplit>
              </div>
            </div>

            <MasterToggleBtn onClick={() => {
              const nextState = !isHeaderOpen;
              setIsHeaderOpen(nextState);
              if (nextState) {
                setShowSettings(true);
                setShowGenerate(true);
              }
            }}>
              {isHeaderOpen ? (
                <><ChevronUp size={20} /> Hide Settings</>
              ) : (
                <><ChevronDown size={20} /> Show Settings</>
              )}
            </MasterToggleBtn>
          </StickyHeader>

          <main style={{ marginTop: '2rem' }}>
            {isGenerating && (
              <LoadingStateContainer>
                <LargeLoader><Sparkles size={48} /></LargeLoader>
                <h3>Brainstorming ideas...</h3>
                <p>{generationStep}</p>
              </LoadingStateContainer>
            )}

            {!isGenerating && results.length > 0 && (
              <>
                <ResultsHeader>
                  <ResultsCountBadge>
                    <Sparkles size={16} />
                    <span>{filteredAndSortedResults.length} of {results.length} Ideas</span>
                  </ResultsCountBadge>

                  <ResultsControls>
                    <SearchInputWrapper>
                      <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--colors-textMuted)', pointerEvents: 'none' }} />
                      <SearchInput
                        placeholder="Filter ideas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--colors-textMuted)', display: 'flex' }}
                          title="Clear filter"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </SearchInputWrapper>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowUpDown size={14} color="var(--colors-textMuted)" />
                      <SortSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="default">Default Order</option>
                        <option value="novelty">Highest Novelty (NOV)</option>
                        <option value="feasibility">Highest Feasibility (FEA)</option>
                        <option value="syntax">Highest Syntax (SYN)</option>
                        <option value="relevance">Highest Relevance (REL)</option>
                      </SortSelect>
                    </div>

                    <ToolbarButton onClick={handleCopyAll} title="Copy all ideas in selected format">
                      <CheckCheck size={16} color="var(--colors-primary)" /> Copy All
                    </ToolbarButton>

                    <ToolbarButton variant="danger" onClick={handleClearResults} title="Clear all generated ideas">
                      <Trash2 size={16} />
                    </ToolbarButton>
                  </ResultsControls>
                </ResultsHeader>

                {filteredAndSortedResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '24px', border: '1px solid var(--colors-border)' }}>
                    <p style={{ color: 'var(--colors-textMuted)', marginBottom: '1rem' }}>
                      No ideas matched "<strong>{searchQuery}</strong>"
                    </p>
                    <ToolbarButton onClick={() => setSearchQuery('')}>
                      Reset Filter
                    </ToolbarButton>
                  </div>
                ) : (
                  <IdeasList>
                    {filteredAndSortedResults.map((item, index) => (
                      <IdeaCard key={`${item.title}-${index}`} style={{ animationDelay: `${index * 0.06}s` }}>
                        <CardActions>
                          <CardActionButton
                            onClick={() => handleSearch(item)}
                            title="Search Google / Prior Art Check"
                            aria-label="Search Prior Art"
                          >
                            <Search size={16} />
                          </CardActionButton>
                          <CardActionButton
                            onClick={() => handleCopy(item, index)}
                            title="Copy idea"
                            aria-label="Copy idea"
                          >
                            {copiedId === index ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                          </CardActionButton>
                        </CardActions>
                        {item.tag && <TagBadge>🏷️ {item.tag}</TagBadge>}
                        {item.title && <IdeaTitle>{item.title}</IdeaTitle>}
                        {String(item.thoughtProcess || '').trim() && (
                          <ThoughtChain>
                            {String(item.thoughtProcess)
                              .split('→')
                              .map((node) => node.trim())
                              .filter(Boolean)
                              .map((node, i, arr) => (
                                <React.Fragment key={i}>
                                  <span style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }}>
                                    {node}
                                  </span>
                                  {i < arr.length - 1 && <span style={{ color: 'var(--colors-secondary)' }}>→</span>}
                                </React.Fragment>
                              ))}
                          </ThoughtChain>
                        )}
                        <IdeaContent>
                          {(item.idea).split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
                        </IdeaContent>
                        <IdeaMetrics>
                          <Metric>
                            <MetricLabel>Syntax (SYN)</MetricLabel>
                            <MetricValue color={getScoreColor(item.evaluation?.syntax)}>
                              {item.evaluation?.syntax || 0}
                            </MetricValue>
                            <ProgressBarBg>
                              <ProgressBarFill
                                css={{ width: `${item.evaluation?.syntax || 0}%` }}
                                color={getScoreColor(item.evaluation?.syntax)}
                              />
                            </ProgressBarBg>
                          </Metric>
                          <Metric>
                            <MetricLabel>Feasibility (FEA)</MetricLabel>
                            <MetricValue color={getScoreColor(item.evaluation?.feasibility)}>
                              {item.evaluation?.feasibility || 0}
                            </MetricValue>
                            <ProgressBarBg>
                              <ProgressBarFill
                                css={{ width: `${item.evaluation?.feasibility || 0}%` }}
                                color={getScoreColor(item.evaluation?.feasibility)}
                              />
                            </ProgressBarBg>
                          </Metric>
                          <Metric>
                            <MetricLabel>Relevance (REL)</MetricLabel>
                            <MetricValue color={getScoreColor(item.evaluation?.relevance)}>
                              {item.evaluation?.relevance || 0}
                            </MetricValue>
                            <ProgressBarBg>
                              <ProgressBarFill
                                css={{ width: `${item.evaluation?.relevance || 0}%` }}
                                color={getScoreColor(item.evaluation?.relevance)}
                              />
                            </ProgressBarBg>
                          </Metric>
                          <Metric>
                            <MetricLabel>Novelty (NOV)</MetricLabel>
                            <MetricValue color={getScoreColor(item.evaluation?.novelty)}>
                              {item.evaluation?.novelty || 0}
                            </MetricValue>
                            <ProgressBarBg>
                              <ProgressBarFill
                                css={{ width: `${item.evaluation?.novelty || 0}%` }}
                                color={getScoreColor(item.evaluation?.novelty)}
                              />
                            </ProgressBarBg>
                          </Metric>
                        </IdeaMetrics>
                        {item.evaluation?.reasoning && (
                          <Reasoning>
                            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--colors-text)' }}>
                              <Sparkles size={14} color="var(--colors-secondary)" /> Strategic Novelty & Mechanism Audit:
                            </strong>
                            "{item.evaluation?.reasoning}"
                          </Reasoning>
                        )}
                      </IdeaCard>
                    ))}
                  </IdeasList>
                )}
              </>
            )}
          </main>
        </AppContainer>
      </RootContainer>

      {toast && (
        <ToastContainer>
          <Sparkles size={16} color="#4ade80" />
          <span>{toast}</span>
        </ToastContainer>
      )}

      {
        showCopySettings && (
          <ModalOverlay onClick={() => setShowCopySettings(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalCloseBtn onClick={() => setShowCopySettings(false)}>
                <X size={20} />
              </ModalCloseBtn>
              <h3><SlidersHorizontal size={20} /> Copy Format Settings</h3>

              <label style={{ fontSize: '0.85rem', color: 'var(--colors-textMuted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Presets
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {FORMAT_PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleCopyFormatChange(p.format)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      border: copyFormat === p.format ? '2px solid #FF006E' : '1px solid var(--colors-border)',
                      background: copyFormat === p.format ? 'rgba(255, 0, 110, 0.1)' : 'transparent',
                      color: copyFormat === p.format ? '#FF006E' : 'var(--colors-textMuted)',
                      fontWeight: copyFormat === p.format ? 700 : 400,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--colors-textMuted)', marginBottom: '0.5rem' }}>
                Enter your desired format or select one of the presets above. Available variables:
              </p>
              <VariableList>
                {COPY_VARIABLES.map(v => (
                  <VariableTag key={v.key} title={v.desc}>{v.key}</VariableTag>
                ))}
              </VariableList>
              <ModalTextarea
                value={copyFormat}
                onChange={(e) => handleCopyFormatChange(e.target.value)}
                placeholder={DEFAULT_COPY_FORMAT}
              />

              <label style={{ fontSize: '0.85rem', color: 'var(--colors-textMuted)', fontWeight: 600, display: 'block', marginTop: '1rem', marginBottom: '0.4rem' }}>
                Preview
              </label>
              <pre style={{
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--colors-border)',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--colors-text)',
                lineHeight: 1.5,
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {copyFormat
                  .replace(/\{title\}/g, SAMPLE_IDEA.title)
                  .replace(/\{tag\}/g, SAMPLE_IDEA.tag)
                  .replace(/\{thoughtProcess\}/g, SAMPLE_IDEA.thoughtProcess)
                  .replace(/\{idea\}/g, SAMPLE_IDEA.idea)
                  .replace(/\{syntax\}/g, String(SAMPLE_IDEA.evaluation.syntax))
                  .replace(/\{feasibility\}/g, String(SAMPLE_IDEA.evaluation.feasibility))
                  .replace(/\{relevance\}/g, String(SAMPLE_IDEA.evaluation.relevance))
                  .replace(/\{novelty\}/g, String(SAMPLE_IDEA.evaluation.novelty))
                  .replace(/\{reasoning\}/g, SAMPLE_IDEA.evaluation.reasoning)}
              </pre>

              <button
                onClick={() => handleCopyFormatChange(DEFAULT_COPY_FORMAT)}
                style={{
                  marginTop: '0.75rem',
                  background: 'transparent',
                  border: '1px solid var(--colors-border)',
                  borderRadius: '999px',
                  padding: '0.4rem 1rem',
                  fontSize: '0.8rem',
                  color: 'var(--colors-textMuted)',
                  cursor: 'pointer',
                }}
              >
                Reset to Default
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid var(--colors-border)', margin: '1.5rem 0' }} />

              <h3><Volume2 size={20} /> Notification Sound Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--colors-textMuted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Volume: {Math.round(soundVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onMouseUp={() => playSound(soundVolume)}
                    onTouchEnd={() => playSound(soundVolume)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setSoundVolume(v);
                      try {
                        localStorage.setItem('creflux_sound_volume', String(v));
                      } catch (err) {
                        console.warn('Failed to persist sound volume:', err);
                      }
                    }}
                    style={{ width: '100%', accentColor: '#FF006E' }}
                  />
                  <p style={{ fontSize: '0.7rem', color: 'var(--colors-textMuted)', marginTop: '0.4rem' }}>
                    A 'ding' sound (High F#) plays when all ideas are generated.
                  </p>
                </div>
              </div>
            </ModalContent>
          </ModalOverlay>
        )
      }
    </>
  );
}
