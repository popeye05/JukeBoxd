import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    TextField,
    InputAdornment,
    Grid,
    CircularProgress,
    Alert
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { UserDiscovery } from '../components/social';
import { UserProfile as UserProfileComponent } from '../components/social';
import { socialApi } from '../services/socialApi';
import { User } from '../types';

const DiscoverUsersPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Perform search when debounced query changes
    useEffect(() => {
        const searchUsers = async () => {
            if (!debouncedQuery.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const users = await socialApi.searchUsers(debouncedQuery);
                setSearchResults(users);
            } catch (err) {
                console.error('Failed to search users:', err);
                setError('Failed to search users. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        searchUsers();
    }, [debouncedQuery]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                Discover Users
            </Typography>

            <Box sx={{ mb: 4 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search for users by username or display name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="action" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ maxWidth: 600 }}
                />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Search Results */}
            {debouncedQuery.trim() && (
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                        Search Results
                    </Typography>

                    {loading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : searchResults.length === 0 ? (
                        <Typography variant="body1" color="text.secondary">
                            No users found matching "{debouncedQuery}"
                        </Typography>
                    ) : (
                        <Grid container spacing={3}>
                            {searchResults.map((user) => (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
                                    <UserProfileComponent userId={user.id} showFollowButton={true} compact={true} />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            )}

            {/* Default Suggestions (UserDiscovery Component) */}
            {!debouncedQuery.trim() && (
                <Box>
                    <UserDiscovery title="Suggested Users" limit={9} showRefresh={true} />
                </Box>
            )}
        </Container>
    );
};

export default DiscoverUsersPage;
