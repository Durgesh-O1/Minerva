import { NextRequest, NextResponse } from 'next/server';
import { askTutorGrok } from '@/lib/grok';
import { logMisconception } from '@/lib/db';
import { ConceptId } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, studentId = 'demo_student', notes } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Call Grok with fallback
    const tutorResponse = await askTutorGrok(messages, notes, studentId);

    // Save diagnosis to student misconception log in db.json if diagnosis is meaningful
    if (tutorResponse.diagnosis && tutorResponse.diagnosis.misconception_id !== 'none') {
      try {
        await logMisconception(studentId, {
          misconception_id: tutorResponse.diagnosis.misconception_id,
          concept_id: (tutorResponse.related_concepts[0] as ConceptId) || 'adding_fractions',
          status: tutorResponse.diagnosis.status,
          confidence: tutorResponse.diagnosis.confidence,
          evidence: tutorResponse.diagnosis.evidence,
          problem: 'What is 1/2 + 1/3?',
        });
      } catch (dbError) {
        console.error('Failed to log misconception to db.json:', dbError);
      }
    }

    return NextResponse.json(tutorResponse);
  } catch (error: any) {
    console.error('Tutor API Error:', error);
    return NextResponse.json({
      reply: "Let's take a closer look at this together. Could you tell me how you are thinking about this fraction problem?",
      diagnosis: {
        misconception_id: 'unknown',
        confidence: 0.5,
        evidence: 'Error handling fallback',
        status: 'suspected'
      },
      hint_level: 0,
      related_concepts: ['common_denominators'],
      understood: false
    });
  }
}
