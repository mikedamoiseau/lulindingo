const lessons = [
  {
    id: 'math-subtraction-1-lesson-1',
    unitId: 'math-subtraction-1',
    order: 1,
    exercises: [
      {
        type: 'type-answer',
        equation: '1 - 0 = []',
        correctAnswer: 1,
      },
      {
        type: 'select-answer',
        equation: '1 - 1 = []',
        correctAnswer: 0,
        options: [0, 1, 2],
      },
      {
        type: 'type-answer',
        equation: '[] = 2 - 1',
        correctAnswer: 1,
      },
      {
        type: 'follow-pattern',
        equation: '3 - 1 = []',
        correctAnswer: 2,
        options: [2, 3],
        pattern: [
          { expression: '1 - 1', result: 0 },
          { expression: '2 - 1', result: 1 },
          { expression: '3 - 1', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '2 - 0 = []',
        correctAnswer: 2,
        options: [0, 1, 2],
      },
      {
        type: 'type-answer',
        equation: '[] = 3 - 2',
        correctAnswer: 1,
      },
      {
        type: 'select-answer',
        equation: '3 - 3 = []',
        correctAnswer: 0,
        options: [0, 1, 3],
      },
      {
        type: 'follow-pattern',
        equation: '3 - 2 = []',
        correctAnswer: 1,
        options: [1, 2],
        pattern: [
          { expression: '3 - 0', result: 3 },
          { expression: '3 - 1', result: 2 },
          { expression: '3 - 2', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '2 - 2 = []',
        correctAnswer: 0,
      },
      {
        type: 'select-answer',
        equation: '3 - 0 = []',
        correctAnswer: 3,
        options: [1, 2, 3],
      },
    ],
  },
  {
    id: 'math-subtraction-1-lesson-2',
    unitId: 'math-subtraction-1',
    order: 2,
    exercises: [
      {
        type: 'select-answer',
        equation: '4 - 1 = []',
        correctAnswer: 3,
        options: [2, 3, 4],
      },
      {
        type: 'type-answer',
        equation: '[] = 4 - 2',
        correctAnswer: 2,
      },
      {
        type: 'follow-pattern',
        equation: '5 - 3 = []',
        correctAnswer: 2,
        options: [2, 3],
        pattern: [
          { expression: '5 - 1', result: 4 },
          { expression: '5 - 2', result: 3 },
          { expression: '5 - 3', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '5 - 4 = []',
        correctAnswer: 1,
        options: [0, 1, 2],
      },
      {
        type: 'type-answer',
        equation: '4 - 3 = []',
        correctAnswer: 1,
      },
      {
        type: 'select-answer',
        equation: '5 - 2 = []',
        correctAnswer: 3,
        options: [2, 3, 5],
      },
      {
        type: 'follow-pattern',
        equation: '4 - 2 = []',
        correctAnswer: 2,
        options: [2, 1],
        pattern: [
          { expression: '2 - 2', result: 0 },
          { expression: '3 - 2', result: 1 },
          { expression: '4 - 2', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 5 - 5',
        correctAnswer: 0,
      },
      {
        type: 'select-answer',
        equation: '4 - 0 = []',
        correctAnswer: 4,
        options: [2, 3, 4],
      },
      {
        type: 'type-answer',
        equation: '5 - 1 = []',
        correctAnswer: 4,
      },
    ],
  },
  {
    id: 'math-subtraction-1-lesson-3',
    unitId: 'math-subtraction-1',
    order: 3,
    exercises: [
      {
        type: 'type-answer',
        equation: '6 - 3 = []',
        correctAnswer: 3,
      },
      {
        type: 'select-answer',
        equation: '7 - 4 = []',
        correctAnswer: 3,
        options: [2, 3, 4],
      },
      {
        type: 'follow-pattern',
        equation: '6 - 2 = []',
        correctAnswer: 4,
        options: [4, 3],
        pattern: [
          { expression: '4 - 2', result: 2 },
          { expression: '5 - 2', result: 3 },
          { expression: '6 - 2', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 7 - 5',
        correctAnswer: 2,
      },
      {
        type: 'select-answer',
        equation: '6 - 1 = []',
        correctAnswer: 5,
        options: [4, 5, 7],
      },
      {
        type: 'type-answer',
        equation: '7 - 7 = []',
        correctAnswer: 0,
      },
      {
        type: 'follow-pattern',
        equation: '7 - 3 = []',
        correctAnswer: 4,
        options: [4, 5],
        pattern: [
          { expression: '7 - 1', result: 6 },
          { expression: '7 - 2', result: 5 },
          { expression: '7 - 3', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '6 - 4 = []',
        correctAnswer: 2,
        options: [1, 2, 3],
      },
      {
        type: 'type-answer',
        equation: '[] = 7 - 6',
        correctAnswer: 1,
      },
      {
        type: 'select-answer',
        equation: '6 - 5 = []',
        correctAnswer: 1,
        options: [0, 1, 2],
      },
    ],
  },
  {
    id: 'math-subtraction-1-lesson-4',
    unitId: 'math-subtraction-1',
    order: 4,
    exercises: [
      {
        type: 'select-answer',
        equation: '8 - 3 = []',
        correctAnswer: 5,
        options: [4, 5, 6],
      },
      {
        type: 'type-answer',
        equation: '[] = 9 - 4',
        correctAnswer: 5,
      },
      {
        type: 'follow-pattern',
        equation: '8 - 5 = []',
        correctAnswer: 3,
        options: [3, 4],
        pattern: [
          { expression: '8 - 3', result: 5 },
          { expression: '8 - 4', result: 4 },
          { expression: '8 - 5', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '9 - 6 = []',
        correctAnswer: 3,
        options: [2, 3, 4],
      },
      {
        type: 'type-answer',
        equation: '8 - 2 = []',
        correctAnswer: 6,
      },
      {
        type: 'select-answer',
        equation: '9 - 7 = []',
        correctAnswer: 2,
        options: [1, 2, 3],
      },
      {
        type: 'follow-pattern',
        equation: '9 - 3 = []',
        correctAnswer: 6,
        options: [6, 5],
        pattern: [
          { expression: '9 - 1', result: 8 },
          { expression: '9 - 2', result: 7 },
          { expression: '9 - 3', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 8 - 8',
        correctAnswer: 0,
      },
      {
        type: 'select-answer',
        equation: '9 - 5 = []',
        correctAnswer: 4,
        options: [3, 4, 5],
      },
      {
        type: 'type-answer',
        equation: '8 - 1 = []',
        correctAnswer: 7,
      },
    ],
  },
  {
    id: 'math-subtraction-1-lesson-5',
    unitId: 'math-subtraction-1',
    order: 5,
    exercises: [
      {
        type: 'type-answer',
        equation: '10 - 3 = []',
        correctAnswer: 7,
      },
      {
        type: 'select-answer',
        equation: '10 - 7 = []',
        correctAnswer: 3,
        options: [2, 3, 4],
      },
      {
        type: 'follow-pattern',
        equation: '10 - 5 = []',
        correctAnswer: 5,
        options: [5, 4],
        pattern: [
          { expression: '10 - 3', result: 7 },
          { expression: '10 - 4', result: 6 },
          { expression: '10 - 5', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '10 - 2 = []',
        correctAnswer: 8,
        options: [7, 8, 9],
      },
      {
        type: 'type-answer',
        equation: '[] = 10 - 9',
        correctAnswer: 1,
      },
      {
        type: 'select-answer',
        equation: '9 - 1 = []',
        correctAnswer: 8,
        options: [7, 8, 10],
      },
      {
        type: 'follow-pattern',
        equation: '10 - 8 = []',
        correctAnswer: 2,
        options: [2, 3],
        pattern: [
          { expression: '10 - 6', result: 4 },
          { expression: '10 - 7', result: 3 },
          { expression: '10 - 8', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '10 - 10 = []',
        correctAnswer: 0,
      },
      {
        type: 'select-answer',
        equation: '10 - 4 = []',
        correctAnswer: 6,
        options: [5, 6, 7],
      },
      {
        type: 'type-answer',
        equation: '[] = 10 - 1',
        correctAnswer: 9,
      },
    ],
  },
];

export default lessons;
