import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getDemoStudent, updateStudent, setClockOffset } from '@/lib/db';
import { CONCEPTS, MISCONCEPTIONS } from '@/types/database';

export async function GET() {
  try {
    const db = await getDatabase();
    const student = await getDemoStudent();

    return NextResponse.json({
      student,
      concepts: Object.values(CONCEPTS),
      misconceptionsMeta: Object.values(MISCONCEPTIONS),
      clockOffsetDays: db.clockOffsetDays || 0,
    });
  } catch (error: any) {
    console.error('Student API GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, days = 3, notes, revisitId, passed, studentId = 'demo_student' } = body;

    if (action === 'advance_clock') {
      const db = await getDatabase();
      const newOffset = (db.clockOffsetDays || 0) + Number(days);
      await setClockOffset(newOffset);
      const student = await getDemoStudent();
      return NextResponse.json({ clockOffsetDays: newOffset, student });
    }

    if (action === 'update_notes') {
      const student = await updateStudent(studentId, (s) => ({
        ...s,
        notes: notes || '',
      }));
      return NextResponse.json({ student });
    }

    if (action === 'resolve_retest') {
      const student = await updateStudent(studentId, (s) => {
        const queue = (s.revisitQueue || []).map((item) => {
          if (item.id === revisitId) {
            return { ...item, completed: true, score: passed ? 100 : 0 };
          }
          return item;
        });

        let misconceptions = [...s.misconceptions];
        if (!passed) {
          // Re-activate
          misconceptions = misconceptions.map((m) => {
            const targetItem = s.revisitQueue.find((r) => r.id === revisitId);
            if (targetItem && m.misconception_id === targetItem.misconception_id) {
              return { ...m, status: 'confirmed' as const };
            }
            return m;
          });
        }

        return {
          ...s,
          revisitQueue: queue,
          misconceptions,
        };
      });
      return NextResponse.json({ student });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Student API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
