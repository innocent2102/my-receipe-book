'use client';

import { Chip, Tooltip } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from '../i18n/LanguageProvider';

type Props = {
  online: boolean;
  /** Number of changes waiting to be sent to the server. */
  pending?: number;
};

/** AppBar badge telling the user whether they are working from the local copy. */
export function OfflineIndicator({ online, pending = 0 }: Props) {
  const { t, tPlural } = useTranslation();

  if (online && pending === 0) return null;

  const label = online ? t('offline.pendingLabel') : t('offline.label');
  const tooltip = online
    ? tPlural('offline.pending', pending, { count: pending })
    : pending > 0
      ? tPlural('offline.pending', pending, { count: pending })
      : t('offline.tooltip');

  return (
    <Tooltip title={tooltip}>
      <Chip
        size="small"
        color={online ? 'warning' : 'default'}
        icon={online ? <SyncIcon /> : <CloudOffIcon />}
        label={label}
        sx={{ mr: 1, color: 'inherit', borderColor: 'currentColor' }}
        variant="outlined"
      />
    </Tooltip>
  );
}
