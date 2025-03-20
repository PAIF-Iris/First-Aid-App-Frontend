//homepage
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';

const HomePage: React.FC = () => {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollView}>
                <Text style={styles.title}>AI First Aid Assistant</Text>
                <Text style={styles.subtitle}>How can we help you today?</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/VoiceAssistant')}
                >
                    <Ionicons name="mic" size={24} color="#007AFF"/>
                    <Text style={styles.buttonText}>Voice Assistant</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/Video')}
                >
                    <Ionicons name="videocam" size={24} color="#007AFF" />
                    <Text style={styles.buttonText}>Videos</Text>
                </TouchableOpacity>

                <Text style={styles.helpText}>Tap a button to get started</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 15,
        width: '80%',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#333',
        fontSize: 18,
        marginLeft: 15,
        fontWeight: '500',
    },
    helpText: {
        color: '#666',
        fontSize: 14,
        marginTop: 20,
    },
});

export default HomePage;