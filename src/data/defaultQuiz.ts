import { QuizConfig } from '../types';

export const defaultQuiz: QuizConfig = {
  title: "Familjens Sommarquiz",
  password: "123",
  barnQuestions: [
    {
      id: "b1",
      text: "Vilken färg har en banan?",
      options: ["Röd", "Blå", "Gul", "Grön"],
      correctAnswer: 2
    },
    {
      id: "b2",
      text: "Vilket djur säger 'Muuuu'?",
      options: ["Häst", "Ko", "Hund", "Katt"],
      correctAnswer: 1
    },
    {
      id: "b3",
      text: "Hur många fingrar har en människa på en hand?",
      options: ["4", "5", "6", "10"],
      correctAnswer: 1
    }
  ],
  vuxenQuestions: [
    {
      id: "v1",
      text: "Vilken planet är känd som den röda planeten?",
      options: ["Venus", "Jupiter", "Mars", "Saturnus"],
      correctAnswer: 2
    },
    {
      id: "v2",
      text: "Vem skrev romanen 'Processen'?",
      options: ["August Strindberg", "Franz Kafka", "Ernest Hemingway", "Fyodor Dostoevsky"],
      correctAnswer: 1
    },
    {
      id: "v3",
      text: "Vad är huvudstaden i Kanada?",
      options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
      correctAnswer: 2
    }
  ]
};
