'use client';

import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from '../i18n/LanguageProvider';

export type RecipeSummary = {
  id: string;
  title: string;
  description?: string;
  ingredients?: { name?: string; amount?: number; unit?: string }[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

/** Comma-separated ingredient names for the compact row summary. */
export const ingredientNames = (recipe: RecipeSummary) =>
  (recipe.ingredients ?? [])
    .map((ing) => ing.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(', ');

type Props = {
  recipes: RecipeSummary[];
  onOpen: (recipe: RecipeSummary) => void;
  renderActions: (recipe: RecipeSummary) => ReactNode;
  /** Right padding (theme spacing units) keeping the text clear of the actions. */
  actionsSpacing?: number;
};

/** Shared recipe row list, used by both the recipe list and the planned list. */
export function RecipeRows({ recipes, onOpen, renderActions, actionsSpacing = 20 }: Props) {
  const { t } = useTranslation();

  return (
    <List disablePadding>
      {recipes.map((recipe, index) => {
        const ingredientSummary = ingredientNames(recipe);

        return (
          <Box key={recipe.id}>
            {index > 0 ? <Box sx={{ borderTop: 1, borderColor: 'divider' }} /> : null}
            <ListItem
              alignItems="flex-start"
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  {renderActions(recipe)}
                </Stack>
              }
            >
              <ListItemButton
                alignItems="flex-start"
                onClick={() => onOpen(recipe)}
                sx={{ py: 2, px: 3, pr: actionsSpacing }}
              >
                <ListItemText
                  primary={recipe.title}
                  primaryTypographyProps={{ variant: 'h6', component: 'div' }}
                  secondary={
                    <>
                      {recipe.description ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {recipe.description}
                        </Typography>
                      ) : null}
                      {ingredientSummary ? (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          noWrap
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {ingredientSummary}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {recipe.prepTime != null ? (
                          <Chip
                            size="small"
                            label={t('recipes.chip.prep', { minutes: recipe.prepTime })}
                          />
                        ) : null}
                        {recipe.cookTime != null ? (
                          <Chip
                            size="small"
                            label={t('recipes.chip.cook', { minutes: recipe.cookTime })}
                          />
                        ) : null}
                        {recipe.servings != null ? (
                          <Chip
                            size="small"
                            label={t('recipes.chip.servings', { count: recipe.servings })}
                          />
                        ) : null}
                        {recipe.tags?.map((tag) => (
                          <Chip key={tag} size="small" variant="outlined" label={tag} />
                        ))}
                      </Stack>
                    </>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        );
      })}
    </List>
  );
}
