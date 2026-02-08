
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Alert
} from '@mui/material';
import { UserProfile } from '../../types';
import api from '../../services/api';

interface EditProfileDialogProps {
    open: boolean;
    onClose: () => void;
    currentUser: UserProfile;
    onProfileUpdate: (updatedProfile: UserProfile) => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
    open,
    onClose,
    currentUser,
    onProfileUpdate
}) => {
    const [displayName, setDisplayName] = useState(currentUser.displayName || '');
    const [bio, setBio] = useState(currentUser.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setDisplayName(currentUser.displayName || '');
            setBio(currentUser.bio || '');
            setAvatarUrl(currentUser.avatarUrl || '');
        }
    }, [open, currentUser]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.put('/auth/me/profile', {
                displayName,
                bio,
                avatarUrl
            });

            if (response.data.success) {
                onProfileUpdate(response.data.data.user);
                onClose();
            }
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.response?.data?.error?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    <TextField
                        label="Display Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        fullWidth
                        inputProps={{ maxLength: 50 }}
                    />
                    <TextField
                        label="Bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        multiline
                        rows={4}
                        fullWidth
                        inputProps={{ maxLength: 500 }}
                    />
                    <TextField
                        label="Avatar URL"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        fullWidth
                        helperText="Link to an image for your profile picture"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditProfileDialog;
