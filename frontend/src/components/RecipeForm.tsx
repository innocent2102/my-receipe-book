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
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { Ingredient, generateId } from '@my-receipe-book/shared';
import { useTranslation } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/translations';
import { isYouTubeUrl, youTubeEmbedUrl } from '../lib/youtube';
import {
  RECIPE_IMAGE_TYPES,
  imageFileFromTransfer,
  isDisplayableImageUrl,
  readImageFromClipboard,
  uploadRecipeImage,
} from '../lib/recipeImage';
import { RecipeThumbnail } from './RecipeThumbnail';

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
  videoUrl?: string;
  imageUrl?: string;
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

const IMAGE_ERROR_CODES = ['unsupported_type', 'too_large', 'empty'] as const;

function imageErrorKey(code: string): TranslationKey {
  const known = IMAGE_ERROR_CODES.find((candidate) => candidate === code);
  return (known ? `add.imageError.${known}` : 'add.imageError.generic') as TranslationKey;
}

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
  const [videoUrl, setVideoUrl] = useState(initialValues?.videoUrl ?? '');
  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl ?? '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoEmbedUrl = youTubeEmbedUrl(videoUrl);

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

  /** Drops a suggestion from the user's catalog (the ✕ on a dropdown option). */
  const forgetIngredientName = async (name: string) => {
    setIngredientOptions((prev) => prev.filter((option) => option !== name));

    try {
      const res = await fetch(`/api/ingredients?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: string[];
      };
      if (res.ok && json.success && Array.isArray(json.data)) {
        setIngredientOptions(json.data);
      }
    } catch (err) {
      console.error('Error removing ingredient suggestion:', err);
    }
  };

  const addIngredient = () => {
    // Newest row first so the user can keep typing without scrolling.
    setIngredients([
      {
        id: generateId(),
        name: '',
        amount: 0,
        unit: '',
      },
      ...ingredients,
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

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;

    setError(null);
    setIsUploadingImage(true);
    const result = await uploadRecipeImage(file);
    setIsUploadingImage(false);

    if ('url' in result) {
      setImageUrl(result.url);
    } else {
      setError(t(imageErrorKey(result.errorCode)));
    }
  };

  /** Ctrl+V of a copied picture anywhere in the photo area. Pasting a link still works. */
  const handleImagePaste = (event: React.ClipboardEvent) => {
    const file = imageFileFromTransfer(event.clipboardData);
    if (!file) return;

    event.preventDefault();
    void handleImageFile(file);
  };

  const handleImageDrop = (event: React.DragEvent) => {
    const file = imageFileFromTransfer(event.dataTransfer);
    if (!file) return;

    event.preventDefault();
    void handleImageFile(file);
  };

  /** For users who copied a picture but are not typing in the field. */
  const pasteImageFromClipboard = async () => {
    const file = await readImageFromClipboard();
    if (!file) {
      setError(t('add.imageError.clipboard_empty'));
      return;
    }
    await handleImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t('add.titleRequired'));
      return;
    }

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !isYouTubeUrl(trimmedVideoUrl)) {
      setError(t('add.videoUrlInvalid'));
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
        videoUrl: trimmedVideoUrl || undefined,
        imageUrl: imageUrl.trim() || undefined,
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

        <Grid item xs={12}>
          <TextField
            fullWidth
            type="url"
            label={t('add.videoUrl')}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={t('add.videoUrlPlaceholder')}
            error={videoUrl.trim() !== '' && !isYouTubeUrl(videoUrl)}
            helperText={
              videoUrl.trim() !== '' && !isYouTubeUrl(videoUrl)
                ? t('add.videoUrlInvalid')
                : t('add.videoUrlHelp')
            }
          />
          {videoEmbedUrl ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                pt: '56.25%',
                mt: 2,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                component="iframe"
                src={videoEmbedUrl}
                title={t('add.videoPreview')}
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
          ) : null}
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {t('add.image')}
          </Typography>
          <Box
            onPaste={handleImagePaste}
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
            sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}
          >
            <RecipeThumbnail imageUrl={imageUrl} alt={t('add.imagePreview')} size={96} />
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <TextField
                fullWidth
                label={t('add.imageUrl')}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t('add.imageUrlPlaceholder')}
                error={imageUrl.trim() !== '' && !isDisplayableImageUrl(imageUrl)}
                helperText={
                  imageUrl.trim() !== '' && !isDisplayableImageUrl(imageUrl)
                    ? t('add.imageUrlInvalid')
                    : t('add.imageHelp')
                }
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? t('add.imageUploading') : t('add.imageUpload')}
                  <input
                    type="file"
                    hidden
                    accept={RECIPE_IMAGE_TYPES.join(',')}
                    onChange={(e) => {
                      void handleImageFile(e.target.files?.[0]);
                      // Lets the user re-pick the same file after an error.
                      e.target.value = '';
                    }}
                  />
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentPasteIcon />}
                  disabled={isUploadingImage}
                  onClick={() => void pasteImageFromClipboard()}
                >
                  {t('add.imagePaste')}
                </Button>
                {imageUrl ? (
                  <Button size="small" color="error" onClick={() => setImageUrl('')}>
                    {t('add.imageRemove')}
                  </Button>
                ) : null}
              </Box>
            </Box>
          </Box>
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
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & {
                      key: string;
                    };
                    return (
                      <Box
                        component="li"
                        key={key}
                        {...optionProps}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Box component="span" sx={{ flexGrow: 1 }}>
                          {option}
                        </Box>
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={t('add.forgetIngredientAria', { name: option })}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();
                            void forgetIngredientName(option);
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('add.ingredientName')}
                      placeholder={t('add.ingredientNamePlaceholder')}
                    />
                  )}
                />
                <TextField
                  label={t('add.amount')}
                  type="number"
                  value={ingredient.amount || ''}
                  onChange={(e) =>
                    updateIngredient(ingredient.id, 'amount', Number(e.target.value) || 0)
                  }
                  sx={{ width: 110 }}
                  inputProps={{ step: 0.1 }}
                />
                <TextField
                  label={t('add.unit')}
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                  sx={{ flex: 1 }}
                  placeholder={t('add.unitPlaceholder')}
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
