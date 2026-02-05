import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const AccountSettings: React.FC = () => {
  const { user, deleteAccount } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteAccount();
      // User will be redirected automatically due to auth state change
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setDeleteDialogOpen(false);
    setConfirmationText('');
    setError(null);
  };

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Account Settings
      </Typography>

      {/* Account Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Username
              </Typography>
              <Typography variant="body1">
                {user.username}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">
                {user.email}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Member Since
              </Typography>
              <Typography variant="body1">
                {new Date(user.createdAt).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WarningIcon color="error" sx={{ mr: 1 }} />
            <Typography variant="h6" color="error">
              Danger Zone
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body1" gutterBottom>
            Delete Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
            Your ratings and reviews will be anonymized to preserve community data integrity.
          </Typography>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Delete Account
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This action will permanently delete your account and cannot be undone.
          </DialogContentText>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>What will happen:</strong>
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Your personal information will be permanently deleted</li>
              <li>Your ratings and reviews will be anonymized (not deleted) to preserve community data</li>
              <li>All follow relationships will be removed</li>
              <li>You will be immediately logged out</li>
            </ul>
          </Alert>

          <Typography variant="body2" sx={{ mb: 1 }}>
            To confirm, type <strong>DELETE</strong> in the box below:
          </Typography>
          
          <TextField
            fullWidth
            variant="outlined"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Type DELETE to confirm"
            error={!!error}
            helperText={error}
            disabled={isDeleting}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={confirmationText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountSettings;