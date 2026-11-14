'use client';

import { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemText, Tooltip, ListItemIcon } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from '../i18n/LanguageProvider';
import { locales, localeNames, type Locale } from '../i18n/translations';

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleSelect = (next: Locale) => {
    setLocale(next);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={t('language.label')}>
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={t('language.label')}
          aria-haspopup="true"
          aria-controls={open ? 'language-menu' : undefined}
          aria-expanded={open ? 'true' : undefined}
        >
          <TranslateIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {locales.map((item) => (
          <MenuItem key={item} selected={item === locale} onClick={() => handleSelect(item)}>
            <ListItemIcon sx={{ visibility: item === locale ? 'visible' : 'hidden' }}>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{localeNames[item]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
