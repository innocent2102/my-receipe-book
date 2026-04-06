'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Grid,
  Chip,
  Stack,
  Alert,
  AppBar,
  Toolbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { UserMenu } from '../../../components/UserMenu';
import { Ingredient, generateId } from '@my-receipe-book/shared';
import { getApiBaseUrl } from '../../../lib/api';

interface InstructionItem {
  id: string;
  text: string;
}

export default function AddRecipePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [cookTime, setCookTime] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<InstructionItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Recipe title is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const recipeData = {
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients: ingredients.map(({ id, ...rest }) => rest),
        instructions: instructions.map((inst) => inst.text.trim()),
        prepTime: prepTime ? Number(prepTime) : undefined,
        cookTime: cookTime ? Number(cookTime) : undefined,
        servings: servings ? Number(servings) : undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      const res = await fetch(`${getApiBaseUrl()}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      });

      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to save recipe (${res.status})`);
      }

      router.push('/recipes');
    } catch (err) {
      setError('Failed to save recipe. Please try again.');
      console.error('Error saving recipe:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.back()}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Add New Recipe
          </Typography>
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Recipe
          </Typography>

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
                  label="Recipe Title *"
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
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your recipe..."
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Prep Time (minutes)"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : '')}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cook Time (minutes)"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value ? Number(e.target.value) : '')}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Servings"
                  value={servings}
                  onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
                />
              </Grid>

              {/* Ingredients */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Ingredients</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addIngredient}
                    variant="outlined"
                    size="small"
                  >
                    Add Ingredient
                  </Button>
                </Box>

                <Stack spacing={2}>
                  {ingredients.map((ingredient, index) => (
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
                        label="Amount"
                        type="number"
                        value={ingredient.amount || ''}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, 'amount', Number(e.target.value) || 0)
                        }
                        sx={{ width: 100 }}
                        inputProps={{ step: 0.1 }}
                      />
                      <TextField
                        label="Unit"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                        sx={{ flex: 1 }}
                        placeholder="e.g., cups, tbsp, g"
                      />
                      <TextField
                        label="Ingredient Name"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                        sx={{ flex: 2 }}
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
                  <Typography variant="h6">Instructions</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addInstruction}
                    variant="outlined"
                    size="small"
                  >
                    Add Step
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
                        placeholder={`Step ${index + 1}...`}
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
                  Tags
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
                    label="Add Tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="e.g., vegetarian, quick, dessert"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </Box>
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    size="large"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Recipe'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </>
  );
}

