'use client';

import { Box } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { isDisplayableImageUrl } from '../lib/recipeImage';

interface RecipeThumbnailProps {
  imageUrl?: string;
  alt: string;
  /** Square edge length in pixels, or a responsive sx width/height value. */
  size?: number | string;
  rounded?: number;
}

/** Recipe photo with a neutral placeholder, so lists keep an even rhythm without one. */
export function RecipeThumbnail({ imageUrl, alt, size = 56, rounded = 1 }: RecipeThumbnailProps) {
  const sx = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: rounded,
    overflow: 'hidden',
  } as const;

  if (!isDisplayableImageUrl(imageUrl)) {
    return (
      <Box
        sx={{
          ...sx,
          bgcolor: 'action.hover',
          color: 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RestaurantIcon fontSize="small" />
      </Box>
    );
  }

  return (
    // A plain <img>: photos can come from any imported site, which next/image would
    // need configured per domain.
    <Box component="img" src={imageUrl} alt={alt} loading="lazy" sx={{ ...sx, objectFit: 'cover' }} />
  );
}
