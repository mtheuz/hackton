import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { ActivityContent, ActivityType } from '../types/modoAula';
import type { LessonSlide, SlideType } from '../types/lesson';

const BUCKET = 'content-triggers';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface SlideRow {
  id: string;
  position: number;
  slide_type: SlideType;
  content_json: ActivityContent | null;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  accessibility_caption: string | null;
}

async function slideFromRow(row: SlideRow): Promise<LessonSlide> {
  let fileUrl: string | null = null;
  if (row.file_path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS);
    fileUrl = data?.signedUrl ?? null;
  }
  return {
    id: row.id,
    position: row.position,
    type: row.slide_type,
    content: row.content_json,
    textContent: row.text_content,
    filePath: row.file_path,
    fileUrl,
    fileName: row.file_name,
    fileType: row.file_type,
    accessibilityCaption: row.accessibility_caption,
  };
}

export async function fetchLessonSlides(lessonId: string): Promise<LessonSlide[]> {
  const { data } = await supabase
    .from('lesson_slides')
    .select('id, position, slide_type, content_json, text_content, file_path, file_name, file_type, accessibility_caption')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true });
  const rows = (data ?? []) as SlideRow[];
  return Promise.all(rows.map(slideFromRow));
}

interface AddMaterialSlideParams {
  textContent: string;
  file: File | null;
  accessibilityCaption?: string;
}

interface UseLessonSlidesResult {
  slides: LessonSlide[];
  loading: boolean;
  addActivitySlide: (type: ActivityType, content: ActivityContent) => Promise<void>;
  addMaterialSlide: (params: AddMaterialSlideParams) => Promise<void>;
  removeSlide: (slideId: string) => Promise<void>;
  moveSlide: (slideId: string, direction: 'up' | 'down') => Promise<void>;
}

export function useLessonSlides(lessonId: string | null): UseLessonSlidesResult {
  const [slides, setSlides] = useState<LessonSlide[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!lessonId) {
      setSlides([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSlides(await fetchLessonSlides(lessonId));
    setLoading(false);
  }, [lessonId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const addActivitySlide = useCallback(
    async (type: ActivityType, content: ActivityContent) => {
      if (!lessonId) return;
      const { error } = await supabase.from('lesson_slides').insert({
        lesson_id: lessonId,
        position: slides.length,
        slide_type: type,
        content_json: content,
      });
      if (error) throw error;
      await refetch();
    },
    [lessonId, slides.length, refetch],
  );

  const addMaterialSlide = useCallback(
    async ({ textContent, file, accessibilityCaption }: AddMaterialSlideParams) => {
      if (!lessonId) return;
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;
      if (file) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : null;
        filePath = `lessons/${lessonId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { contentType: file.type || undefined });
        if (uploadError) throw uploadError;
        fileName = file.name;
        fileType = file.type || null;
      }
      const { error } = await supabase.from('lesson_slides').insert({
        lesson_id: lessonId,
        position: slides.length,
        slide_type: 'material',
        text_content: textContent || null,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
        accessibility_caption: accessibilityCaption ?? null,
      });
      if (error) throw error;
      await refetch();
    },
    [lessonId, slides.length, refetch],
  );

  const removeSlide = useCallback(
    async (slideId: string) => {
      const { error } = await supabase.from('lesson_slides').delete().eq('id', slideId);
      if (error) throw error;
      await refetch();
    },
    [refetch],
  );

  const moveSlide = useCallback(
    async (slideId: string, direction: 'up' | 'down') => {
      const index = slides.findIndex((s) => s.id === slideId);
      if (index === -1) return;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= slides.length) return;
      const current = slides[index];
      const swap = slides[swapIndex];
      const { error: error1 } = await supabase
        .from('lesson_slides')
        .update({ position: swap.position })
        .eq('id', current.id);
      const { error: error2 } = await supabase
        .from('lesson_slides')
        .update({ position: current.position })
        .eq('id', swap.id);
      if (error1 || error2) throw error1 ?? error2;
      await refetch();
    },
    [slides, refetch],
  );

  return { slides, loading, addActivitySlide, addMaterialSlide, removeSlide, moveSlide };
}
