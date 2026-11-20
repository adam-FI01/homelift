import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then((m) => m.Home), title: 'HomeLift' },
  {
    path: 'exercises',
    loadComponent: () => import('./exercises/exercise-list').then((m) => m.ExerciseList),
    title: 'Exercises · HomeLift',
  },
  {
    path: 'exercises/new',
    loadComponent: () => import('./exercises/exercise-form').then((m) => m.ExerciseForm),
    title: 'New exercise · HomeLift',
  },
  {
    path: 'exercises/:id',
    loadComponent: () => import('./history/exercise-progress').then((m) => m.ExerciseProgress),
    title: 'Progress · HomeLift',
  },
  {
    path: 'exercises/:id/edit',
    loadComponent: () => import('./exercises/exercise-form').then((m) => m.ExerciseForm),
    title: 'Edit exercise · HomeLift',
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history-page').then((m) => m.HistoryPage),
    title: 'History · HomeLift',
  },
  {
    path: 'workout',
    loadComponent: () => import('./workout/workout-page').then((m) => m.WorkoutPage),
    title: 'Workout · HomeLift',
  },
  {
    path: 'stats',
    loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
    title: 'Stats · HomeLift',
  },
  {
    path: 'routines',
    loadComponent: () => import('./routines/routines-page').then((m) => m.RoutinesPage),
    title: 'Routines · HomeLift',
  },
  {
    path: 'routines/new',
    loadComponent: () => import('./routines/routine-editor').then((m) => m.RoutineEditor),
    title: 'New routine · HomeLift',
  },
  {
    path: 'routines/:id',
    loadComponent: () => import('./routines/routine-editor').then((m) => m.RoutineEditor),
    title: 'Edit routine · HomeLift',
  },
  {
    path: 'data',
    loadComponent: () => import('./data/data-page').then((m) => m.DataPage),
    title: 'Your data · HomeLift',
  },
  { path: '**', redirectTo: '' },
];
