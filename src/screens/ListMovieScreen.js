import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getAllMovies } from '../database/db';
import MovieCard from '../components/MovieCard';
import { colors, commonStyles } from '../styles/commonStyles';

export default function ListMovieScreen({ navigation, route }) {
    const { user } = useAuth();
    const [movies, setMovies] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadMovies = () => {
        try {
            const all = getAllMovies();
            // Only show movies with status 'SHOWING'
            const showing = all.filter(m => m.status === 'SHOWING');
            setMovies(showing);
        } catch (err) {
            console.error('Error loading movies:', err);
        }
    };

    useEffect(() => {
        loadMovies();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadMovies();
        setRefreshing(false);
    };

    const renderItem = ({ item }) => (
        <MovieCard
            movie={item}
            onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Đang chiếu</Text>
                <Text style={styles.subtitle}>{movies.length} phim đang chiếu</Text>
            </View>

            <FlatList
                data={movies}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={movies.length === 0 ? styles.emptyList : null}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
