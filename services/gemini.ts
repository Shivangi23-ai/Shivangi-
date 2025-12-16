
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ClassLevel, Subject, Chapter, LessonContent, Language, Board, Stream, ContentType, MCQItem, SystemSettings } from "../types";
import { STATIC_SYLLABUS } from "../constants";

// ============================================================================
// 🔑 MANUAL BACKUP KEY
const MANUAL_API_KEY = "AIzaSyCUvxGE45jnwMmQ4u-8L1NJowela6DckQo"; 
// ============================================================================

// Helper: Get available keys
const getAvailableKeys = (): string[] => {
    try {
        const storedSettings = localStorage.getItem('nst_system_settings');
        const keys: string[] = [];
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings) as SystemSettings;
            if (parsed.apiKeys && Array.isArray(parsed.apiKeys)) {
                parsed.apiKeys.forEach(k => { if(k.trim()) keys.push(k.trim()); });
            }
        }
        if (MANUAL_API_KEY) keys.push(MANUAL_API_KEY);
        const envKey = process.env.API_KEY;
        if (envKey && envKey !== 'DUMMY_KEY_FOR_BUILD') keys.push(envKey);
        return Array.from(new Set(keys));
    } catch (e) {
        return MANUAL_API_KEY ? [MANUAL_API_KEY] : [];
    }
};

const executeWithRotation = async <T>(
    operation: (ai: GoogleGenAI) => Promise<T>
): Promise<T> => {
    const keys = getAvailableKeys();
    const shuffledKeys = keys.sort(() => 0.5 - Math.random());
    if (shuffledKeys.length === 0) throw new Error("No API Keys available");
    let lastError: any = null;
    for (const key of shuffledKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            return await operation(ai);
        } catch (error: any) {
            lastError = error;
        }
    }
    throw lastError || new Error("All API Keys failed.");
};

// Cache
const chapterCache: Record<string, Chapter[]> = {};
const lessonCache: Record<string, LessonContent> = {};

const cleanJson = (text: string) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- CONTENT DB LOOKUP ---
const getAdminContent = (
    board: Board, 
    classLevel: ClassLevel, 
    stream: Stream | null, 
    subject: Subject, 
    chapterId: string,
    type: ContentType
): LessonContent | null => {
    const streamKey = stream ? `-${stream}` : '';
    // Key format used in AdminDashboard to save content
    const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapterId}`;
    
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            
            // Check specific link types
            if (type === 'PDF_FREE' && parsed.freeLink) {
                return {
                    id: Date.now().toString(),
                    title: "Free Study Material",
                    subtitle: "Provided by Admin",
                    content: parsed.freeLink,
                    type: 'PDF_FREE',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }

            if (type === 'PDF_PREMIUM' && parsed.premiumLink) {
                return {
                    id: Date.now().toString(),
                    title: "Premium Notes",
                    subtitle: "High Quality Content",
                    content: parsed.premiumLink,
                    type: 'PDF_PREMIUM',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }

            // Legacy Fallback (View Old Links)
            if (type === 'PDF_VIEWER' && parsed.link) {
                return {
                    id: Date.now().toString(),
                    title: "Class Notes", 
                    subtitle: "Provided by Teacher",
                    content: parsed.link, 
                    type: 'PDF_VIEWER',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }
            
            // Check for Manual MCQs
            if ((type === 'MCQ_SIMPLE' || type === 'MCQ_ANALYSIS') && parsed.manualMcqData) {
                return {
                    id: Date.now().toString(),
                    title: "Class Test (Admin)",
                    subtitle: `${parsed.manualMcqData.length} Questions`,
                    content: '',
                    type: type,
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    mcqData: parsed.manualMcqData
                }
            }
        }
    } catch (e) {
        console.error("DB Lookup Error", e);
    }
    return null;
};

// --- SYLLABUS FETCHING ---
const getCustomChapters = (key: string): Chapter[] | null => {
    try {
        const data = localStorage.getItem(`nst_custom_chapters_${key}`);
        return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
};

export const fetchChapters = async (
  board: Board,
  classLevel: ClassLevel, 
  stream: Stream | null,
  subject: Subject,
  language: Language
): Promise<Chapter[]> => {
  const streamKey = stream ? `-${stream}` : '';
  const cacheKey = `${board}-${classLevel}${streamKey}-${subject.name}-${language}`;
  
  const customChapters = getCustomChapters(cacheKey);
  if (customChapters && customChapters.length > 0) return customChapters;

  if (chapterCache[cacheKey]) return chapterCache[cacheKey];

  const staticKey = `${board}-${classLevel}-${subject.name}`; 
  const staticList = STATIC_SYLLABUS[staticKey];
  if (staticList && staticList.length > 0) {
      const chapters: Chapter[] = staticList.map((title, idx) => ({
          id: `static-${idx + 1}`,
          title: title,
          description: `Chapter ${idx + 1}`
      }));
      chapterCache[cacheKey] = chapters;
      return chapters;
  }

  // Fallback AI for Chapters List
  // READ SETTINGS FOR MODEL
  let modelName = "gemini-2.5-flash";
  try {
      const s = localStorage.getItem('nst_system_settings');
      if (s) { const p = JSON.parse(s); if(p.aiModel) modelName = p.aiModel; }
  } catch(e){}

  const prompt = `List 15 standard chapters for Class ${classLevel} ${stream ? stream : ''} Subject: ${subject.name} (${board}). Return JSON array: [{"title": "...", "description": "..."}].`;
  try {
    const data = await executeWithRotation(async (ai) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || '[]'));
    });
    const chapters: Chapter[] = data.map((item: any, index: number) => ({
      id: `ch-${index + 1}`,
      title: item.title,
      description: item.description || ''
    }));
    chapterCache[cacheKey] = chapters;
    return chapters;
  } catch (error) {
    const data = [{id:'1', title: 'Chapter 1'}, {id:'2', title: 'Chapter 2'}];
    chapterCache[cacheKey] = data;
    return data;
  }
};

// --- MAIN CONTENT FUNCTION ---
export const fetchLessonContent = async (
  board: Board,
  classLevel: ClassLevel,
  stream: Stream | null,
  subject: Subject,
  chapter: Chapter,
  language: Language,
  type: ContentType,
  existingMCQCount: number = 0,
  isPremium: boolean = false,
  targetQuestions: number = 15
): Promise<LessonContent> => {
  
  // Get Settings for Custom Instruction & Model
  let customInstruction = "";
  let modelName = "gemini-2.5-flash";
  try {
      const stored = localStorage.getItem('nst_system_settings');
      if (stored) {
          const s = JSON.parse(stored) as SystemSettings;
          if (s.aiInstruction) customInstruction = `IMPORTANT INSTRUCTION: ${s.aiInstruction}`;
          if (s.aiModel) modelName = s.aiModel;
      }
  } catch(e) {}

  // 1. CHECK ADMIN DATABASE FIRST
  const adminContent = getAdminContent(board, classLevel, stream, subject, chapter.id, type);
  if (adminContent) {
      return {
          ...adminContent,
          title: chapter.title, 
      };
  }

  // 2. IF ADMIN CONTENT MISSING, HANDLE PDF TYPES (Don't generate fake PDF)
  if (type === 'PDF_FREE' || type === 'PDF_PREMIUM' || type === 'PDF_VIEWER') {
      return {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: "Content Unavailable",
          content: "",
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          isComingSoon: true // Trigger "Coming Soon" screen
      };
  }

  // 3. AI GENERATION (Fallback for Notes/MCQ only)
  
  // MCQ Mode
  if (type === 'MCQ_ANALYSIS' || type === 'MCQ_SIMPLE') {
      const prompt = `${customInstruction}
      Create ${targetQuestions} MCQs for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}". 
      Language: ${language}.
      Return valid JSON array: 
      [
        {
          "question": "Question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "Explanation here",
          "mnemonic": "Short memory trick",
          "concept": "Core concept"
        }
      ]`;

      const data = await executeWithRotation(async (ai) => {
          const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(cleanJson(response.text || '[]'));
      });

      return {
          id: Date.now().toString(),
          title: `MCQ Test: ${chapter.title}`,
          subtitle: `${data.length} Questions`,
          content: '',
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          mcqData: data
      };
  }

  // NOTES Mode
  const isDetailed = type === 'NOTES_PREMIUM';
  const prompt = `${customInstruction}
  Write detailed study notes for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}".
  Language: ${language}.
  Format: Markdown.
  Structure:
  1. Introduction
  2. Key Concepts (Bullet points)
  3. Detailed Explanations
  4. Important Formulas/Dates
  5. Summary
  ${isDetailed ? 'Include deep insights, memory tips, and exam strategies.' : 'Keep it concise and clear.'}`;

  const text = await executeWithRotation(async (ai) => {
      const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
      });
      return response.text || "Content generation failed.";
  });

  return {
      id: Date.now().toString(),
      title: chapter.title,
      subtitle: isDetailed ? "Premium Study Notes" : "Quick Revision Notes",
      content: text,
      type: type,
      dateCreated: new Date().toISOString(),
      subjectName: subject.name,
      isComingSoon: false
  };
};

export const generateTestPaper = async (
    topics: { subject: string, chapters: string[] }[],
    count: number,
    language: Language
): Promise<MCQItem[]> => {
    // Basic settings read for model
    let modelName = "gemini-2.5-flash";
    try {
      const s = localStorage.getItem('nst_system_settings');
      if (s) { const p = JSON.parse(s); if(p.aiModel) modelName = p.aiModel; }
    } catch(e){}

    const topicsStr = topics.map(t => `${t.subject}: [${t.chapters.join(', ')}]`).join('; ');
    const prompt = `Create Exam Paper with ${count} MCQs. Scope: ${topicsStr}. Lang: ${language}. Return JSON Array [{question, options[], correctAnswer(int)}]. No explanations.`;
    
    try {
        return await executeWithRotation(async (ai) => {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const rawData = JSON.parse(cleanJson(response.text || '[]'));
            return rawData.map((item: any) => ({
                question: item.question,
                options: item.options,
                correctAnswer: item.correctAnswer,
                explanation: "Refer to Key",
            }));
        });
    } catch (error) {
        return [];
    }
};

export const generateDevCode = async (userPrompt: string): Promise<string> => { return "// Dev Console Disabled"; };
