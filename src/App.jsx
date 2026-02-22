import React, { useState } from 'react';
import { generateIdeas, evaluateIdeasBatch, enhancePrompt } from './lib/openai';
import { Settings, Sparkles, ChevronDown, ChevronUp, AlertCircle, Copy, Check, Dices } from 'lucide-react';
import { styled, gloablStyles, keyframes } from './stitches.config';
import { RANDOM_PROMPTS } from './lib/prompts';

// Initialize global styles
gloablStyles();

const PROVIDERS = {
  openai: { name: 'OpenAI', defaultBase: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  gemini: { name: 'Gemini', defaultBase: 'https://generativelanguage.googleapis.com/v1beta/openai/', defaultModel: 'gemini-2.5-flash' },
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

const fadeIn = keyframes({
  from: { opacity: 0, transform: 'translateY(-10px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
});

const RootContainer = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
});

const AppContainer = styled('div', {
  width: '100%',
  maxWidth: '1200px', // Increased to fit two horizontal panels comfortably
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
  margin: '0 0 $5 0', // Remove negative edges
  padding: '$5',
  borderRadius: '$7', // Fully rounded island
  border: '1px solid $border',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: '$4',
  transition: 'all 0.3s ease',
  paddingBottom: '2.5rem', // Make room for the absolute toggle button
});

const MasterToggleBtn = styled('button', {
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translate(-50%, -65%)', // move up 65% of its height
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
    transform: 'translate(-50%, -65%) scale(1.05)',
    boxShadow: '0 6px 20px rgba(58, 134, 255, 0.4)',
  },
  '&:active': {
    transform: 'translate(-50%, -65%) scale(0.95)',
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
  borderRadius: '$round', // Default to fully pill-shaped
  padding: '$5',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s ease',
  height: 'auto', // Ensure it un-stretches if in a grid
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
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      false: {
        borderRadius: '$round',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s ease', // Matches grid-template-rows 0.35s collapse
      }
    }
  }
});

const PanelsSplit = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
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
  gridTemplateColumns: '1fr 1fr',
  gap: '$3',
});

const Label = styled('label', {
  fontSize: '$2',
  color: '$textMuted',
  fontWeight: 600,
});

const inputShared = {
  width: '100%',
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
  paddingRight: '3rem', // Add space for the dice button
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
  marginBottom: '$3',
  marginTop: 0,
  paddingRight: '40px', // Space for copy button
  lineHeight: 1.4,
});

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
  gridTemplateColumns: 'repeat(3, 1fr)',
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

const ToggleHeader = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  paddingBottom: '$2', // extra padding space for when toggled
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
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a creative prompt.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationStep("Enhancing Prompt...");
    setResults([]);

    const providerConfig = {
      apiKey: finalApiKey,
      baseURL: baseURL.trim(),
      model: model.trim(),
      provider
    };

    try {
      const enhancedPrompt = await enhancePrompt(providerConfig, prompt);

      setGenerationStep("Hallucinating & Evaluating...");
      const hallucinationLevel = sliderIndex * 0.5; // Maps 0-4 to 0.0-2.0
      const rawIdeas = await generateIdeas(providerConfig, enhancedPrompt, hallucinationLevel);

      if (!rawIdeas || rawIdeas.length === 0) {
        throw new Error("No ideas were generated. Try tweaking the prompt or checking the model.");
      }

      // Evaluate the batch of 100 ideas in one API call
      const evaluatedIdeas = await evaluateIdeasBatch(providerConfig, prompt, rawIdeas);
      setResults(evaluatedIdeas);

      // Auto-collapse panels to show ideas taking full screen
      setShowGenerate(false);
      setShowSettings(false);

    } catch (err) {
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_PROMPTS.length);
    setPrompt(RANDOM_PROMPTS[randomIndex]);
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };


  const handleCopy = (item, index) => {
    const copyText = `${item.title ? `[${item.title}]\n` : ''}${item.idea}\n\nReasoning: ${item.evaluation.reasoning}\nSyntax: ${item.evaluation.syntax} | Feasibility: ${item.evaluation.feasibility} | Relevance: ${item.evaluation.relevance}`;
    navigator.clipboard.writeText(copyText);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <RootContainer>
      <AppContainer>
        <StickyHeader>
          <Header>
            <h1>CreFlux</h1>
            <p>
              Make your idea with AI's hallucination
            </p>
          </Header>

          <ToggleBody open={isHeaderOpen}>
            <div>
              <PanelsSplit>
                <GlassPanel open={showSettings}>
                  <ToggleHeader onClick={() => setShowSettings(!showSettings)}>
                    <h2><Settings size={20} /> AI Configuration</h2>
                    {showSettings ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </ToggleHeader>

                  <ToggleBody open={showSettings}>
                    <div>
                      <FormGroup>
                        <Label>AI Provider</Label>
                        <Select value={provider} onChange={handleProviderChange}>
                          {Object.entries(PROVIDERS).map(([key, data]) => (
                            <option key={key} value={key}>{data.name}</option>
                          ))}
                        </Select>
                      </FormGroup>

                      <FormRow>
                        <FormGroup>
                          <Label>API Key</Label>
                          <Input
                            type="password"
                            placeholder="Enter API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                          />
                        </FormGroup>
                        <FormGroup>
                          <Label>Model Name</Label>
                          <Input
                            type="text"
                            placeholder="e.g. gpt-4o"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                          />
                        </FormGroup>
                      </FormRow>

                      <FormGroup>
                        <Label>Base URL (Optional override)</Label>
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
                            <Label style={{ marginBottom: 0 }}>Hallucination Level</Label>
                            <SliderValue>{SLIDER_LABELS[sliderIndex]}</SliderValue>
                          </SliderHeader>
                          <SliderInput
                            type="range"
                            min="0"
                            max="4"
                            step="1"
                            value={sliderIndex}
                            onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                          />
                        </SliderContainer>
                      </FormGroup>
                    </div>
                  </ToggleBody>
                </GlassPanel>

                <GlassPanel open={showGenerate}>
                  <ToggleHeader onClick={() => setShowGenerate(!showGenerate)}>
                    <h2><Sparkles size={20} /> Generate Ideas</h2>
                    {showGenerate ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </ToggleHeader>

                  <ToggleBody open={showGenerate}>
                    <div>
                      <FormGroup style={{ position: 'relative' }}>
                        <Textarea
                          placeholder="Enter a problem, topic, or seed. Example: 'How to revolutionize public transport' or 'A new way to eat soup'"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                        />
                        <RandomPromptBtn onClick={handleRandomPrompt} title="Use a random prompt">
                          <Dices size={18} />
                        </RandomPromptBtn>
                      </FormGroup>

                      {error && (
                        <ErrorMessage>
                          <AlertCircle size={20} />
                          <span>{error}</span>
                        </ErrorMessage>
                      )}

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
          </ToggleBody>

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
                <IdeaCard key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                  <CopyButton onClick={() => handleCopy(item, index)} title="Copy Idea">
                    {copiedId === index ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                  </CopyButton>
                  {item.title && <IdeaTitle>{item.title}</IdeaTitle>}
                  <IdeaContent>
                    {item.idea}
                  </IdeaContent>
                  <IdeaMetrics>
                    <Metric>
                      <MetricLabel>Syntax</MetricLabel>
                      <MetricValue color={getScoreColor(item.evaluation.syntax)}>
                        {item.evaluation.syntax || 0}
                      </MetricValue>
                      <ProgressBarBg>
                        <ProgressBarFill
                          color={getScoreColor(item.evaluation.syntax)}
                          style={{ width: `${item.evaluation.syntax || 0}%` }}
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
                          color={getScoreColor(item.evaluation.feasibility)}
                          style={{ width: `${item.evaluation.feasibility || 0}%` }}
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
                          color={getScoreColor(item.evaluation.relevance)}
                          style={{ width: `${item.evaluation.relevance || 0}%` }}
                        />
                      </ProgressBarBg>
                    </Metric>
                  </IdeaMetrics>
                  {item.evaluation.reasoning && (
                    <Reasoning>
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
  );
}
