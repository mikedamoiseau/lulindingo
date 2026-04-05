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
      },
      {
        type: 'type-answer',
        equation: '[] = 1 + 0',
        correctAnswer: 1,
      },
      {
        type: 'follow-pattern',
        equation: '5 + 2 = []',
        correctAnswer: 7,
        options: [7, 4],
        pattern: [
          { expression: '3 + 2', result: 5 },
          { expression: '4 + 2', result: 6 },
          { expression: '5 + 2', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '3 + 4 = []',
        correctAnswer: 7,
        options: [6, 7, 8],
      },
      {
        type: 'type-answer',
        equation: '[] = 2 + 3',
        correctAnswer: 5,
      },
      {
        type: 'follow-pattern',
        equation: '4 + 3 = []',
        correctAnswer: 7,
        options: [7, 6],
        pattern: [
          { expression: '2 + 3', result: 5 },
          { expression: '3 + 3', result: 6 },
          { expression: '4 + 3', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '5 + 3 = []',
        correctAnswer: 8,
        options: [7, 8, 9],
      },
      {
        type: 'type-answer',
        equation: '[] = 4 + 4',
        correctAnswer: 8,
      },
      {
        type: 'select-answer',
        equation: '2 + 6 = []',
        correctAnswer: 8,
        options: [6, 8, 10],
      },
      {
        type: 'type-answer',
        equation: '[] = 3 + 5',
        correctAnswer: 8,
      },
    ],
  },
];

export default lessons;
