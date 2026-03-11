import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Alert,
    Avatar,
    IconButton
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
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
    const [uploadingImage, setUploadingImage] = useState(false);

    React.useEffect(() => {
        if (open) {
            setDisplayName(currentUser.displayName || '');
            setBio(currentUser.bio || '');
            setAvatarUrl(currentUser.avatarUrl || '');
        }
    }, [open, currentUser]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Image size must be less than 2MB');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        setUploadingImage(true);
        setError(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarUrl(reader.result as string);
            setUploadingImage(false);
        };
        reader.onerror = () => {
            setError('Failed to read image file');
            setUploadingImage(false);
        };
        reader.readAsDataURL(file);
    };

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
                    {/* Avatar Upload Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                            src={avatarUrl}
                            sx={{ width: 80, height: 80 }}
                        >
                            {displayName?.charAt(0).toUpperCase() || currentUser.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <input
                                accept="image/*"
                                style={{ display: 'none' }}
                                id="avatar-upload"
                                type="file"
                                onChange={handleImageUpload}
                            />
                            <label htmlFor="avatar-upload">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<PhotoCamera />}
                                    disabled={uploadingImage}
                                >
                                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                                </Button>
                            </label>
                            <Box sx={{ mt: 0.5 }}>
                                <small style={{ color: '#888' }}>Max 2MB, JPG/PNG</small>
                            </Box>
                        </Box>
                    </Box>

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
                        label="Avatar URL (Optional)"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        fullWidth
                        helperText="Or paste a link to an image"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading || uploadingImage}>
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditProfileDialog;
