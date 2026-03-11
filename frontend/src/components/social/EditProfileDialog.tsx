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
    IconButton,
    Typography
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
    const [coverPhotoUrl, setCoverPhotoUrl] = useState(currentUser.coverPhotoUrl || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    React.useEffect(() => {
        if (open) {
            setDisplayName(currentUser.displayName || '');
            setBio(currentUser.bio || '');
            setAvatarUrl(currentUser.avatarUrl || '');
            setCoverPhotoUrl(currentUser.coverPhotoUrl || '');
        }
    }, [open, currentUser]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
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

        if (type === 'avatar') {
            setUploadingAvatar(true);
        } else {
            setUploadingCover(true);
        }
        setError(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'avatar') {
                setAvatarUrl(reader.result as string);
                setUploadingAvatar(false);
            } else {
                setCoverPhotoUrl(reader.result as string);
                setUploadingCover(false);
            }
        };
        reader.onerror = () => {
            setError('Failed to read image file');
            if (type === 'avatar') {
                setUploadingAvatar(false);
            } else {
                setUploadingCover(false);
            }
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
                avatarUrl,
                coverPhotoUrl
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
                    {/* Cover Photo Upload Section */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Cover Photo</Typography>
                        <Box
                            sx={{
                                width: '100%',
                                height: 120,
                                borderRadius: 2,
                                border: '2px dashed #ccc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundImage: coverPhotoUrl ? `url(${coverPhotoUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {!coverPhotoUrl && (
                                <Typography variant="body2" color="text.secondary">
                                    Click to upload cover photo
                                </Typography>
                            )}
                            <input
                                accept="image/*"
                                style={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer'
                                }}
                                id="cover-upload"
                                type="file"
                                onChange={(e) => handleImageUpload(e, 'cover')}
                            />
                        </Box>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PhotoCamera />}
                                disabled={uploadingCover}
                                onClick={() => document.getElementById('cover-upload')?.click()}
                            >
                                {uploadingCover ? 'Uploading...' : 'Change Cover'}
                            </Button>
                            {coverPhotoUrl && (
                                <Button
                                    size="small"
                                    variant="text"
                                    color="error"
                                    onClick={() => setCoverPhotoUrl('')}
                                >
                                    Remove
                                </Button>
                            )}
                        </Box>
                    </Box>

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
                                onChange={(e) => handleImageUpload(e, 'avatar')}
                            />
                            <label htmlFor="avatar-upload">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<PhotoCamera />}
                                    disabled={uploadingAvatar}
                                >
                                    {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
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
                <Button onClick={handleSubmit} variant="contained" disabled={loading || uploadingAvatar || uploadingCover}>
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditProfileDialog;
