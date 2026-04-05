const lessons = [
  {
    id: 'math-addition-1-lesson-1',
    unitId: 'math-addition-1',
    order: 1,
    exercises: [
      {
        type: 'type-answer',
        equation: '1 + 0 = []',
        correctAnswer: 1,
      },
      {
        type: 'select-answer',
        equation: '0 + 1 = []',
        correctAnswer: 1,
        options: [0, 1, 2],
      },
      {
        type: 'type-answer',
        equation: '1 + 1 = []',
        correctAnswer: 2,
      },
      {
        type: 'follow-pattern',
        equation: '0 + 2 = []',
        correctAnswer: 2,
        options: [2, 3],
        pattern: [
          { expression: '0 + 0', result: 0 },
          { expression: '0 + 1', result: 1 },
          { expression: '0 + 2', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '2 + 1 = []',
        correctAnswer: 3,
        options: [2, 3, 4],
      },
      {
        type: 'type-answer',
        equation: '1 + 2 = []',
        correctAnswer: 3,
      },
      {
        type: 'follow-pattern',
        equation: '2 + 2 = []',
        correctAnswer: 4,
        options: [3, 4],
        pattern: [
          { expression: '0 + 2', result: 2 },
          { expression: '1 + 2', result: 3 },
          { expression: '2 + 2', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '0 + 3 = []',
        correctAnswer: 3,
        options: [2, 3, 4],
      },
      {
        type: 'type-answer',
        equation: '3 + 0 = []',
        correctAnswer: 3,
      },
      {
        type: 'follow-pattern',
        equation: '1 + 3 = []',
        correctAnswer: 4,
        options: [4, 5],
        pattern: [
          { expression: '1 + 1', result: 2 },
          { expression: '1 + 2', result: 3 },
          { expression: '1 + 3', result: null },
        ],
      },
    ],
  },
  {
    id: 'math-addition-1-lesson-2',
    unitId: 'math-addition-1',
    order: 2,
    exercises: [
      {
        type: 'select-answer',
        equation: '2 + 3 = []',
        correctAnswer: 5,
        options: [4, 5, 6],
      },
      {
        type: 'type-answer',
        equation: '3 + 2 = []',
        correctAnswer: 5,
      },
      {
        type: 'follow-pattern',
        equation: '3 + 3 = []',
        correctAnswer: 6,
        options: [5, 6],
        pattern: [
          { expression: '1 + 3', result: 4 },
          { expression: '2 + 3', result: 5 },
          { expression: '3 + 3', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '4 + 1 = []',
        correctAnswer: 5,
        options: [4, 5, 6],
      },
      {
        type: 'type-answer',
        equation: '1 + 4 = []',
        correctAnswer: 5,
      },
      {
        type: 'select-answer',
        equation: '4 + 2 = []',
        correctAnswer: 6,
        options: [5, 6, 7],
      },
      {
        type: 'follow-pattern',
        equation: '4 + 3 = []',
        correctAnswer: 7,
        options: [7, 6],
        pattern: [
          { expression: '4 + 1', result: 5 },
          { expression: '4 + 2', result: 6 },
          { expression: '4 + 3', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '3 + 4 = []',
        correctAnswer: 7,
      },
      {
        type: 'select-answer',
        equation: '2 + 4 = []',
        correctAnswer: 6,
        options: [5, 6, 8],
      },
      {
        type: 'follow-pattern',
        equation: '5 + 1 = []',
        correctAnswer: 6,
        options: [6, 7],
        pattern: [
          { expression: '3 + 1', result: 4 },
          { expression: '4 + 1', result: 5 },
          { expression: '5 + 1', result: null },
        ],
      },
    ],
  },
  {
    id: 'math-addition-1-lesson-3',
    unitId: 'math-addition-1',
    order: 3,
    exercises: [
      {
        type: 'type-answer',
        equation: '5 + 2 = []',
        correctAnswer: 7,
      },
      {
        type: 'select-answer',
        equation: '3 + 5 = []',
        correctAnswer: 8,
        options: [7, 8, 9],
      },
      {
        type: 'follow-pattern',
        equation: '5 + 3 = []',
        correctAnswer: 8,
        options: [8, 7],
        pattern: [
          { expression: '5 + 1', result: 6 },
          { expression: '5 + 2', result: 7 },
          { expression: '5 + 3', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '4 + 4 = []',
        correctAnswer: 8,
      },
      {
        type: 'select-answer',
        equation: '6 + 2 = []',
        correctAnswer: 8,
        options: [7, 8, 10],
      },
      {
        type: 'follow-pattern',
        equation: '6 + 3 = []',
        correctAnswer: 9,
        options: [9, 8],
        pattern: [
          { expression: '6 + 1', result: 7 },
          { expression: '6 + 2', result: 8 },
          { expression: '6 + 3', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '5 + 4 = []',
        correctAnswer: 9,
        options: [8, 9, 10],
      },
      {
        type: 'type-answer',
        equation: '4 + 5 = []',
        correctAnswer: 9,
      },
      {
        type: 'follow-pattern',
        equation: '2 + 6 = []',
        correctAnswer: 8,
        options: [8, 7],
        pattern: [
          { expression: '2 + 4', result: 6 },
          { expression: '2 + 5', result: 7 },
          { expression: '2 + 6', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '7 + 1 = []',
        correctAnswer: 8,
        options: [7, 8, 9],
      },
    ],
  },
  {
    id: 'math-addition-1-lesson-4',
    unitId: 'math-addition-1',
    order: 4,
    exercises: [
      {
        type: 'select-answer',
        equation: '7 + 2 = []',
        correctAnswer: 9,
        options: [8, 9, 10],
      },
      {
        type: 'type-answer',
        equation: '6 + 4 = []',
        correctAnswer: 10,
      },
      {
        type: 'follow-pattern',
        equation: '7 + 3 = []',
        correctAnswer: 10,
        options: [10, 9],
        pattern: [
          { expression: '7 + 1', result: 8 },
          { expression: '7 + 2', result: 9 },
          { expression: '7 + 3', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '5 + 5 = []',
        correctAnswer: 10,
        options: [9, 10, 8],
      },
      {
        type: 'type-answer',
        equation: '8 + 1 = []',
        correctAnswer: 9,
      },
      {
        type: 'follow-pattern',
        equation: '8 + 2 = []',
        correctAnswer: 10,
        options: [10, 9],
        pattern: [
          { expression: '6 + 2', result: 8 },
          { expression: '7 + 2', result: 9 },
          { expression: '8 + 2', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '4 + 6 = []',
        correctAnswer: 10,
        options: [9, 10, 8],
      },
      {
        type: 'type-answer',
        equation: '3 + 6 = []',
        correctAnswer: 9,
      },
      {
        type: 'select-answer',
        equation: '1 + 8 = []',
        correctAnswer: 9,
        options: [8, 9, 10],
      },
      {
        type: 'follow-pattern',
        equation: '3 + 7 = []',
        correctAnswer: 10,
        options: [10, 9],
        pattern: [
          { expression: '1 + 7', result: 8 },
          { expression: '2 + 7', result: 9 },
          { expression: '3 + 7', result: null },
        ],
      },
    ],
  },
  {
    id: 'math-addition-1-lesson-5',
    unitId: 'math-addition-1',
    order: 5,
    exercises: [
      {
        type: 'type-answer',
        equation: '9 + 1 = []',
        correctAnswer: 10,
      },
      {
        type: 'select-answer',
        equation: '1 + 9 = []',
        correctAnswer: 10,
        options: [8, 9, 10],
      },
      {
        type: 'follow-pattern',
        equation: '2 + 8 = []',
        correctAnswer: 10,
        options: [10, 9],
        pattern: [
          { expression: '2 + 6', result: 8 },
          { expression: '2 + 7', result: 9 },
          { expression: '2 + 8', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '8 + 2 = []',
        correctAnswer: 10,
      },
      {
        type: 'select-answer',
        equation: '6 + 3 = []',
        correctAnswer: 9,
        options: [8, 9, 10],
      },
      {
        type: 'follow-pattern',
        equation: '4 + 6 = []',
        correctAnswer: 10,
        options: [10, 8],
        pattern: [
          { expression: '2 + 6', result: 8 },
          { expression: '3 + 6', result: 9 },
          { expression: '4 + 6', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '7 + 3 = []',
        correctAnswer: 10,
        options: [9, 10, 8],
      },
      {
        type: 'type-answer',
        equation: '5 + 4 = []',
        correctAnswer: 9,
      },
      {
        type: 'follow-pattern',
        equation: '10 + 0 = []',
        correctAnswer: 10,
        options: [10, 9],
        pattern: [
          { expression: '8 + 0', result: 8 },
          { expression: '9 + 0', result: 9 },
          { expression: '10 + 0', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '6 + 4 = []',
        correctAnswer: 10,
        options: [8, 9, 10, 7],
      },
    ],
  },
];

export default lessons;
