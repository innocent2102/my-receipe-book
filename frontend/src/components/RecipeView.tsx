'use client';

import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { youTubeEmbedUrl } from '../lib/youtube';
import { useTranslation } from '../i18n/LanguageProvider';

export type RecipeViewIngredient = {
  id?: string;
  name: string;
  amount: number;
  unit: string;
};

export type RecipeViewData = {
  id: string;
  title: string;
  description?: string;
  ingredients?: RecipeViewIngredient[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
  videoUrl?: string;
};

/** Read-only recipe body, shared by the detail page and public share links. */
export function RecipeView({ recipe }: { recipe: RecipeViewData }) {
  const { t } = useTranslation();

  const totalTime =
    recipe.prepTime != null || recipe.cookTime != null
      ? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
      : null;
  const instructionSteps = (recipe.instructions ?? []).filter((step) => step.trim() !== '');
  const videoEmbedUrl = recipe.videoUrl ? youTubeEmbedUrl(recipe.videoUrl) : null;

  return (
    <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {recipe.title}
      </Typography>

      {recipe.description ? (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {recipe.description}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {recipe.prepTime != null ? (
          <Chip size="small" label={t('recipes.chip.prep', { minutes: recipe.prepTime })} />
        ) : null}
        {recipe.cookTime != null ? (
          <Chip size="small" label={t('recipes.chip.cook', { minutes: recipe.cookTime })} />
        ) : null}
        {totalTime != null ? (
          <Chip size="small" color="primary" label={t('recipes.chip.total', { minutes: totalTime })} />
        ) : null}
        {recipe.servings != null ? (
          <Chip size="small" label={t('recipes.chip.servings', { count: recipe.servings })} />
        ) : null}
        {recipe.tags?.map((tag) => (
          <Chip key={tag} size="small" variant="outlined" label={tag} />
        ))}
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {videoEmbedUrl ? (
        <>
          <Typography variant="h6" component="h2" gutterBottom>
            {t('detail.video')}
          </Typography>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              pt: '56.25%',
              mb: 3,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Box
              component="iframe"
              src={videoEmbedUrl}
              title={t('detail.video')}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </Box>
        </>
      ) : null}

      <Typography variant="h6" component="h2" gutterBottom>
        {t('detail.ingredients')}
      </Typography>
      {recipe.ingredients && recipe.ingredients.length > 0 ? (
        <List dense disablePadding sx={{ mb: 3 }}>
          {recipe.ingredients.map((ing, index) => (
            <ListItem key={ing.id ?? `${ing.name}-${index}`} disableGutters sx={{ py: 0.5 }}>
              <ListItemText
                primary={[ing.amount || '', ing.unit || '', ing.name]
                  .map((part) => String(part).trim())
                  .filter((part) => part !== '')
                  .join(' ')}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('detail.noIngredients')}
        </Typography>
      )}

      {instructionSteps.length > 0 ? (
        <>
          <Typography variant="h6" component="h2" gutterBottom>
            {t('detail.instructions')}
          </Typography>
          <Box component="ol" sx={{ pl: 3, m: 0 }}>
            {instructionSteps.map((step, index) => (
              <Box component="li" key={index} sx={{ mb: 1.5 }}>
                <Typography variant="body1">{step}</Typography>
              </Box>
            ))}
          </Box>
        </>
      ) : null}
    </Paper>
  );
}
