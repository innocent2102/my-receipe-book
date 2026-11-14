'use client';

import { useState, useEffect } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Grid,
  Chip,
  Stack,
  Alert,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Ingredient, generateId } from '@my-receipe-book/shared';
import { useTranslation } from '../i18n/LanguageProvider';

interface InstructionItem {
  id: string;
  text: string;
}

export interface RecipeFormValues {
  title: string;
  description?: string;
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
}

interface RecipeFormProps {
  /** Pre-fills the form; omit when creating a new recipe. */
  initialValues?: RecipeFormValues;
  submitLabel: string;
  submittingLabel: string;
  /** Should throw an `Error` to surface a message in the form. */
  onSubmit: (values: RecipeFormValues) => Promise<void>;
  onCancel: () => void;
}

const normalizeIngredientName = (name: string) => name.trim().replace(/\s+/g, ' ');

export function RecipeForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [prepTime, setPrepTime] = useState<number | ''>(initialValues?.prepTime ?? '');
  const [cookTime, setCookTime] = useState<number | ''>(initialValues?.cookTime ?? '');
  const [servings, setServings] = useState<number | ''>(initialValues?.servings ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(() =>
    (initialValues?.ingredients ?? []).map((ing) => ({ id: generateId(), ...ing }))
  );
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<InstructionItem[]>(() =>
    (initialValues?.instructions ?? []).map((text) => ({ id: generateId(), text }))
  );
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadIngredientOptions = async () => {
      try {
        const res = await fetch('/api/ingredients', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: string[];
        };
        if (!cancelled && res.ok && json.success && Array.isArray(json.data)) {
          setIngredientOptions(json.data);
        }
      } catch (err) {
        console.error('Error loading ingredient suggestions:', err);
      }
    };

    loadIngredientOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Persists a newly typed ingredient name so it shows up in future autocompletes. */
  const rememberIngredientName = async (rawName: string) => {
    const name = normalizeIngredientName(rawName);
    if (!name) return;

    const isKnown = ingredientOptions.some(
      (option) => option.toLowerCase() === name.toLowerCase()
    );
    if (isKnown) return;

    setIngredientOptions((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));

    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: string[];
      };
      if (res.ok && json.success && Array.isArray(json.data)) {
        setIngredientOptions(json.data);
      }
    } catch (err) {
      console.error('Error saving ingredient:', err);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: generateId(),
        name: '',
        amount: 0,
        unit: '',
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string | number) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      {
        id: generateId(),
        text: '',
      },
    ]);
  };

  const removeInstruction = (id: string) => {
    setInstructions(instructions.filter((inst) => inst.id !== id));
  };

  const updateInstruction = (id: string, text: string) => {
    setInstructions(
      instructions.map((inst) => (inst.id === id ? { ...inst, text } : inst))
    );
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t('add.titleRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients: ingredients.map(({ id, ...rest }) => rest),
        instructions: instructions.map((inst) => inst.text.trim()),
        prepTime: prepTime ? Number(prepTime) : undefined,
        cookTime: cookTime ? Number(cookTime) : undefined,
        servings: servings ? Number(servings) : undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('add.saveFailedGeneric'));
      console.error('Error saving recipe:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={t('add.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('add.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('add.descriptionPlaceholder')}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label={t('add.prepTime')}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : '')}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label={t('add.cookTime')}
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value ? Number(e.target.value) : '')}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label={t('add.servings')}
            value={servings}
            onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
          />
        </Grid>

        {/* Ingredients */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('add.ingredients')}</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addIngredient}
              variant="outlined"
              size="small"
            >
              {t('add.addIngredient')}
            </Button>
          </Box>

          <Stack spacing={2}>
            {ingredients.map((ingredient) => (
              <Box
                key={ingredient.id}
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <TextField
                  label={t('add.amount')}
                  type="number"
                  value={ingredient.amount || ''}
                  onChange={(e) =>
                    updateIngredient(ingredient.id, 'amount', Number(e.target.value) || 0)
                  }
                  sx={{ width: 100 }}
                  inputProps={{ step: 0.1 }}
                />
                <TextField
                  label={t('add.unit')}
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                  sx={{ flex: 1 }}
                  placeholder={t('add.unitPlaceholder')}
                />
                <Autocomplete
                  freeSolo
                  autoHighlight
                  selectOnFocus
                  handleHomeEndKeys
                  options={ingredientOptions}
                  inputValue={ingredient.name}
                  value={ingredient.name}
                  sx={{ flex: 2 }}
                  onInputChange={(_event, newInputValue) =>
                    updateIngredient(ingredient.id, 'name', newInputValue)
                  }
                  onChange={(_event, newValue) => {
                    const name = typeof newValue === 'string' ? newValue : '';
                    updateIngredient(ingredient.id, 'name', name);
                    void rememberIngredientName(name);
                  }}
                  onBlur={() => void rememberIngredientName(ingredient.name)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('add.ingredientName')}
                      placeholder={t('add.ingredientNamePlaceholder')}
                    />
                  )}
                />
                <IconButton
                  color="error"
                  onClick={() => removeIngredient(ingredient.id)}
                  sx={{ mt: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('add.instructions')}</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addInstruction}
              variant="outlined"
              size="small"
            >
              {t('add.addStep')}
            </Button>
          </Box>

          <Stack spacing={2}>
            {instructions.map((instruction, index) => (
              <Box
                key={instruction.id}
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                }}
              >
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mt: 1,
                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={instruction.text}
                  onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                  placeholder={t('add.stepPlaceholder', { number: index + 1 })}
                />
                <IconButton
                  color="error"
                  onClick={() => removeInstruction(instruction.id)}
                  sx={{ mt: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* Tags */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {t('add.tags')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              label={t('add.addTagLabel')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={t('add.tagPlaceholder')}
            />
            <Button
              variant="outlined"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
            >
              {t('common.add')}
            </Button>
          </Box>
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting} size="large">
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
}
