import { askTutorGrok } from '../lib/grok';

async function testQuestions() {
  const questions = [
    'What is photosynthesis?',
    'Explain Pythagoras theorem',
    'What is gravity?',
    'What is 1/2 + 1/3? I think it is 2/5',
  ];

  for (const q of questions) {
    console.log(`\n========================================`);
    console.log(`TESTING QUESTION: "${q}"`);
    console.log(`========================================`);
    const start = Date.now();
    try {
      const response = await askTutorGrok([{ role: 'user', content: q }]);
      console.log(`Response time: ${Date.now() - start}ms`);
      console.log(`REPLY:\n${response.reply}`);
      console.log(`DIAGNOSIS:`, JSON.stringify(response.diagnosis, null, 2));
      console.log(`CONCEPTS:`, response.related_concepts);
    } catch (err: any) {
      console.error(`ERROR:`, err.message);
    }
  }
}

testQuestions();
