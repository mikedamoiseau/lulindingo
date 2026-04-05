const lessons = [
  {
    id: 'math-addition-2-lesson-1',
    unitId: 'math-addition-2',
    order: 1,
    exercises: [
      {
        type: 'select-answer',
        equation: '10 + 5 = []',
        correctAnswer: 15,
        options: [13, 15, 16],
      },
      {
        type: 'type-answer',
        equation: '[] = 10 + 2',
        correctAnswer: 12,
      },
      {
        type: 'follow-pattern',
        equation: '10 + 4 = []',
        correctAnswer: 14,
        options: [14, 13],
        pattern: [
          { expression: '10 + 2', result: 12 },
          { expression: '10 + 3', result: 13 },
          { expression: '10 + 4', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '11 + 3 = []',
        correctAnswer: 14,
        options: [13, 14, 15],
      },
      {
        type: 'type-answer',
        equation: '[] = 12 + 3',
        correctAnswer: 15,
      },
      {
        type: 'follow-pattern',
        equation: '12 + 5 = []',
        correctAnswer: 17,
        options: [17, 16],
        pattern: [
          { expression: '10 + 5', result: 15 },
          { expression: '11 + 5', result: 16 },
          { expression: '12 + 5', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '10 + 8 = []',
        correctAnswer: 18,
        options: [17, 18, 20],
      },
      {
        type: 'type-answer',
        equation: '[] = 11 + 5',
        correctAnswer: 16,
      },
      {
        type: 'follow-pattern',
        equation: '13 + 2 = []',
        correctAnswer: 15,
        options: [15, 14],
        pattern: [
          { expression: '11 + 2', result: 13 },
          { expression: '12 + 2', result: 14 },
          { expression: '13 + 2', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 10 + 7',
        correctAnswer: 17,
      },
    ],
  },
  {
    id: 'math-addition-2-lesson-2',
    unitId: 'math-addition-2',
    order: 2,
    exercises: [
      {
        type: 'type-answer',
        equation: '[] = 14 + 3',
        correctAnswer: 17,
      },
      {
        type: 'select-answer',
        equation: '12 + 6 = []',
        correctAnswer: 18,
        options: [17, 18, 19],
      },
      {
        type: 'follow-pattern',
        equation: '13 + 5 = []',
        correctAnswer: 18,
        options: [18, 17],
        pattern: [
          { expression: '11 + 5', result: 16 },
          { expression: '12 + 5', result: 17 },
          { expression: '13 + 5', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 11 + 8',
        correctAnswer: 19,
      },
      {
        type: 'select-answer',
        equation: '15 + 4 = []',
        correctAnswer: 19,
        options: [18, 19, 21],
      },
      {
        type: 'follow-pattern',
        equation: '14 + 6 = []',
        correctAnswer: 20,
        options: [20, 19],
        pattern: [
          { expression: '12 + 6', result: 18 },
          { expression: '13 + 6', result: 19 },
          { expression: '14 + 6', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '13 + 4 = []',
        correctAnswer: 17,
        options: [16, 17, 19],
      },
      {
        type: 'type-answer',
        equation: '[] = 15 + 5',
        correctAnswer: 20,
      },
      {
        type: 'follow-pattern',
        equation: '11 + 7 = []',
        correctAnswer: 18,
        options: [18, 17],
        pattern: [
          { expression: '10 + 6', result: 16 },
          { expression: '10 + 7', result: 17 },
          { expression: '11 + 7', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 12 + 8',
        correctAnswer: 20,
      },
    ],
  },
  {
    id: 'math-addition-2-lesson-3',
    unitId: 'math-addition-2',
    order: 3,
    exercises: [
      {
        type: 'select-answer',
        equation: '15 + 10 = []',
        correctAnswer: 25,
        options: [24, 25, 26],
      },
      {
        type: 'type-answer',
        equation: '[] = 18 + 5',
        correctAnswer: 23,
      },
      {
        type: 'follow-pattern',
        equation: '16 + 8 = []',
        correctAnswer: 24,
        options: [24, 23],
        pattern: [
          { expression: '14 + 8', result: 22 },
          { expression: '15 + 8', result: 23 },
          { expression: '16 + 8', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 17 + 6',
        correctAnswer: 23,
      },
      {
        type: 'select-answer',
        equation: '14 + 9 = []',
        correctAnswer: 23,
        options: [22, 23, 25],
      },
      {
        type: 'follow-pattern',
        equation: '20 + 10 = []',
        correctAnswer: 30,
        options: [30, 29],
        pattern: [
          { expression: '10 + 10', result: 20 },
          { expression: '15 + 10', result: 25 },
          { expression: '20 + 10', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '16 + 7 = []',
        correctAnswer: 23,
        options: [22, 23, 24],
      },
      {
        type: 'type-answer',
        equation: '[] = 19 + 6',
        correctAnswer: 25,
      },
      {
        type: 'follow-pattern',
        equation: '13 + 12 = []',
        correctAnswer: 25,
        options: [25, 24],
        pattern: [
          { expression: '11 + 12', result: 23 },
          { expression: '12 + 12', result: 24 },
          { expression: '13 + 12', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 18 + 7',
        correctAnswer: 25,
      },
    ],
  },
  {
    id: 'math-addition-2-lesson-4',
    unitId: 'math-addition-2',
    order: 4,
    exercises: [
      {
        type: 'type-answer',
        equation: '[] = 20 + 15',
        correctAnswer: 35,
      },
      {
        type: 'select-answer',
        equation: '22 + 8 = []',
        correctAnswer: 30,
        options: [29, 30, 32],
      },
      {
        type: 'follow-pattern',
        equation: '18 + 12 = []',
        correctAnswer: 30,
        options: [30, 28],
        pattern: [
          { expression: '16 + 12', result: 28 },
          { expression: '17 + 12', result: 29 },
          { expression: '18 + 12', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '19 + 11 = []',
        correctAnswer: 30,
        options: [29, 30, 31],
      },
      {
        type: 'type-answer',
        equation: '[] = 24 + 6',
        correctAnswer: 30,
      },
      {
        type: 'follow-pattern',
        equation: '25 + 10 = []',
        correctAnswer: 35,
        options: [35, 34],
        pattern: [
          { expression: '15 + 10', result: 25 },
          { expression: '20 + 10', result: 30 },
          { expression: '25 + 10', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '17 + 13 = []',
        correctAnswer: 30,
        options: [29, 30, 31],
      },
      {
        type: 'type-answer',
        equation: '[] = 21 + 14',
        correctAnswer: 35,
      },
      {
        type: 'follow-pattern',
        equation: '23 + 12 = []',
        correctAnswer: 35,
        options: [35, 33],
        pattern: [
          { expression: '21 + 12', result: 33 },
          { expression: '22 + 12', result: 34 },
          { expression: '23 + 12', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 16 + 14',
        correctAnswer: 30,
      },
    ],
  },
  {
    id: 'math-addition-2-lesson-5',
    unitId: 'math-addition-2',
    order: 5,
    exercises: [
      {
        type: 'select-answer',
        equation: '25 + 15 = []',
        correctAnswer: 40,
        options: [38, 40, 42],
      },
      {
        type: 'type-answer',
        equation: '[] = 22 + 18',
        correctAnswer: 40,
      },
      {
        type: 'follow-pattern',
        equation: '25 + 20 = []',
        correctAnswer: 45,
        options: [45, 43],
        pattern: [
          { expression: '25 + 10', result: 35 },
          { expression: '25 + 15', result: 40 },
          { expression: '25 + 20', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '20 + 25 = []',
        correctAnswer: 45,
        options: [43, 45, 46],
      },
      {
        type: 'type-answer',
        equation: '[] = 25 + 25',
        correctAnswer: 50,
      },
      {
        type: 'follow-pattern',
        equation: '24 + 16 = []',
        correctAnswer: 40,
        options: [40, 38],
        pattern: [
          { expression: '22 + 16', result: 38 },
          { expression: '23 + 16', result: 39 },
          { expression: '24 + 16', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '30 + 20 = []',
        correctAnswer: 50,
        options: [48, 50, 52],
      },
      {
        type: 'type-answer',
        equation: '[] = 23 + 17',
        correctAnswer: 40,
      },
      {
        type: 'follow-pattern',
        equation: '21 + 19 = []',
        correctAnswer: 40,
        options: [40, 39],
        pattern: [
          { expression: '19 + 19', result: 38 },
          { expression: '20 + 19', result: 39 },
          { expression: '21 + 19', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 28 + 22',
        correctAnswer: 50,
      },
    ],
  },
];

export default lessons;
