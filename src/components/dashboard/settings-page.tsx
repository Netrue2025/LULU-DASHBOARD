"use client";

import { Play, RefreshCw, Save, Trash2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { loadStored, saveStored } from "@/lib/store";

const defaults = {
  name: "LULU",
  prompt: "Warm, friendly local assistant.",
  wakeWord: "Hey LULU",
  language: "English",
  whisperModel: "base",
  piperVoice: "en_US-amy-medium",
  adminPassword: "",
  apiKeys: ""
};

type TtsVoice = {
  voice_id: string;
  display_name: string;
  category?: string;
  labels?: Record<string, string>;
};

type TtsConfig = {
  provider: string;
  defaultVoice: string;
  fallback: string;
  cacheEnabled: boolean;
  cacheFolder: string;
  elevenlabsGainDb: number;
  voiceSpeed: number;
  pitchSemitones: number;
  voices: Record<string, { voice_id: string; display_name: string }>;
};

type TtsCache = {
  file_count: number;
  storage_used: number;
  files: Array<{ file: string; size: number }>;
};

const defaultTtsConfig: TtsConfig = {
  provider: "piper",
  defaultVoice: "en_US-amy-medium",
  fallback: "piper",
  cacheEnabled: false,
  cacheFolder: "cache/tts_cache",
  elevenlabsGainDb: 12,
  voiceSpeed: 1,
  pitchSemitones: 0,
  voices: {
    conversation: { voice_id: "en_US-amy-medium", display_name: "Amy - Soft American" },
    story: { voice_id: "en_GB-alba-medium", display_name: "Alba - Soft British" },
    education: { voice_id: "en_US-lessac-medium", display_name: "Lessac - Clear American" }
  }
};
const preferredPiperVoiceIds = [
  "en_US-amy-medium",
  "en_US-lessac-medium",
  "en_GB-alba-medium",
  "en_GB-southern_english_female-low",
  "en_US-kathleen-low"
];

export function SettingsPage() {
  const [settings, setSettings] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const [ttsConfig, setTtsConfig] = useState<TtsConfig>(defaultTtsConfig);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [piperVoices, setPiperVoices] = useState<TtsVoice[]>([]);
  const [ttsCache, setTtsCache] = useState<TtsCache>({ file_count: 0, storage_used: 0, files: [] });
  const [ttsStatus, setTtsStatus] = useState("");
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    setSettings(loadStored("lulu-settings", defaults));
    loadTtsSettings();
  }, []);

  function save() {
    saveStored("lulu-settings", settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function loadTtsSettings() {
    const [configResponse, voicesResponse, cacheResponse] = await Promise.all([
      fetch("/api/lulu/tts?action=config", { cache: "no-store" }),
      fetch("/api/lulu/tts?action=voices", { cache: "no-store" }),
      fetch("/api/lulu/tts?action=cache", { cache: "no-store" })
    ]);

    if (configResponse.ok) setTtsConfig({ ...defaultTtsConfig, ...(await configResponse.json()) });
    if (voicesResponse.ok) {
      const voicePayload = await voicesResponse.json();
      setVoices(uniqueVoices(voicePayload.voices ?? []));
      setPiperVoices(uniqueVoices(voicePayload.piper_voices ?? []));
    }
    if (cacheResponse.ok) setTtsCache(await cacheResponse.json());
  }

  function setModeVoice(mode: "conversation" | "story" | "education", voiceId: string) {
    const voice = activeVoices.find((item) => item.voice_id === voiceId) ?? voices.find((item) => item.voice_id === voiceId);
    setTtsConfig({
      ...ttsConfig,
      voices: {
        ...ttsConfig.voices,
        [mode]: {
          voice_id: voiceId,
          display_name: voice?.display_name ?? voiceId
        }
      }
    });
  }

  function setProvider(provider: string) {
    if (provider === "piper") {
      const mainVoice = piperVoices.find((item) => item.voice_id === "en_US-amy-medium") ?? piperVoices[0];
      setTtsConfig({
        ...ttsConfig,
        provider,
        defaultVoice: mainVoice?.voice_id ?? "en_US-amy-medium",
        voices: {
          conversation: {
            voice_id: mainVoice?.voice_id ?? "en_US-amy-medium",
            display_name: mainVoice?.display_name ?? "Amy - Soft American"
          },
          story: ttsConfig.voices.story?.voice_id?.startsWith("en_")
            ? ttsConfig.voices.story
            : { voice_id: "en_GB-alba-medium", display_name: "Alba - Soft British" },
          education: ttsConfig.voices.education?.voice_id?.startsWith("en_")
            ? ttsConfig.voices.education
            : { voice_id: "en_US-lessac-medium", display_name: "Lessac - Clear American" }
        }
      });
      return;
    }
    setTtsConfig({ ...ttsConfig, provider });
  }

  function usePreferredPiperVoice(voiceId: string) {
    const voice = piperVoices.find((item) => item.voice_id === voiceId);
    setTtsConfig({
      ...ttsConfig,
      provider: "piper",
      defaultVoice: voiceId,
      voices: {
        ...ttsConfig.voices,
        conversation: {
          voice_id: voice?.voice_id ?? voiceId,
          display_name: voice?.display_name ?? voiceId
        }
      }
    });
    setTtsStatus(voice ? `${voice.display_name} selected for Piper` : `${voiceId} selected for Piper`);
  }

  function usePreferredPiperSet() {
    const nextVoices = { ...ttsConfig.voices };
    const mapping: Array<["conversation" | "story" | "education", string]> = [
      ["conversation", "en_US-amy-medium"],
      ["story", "en_GB-alba-medium"],
      ["education", "en_US-lessac-medium"]
    ];
    for (const [mode, voiceId] of mapping) {
      const voice = piperVoices.find((item) => item.voice_id === voiceId);
      nextVoices[mode] = {
        voice_id: voice?.voice_id ?? voiceId,
        display_name: voice?.display_name ?? voiceId
      };
    }
    setTtsConfig({ ...ttsConfig, provider: "piper", defaultVoice: "en_US-amy-medium", voices: nextVoices });
    setTtsStatus("Soft Piper voice set selected");
  }

  async function saveTtsSettings() {
    const previewAudio = new Audio();
    const response = await fetch("/api/lulu/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "config", config: ttsConfig })
    });
    if (!response.ok) {
      setTtsStatus("Could not save voice settings");
      return;
    }
    setTtsStatus("Voice settings saved. Generating preview...");
    await loadTtsSettings();
    await previewVoice("conversation", previewAudio);
  }

  async function previewVoice(mode: "conversation" | "story" | "education", audioPlayer?: HTMLAudioElement) {
    setPreviewing(true);
    setTtsStatus("Generating preview");
    try {
      const response = await fetch("/api/lulu/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "speak", text: "Hello, I'm LULU!", mode, allowFallback: false })
      });
      const data = await response.json();
      if (!response.ok) {
        setTtsStatus(data.detail ?? data.fallback_reason ?? "Preview failed");
        return;
      }
      const audioUrl = `${data.audio_url}${String(data.audio_url).includes("?") ? "&" : "?"}preview=${Date.now()}`;
      const player = audioPlayer ?? new Audio();
      player.src = audioUrl;
      await player.play();
      const fallback = data.fallback_used ? ` using fallback${data.fallback_reason ? `: ${data.fallback_reason}` : ""}` : "";
      setTtsStatus(`Preview ready: ${data.provider}${fallback}${data.cache_hit ? " cache" : ""}`);
      await loadTtsSettings();
    } catch (error) {
      setTtsStatus(error instanceof Error ? `Preview failed: ${error.message}` : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  const activeVoices = ttsConfig.provider === "piper"
    ? (piperVoices.length ? piperVoices : uniqueVoices(voices.filter((voice) => voice.category === "local_piper")))
    : uniqueVoices(voices.filter((voice) => voice.category !== "local_piper"));

  async function clearTtsCache() {
    const response = await fetch("/api/lulu/tts", { method: "DELETE" });
    setTtsStatus(response.ok ? "TTS cache cleared" : "Could not clear TTS cache");
    await loadTtsSettings();
  }

  async function preloadTtsCache() {
    setTtsStatus("Preloading common phrases");
    const response = await fetch("/api/lulu/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preload" })
    });
    const data = await response.json();
    setTtsStatus(response.ok ? `Preloaded ${data.generated ?? 0} phrase(s)` : data.detail ?? "Preload failed");
    await loadTtsSettings();
  }

  return (
    <DashboardShell title="Settings" subtitle="General, speech, and security controls">
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="General Settings">
          <div className="space-y-3">
            <Input placeholder="LULU Name" value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} />
            <Textarea placeholder="Personality Prompt" value={settings.prompt} onChange={(event) => setSettings({ ...settings, prompt: event.target.value })} />
            <Input placeholder="Wake Word" value={settings.wakeWord} onChange={(event) => setSettings({ ...settings, wakeWord: event.target.value })} />
            <Select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value })}>
              <option>English</option>
              <option>Yoruba</option>
              <option>Pidgin English</option>
            </Select>
          </div>
        </SectionCard>
        <SectionCard title="Speech Settings">
          <div className="space-y-3">
            <Input placeholder="Whisper Model" value={settings.whisperModel} onChange={(event) => setSettings({ ...settings, whisperModel: event.target.value })} />
            <Input placeholder="Piper Voice" value={settings.piperVoice} onChange={(event) => setSettings({ ...settings, piperVoice: event.target.value })} />
          </div>
        </SectionCard>
        <SectionCard title="Security Settings">
          <div className="space-y-3">
            <Input type="password" placeholder="Admin Password" value={settings.adminPassword} onChange={(event) => setSettings({ ...settings, adminPassword: event.target.value })} />
            <Textarea placeholder="API Keys" value={settings.apiKeys} onChange={(event) => setSettings({ ...settings, apiKeys: event.target.value })} />
          </div>
        </SectionCard>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <SectionCard
          title="Voice Settings"
          action={<Button variant="secondary" onClick={loadTtsSettings}><RefreshCw className="h-4 w-4" />Refresh</Button>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={ttsConfig.provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="piper">Piper Local Voice</option>
              <option value="elevenlabs">ElevenLabs</option>
            </Select>
            <Select value={ttsConfig.cacheEnabled ? "1" : "0"} onChange={(event) => setTtsConfig({ ...ttsConfig, cacheEnabled: event.target.value === "1" })}>
              <option value="1">Cache Enabled</option>
              <option value="0">Cache Disabled</option>
            </Select>
            <VoiceSelect label="LULU Main Voice" mode="conversation" voices={activeVoices} value={ttsConfig.voices.conversation?.voice_id ?? ""} onChange={setModeVoice} />
            <VoiceSelect label="Story Voice" mode="story" voices={activeVoices} value={ttsConfig.voices.story?.voice_id ?? ""} onChange={setModeVoice} />
            <VoiceSelect label="Education Voice" mode="education" voices={activeVoices} value={ttsConfig.voices.education?.voice_id ?? ""} onChange={setModeVoice} />
            <Input placeholder="Cache folder" value={ttsConfig.cacheFolder} onChange={(event) => setTtsConfig({ ...ttsConfig, cacheFolder: event.target.value })} />
            <Input
              type="number"
              min="-6"
              max="12"
              step="1"
              placeholder="ElevenLabs gain dB"
              disabled={ttsConfig.provider !== "elevenlabs"}
              value={ttsConfig.elevenlabsGainDb}
              onChange={(event) => setTtsConfig({ ...ttsConfig, elevenlabsGainDb: Number(event.target.value) })}
            />
            <RangeSetting
              label="Voice Speed"
              value={ttsConfig.voiceSpeed}
              min={0.7}
              max={1.4}
              step={0.05}
              display={`${ttsConfig.voiceSpeed.toFixed(2)}x`}
              onChange={(voiceSpeed) => setTtsConfig({ ...ttsConfig, voiceSpeed })}
            />
            <RangeSetting
              label="Pitch"
              value={ttsConfig.pitchSemitones}
              min={-6}
              max={6}
              step={0.5}
              display={`${ttsConfig.pitchSemitones > 0 ? "+" : ""}${ttsConfig.pitchSemitones.toFixed(1)} st`}
              onChange={(pitchSemitones) => setTtsConfig({ ...ttsConfig, pitchSemitones })}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {preferredPiperVoiceIds.map((voiceId) => {
              const voice = piperVoices.find((item) => item.voice_id === voiceId);
              return (
                <Button key={voiceId} variant={voice ? "secondary" : "ghost"} onClick={() => usePreferredPiperVoice(voiceId)}>
                  {voice?.display_name ?? voiceId}
                </Button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={saveTtsSettings}><Save className="h-4 w-4" />Save Voice Settings</Button>
            <Button variant="secondary" disabled={previewing} onClick={() => previewVoice("conversation")}><Play className="h-4 w-4" />Preview</Button>
            <Button variant="secondary" onClick={usePreferredPiperSet}>Use Soft Piper Set</Button>
            <Button variant="secondary" disabled={previewing} onClick={preloadTtsCache}><Volume2 className="h-4 w-4" />Preload Phrases</Button>
          </div>
          {ttsStatus ? <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{ttsStatus}</p> : null}
        </SectionCard>

        <SectionCard title="Voice Cache">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Files</span>
              <span className="font-medium">{ttsCache.file_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Storage Used</span>
              <span className="font-medium">{formatBytes(ttsCache.storage_used ?? 0)}</span>
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
              {(ttsCache.files ?? []).slice(0, 8).map((file) => (
                <div key={file.file} className="flex items-center justify-between gap-2">
                  <span className="truncate">{file.file}</span>
                  <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={clearTtsCache}><Trash2 className="h-4 w-4" />Clear Cache</Button>
          </div>
        </SectionCard>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save}><Save className="h-4 w-4" />{saved ? "Saved" : "Save Settings"}</Button>
      </div>
    </DashboardShell>
  );
}

function VoiceSelect({
  label,
  mode,
  voices,
  value,
  onChange
}: {
  label: string;
  mode: "conversation" | "story" | "education";
  voices: TtsVoice[];
  value: string;
  onChange: (mode: "conversation" | "story" | "education", voiceId: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onChange={(event) => onChange(mode, event.target.value)}>
        {voices.length ? voices.map((voice, index) => (
          <option key={`${voice.voice_id}-${index}`} value={voice.voice_id}>{voice.display_name || voice.voice_id}</option>
        )) : <option value={value}>{value || "Configured voice"}</option>}
      </Select>
    </label>
  );
}

function RangeSetting({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2 rounded-md border bg-background/50 p-3 text-sm">
      <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{display}</span>
      </span>
      <input
        className="h-2 w-full accent-primary"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function uniqueVoices(rawVoices: TtsVoice[]) {
  const seen = new Set<string>();
  return rawVoices.filter((voice) => {
    const key = voice.voice_id.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
