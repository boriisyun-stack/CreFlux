import React, { useState, useCallback } from 'react';
import { generateIdeas, evaluateIdeasBatch, enhancePrompt } from './lib/openai';
import { Settings, Sparkles, ChevronDown, ChevronUp, AlertCircle, Copy, Check, Dices, X, SlidersHorizontal, Volume2 } from 'lucide-react';
import { styled, globalStyles, keyframes } from './stitches.config';
import { getRandomPrompt } from './lib/prompts';

// Initialize global styles
globalStyles();

const PROVIDERS = {
  openai: { name: 'OpenAI', defaultBase: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  gemini: { name: 'Gemini', defaultBase: 'https://generativelanguage.googleapis.com/v1beta/openai/', defaultModel: 'gemini-2.5-flash-lite' },
  grok: { name: 'Grok', defaultBase: 'https://api.x.ai/v1', defaultModel: 'grok-2-latest' },
  openrouter: { name: 'OpenRouter', defaultBase: 'https://openrouter.ai/api/v1', defaultModel: 'mistralai/mistral-large-2411' },
  custom: { name: 'Custom', defaultBase: '', defaultModel: '' },
};

const SLIDER_LABELS = ["Copy and Paste", "Reference", "Normal", "Create", "Creativity"];

// --- STITCHES COMPONENTS ---

const glow = keyframes({
  '0%': { filter: 'drop-shadow(0 0 10px rgba(255, 0, 110, 0.6))' },
  '100%': { filter: 'drop-shadow(0 0 20px rgba(58, 134, 255, 0.8))' }
});

const spin = keyframes({
  '100%': { transform: 'rotate(360deg)' }
});

const slideUp = keyframes({
  from: { opacity: 0, transform: 'translateY(20px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
});

const RootContainer = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
});

const AppContainer = styled('div', {
  width: '100%',
  maxWidth: '1200px', // Restored to 1200px (user only wanted UI panels wider)
  display: 'flex',
  flexDirection: 'column',
  padding: '0 $5 $5 $5', // Left, right, bottom padding
});

const StickyHeader = styled('div', {
  position: 'sticky',
  top: '$4', // Floating top
  zIndex: 100,
  backgroundColor: 'rgba(248, 249, 250, 0.85)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  width: '120%', // Make the panels block 1.2x wider
  marginLeft: '-10%', // Center the artificially widened block
  marginRight: '-10%',
  marginBottom: '$5',
  padding: '$5',
  borderRadius: '$7', // Fully rounded island
  border: '1px solid $border',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: '$4',
  transition: 'all 0.3s ease',
  paddingTop: '$4',
  paddingBottom: '2.5rem', // Reduced from 4rem for tighter spacing
});

const MasterToggleBtn = styled('button', {
  position: 'absolute',
  bottom: '-12px', // Moved up slightly from -16px
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
  fontSize: '1rem',
  boxShadow: '0 4px 15px rgba(255, 0, 110, 0.3)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  zIndex: 10,
  '&:hover': {
    transform: 'translateX(-50%) scale(1.05)',
    boxShadow: '0 6px 20px rgba(58, 134, 255, 0.4)',
  },
  '&:active': {
    transform: 'translateX(-50%) scale(0.95)',
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
  paddingRight: '40px', // Space for copy button
  lineHeight: 1.4,
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

const DEFAULT_COPY_FORMAT = `[{title}]
{thoughtProcess}

{idea}

Reasoning: {reasoning}
Syntax: {syntax} | Feasibility: {feasibility} | Relevance: {relevance} | Novelty: {novelty}`;

const COPY_VARIABLES = [
  { key: '{title}', desc: 'Idea Title' },
  { key: '{idea}', desc: 'Idea Content' },
  { key: '{thoughtProcess}', desc: 'Thought Process Chain' },
  { key: '{syntax}', desc: 'Syntax Score' },
  { key: '{feasibility}', desc: 'Feasibility Score' },
  { key: '{relevance}', desc: 'Relevance Score' },
  { key: '{novelty}', desc: 'Novelty Score' },
  { key: '{reasoning}', desc: 'Evaluation Reasoning' },
];

const FORMAT_PRESETS = [
  {
    key: 'default', name: 'Default', format: `[{title}]
{thoughtProcess}

{idea}

Reasoning: {reasoning}
Syntax: {syntax} | Feasibility: {feasibility} | Relevance: {relevance} | Novelty: {novelty}` },
  {
    key: 'notion', name: 'Notion', format: `### {title}
*({thoughtProcess})*

> {idea}

**Reasoning:** {reasoning}
**SYN:** {syntax} | **FEA:** {feasibility} | **REL:** {relevance} | **NOV:** {novelty}` },
  { key: 'oneliner', name: 'One-liner', format: `[{title}] {idea} (SYN:{syntax}/FEA:{feasibility}/REL:{relevance}/NOV:{novelty})` },
  {
    key: 'markdown', name: 'Markdown', format: `## {title}
*{thoughtProcess}*

{idea}

---

- **Syntax:** {syntax}/100
- **Feasibility:** {feasibility}/100
- **Relevance:** {relevance}/100
- **Novelty:** {novelty}/100

> {reasoning}` },
  { key: 'simple', name: 'Simple', format: `{title}: {idea}` },
  {
    key: 'json', name: 'JSON', format: `{
  "title": "{title}",
  "idea": "{idea}",
  "thoughtProcess": "{thoughtProcess}",
  "scores": { "syntax": {syntax}, "feasibility": {feasibility}, "relevance": {relevance}, "novelty": {novelty} },
  "reasoning": "{reasoning}"
}` },
];

const SAMPLE_IDEA = {
  title: 'Auto-Translate Earbuds',
  idea: 'Real-time translation AI earbuds that eliminate language barriers.',
  evaluation: { syntax: 87, feasibility: 72, relevance: 94, novelty: 99, reasoning: 'Technologically viable with high market demand and groundbreaking execution.' },
};

function playSound(volume) {
  if (volume <= 0) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
  background: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid $border',
  borderRadius: '$6',
  padding: '$4',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 4px 15px rgba(31, 38, 135, 0.05)',
  animation: `${slideUp} 0.5s ease backwards`,
});

const IdeaContent = styled('div', {
  fontSize: '$4', // slightly smaller since we have a title
  lineHeight: 1.6,
  marginBottom: '$4',
});

const CopyButton = styled('button', {
  position: 'absolute',
  top: '$4',
  right: '$4',
  background: 'rgba(255, 255, 255, 0.5)',
  border: '1px solid $border',
  borderRadius: '$round',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '$text',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: 'white',
    transform: 'scale(1.1)',
    color: '$primary',
  },
});

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
  letterSpacing: '1px',
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
  background: 'rgba(0,0,0,0.1)',
  borderRadius: '$round',
  marginTop: '$1',
  overflow: 'hidden',
});

const ProgressBarFill = styled('div', {
  height: '100%',
  borderRadius: '$round',
  transition: 'width 0.5s ease',
  variants: {
    color: {
      high: { background: '$success' },
      medium: { background: '$warning' },
      low: { background: '$error' }
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
  paddingBottom: '$2', // extra padding space for when toggled
  transition: 'transform 0.3s ease',
  variants: {
    open: {
      true: {
        transform: 'translateY(40%)',
      },
      false: {
        transform: 'translateY(0)',
      }
    }
  }
});

const ToggleBody = styled('div', {
  display: 'grid',
  gridTemplateRows: '0fr',
  transition: 'grid-template-rows 0.35s ease, opacity 0.3s ease, margin-top 0.35s ease',
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
  padding: '$3',
  background: '$errorBg',
  border: '1px solid $error',
  color: '#ff88a0',
  borderRadius: '$round',
  fontSize: '0.95rem',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
});

export default function App() {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState(PROVIDERS['openai'].defaultBase);
  const [model, setModel] = useState(PROVIDERS['openai'].defaultModel);

  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const [sliderIndex, setSliderIndex] = useState(4); // Default: Creativity (temp 2.0)

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



  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setProvider(newProv);
    if (newProv !== 'custom') {
      setBaseURL(PROVIDERS[newProv].defaultBase);
      setModel(PROVIDERS[newProv].defaultModel);
    }
  };

  const handleGenerate = async () => {
    let finalApiKey = apiKey.trim();
    if (!finalApiKey) {
      setError("Please enter your API key in the configuration panel.");
      setShowSettings(true);
      setIsHeaderOpen(true); // Ensure master panel is visible
      return;
    }
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

      setGenerationStep("Spawning 100 ideas...");
      const hallucinationLevel = sliderIndex * 0.5; // Maps 0-4 to 0.0-2.0
      const rawIdeas = await generateIdeas(providerConfig, enhancedPrompt, hallucinationLevel);

      if (!rawIdeas || rawIdeas.length === 0) {
        throw new Error("No ideas were generated. Try tweaking the prompt or checking the model.");
      }

      setGenerationStep("Evaluating & expanding top 10...");
      const evaluatedIdeas = await evaluateIdeasBatch(providerConfig, prompt, rawIdeas);
      setResults(evaluatedIdeas);

      // Play completion sound
      playSound(soundVolume);

      // Auto-collapse panels to show ideas taking full screen
      setShowGenerate(false);
      setShowSettings(false);

    } catch (err) {
      setError("An error occurred: " + err.message);
      setIsHeaderOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomPrompt = () => {
    setPrompt(getRandomPrompt());
  };

  const getScoreColor = useCallback((score) => {
    if (score >= 75) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }, []);




  const handleCopy = useCallback((item, index) => {
    const copyText = copyFormat
      .replace(/\{title\}/g, item.title || '')
      .replace(/\{thoughtProcess\}/g, item.thoughtProcess || '')
      .replace(/\{idea\}/g, item.idea || '')
      .replace(/\{syntax\}/g, String(item.evaluation?.syntax || 0))
      .replace(/\{feasibility\}/g, String(item.evaluation?.feasibility || 0))
      .replace(/\{relevance\}/g, String(item.evaluation?.relevance || 0))
      .replace(/\{novelty\}/g, String(item.evaluation?.novelty || 0))
      .replace(/\{reasoning\}/g, item.evaluation?.reasoning || '');
    try {
      navigator.clipboard.writeText(copyText);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  }, [copyFormat]);

  const handleCopyFormatChange = (val) => {
    setCopyFormat(val);
    try { localStorage.setItem('creflux_copy_format', val); } catch { }
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
              <AlertCircle size={20} />
              {error}
            </ErrorMessage>
          )}

          <StickyHeader>
            <Header style={{ marginBottom: isHeaderOpen ? '1rem' : '0', transition: 'margin 0.4s ease' }}>
              <h1>CreFlux</h1>
              <p>
                Make your idea with AI's hallucination
              </p>
            </Header>

            <div style={{ position: 'relative', width: '100%', display: 'grid', gridTemplateRows: isHeaderOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s ease' }}>
              <div style={{ overflow: 'hidden', minHeight: 0 }}>
                <PanelsSplit>
                  <GlassPanel open={showSettings}>
                    <ToggleHeader open={showSettings} onClick={() => setShowSettings(!showSettings)}>
                      <h2><Settings size={20} /> AI Configuration</h2>
                      {showSettings ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </ToggleHeader>

                    <ToggleBody open={showSettings}>
                      <div>
                        <FormGroup>
                          <Label>API PROVIDER</Label>
                          <Select value={provider} onChange={handleProviderChange}>
                            {Object.entries(PROVIDERS).map(([key, data]) => (
                              <option key={key} value={key}>{data.name}</option>
                            ))}
                          </Select>
                        </FormGroup>

                        <FormRow>
                          <FormGroup>
                            <Label>API KEY</Label>
                            <Input
                              type="password"
                              placeholder="Enter API Key"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                          </FormGroup>

                          <FormGroup>
                            <Label>MODEL NAME</Label>
                            <Input
                              type="text"
                              placeholder="e.g. gpt-4o"
                              value={model}
                              onChange={(e) => setModel(e.target.value)}
                            />
                          </FormGroup>
                        </FormRow>

                        <FormGroup>
                          <Label>BASE URL (OPTIONAL OVERRIDE)</Label>
                          <Input
                            type="url"
                            placeholder="https://api.openai.com/v1"
                            value={baseURL}
                            onChange={(e) => setBaseURL(e.target.value)}
                            disabled={provider !== 'custom'}
                          />
                        </FormGroup>

                        <FormGroup>
                          <SliderContainer>
                            <SliderHeader>
                              <Label style={{ marginBottom: 0 }}>HALLUCINATION LEVEL</Label>
                              <SliderValue>{SLIDER_LABELS[sliderIndex]}</SliderValue>
                            </SliderHeader>
                            <SliderInput
                              type="range"
                              min="0"
                              max="4"
                              step="1"
                              value={sliderIndex}
                              onChange={(e) => setSliderIndex(parseInt(e.target.value, 10))}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888098', fontSize: '0.75rem', marginTop: '4px' }}>
                              <span>PRECISE</span>
                              <span>CREATIVE</span>
                            </div>
                          </SliderContainer>
                        </FormGroup>
                      </div>
                    </ToggleBody>
                  </GlassPanel>

                  <GlassPanel open={showGenerate}>
                    <ToggleHeader open={showGenerate} onClick={() => setShowGenerate(!showGenerate)}>
                      <h2><Sparkles size={20} /> Generate Ideas</h2>
                      {showGenerate ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </ToggleHeader>

                    <ToggleBody open={showGenerate}>
                      <div>
                        <FormGroup style={{ position: 'relative' }}>
                          <Textarea
                            placeholder="Describe your vision in detail... e.g. 'Generate 10 innovative startup ideas for the sustainable fashion industry targeting Gen Z.'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                          />
                          <RandomPromptBtn onClick={handleRandomPrompt} title="Use a random prompt">
                            <Dices size={18} />
                          </RandomPromptBtn>
                        </FormGroup>

                        <FormGroup style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$2' }}>
                          <Label>Sound Volume</Label>
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
                                try { localStorage.setItem('creflux_sound_volume', String(v)); } catch { }
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

            <MasterToggleBtn onClick={() => setIsHeaderOpen(!isHeaderOpen)}>
              {isHeaderOpen ? (
                <><ChevronUp size={20} /> Hide Configuration</>
              ) : (
                <><ChevronDown size={20} /> Show Configuration</>
              )}
            </MasterToggleBtn>
          </StickyHeader>

          <main>
            {isGenerating && (
              <LoadingStateContainer>
                <LargeLoader><Sparkles size={48} /></LargeLoader>
                <h3>Spawning Ideas...</h3>
                <p>{generationStep}</p>
              </LoadingStateContainer>
            )}

            {!isGenerating && results.length > 0 && (
              <IdeasList>
                {results.map((item, index) => (
                  <IdeaCard key={`${item.title}-${index}`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <CopyButton onClick={() => handleCopy(item, index)} title="Copy Idea">
                      {copiedId === index ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                    </CopyButton>
                    {item.title && <IdeaTitle>{item.title}</IdeaTitle>}
                    {item.thoughtProcess && (
                      <ThoughtChain>
                        {item.thoughtProcess.split('→').map((node, i, arr) => (
                          <React.Fragment key={i}>
                            <span style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px' }}>
                              {node.trim()}
                            </span>
                            {i < arr.length - 1 && <span style={{ color: 'var(--colors-secondary)' }}>→</span>}
                          </React.Fragment>
                        ))}
                      </ThoughtChain>
                    )}
                    <IdeaContent>
                      {item.idea.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
                    </IdeaContent>
                    <IdeaMetrics>
                      <Metric>
                        <MetricLabel>Syntax</MetricLabel>
                        <MetricValue color={getScoreColor(item.evaluation.syntax)}>
                          {item.evaluation.syntax || 0}
                        </MetricValue>
                        <ProgressBarBg>
                          <ProgressBarFill
                            css={{ width: `${item.evaluation.syntax || 0}%` }}
                            color={getScoreColor(item.evaluation.syntax)}
                          />
                        </ProgressBarBg>
                      </Metric>
                      <Metric>
                        <MetricLabel>Feasibility</MetricLabel>
                        <MetricValue color={getScoreColor(item.evaluation.feasibility)}>
                          {item.evaluation.feasibility || 0}
                        </MetricValue>
                        <ProgressBarBg>
                          <ProgressBarFill
                            css={{ width: `${item.evaluation.feasibility || 0}%` }}
                            color={getScoreColor(item.evaluation.feasibility)}
                          />
                        </ProgressBarBg>
                      </Metric>
                      <Metric>
                        <MetricLabel>Relevance</MetricLabel>
                        <MetricValue color={getScoreColor(item.evaluation.relevance)}>
                          {item.evaluation.relevance || 0}
                        </MetricValue>
                        <ProgressBarBg>
                          <ProgressBarFill
                            css={{ width: `${item.evaluation.relevance || 0}%` }}
                            color={getScoreColor(item.evaluation.relevance)}
                          />
                        </ProgressBarBg>
                      </Metric>
                      <Metric>
                        <MetricLabel>Novelty</MetricLabel>
                        <MetricValue color={getScoreColor(item.evaluation.novelty)}>
                          {item.evaluation.novelty || 0}
                        </MetricValue>
                        <ProgressBarBg>
                          <ProgressBarFill
                            css={{ width: `${item.evaluation.novelty || 0}%` }}
                            color={getScoreColor(item.evaluation.novelty)}
                          />
                        </ProgressBarBg>
                      </Metric>
                    </IdeaMetrics>
                    {item.evaluation.reasoning && (
                      <Reasoning>
                        <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--colors-text)' }}>
                          AI Reasoning:
                        </strong>
                        "{item.evaluation.reasoning}"
                      </Reasoning>
                    )}
                  </IdeaCard>
                ))}
              </IdeasList>
            )}
          </main>
        </AppContainer>
      </RootContainer>

      {
        showCopySettings && (
          <ModalOverlay onClick={() => setShowCopySettings(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalCloseBtn onClick={() => setShowCopySettings(false)}>
                <X size={20} />
              </ModalCloseBtn>
              <h3><SlidersHorizontal size={20} /> Copy Format</h3>

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
                Customize directly or select a preset above. Available variables:
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

              <h3><Volume2 size={20} /> Notification Sound</h3>
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
                    onChange={(e) => { const v = parseFloat(e.target.value); setSoundVolume(v); try { localStorage.setItem('creflux_sound_volume', String(v)); } catch { } }}
                    style={{ width: '100%', accentColor: '#FF006E' }}
                  />
                  <p style={{ fontSize: '0.7rem', color: 'var(--colors-textMuted)', marginTop: '0.4rem' }}>
                    A "Ding" sound (High F#) plays when generation completes.
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
