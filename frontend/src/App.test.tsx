import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders JukeBoxd app', () => {
  render(<App />);
  const titleElement = screen.getByText(/Welcome to JukeBoxd/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders app bar with JukeBoxd title', () => {
  render(<App />);
  const appBarTitle = screen.getByText('JukeBoxd');
  expect(appBarTitle).toBeInTheDocument();
});


