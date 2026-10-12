/**
 * __tests__/MediaCard.test.tsx
 * Ionicons React component olarak mock'landi
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Ionicons'u gercek React komponenti olarak mock'la
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(View, { testID: name }),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

import MediaCard from '../components/MediaCard';
import type { MediaItem } from '../hooks/useStorage';

const makeItem = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: '1',
  title: 'Inception',
  trailer: '',
  year: '2010',
  type: 'movie',
  img: 'https://via.placeholder.com/80x110',
  userRating: 7,
  userNote: '',
  addedAt: new Date().toISOString(),
  ...overrides,
});

const noop = () => {};

describe('MediaCard - Render', () => {
  it('hata vermeden render olur', () => {
    expect(() =>
      render(<MediaCard item={makeItem()} onPress={noop} onRate={noop} onRemove={noop} />)
    ).not.toThrow();
  });

  it('film basligini gosterir', () => {
    const { getByText } = render(
      <MediaCard item={makeItem()} onPress={noop} onRate={noop} onRemove={noop} />
    );
    expect(getByText('Inception')).toBeTruthy();
  });

  it('yili gosterir', () => {
    const { getByText } = render(
      <MediaCard item={makeItem()} onPress={noop} onRate={noop} onRemove={noop} />
    );
    expect(getByText(/2010/)).toBeTruthy();
  });

  it('userRating > 0 ise puan gosterir', () => {
    const { getByText } = render(
      <MediaCard item={makeItem({ userRating: 8 })} onPress={noop} onRate={noop} onRemove={noop} />
    );
    expect(getByText(/8\/10/)).toBeTruthy();
  });

  it('userRating = 0 ise Puan ver gosterir', () => {
    const { getByText } = render(
      <MediaCard item={makeItem({ userRating: 0 })} onPress={noop} onRate={noop} onRemove={noop} />
    );
    expect(getByText('Puan ver')).toBeTruthy();
  });

  it('userNote varsa gosterir', () => {
    const { getByText } = render(
      <MediaCard
        item={makeItem({ userNote: 'Cok iyi bir film' })}
        onPress={noop} onRate={noop} onRemove={noop}
      />
    );
    expect(getByText(/Cok iyi bir film/)).toBeTruthy();
  });

  it('userNote bossa not gosterilmez', () => {
    const { queryByText } = render(
      <MediaCard item={makeItem({ userNote: '' })} onPress={noop} onRate={noop} onRemove={noop} />
    );
    expect(queryByText(/userNote/)).toBeFalsy();
  });
});

describe('MediaCard - Callback', () => {
  it('onPress cagrilir', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <MediaCard item={makeItem()} onPress={onPress} onRate={noop} onRemove={noop} />
    );
    fireEvent.press(getByText('Inception'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('farkli baslik dogru render olur', () => {
    const { getByText } = render(
      <MediaCard
        item={makeItem({ title: 'Interstellar', year: '2014' })}
        onPress={noop} onRate={noop} onRemove={noop}
      />
    );
    expect(getByText('Interstellar')).toBeTruthy();
    expect(getByText(/2014/)).toBeTruthy();
  });
});