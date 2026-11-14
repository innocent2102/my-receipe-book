'use client';

import { Box, CircularProgress } from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** No landing page: signed-in users go straight to their recipes, others to login. */
export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/recipes');
    } else if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=%2Frecipes');
    }
  }, [status, router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
      <CircularProgress />
    </Box>
  );
}
