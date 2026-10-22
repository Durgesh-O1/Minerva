import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { MISCONCEPTIONS, CONCEPTS, ConceptId, Student } from '@/types/database';
import { runSeed } from '@/scripts/seed';


export async function GET() {
  try {
    const db = await getDatabase();
    const students = db.students;
    const totalStudents = students.length;

    if (totalStudents === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 404 });
    }

    // 1. Overall stats
    const avgMastery = Math.round(
      students.reduce((acc, s) => acc + s.overallMastery, 0) / totalStudents
    );

    const activeStudents24h = students.filter(s => {
      const diffHours = (Date.now() - new Date(s.lastActive).getTime()) / (1000 * 60 * 60);
      return diffHours <= 24;
    }).length;

    let totalActiveMisconceptions = 0;
    students.forEach(s => {
      totalActiveMisconceptions += s.misconceptions.filter(m => m.status !== 'resolved').length;
    });

    // 2. Headline Misconception Breakdown
    const misconceptionStats = Object.keys(MISCONCEPTIONS).map((mId) => {
      const meta = MISCONCEPTIONS[mId];
      let activeCount = 0;
      let resolvedCount = 0;
      let totalStudentsImpacted = 0;

      students.forEach(s => {
        const matchingLogs = s.misconceptions.filter(m => m.misconception_id === mId);
        if (matchingLogs.length > 0) {
          totalStudentsImpacted += 1;
          const hasActive = matchingLogs.some(m => m.status === 'confirmed' || m.status === 'suspected');
          if (hasActive) {
            activeCount += 1;
          } else if (matchingLogs.some(m => m.status === 'resolved')) {
            resolvedCount += 1;
          }
        }
      });

      const percentage = Math.round((totalStudentsImpacted / totalStudents) * 100);

      return {
        id: mId,
        name: meta.name,
        description: meta.description,
        example: meta.example,
        remedyHint: meta.remedyHint,
        activeCount,
        resolvedCount,
        totalImpacted: totalStudentsImpacted,
        percentage,
      };
    }).sort((a, b) => b.totalImpacted - a.totalImpacted);

    // 3. Concept Heatmap Breakdown
    const conceptHeatmap = (Object.keys(CONCEPTS) as ConceptId[]).map((cId) => {
      const meta = CONCEPTS[cId];
      const masteries = students.map(s => s.masteryByConcept[cId] ?? 0);
      const avg = Math.round(masteries.reduce((a, b) => a + b, 0) / totalStudents);
      const below60 = masteries.filter(m => m < 60).length;
      const above80 = masteries.filter(m => m >= 80).length;

      let status: 'critical' | 'warning' | 'good' = 'good';
      if (avg < 50) status = 'critical';
      else if (avg < 70) status = 'warning';

      return {
        id: cId,
        name: meta.name,
        category: meta.category,
        prerequisites: meta.prerequisites,
        avgMastery: avg,
        below60Count: below60,
        above80Count: above80,
        status,
      };
    });

    // 4. At-Risk Students
    const atRiskStudents = students
      .map(s => {
        const activeCount = s.misconceptions.filter(m => m.status !== 'resolved').length;
        const confirmedM1 = s.misconceptions.some(m => m.misconception_id === 'M1' && m.status === 'confirmed');
        let riskScore = 0;
        if (s.overallMastery < 45) riskScore += 40;
        else if (s.overallMastery < 60) riskScore += 20;
        riskScore += activeCount * 15;
        if (confirmedM1) riskScore += 20;

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar,
          isDemoStudent: !!s.isDemoStudent,
          overallMastery: s.overallMastery,
          activeMisconceptionsCount: activeCount,
          activeMisconceptions: s.misconceptions
            .filter(m => m.status !== 'resolved')
            .map(m => ({
              id: m.misconception_id,
              name: MISCONCEPTIONS[m.misconception_id]?.name || m.misconception_id,
              status: m.status,
              confidence: m.confidence,
              evidence: m.evidence
            })),
          riskScore,
          lastActive: s.lastActive
        };
      })
      .filter(s => s.riskScore >= 35)
      .sort((a, b) => b.riskScore - a.riskScore);

    // 5. Actionable Recommendations
    const topMisconception = misconceptionStats[0];
    const weakestConcept = [...conceptHeatmap].sort((a, b) => a.avgMastery - b.avgMastery)[0];

    const recommendations = [
      {
        id: 'rec_1',
        priority: 'high',
        tag: 'Targeted Reteach',
        title: `Reteach "${weakestConcept.name}" to ${weakestConcept.below60Count} students`,
        detail: `The class bottleneck is currently at "${weakestConcept.name}" with an average mastery of only ${weakestConcept.avgMastery}%. ${weakestConcept.below60Count} students are scoring below 60%.`,
        actionLabel: 'Launch Guided Mini-Lesson',
        targetConcept: weakestConcept.id
      },
      {
        id: 'rec_2',
        priority: 'high',
        tag: 'Headline Gap',
        title: `Address ${topMisconception.id} (${topMisconception.name})`,
        detail: `${topMisconception.totalImpacted} of ${totalStudents} students (${topMisconception.percentage}%) exhibit this flaw. Tip: ${topMisconception.remedyHint}`,
        actionLabel: 'Assign Cognitive Conflict Worksheet',
        targetMisconception: topMisconception.id
      },
      {
        id: 'rec_3',
        priority: 'medium',
        tag: 'Spaced Retention',
        title: `${students.flatMap(s => s.revisitQueue).filter(r => !r.completed).length} spaced revisits scheduled`,
        detail: `Keep learned concepts fresh by checking in on students with upcoming 1, 3, and 7-day retests.`,
        actionLabel: 'Review Retention Queue'
      }
    ];

    return NextResponse.json({
      summary: {
        totalStudents,
        avgMastery,
        activeStudents24h,
        totalActiveMisconceptions,
        clockOffsetDays: db.clockOffsetDays,
        lastUpdated: db.lastUpdated,
      },
      misconceptionStats,
      conceptHeatmap,
      atRiskStudents,
      recommendations,
      students,
    });
  } catch (error) {
    console.error('Teacher API GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher dashboard data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'reset') {
      runSeed();
      return NextResponse.json({ success: true, message: 'Database reset to default seed state' });
    }

    if (action === 'advance_clock') {
      const days = Number(body.days) || 1;
      const db = await getDatabase();
      db.clockOffsetDays = (db.clockOffsetDays || 0) + days;
      await saveDatabase(db);
      return NextResponse.json({ 
        success: true, 
        clockOffsetDays: db.clockOffsetDays,
        message: `Advanced clock by ${days} day(s). Total offset: ${db.clockOffsetDays} days.` 
      });
    }

    if (action === 'add_student_note') {
      const { studentId, note } = body;
      const db = await getDatabase();
      const student = db.students.find(s => s.id === studentId);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      student.notes = note;
      await saveDatabase(db);
      return NextResponse.json({ success: true, student });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Teacher API POST Error:', error);
    return NextResponse.json({ error: 'Failed to execute teacher action' }, { status: 500 });
  }
}
