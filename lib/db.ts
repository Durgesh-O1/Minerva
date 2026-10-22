import fs from 'fs/promises';
import path from 'path';
import { DatabaseSchema, Student, MisconceptionLogEntry, RevisitScheduleItem } from '@/types/database';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export async function getDatabase(): Promise<DatabaseSchema> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (error) {
    console.warn('Database file not found or corrupted, returning empty schema or fallback', error);
    // If not found, create directory and return seeded default if possible
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    throw error;
  }
}

export async function saveDatabase(data: DatabaseSchema): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  data.lastUpdated = new Date().toISOString();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getAllStudents(): Promise<Student[]> {
  const db = await getDatabase();
  return db.students;
}

export async function getStudentById(id: string): Promise<Student | null> {
  const db = await getDatabase();
  return db.students.find(s => s.id === id) || null;
}

export async function getDemoStudent(): Promise<Student | null> {
  const db = await getDatabase();
  return db.students.find(s => s.isDemoStudent) || db.students[0] || null;
}

export async function updateStudent(id: string, updateFn: (s: Student) => Student): Promise<Student | null> {
  const db = await getDatabase();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return null;

  db.students[idx] = updateFn(db.students[idx]);
  await saveDatabase(db);
  return db.students[idx];
}

export async function logMisconception(
  studentId: string, 
  log: Omit<MisconceptionLogEntry, 'id' | 'timestamp'>
): Promise<Student | null> {
  return updateStudent(studentId, (student) => {
    const newEntry: MisconceptionLogEntry = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    
    // Update or append
    const existingIdx = student.misconceptions.findIndex(
      m => m.misconception_id === log.misconception_id && m.status !== 'resolved'
    );

    let updatedMisconceptions = [...student.misconceptions];
    if (existingIdx >= 0) {
      updatedMisconceptions[existingIdx] = newEntry;
    } else {
      updatedMisconceptions.unshift(newEntry);
    }

    // Schedule revisit if resolved
    let revisitQueue = [...student.revisitQueue];
    if (log.status === 'resolved') {
      const now = new Date();
      const intervals: (1 | 3 | 7)[] = [1, 3, 7];
      intervals.forEach(days => {
        const dueDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        revisitQueue.push({
          id: `rev_${Date.now()}_${days}d`,
          misconception_id: log.misconception_id,
          intervalDays: days,
          dueDate,
          completed: false,
        });
      });
    }

    return {
      ...student,
      misconceptions: updatedMisconceptions,
      revisitQueue,
      lastActive: new Date().toISOString()
    };
  });
}

export async function setClockOffset(days: number): Promise<number> {
  const db = await getDatabase();
  db.clockOffsetDays = days;
  await saveDatabase(db);
  return db.clockOffsetDays;
}
