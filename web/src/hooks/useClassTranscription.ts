import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionEventLike extends Event { results: { [index: number]: { [index: number]: { transcript: string } } }; resultIndex: number; }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; } }

export function useClassTranscription(enabled: boolean) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const speech = useRef<SpeechRecognitionLike | null>(null);

  const stop = useCallback(() => {
    recorder.current?.stop();
    speech.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    recorder.current = null; stream.current = null; speech.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    if (!enabled || recording) return;
    setError(null);
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !Recognition) {
      setUnsupported(true); return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const mediaRecorder = new MediaRecorder(media); mediaRecorder.start(); recorder.current = mediaRecorder;
      const recognition = new Recognition(); recognition.lang = 'pt-BR'; recognition.continuous = true; recognition.interimResults = true;
      recognition.onresult = (event) => {
        const text = Array.from({ length: event.resultIndex + 1 }, (_, index) => event.results[index]?.[0]?.transcript ?? '').join(' ');
        if (text.trim()) setTranscript((current) => current ? `${current} ${text}` : text);
      };
      recognition.onerror = () => setError('A gravação continua, mas a transcrição foi interrompida.');
      recognition.start(); speech.current = recognition; setRecording(true);
    } catch { setError('Não foi possível acessar o microfone. Verifique a permissão do navegador.'); }
  }, [enabled, recording]);

  useEffect(() => () => stop(), [stop]);
  return { recording, transcript, unsupported, error, start, stop, clear: () => setTranscript('') };
}
