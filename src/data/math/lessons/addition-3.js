const lessons = [
  {
    id: 'math-addition-3-lesson-1',
    unitId: 'math-addition-3',
    order: 1,
    exercises: [
      {
        type: 'select-answer',
        equation: '20 + 30 = []',
        correctAnswer: 50,
        options: [48, 50, 52],
      },
      {
        type: 'type-answer',
        equation: '[] = 25 + 28',
        correctAnswer: 53,
      },
      {
        type: 'follow-pattern',
        equation: '22 + 30 = []',
        correctAnswer: 52,
        options: [52, 51],
        pattern: [
          { expression: '20 + 30', result: 50 },
          { expression: '21 + 30', result: 51 },
          { expression: '22 + 30', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '30 + 25 = []',
        correctAnswer: 55,
        options: [53, 55, 57],
      },
      {
        type: 'type-answer',
        equation: '[] = 20 + 35',
        correctAnswer: 55,
      },
      {
        type: 'follow-pattern',
        equation: '24 + 38 = []',
        correctAnswer: 62,
        options: [62, 61],
        pattern: [
          { expression: '22 + 38', result: 60 },
          { expression: '23 + 38', result: 61 },
          { expression: '24 + 38', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '28 + 32 = []',
        correctAnswer: 60,
        options: [58, 60, 62],
      },
      {
        type: 'type-answer',
        equation: '[] = 31 + 30',
        correctAnswer: 61,
      },
      {
        type: 'follow-pattern',
        equation: '27 + 36 = []',
        correctAnswer: 63,
        options: [63, 62],
        pattern: [
          { expression: '25 + 36', result: 61 },
          { expression: '26 + 36', result: 62 },
          { expression: '27 + 36', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 33 + 29',
        correctAnswer: 62,
      },
    ],
  },
  {
    id: 'math-addition-3-lesson-2',
    unitId: 'math-addition-3',
    order: 2,
    exercises: [
      {
        type: 'type-answer',
        equation: '[] = 30 + 32',
        correctAnswer: 62,
      },
      {
        type: 'select-answer',
        equation: '35 + 30 = []',
        correctAnswer: 65,
        options: [63, 65, 67],
      },
      {
        type: 'follow-pattern',
        equation: '32 + 35 = []',
        correctAnswer: 67,
        options: [67, 66],
        pattern: [
          { expression: '30 + 35', result: 65 },
          { expression: '31 + 35', result: 66 },
          { expression: '32 + 35', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 28 + 40',
        correctAnswer: 68,
      },
      {
        type: 'select-answer',
        equation: '34 + 36 = []',
        correctAnswer: 70,
        options: [68, 70, 72],
      },
      {
        type: 'follow-pattern',
        equation: '38 + 33 = []',
        correctAnswer: 71,
        options: [71, 70],
        pattern: [
          { expression: '36 + 33', result: 69 },
          { expression: '37 + 33', result: 70 },
          { expression: '38 + 33', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '40 + 30 = []',
        correctAnswer: 70,
        options: [68, 70, 72],
      },
      {
        type: 'type-answer',
        equation: '[] = 36 + 36',
        correctAnswer: 72,
      },
      {
        type: 'follow-pattern',
        equation: '37 + 35 = []',
        correctAnswer: 72,
        options: [72, 71],
        pattern: [
          { expression: '35 + 35', result: 70 },
          { expression: '36 + 35', result: 71 },
          { expression: '37 + 35', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 42 + 30',
        correctAnswer: 72,
      },
    ],
  },
  {
    id: 'math-addition-3-lesson-3',
    unitId: 'math-addition-3',
    order: 3,
    exercises: [
      {
        type: 'select-answer',
        equation: '35 + 40 = []',
        correctAnswer: 75,
        options: [73, 75, 77],
      },
      {
        type: 'type-answer',
        equation: '[] = 38 + 38',
        correctAnswer: 76,
      },
      {
        type: 'follow-pattern',
        equation: '40 + 38 = []',
        correctAnswer: 78,
        options: [78, 77],
        pattern: [
          { expression: '38 + 38', result: 76 },
          { expression: '39 + 38', result: 77 },
          { expression: '40 + 38', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 42 + 36',
        correctAnswer: 78,
      },
      {
        type: 'select-answer',
        equation: '40 + 40 = []',
        correctAnswer: 80,
        options: [78, 80, 82],
      },
      {
        type: 'follow-pattern',
        equation: '42 + 40 = []',
        correctAnswer: 82,
        options: [82, 81],
        pattern: [
          { expression: '40 + 40', result: 80 },
          { expression: '41 + 40', result: 81 },
          { expression: '42 + 40', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '45 + 38 = []',
        correctAnswer: 83,
        options: [81, 83, 85],
      },
      {
        type: 'type-answer',
        equation: '[] = 44 + 40',
        correctAnswer: 84,
      },
      {
        type: 'follow-pattern',
        equation: '44 + 41 = []',
        correctAnswer: 85,
        options: [85, 84],
        pattern: [
          { expression: '42 + 41', result: 83 },
          { expression: '43 + 41', result: 84 },
          { expression: '44 + 41', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 46 + 39',
        correctAnswer: 85,
      },
    ],
  },
  {
    id: 'math-addition-3-lesson-4',
    unitId: 'math-addition-3',
    order: 4,
    exercises: [
      {
        type: 'type-answer',
        equation: '[] = 42 + 43',
        correctAnswer: 85,
      },
      {
        type: 'select-answer',
        equation: '45 + 40 = []',
        correctAnswer: 85,
        options: [83, 85, 87],
      },
      {
        type: 'follow-pattern',
        equation: '46 + 42 = []',
        correctAnswer: 88,
        options: [88, 87],
        pattern: [
          { expression: '44 + 42', result: 86 },
          { expression: '45 + 42', result: 87 },
          { expression: '46 + 42', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '50 + 40 = []',
        correctAnswer: 90,
        options: [88, 90, 92],
      },
      {
        type: 'type-answer',
        equation: '[] = 48 + 42',
        correctAnswer: 90,
      },
      {
        type: 'follow-pattern',
        equation: '50 + 42 = []',
        correctAnswer: 92,
        options: [92, 91],
        pattern: [
          { expression: '50 + 40', result: 90 },
          { expression: '50 + 41', result: 91 },
          { expression: '50 + 42', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '52 + 40 = []',
        correctAnswer: 92,
        options: [90, 92, 94],
      },
      {
        type: 'type-answer',
        equation: '[] = 46 + 47',
        correctAnswer: 93,
      },
      {
        type: 'follow-pattern',
        equation: '52 + 43 = []',
        correctAnswer: 95,
        options: [95, 94],
        pattern: [
          { expression: '50 + 43', result: 93 },
          { expression: '51 + 43', result: 94 },
          { expression: '52 + 43', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 50 + 45',
        correctAnswer: 95,
      },
    ],
  },
  {
    id: 'math-addition-3-lesson-5',
    unitId: 'math-addition-3',
    order: 5,
    exercises: [
      {
        type: 'select-answer',
        equation: '50 + 42 = []',
        correctAnswer: 92,
        options: [90, 92, 94],
      },
      {
        type: 'type-answer',
        equation: '[] = 48 + 46',
        correctAnswer: 94,
      },
      {
        type: 'follow-pattern',
        equation: '52 + 44 = []',
        correctAnswer: 96,
        options: [96, 95],
        pattern: [
          { expression: '50 + 44', result: 94 },
          { expression: '51 + 44', result: 95 },
          { expression: '52 + 44', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '55 + 40 = []',
        correctAnswer: 95,
        options: [93, 95, 97],
      },
      {
        type: 'type-answer',
        equation: '[] = 53 + 44',
        correctAnswer: 97,
      },
      {
        type: 'follow-pattern',
        equation: '54 + 44 = []',
        correctAnswer: 98,
        options: [98, 97],
        pattern: [
          { expression: '52 + 44', result: 96 },
          { expression: '53 + 44', result: 97 },
          { expression: '54 + 44', result: null },
        ],
      },
      {
        type: 'select-answer',
        equation: '55 + 43 = []',
        correctAnswer: 98,
        options: [96, 98, 100],
      },
      {
        type: 'type-answer',
        equation: '[] = 50 + 49',
        correctAnswer: 99,
      },
      {
        type: 'follow-pattern',
        equation: '56 + 44 = []',
        correctAnswer: 100,
        options: [100, 99],
        pattern: [
          { expression: '54 + 44', result: 98 },
          { expression: '55 + 44', result: 99 },
          { expression: '56 + 44', result: null },
        ],
      },
      {
        type: 'type-answer',
        equation: '[] = 60 + 40',
        correctAnswer: 100,
      },
    ],
  },
];

export default lessons;
