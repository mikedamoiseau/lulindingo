const lessons = [
  {
    id: 'math-addition-1-lesson-1',
    unitId: 'math-addition-1',
    order: 1,
    exercises: [
      {
        type: 'select-answer',
        equation: '1 + 1 = []',
        correctAnswer: 2,
        options: [0, 2, 5],
        instruction: 'Select the answer',
      },
      {
        type: 'type-answer',
        equation: '[] = 1 + 0',
        correctAnswer: 1,
        instruction: 'Type the answer',
      },
    ],
  },
];

export default lessons;
