import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Play, 
  Download, 
  RefreshCw, 
  Instagram,
  ChefHat,
  Info,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { generateThematicPrompt, generateSushiVideo, pollVideoOperation, fetchVideoBlob } from './services/geminiService';
import { VideoGenerationStatus } from './types';

// Extend window for AI Studio API Key selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [status, setStatus] = useState<VideoGenerationStatus>(VideoGenerationStatus.IDLE);
  const [image, setImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [rollName, setRollName] = useState('Snow White Princess');
  const [userSuggestions, setUserSuggestions] = useState('');
  const [savedIdeas, setSavedIdeas] = useState<{name: string, notes: string}[]>([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadingMessages = [
    "Researching the name's origins...",
    "Analyzing the thematic essence...",
    "Crafting a cinematic vision...",
    "Setting the stage for the reel...",
    "Adding cinematic magic...",
    "Polishing the final reel...",
    "Almost ready for Instagram!"
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === VideoGenerationStatus.GENERATING || status === VideoGenerationStatus.POLLING) {
      let i = 0;
      setLoadingMessage(loadingMessages[0]);
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleGenerate = async () => {
    if (!image || !rollName) return;
    
    setError(null);
    setStatus(VideoGenerationStatus.GENERATING);
    
    try {
      // Create a fresh instance of the API key from process.env
      const apiKey = (process.env as any).API_KEY;
      
      if (!apiKey) {
        throw new Error("API Key not found. Please select a key.");
      }

      // 1. Research the name and generate a thematic prompt
      setLoadingMessage("Researching the name's origins...");
      const thematicPrompt = await generateThematicPrompt(apiKey, rollName, userSuggestions);
      setPrompt(thematicPrompt);

      // 2. Generate the video using the thematic prompt
      setLoadingMessage("Generating thematic reel...");
      let operation = await generateSushiVideo(apiKey, image, thematicPrompt);
      
      setStatus(VideoGenerationStatus.POLLING);
      operation = await pollVideoOperation(apiKey, operation);
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const blob = await fetchVideoBlob(apiKey, downloadLink);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatus(VideoGenerationStatus.COMPLETED);
      } else {
        throw new Error("Video generation failed - no download link received.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key session expired. Please re-select your key.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
      setStatus(VideoGenerationStatus.FAILED);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${rollName.toLowerCase().replace(/\s+/g, '-')}-reel.mp4`;
      a.click();
    }
  };

  const saveIdea = () => {
    if (rollName && !savedIdeas.find(i => i.name === rollName)) {
      setSavedIdeas([...savedIdeas, { name: rollName, notes: userSuggestions }]);
    }
  };

  const applyIdea = (idea: {name: string, notes: string}) => {
    setRollName(idea.name);
    setUserSuggestions(idea.notes);
  };

  const removeIdea = (name: string) => {
    setSavedIdeas(savedIdeas.filter(i => i.name !== name));
  };

  const reset = () => {
    setVideoUrl(null);
    setStatus(VideoGenerationStatus.IDLE);
    setError(null);
    setPrompt('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="mb-16 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <ChefHat size={14} className="text-orange-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/60">Sushi Reel Alchemist</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-light tracking-tight mb-4"
          >
            Thematic <span className="italic font-serif">Sushi</span> Reels
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-lg max-w-xl mx-auto"
          >
            Enter a sushi roll name and let AI research its essence to create a cinematic masterpiece.
          </motion.p>
        </header>

        {!hasApiKey ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-xl"
          >
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
              <Info className="text-orange-400" />
            </div>
            <h2 className="text-2xl font-medium mb-4">API Key Required</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              To use Veo video generation, you must select a paid Google Cloud API key. 
              Billing must be enabled on your project.
            </p>
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handleConnectKey}
                className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-orange-400 transition-colors flex items-center gap-2"
              >
                Connect API Key
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/60 underline underline-offset-4"
              >
                Learn about billing
              </a>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Controls */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Sushi Name Input */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-4 font-bold">
                  1. Sushi Roll Name
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={rollName}
                    onChange={(e) => setRollName(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-lg text-white/80 focus:outline-none focus:border-orange-500/50 transition-colors"
                    placeholder="e.g. Dragon Roll, Fire & Ice..."
                  />
                  <button 
                    onClick={saveIdea}
                    className="px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white/60"
                    title="Save Idea"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-white/30">
                  AI will research this name to determine the video's theme.
                </p>
              </div>

              {/* Director's Notes / Suggestions */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-4 font-bold">
                  2. Director's Notes (Optional)
                </label>
                <textarea 
                  value={userSuggestions}
                  onChange={(e) => setUserSuggestions(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/80 focus:outline-none focus:border-orange-500/50 transition-colors min-h-[80px] resize-none"
                  placeholder="Add specific ideas (e.g. 'make it look like a rainy night', 'add more sparkles')..."
                />
                <p className="mt-2 text-[10px] text-white/30">
                  These suggestions will influence the AI's creative direction.
                </p>
              </div>

              {/* Image Upload */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-4 font-bold">
                  3. Upload Photo
                </label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3
                    ${image ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}
                  `}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="relative z-10 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/20">
                        <RefreshCw size={20} />
                      </div>
                      <span className="relative z-10 text-xs font-medium">Change Photo</span>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-white/5 rounded-full">
                        <Upload size={24} className="text-white/40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Click to upload</p>
                        <p className="text-[10px] text-white/30 mt-1">PNG, JPG or WEBP</p>
                      </div>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              {/* Action Button */}
              <button
                disabled={!image || !rollName || status === VideoGenerationStatus.GENERATING || status === VideoGenerationStatus.POLLING}
                onClick={handleGenerate}
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3
                  ${!image || !rollName
                    ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                  }
                `}
              >
                {status === VideoGenerationStatus.GENERATING || status === VideoGenerationStatus.POLLING ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Alchemizing Reel...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} fill="currentColor" />
                    <span>Create Thematic Reel</span>
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                >
                  <AlertCircle className="text-red-400 shrink-0" size={18} />
                  <p className="text-xs text-red-200/80 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </motion.div>

            {/* Right Column: Preview */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-12"
            >
              <div className="relative aspect-[9/16] bg-white/5 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                  {status === VideoGenerationStatus.IDLE && (
                    <motion.div 
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                        <Instagram size={32} className="text-white/20" />
                      </div>
                      <h3 className="text-xl font-medium mb-2 text-white/60">Thematic Preview</h3>
                      <p className="text-sm text-white/30">Your thematic reel will appear here.</p>
                    </motion.div>
                  )}

                  {(status === VideoGenerationStatus.GENERATING || status === VideoGenerationStatus.POLLING) && (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/40 backdrop-blur-sm"
                    >
                      <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ChefHat className="text-orange-400" size={32} />
                        </div>
                      </div>
                      <h3 className="text-xl font-medium mb-2">Alchemizing...</h3>
                      <p className="text-sm text-white/40 italic">"{loadingMessage}"</p>
                      <div className="mt-8 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-orange-500"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {status === VideoGenerationStatus.COMPLETED && videoUrl && (
                    <motion.div 
                      key="completed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0"
                    >
                      <video 
                        src={videoUrl} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay controls */}
                      <div className="absolute bottom-8 left-0 right-0 px-8 flex flex-col gap-3">
                        <button 
                          onClick={handleDownload}
                          className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-400 transition-colors"
                        >
                          <Download size={18} />
                          Download Reel
                        </button>
                        <button 
                          onClick={reset}
                          className="w-full py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10"
                        >
                          <RefreshCw size={18} />
                          Create Another
                        </button>
                      </div>

                      <div className="absolute top-8 left-8">
                        <div className="bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                          <CheckCircle2 size={12} />
                          THEME CAPTURED
                        </div>
                      </div>

                      {/* Prompt Display */}
                      {prompt && (
                        <div className="absolute top-20 left-8 right-8">
                          <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[9px] text-white/60 leading-tight">
                            <span className="text-orange-400 font-bold uppercase block mb-1">AI Prompt Strategy:</span>
                            {prompt}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}

        {/* Saved Ideas Section */}
        {savedIdeas.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-orange-400" size={20} />
                <h2 className="text-xl font-medium">Idea Brainstorming</h2>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                {savedIdeas.length} Saved Ideas
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedIdeas.map((idea) => (
                <div 
                  key={idea.name}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white/80">{idea.name}</h3>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => applyIdea(idea)}
                        className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20"
                        title="Apply Idea"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button 
                        onClick={() => removeIdea(idea.name)}
                        className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                        title="Delete Idea"
                      >
                        <AlertCircle size={14} />
                      </button>
                    </div>
                  </div>
                  {idea.notes && (
                    <p className="text-[10px] text-white/40 line-clamp-2 italic">
                      "{idea.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20">
            Powered by Veo 3.1 & Gemini Pro
          </p>
        </footer>
      </main>
    </div>
  );
}
