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
    loadComponent: () => import('./exercises/exercise-form').then((m) => m.ExerciseForm),
    title: 'Edit exercise · HomeLift',
  },
  { path: '**', redirectTo: '' },
];
