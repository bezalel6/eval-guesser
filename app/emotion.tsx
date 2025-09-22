'use client';

import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';
import { useState } from 'react';

// This implementation is adapted from the Material-UI Next.js app router example:
// https://github.com/mui/material-ui/tree/master/examples/material-ui-nextjs-app-router-ts

export default function EmotionCacheProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [cache] = useState(() => {
    const cache = createCache({ 
      key: 'css',
      prepend: true, // This ensures styles are inserted at the beginning of the head
    });
    cache.compat = true;
    return cache;
  });

  useServerInsertedHTML(() => {
    return (
      <style
        data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: Object.values(cache.inserted).join(' '),
        }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}